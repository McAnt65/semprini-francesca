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
const backgrounds = {
  matematica: "SfondoMatematica.png",
  fisica: "SfondoFisica.png",
  chimica: "SfondoChimica.png",
};

test("Materie: grafica, navigazione e gestione argomenti delle tre pagine in Chrome", {
  skip: !baseUrl || !existsSync(chrome) || typeof WebSocket !== "function",
}, async () => {
  const profile = await mkdtemp(join(tmpdir(), "semprini-materie-g2-"));
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
    assert.ok(port, "Chrome DevTools did not start");
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = pages.find((item) => item.type === "page");
    assert.ok(page);
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });

    let nextId = 0;
    const pending = new Map();
    const errors = [];
    const requestUrls = new Map();
    const appOrigin = new URL(baseUrl).origin;
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
      if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
        errors.push(message.params.args.map(arg => arg.value || arg.description || "error").join(" "));
      }
      if (message.method === "Network.requestWillBeSent") {
        requestUrls.set(message.params.requestId, message.params.request.url);
      }
      if (message.method === "Network.loadingFinished") requestUrls.delete(message.params.requestId);
      if (message.method === "Network.loadingFailed") {
        const { requestId, errorText, canceled, type } = message.params;
        const requestUrl = requestUrls.get(requestId);
        requestUrls.delete(requestId);
        let canceledRscPrefetch = false;
        if (errorText === "net::ERR_ABORTED" && canceled === true && type === "Fetch" && requestUrl) {
          const url = new URL(requestUrl);
          canceledRscPrefetch = url.origin === appOrigin && url.searchParams.has("_rsc");
        }
        // A later navigation can cancel a Next.js RSC prefetch; other failures remain errors.
        if (!canceledRscPrefetch) errors.push(`${errorText} (${type}, canceled=${canceled}) ${requestUrl || "unknown URL"}`);
      }
      if (message.method === "Network.responseReceived" && message.params.response.status >= 400) {
        errors.push(`${message.params.response.status} ${message.params.response.url}`);
      }
      if (message.id && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
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
        try { if (await evaluate(expression)) return; } catch { /* Navigation replaces the context. */ }
        await delay(200);
      }
      throw new Error(`Timed out: ${expression}; errors=${JSON.stringify(errors)}`);
    }
    async function navigate(path) {
      await send("Page.navigate", { url: new URL(path, baseUrl).href });
      await until(`location.pathname === ${JSON.stringify(path)} && document.readyState === "complete"`);
      await until("document.querySelector('main [role=region] textarea') && document.querySelector('main img')?.naturalWidth > 0");
      await until("!document.querySelector('[role=region]').textContent.includes('Caricamento studenti')");
    }

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");
    for (const [width, height] of [[360, 800], [390, 844], [1280, 900]]) {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 500 });
      for (const [slug, background] of Object.entries(backgrounds)) {
        await navigate(`/materie/${slug}`);
        const state = await evaluate(`(() => {
          const main = document.querySelector('main');
          const sheet = main.firstElementChild;
          const image = main.querySelector('img');
          const nav = main.querySelector('nav');
          const workspace = main.querySelector('[role=region]');
          const sections = [...workspace.querySelectorAll('h2')].map(node => node.textContent);
          const links = [...main.querySelectorAll('a')].map(node => ({ href: node.getAttribute('href'), height: node.getBoundingClientRect().height }));
          const sectionTop = workspace.getBoundingClientRect().top;
          const navBottom = nav.getBoundingClientRect().bottom;
          workspace.scrollTop = workspace.scrollHeight;
          return { width: innerWidth, horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
            image: image.getAttribute('src'), imageLoaded: image.complete && image.naturalWidth === 941,
            heading: main.querySelector('h1')?.textContent, headingVisible: main.querySelector('h1')?.getBoundingClientRect().width > 2,
            sections, links, sectionTop, navBottom, sheetBottom: sheet.getBoundingClientRect().bottom,
            scrollable: workspace.scrollHeight > workspace.clientHeight, scrolled: workspace.scrollTop > 0,
            workspaceBottom: workspace.getBoundingClientRect().bottom, textAreaCount: workspace.querySelectorAll('textarea').length };
        })()`);
        assert.equal(state.width, width);
        assert.equal(state.horizontalOverflow, false, JSON.stringify(state));
        assert.equal(state.image, `/${background}`);
        assert.equal(state.imageLoaded, true, JSON.stringify(state));
        assert.equal(state.heading?.toLowerCase(), slug);
        assert.equal(state.headingVisible, false);
        assert.deepEqual(state.sections, ["ARGOMENTI", "REGOLE RAPIDE", "STUDENTI ASSOCIATI"]);
        assert.ok(state.navBottom <= state.sectionTop, JSON.stringify(state));
        assert.ok(state.workspaceBottom < state.sheetBottom, JSON.stringify(state));
        assert.ok(state.scrollable && state.scrolled, JSON.stringify(state));
        assert.ok(state.textAreaCount > 0);
        assert.ok(state.links.some(link => link.href === "/oggi" && link.height >= 44));
        assert.ok(state.links.some(link => link.href === "/materie" && link.height >= 44));
        assert.ok(state.links.some(link => link.href === "/menu" && link.height >= 44));
        assert.ok(state.links.some(link => link.href?.includes(`/materie/${slug}/argomento?id=`) && link.height >= 44));
        assert.ok(state.links.some(link => link.href === `/materie/${slug}/studenti` && link.height >= 44));
        if (process.env.MATERIE_SCREENSHOT_DIR) {
          await evaluate("document.querySelector('[role=region]').scrollTop = 0");
          const shot = await send("Page.captureScreenshot", { format: "png" });
          await writeFile(join(process.env.MATERIE_SCREENSHOT_DIR, `${slug}-${width}.png`), Buffer.from(shot.data, "base64"));
        }
      }
    }

    await navigate("/materie/fisica");
    await evaluate("document.querySelector('textarea').focus()");
    await send("Input.insertText", { text: "Prova G2" });
    await until("localStorage.getItem('semprini:materie:v1:fisica:quick:Formule') === 'Prova G2'");
    await navigate("/materie/fisica");
    await until("document.querySelector('textarea')?.value === 'Prova G2'");
    assert.equal(await evaluate("document.querySelector('textarea').value"), "Prova G2");
    await evaluate(`localStorage.setItem('semprini:students', JSON.stringify([
      {id:'g2-fisica',firstName:'Ada',lastName:'Test',subjects:['Fisica'],status:'active'},
      {id:'g2-archived',firstName:'Eva',lastName:'Hidden',subjects:['Fisica'],status:'archived'}
    ]))`);
    await navigate("/materie/chimica");
    await navigate("/materie/fisica");
    await until("!!document.querySelector('a[href=\"/studenti/g2-fisica\"]')");
    assert.equal(await evaluate("!!document.querySelector('a[href=\"/studenti/g2-archived\"]')"), false);
    await evaluate(`document.querySelector('a[href="/materie/fisica/argomento?id=default%3Afisica%3ACinematica"]').click()`);
    await until("location.pathname === '/materie/fisica/argomento'");
    for (const path of ["/materie", "/menu", "/oggi"]) {
      await navigate("/materie/fisica");
      await evaluate(`document.querySelector('main nav a[href=${JSON.stringify(path)}]').click()`);
      await until(`location.pathname === ${JSON.stringify(path)}`);
    }
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    async function fill(selector, value) {
      await evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); input.focus(); input.select(); })()`);
      await send("Input.insertText", { text: value });
    }
    async function clickButton(label, scope = "main") {
      await evaluate(`(() => { const button = [...document.querySelectorAll(${JSON.stringify(`${scope} button`)})]
        .find(node => node.textContent.trim() === ${JSON.stringify(label)}); if (!button) throw Error('Missing button: ${label}'); button.click(); })()`);
    }
    for (const slug of Object.keys(backgrounds)) {
      await navigate(`/materie/${slug}`);
      const added = `Nuovo argomento ${slug}`;
      const renamed = `Rinominato ${slug}`;
      await clickButton("+ AGGIUNGI");
      await fill("#nuovo-argomento", added);
      await clickButton("SALVA", "form");
      await until(`!![...document.querySelectorAll('a[href*="/argomento?id="]')].find(a => a.textContent.includes(${JSON.stringify(added)}))`);
      const idHref = await evaluate(`[...document.querySelectorAll('a[href*="/argomento?id="]')].find(a => a.textContent.includes(${JSON.stringify(added)})).getAttribute('href')`);
      await navigate(`/materie/${slug}`);
      assert.equal(await evaluate(`!!document.querySelector(${JSON.stringify(`a[href="${idHref}"]`)})`), true);

      await clickButton("+ AGGIUNGI");
      await fill("#nuovo-argomento", added.toLocaleUpperCase("it"));
      await clickButton("SALVA", "form");
      await until("document.querySelector('[role=alert]')?.textContent.includes('esiste già')");
      await clickButton("ANNULLA", "form");

      await evaluate(`document.querySelector(${JSON.stringify(`a[href="${idHref}"]`)}).closest('li').querySelector('button').click()`);
      await clickButton("MODIFICA");
      await fill("input[id^=nome-]", renamed);
      await clickButton("SALVA", "form");
      await until(`document.querySelector(${JSON.stringify(`a[href="${idHref}"]`)})?.textContent.includes(${JSON.stringify(renamed)})`);
      await navigate(`/materie/${slug}`);
      assert.equal(await evaluate(`document.querySelector(${JSON.stringify(`a[href="${idHref}"]`)})?.textContent.includes(${JSON.stringify(renamed)})`), true);
      await send("Page.navigate", { url: new URL(`/materie/${slug}/argomento?nome=${encodeURIComponent(added)}`, baseUrl).href });
      await until(`document.querySelector('h1')?.textContent === ${JSON.stringify(renamed)}`);
      await navigate(`/materie/${slug}`);

      await evaluate(`document.querySelector(${JSON.stringify(`a[href="${idHref}"]`)}).closest('li').querySelector('button').click()`);
      await clickButton("ELIMINA");
      await clickButton("CONFERMA ELIMINA");
      await until(`!document.querySelector(${JSON.stringify(`a[href="${idHref}"]`)})`);
      await navigate(`/materie/${slug}`);
      assert.equal(await evaluate(`!!document.querySelector(${JSON.stringify(`a[href="${idHref}"]`)})`), false);

      const defaults = await evaluate(`(() => [...document.querySelectorAll('a[href*="/argomento?id="]')]
        .slice(0,2).map(a => ({ href:a.getAttribute('href'), name:a.textContent.replace('→','').trim() })))()`);
      const noteKey = `semprini:materie:v1:${slug}:topic:${defaults[0].name}`;
      await evaluate(`localStorage.setItem(${JSON.stringify(noteKey)}, 'Nota conservata')`);
      await evaluate(`document.querySelector(${JSON.stringify(`a[href="${defaults[0].href}"]`)}).closest('li').querySelector('button').click()`);
      await clickButton("ELIMINA");
      await clickButton("CONFERMA ELIMINA");
      await until("document.querySelector('[role=alert]')?.textContent.includes('appunti')");
      await navigate(`/materie/${slug}`);
      await evaluate(`document.querySelector(${JSON.stringify(`a[href="${defaults[0].href}"]`)}).closest('li').querySelector('button').click()`);
      await clickButton("MODIFICA");
      await fill("input[id^=nome-]", `${defaults[0].name} aggiornato`);
      await clickButton("SALVA", "form");
      await until(`document.querySelector(${JSON.stringify(`a[href="${defaults[0].href}"]`)})?.textContent.includes('aggiornato')`);
      await send("Page.navigate", { url: new URL(defaults[0].href, baseUrl).href });
      await until("document.querySelector('#materia-appunti')?.value === 'Nota conservata'");
      await navigate(`/materie/${slug}`);
      await evaluate(`document.querySelector(${JSON.stringify(`a[href="${defaults[1].href}"]`)}).closest('li').querySelector('button').click()`);
      await clickButton("ELIMINA");
      await clickButton("CONFERMA ELIMINA");
      await until(`!document.querySelector(${JSON.stringify(`a[href="${defaults[1].href}"]`)})`);
      await navigate(`/materie/${slug}`);
      assert.equal(await evaluate(`!!document.querySelector(${JSON.stringify(`a[href="${defaults[1].href}"]`)})`), false);
    }
    await send("Page.navigate", { url: new URL("/materie/argomenti", baseUrl).href });
    await until("location.pathname === '/materie/argomenti' && document.querySelector('h2')?.textContent === 'Argomenti della materia'");
    await until("document.body.textContent.includes('Algebra aggiornato')");
    assert.equal(await evaluate("document.body.textContent.includes('Equazioni→')"), false);
    await send("Page.navigate", { url: new URL("/materie/elenco", baseUrl).href });
    await until("location.pathname === '/materie/elenco' && document.body.textContent.includes('6 argomenti')");
    await send("Page.navigate", { url: new URL("/materie/programmi", baseUrl).href });
    await until("location.pathname === '/materie/programmi' && document.body.textContent.includes('PROGRAMMI MODELLO')");
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
