import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.BENVENUTO_BROWSER_URL;
const chrome = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

test("Ingresso → Benvenuto → Oggi/Menu: copertina e cartigli responsive", {
  skip: !baseUrl || !existsSync(chrome) || typeof WebSocket !== "function",
}, async () => {
  const profile = await mkdtemp(join(tmpdir(), "semprini-benvenuto-"));
  const browser = spawn(chrome, [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-gpu-sandbox",
    "--no-first-run", "--disable-extensions", "--remote-debugging-port=0",
    `--user-data-dir=${profile}`, "about:blank",
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
    async function navigate(path, ready) {
      await send("Page.navigate", { url: new URL(path, baseUrl).href });
      await until(`location.pathname === ${JSON.stringify(path)} && (${ready})`);
    }
    async function screenshot(name) {
      if (!process.env.BENVENUTO_SCREENSHOT_DIR) return;
      await send("Runtime.evaluate", { expression: "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))", awaitPromise: true });
      const shot = await send("Page.captureScreenshot", { format: "png" });
      await writeFile(join(process.env.BENVENUTO_SCREENSHOT_DIR, `${name}.png`), Buffer.from(shot.data, "base64"));
    }
    async function tap(selector) {
      const point = await evaluate(`(() => { const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
        return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
      await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
      await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    }

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");
    for (const [width, height] of [[360, 800], [390, 844], [1280, 900]]) {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 500 });
      await navigate("/benvenuto", "document.querySelector('main img')?.complete && document.querySelector('main img')?.naturalWidth === 941");
      const state = await evaluate(`(() => {
        const main=document.querySelector('main'), sheet=main.firstElementChild, img=main.querySelector('img');
        const sr=sheet.getBoundingClientRect(), ir=img.getBoundingClientRect();
        const links=[...main.querySelectorAll('nav a')].map(link => {
          const r=link.getBoundingClientRect();
          return {href:link.getAttribute('href'),label:link.getAttribute('aria-label'),text:link.textContent.trim(),
            left:(r.left-sr.left)/sr.width,top:(r.top-sr.top)/sr.height,width:r.width,height:r.height,
            hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===link,
            background:getComputedStyle(link).backgroundColor};
        });
        return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,
          scrollHeight:document.documentElement.scrollHeight,imgSrc:img.getAttribute('src'),
          naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,
          sheet:{left:sr.left,top:sr.top,width:sr.width,height:sr.height},
          image:{left:ir.left,top:ir.top,width:ir.width,height:ir.height},links};
      })()`);
      assert.equal(state.width, width);
      assert.equal(state.scrollWidth, width, JSON.stringify(state));
      assert.ok(state.scrollHeight <= height + 1, JSON.stringify(state));
      assert.equal(state.imgSrc, "/CoverBenvenuto.png");
      assert.equal(state.naturalHeight, 1671);
      assert.ok(Math.abs(state.sheet.width / state.sheet.height - 941 / 1671) < .001);
      assert.deepEqual(state.image, state.sheet);
      assert.ok(state.sheet.left >= 0 && state.sheet.top >= 0);
      assert.ok(state.sheet.left + state.sheet.width <= width + 1);
      assert.ok(state.sheet.top + state.sheet.height <= height + 1);
      assert.deepEqual(state.links.map(link => [link.href, link.label]), [["/oggi", "Oggi"], ["/menu", "Menu"]]);
      assert.ok(state.links.every(link => link.text === "" && link.hit && link.width >= 44 && link.height >= 44));
      assert.ok(state.links.every(link => link.background === "rgba(0, 0, 0, 0)"));
      assert.ok(Math.abs(state.links[0].left - 72 / 941) < .002 && Math.abs(state.links[0].top - 1076 / 1671) < .002);
      assert.ok(Math.abs(state.links[1].left - 489 / 941) < .002 && Math.abs(state.links[1].top - 1076 / 1671) < .002);
      await screenshot(`benvenuto-${width}`);
      if (width === 390 && process.env.BENVENUTO_SCREENSHOT_DIR) {
        await evaluate("document.querySelectorAll('nav a').forEach(link => { link.style.outline = '2px solid #1260c0'; link.style.outlineOffset = '-2px'; })");
        await screenshot("benvenuto-390-aree");
      }
    }

    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
    await navigate("/", "document.querySelector('main img')?.getAttribute('src')?.includes('Homepage.png')");
    assert.equal(await evaluate("document.querySelector('a[aria-label=\"Entra nel registro\"]')?.getAttribute('href')"), "/benvenuto");
    await screenshot("ingresso-390");
    await tap('a[aria-label="Entra nel registro"]');
    await until("location.pathname === '/benvenuto' && document.querySelector('main img')?.naturalWidth === 941");
    await tap('nav a[href="/oggi"]');
    await until("location.pathname === '/oggi' && !!document.querySelector('main')");
    await navigate("/benvenuto", "!!document.querySelector('nav a[href=\"/menu\"]')");
    await tap('nav a[href="/menu"]');
    await until("location.pathname === '/menu' && document.querySelector('main img')?.naturalWidth === 941");
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
