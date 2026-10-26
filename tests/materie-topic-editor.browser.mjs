import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.MATERIE_BROWSER_URL;
const chrome = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const examples = { matematica: "Algebra", fisica: "Cinematica", chimica: "Atomi e molecole" };
const pathFor = (slug, name) => `/materie/${slug}/argomento?id=${encodeURIComponent(`default:${slug}:${encodeURIComponent(name)}`)}`;

test("Appunti degli argomenti: SfondoStandard, lettura e scrittura nei tre formati", {
  skip: !baseUrl || !existsSync(chrome) || typeof WebSocket !== "function",
}, async () => {
  const profile = await mkdtemp(join(tmpdir(), "semprini-topic-editor-"));
  const browser = spawn(chrome, [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-gpu-sandbox",
    "--use-gl=swiftshader", "--no-first-run", "--disable-extensions",
    "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
  ], { windowsHide: true, stdio: "ignore" });
  let socket;
  try {
    let port;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try {
        port = Number((await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]);
        break;
      } catch {
        if (browser.exitCode !== null) throw new Error("Chrome exited before DevTools started");
        await delay(100);
      }
    }
    assert.ok(port);
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = pages.find((item) => item.type === "page");
    assert.ok(page);
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });

    let nextId = 0;
    const pending = new Map();
    const errors = [];
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
      if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
        errors.push(message.params.args.map(arg => arg.value || arg.description || "error").join(" "));
      }
      if (message.method === "Network.responseReceived" && message.params.response.status >= 400) {
        errors.push(`${message.params.response.status} ${message.params.response.url}`);
      }
      if (message.id && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
      }
    };
    function send(method, params = {}) {
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    }
    async function evaluate(expression) {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    }
    async function until(expression) {
      for (let attempt = 0; attempt < 100; attempt += 1) {
        try { if (await evaluate(expression)) return; } catch { /* Navigation replaces context. */ }
        await delay(200);
      }
      throw new Error(`Timed out: ${expression}; errors=${JSON.stringify(errors)}`);
    }
    async function navigate(path, title) {
      await send("Page.navigate", { url: new URL(path, baseUrl).href });
      await until(`document.querySelector('h1')?.textContent === ${JSON.stringify(title)} &&
        document.querySelector('#materia-appunti') && document.querySelector('main img')?.complete &&
        document.querySelector('main img')?.naturalWidth === 941`);
    }
    async function screenshot(name) {
      if (!process.env.MATERIE_EDITOR_SCREENSHOT_DIR) return;
      await send("Runtime.evaluate", { expression: "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))", awaitPromise: true });
      const shot = await send("Page.captureScreenshot", { format: "png" });
      await writeFile(join(process.env.MATERIE_EDITOR_SCREENSHOT_DIR, `${name}.png`), Buffer.from(shot.data, "base64"));
    }

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");
    for (const [width, height] of [[360, 800], [390, 844], [1280, 900]]) {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 500 });
      for (const [slug, name] of Object.entries(examples)) {
        await navigate(pathFor(slug, name), name);
        const state = await evaluate(`(() => {
          const main = document.querySelector('main'); const sheet = main.firstElementChild;
          const img = main.querySelector('img'); const h1 = main.querySelector('h1');
          const subject = h1.nextElementSibling; const notes = main.querySelector('h2');
          const area = document.querySelector('#materia-appunti');
          const links = [...main.querySelectorAll('nav a')];
          const sr = sheet.getBoundingClientRect(), ar = area.getBoundingClientRect();
          const hr = h1.getBoundingClientRect(), nr = notes.getBoundingClientRect();
          return { width:innerWidth, horizontalOverflow:document.documentElement.scrollWidth > innerWidth,
            image:img.getAttribute('src'), loaded:img.complete && img.naturalWidth === 941,
            objectFit:getComputedStyle(img).objectFit, sheetWidth:sr.width, sheetHeight:sr.height,
            title:h1.textContent, titleColor:getComputedStyle(h1).color, subject:subject.textContent,
            titleBottom:hr.bottom, notes:notes.textContent, notesTop:nr.top, notesBottom:nr.bottom,
            areaTop:ar.top, areaBottom:ar.bottom, areaHeight:ar.height, sheetBottom:sr.bottom,
            areaFont:parseFloat(getComputedStyle(area).fontSize), areaBackground:getComputedStyle(area).backgroundColor,
            placeholder:area.placeholder, links:links.map(link => ({href:link.getAttribute('href'),
              height:link.getBoundingClientRect().height,fontSize:parseFloat(getComputedStyle(link).fontSize)})) };
        })()`);
        assert.equal(state.width, width);
        assert.equal(state.horizontalOverflow, false, JSON.stringify(state));
        assert.equal(state.image, "/SfondoStandard.png");
        assert.equal(state.loaded, true, JSON.stringify(state));
        assert.equal(state.objectFit, "contain");
        assert.ok(Math.abs(state.sheetWidth / state.sheetHeight - 941 / 1672) < .01, JSON.stringify(state));
        assert.equal(state.title, name);
        assert.equal(state.titleColor, "rgb(133, 33, 62)");
        assert.ok(state.subject.length > 0);
        assert.equal(state.notes, "I miei appunti");
        assert.ok(state.titleBottom < state.notesTop && state.notesBottom < state.areaTop, JSON.stringify(state));
        assert.ok(state.areaHeight >= 150, JSON.stringify(state));
        assert.ok(state.areaBottom < state.sheetBottom, JSON.stringify(state));
        assert.ok(state.areaFont >= 16);
        assert.equal(state.areaBackground, "rgba(0, 0, 0, 0)");
        assert.equal(state.placeholder, "Scrivi qui i tuoi appunti...");
        assert.ok(state.links.some(link => link.href === `/materie/${slug}` && link.height >= 44));
        assert.ok(state.links.some(link => link.href === "/menu" && link.height >= 44));
        assert.ok(state.links.every(link => link.fontSize <= 17 && link.fontSize >= 13.5));
        await screenshot(`${slug}-${width}`);
      }
    }

    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    const oldKey = "semprini:materie:v1:matematica:topic:Algebra";
    await navigate(pathFor("matematica", "Algebra"), "Algebra");
    await evaluate(`localStorage.setItem(${JSON.stringify(oldKey)}, 'Appunti già presenti')`);
    await navigate(pathFor("matematica", "Algebra"), "Algebra");
    await until("document.querySelector('#materia-appunti')?.value === 'Appunti già presenti'");
    await evaluate(`(() => { const area=document.querySelector('#materia-appunti'); area.focus();
      area.setSelectionRange(area.value.length, area.value.length); })()`);
    const longText = "Nota lunga. ".repeat(240);
    await send("Input.insertText", { text: longText });
    await until(`localStorage.getItem(${JSON.stringify(oldKey)})?.endsWith(${JSON.stringify(longText)})`);
    const scrolling = await evaluate(`(() => { const area=document.querySelector('#materia-appunti');
      area.scrollTop=area.scrollHeight; return {scrollable:area.scrollHeight>area.clientHeight,scrolled:area.scrollTop>0}; })()`);
    assert.ok(scrolling.scrollable && scrolling.scrolled, JSON.stringify(scrolling));
    await screenshot("algebra-testo-lungo-390");
    await navigate(pathFor("matematica", "Algebra"), "Algebra");
    assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(oldKey)})`), `Appunti già presenti${longText}`);

    await evaluate(`(() => { const raw = {version:1,topics:{
      matematica:[{id:'default:matematica:Algebra',name:'Equazioni differenziali e applicazioni della matematica',noteName:'Algebra',aliases:['Algebra']}],
      fisica:[{id:'default:fisica:Cinematica',name:'Cinematica',noteName:'Cinematica',aliases:['Cinematica']}],
      chimica:[{id:'default:chimica:Atomi%20e%20molecole',name:'Atomi e molecole',noteName:'Atomi e molecole',aliases:['Atomi e molecole']}]
    }}; localStorage.setItem('semprini:materie:argomenti:v1', JSON.stringify(raw)); })()`);
    await navigate(pathFor("matematica", "Algebra"), "Equazioni differenziali e applicazioni della matematica");
    const longTitle = await evaluate(`(() => { const h=document.querySelector('h1').getBoundingClientRect();
      const a=document.querySelector('#materia-appunti').getBoundingClientRect();
      return {titleBottom:h.bottom,areaTop:a.top,areaHeight:a.height,scrollWidth:document.documentElement.scrollWidth}; })()`);
    assert.ok(longTitle.titleBottom < longTitle.areaTop && longTitle.areaHeight >= 150, JSON.stringify(longTitle));
    assert.equal(longTitle.scrollWidth, 390);
    await screenshot("algebra-titolo-lungo-390");

    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 500, deviceScaleFactor: 1, mobile: true });
    const keyboard = await evaluate(`(() => { const sheet=document.querySelector('main').firstElementChild;
      return {width:sheet.getBoundingClientRect().width, pageHeight:document.querySelector('main').getBoundingClientRect().height,
        viewport:innerHeight}; })()`);
    assert.equal(keyboard.width, 390);
    assert.ok(keyboard.pageHeight >= keyboard.viewport, JSON.stringify(keyboard));
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

    await evaluate("document.querySelector('nav a[href=\"/materie/matematica\"]').click()");
    await until("location.pathname === '/materie/matematica'");
    await navigate(pathFor("fisica", "Cinematica"), "Cinematica");
    await evaluate("document.querySelector('nav a[href=\"/menu\"]').click()");
    await until("location.pathname === '/menu'");
    assert.deepEqual(errors, []);
  } finally {
    socket?.close();
    browser.kill();
    if (browser.exitCode === null && browser.signalCode === null) {
      await new Promise((resolve) => browser.once("exit", resolve));
    }
    assert.ok(profile.startsWith(tmpdir() + sep));
    await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});
