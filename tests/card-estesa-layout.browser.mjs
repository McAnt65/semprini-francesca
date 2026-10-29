import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.STUDENT_BROWSER_URL;
const chrome = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

test("Card Estesa stays usable at both Android viewports", { skip: !baseUrl || !existsSync(chrome) }, async () => {
  const profile = await mkdtemp(join(tmpdir(), "semprini-card-estesa-"));
  const browser = spawn(chrome, ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run",
    "--disable-extensions", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"],
  { windowsHide: true, stdio: "ignore" });
  let socket;
  try {
    let port;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { port = Number((await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); break; }
      catch { if (browser.exitCode !== null) throw Error("Chrome si è chiuso prima di DevTools"); await delay(100); }
    }
    assert.ok(port);
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(pages.find((item) => item.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let id = 0;
    const pending = new Map();
    socket.onmessage = ({ data }) => {
      const result = JSON.parse(data);
      const waiting = pending.get(result.id);
      if (!waiting) return;
      pending.delete(result.id);
      if (result.error) waiting.reject(Error(result.error.message)); else waiting.resolve(result.result);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const commandId = ++id;
      pending.set(commandId, { resolve, reject });
      socket.send(JSON.stringify({ id: commandId, method, params }));
    });
    async function evaluate(expression) {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true });
      if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    }
    async function until(expression) {
      for (let attempt = 0; attempt < 120; attempt++) {
        try { if (await evaluate(expression)) return; } catch { /* Navigazione in corso. */ }
        await delay(150);
      }
      throw Error(`Attesa scaduta: ${expression}`);
    }
    await send("Page.enable"); await send("Runtime.enable");
    const url = new URL("/studenti/card-estesa-TEST/estesa", baseUrl).href;
    await send("Page.navigate", { url });
    await until("document.querySelector('main') !== null");
    const record = { id: "card-estesa-TEST", firstName: "Ada", lastName: "TEST", subjects: ["Fisica"],
      textbooks: {}, familyContacts: [{ id: "madre-TEST", firstName: "Maria", lastName: "TEST", phone: "000000" }],
      personalNotes: "Nota esclusivamente TEST. ".repeat(18), learningGoals: "Obiettivo TEST. ".repeat(12) };
    const raw = JSON.stringify([record]);
    await evaluate(`localStorage.setItem('semprini:students', ${JSON.stringify(raw)})`);
    await send("Page.reload", { ignoreCache: true });
    await until("document.querySelector('[aria-label^=\"Fascicolo di\"]') !== null && document.querySelector('button[aria-controls=\"context-help\"]') !== null");
    const helpLayouts = [];
    for (const [width, height] of [[390, 844], [430, 764]]) {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: true });
      await until(`innerWidth === ${width} && innerHeight === ${height}`);
      await evaluate("document.querySelector('[aria-label^=\"Fascicolo di\"]').scrollTop = 0");
      const geometry = await evaluate(`(() => {
        const sheet = document.querySelector('main > div').getBoundingClientRect();
        const help = document.querySelector('button[aria-controls="context-help"]').getBoundingClientRect();
        const nav = [...document.querySelectorAll('nav[aria-label="Navigazione principale"] a')].map(x => ({ href: x.getAttribute('href'), box: x.getBoundingClientRect().toJSON() }));
        const scroll = document.querySelector('[aria-label^="Fascicolo di"]');
        const box = scroll.getBoundingClientRect();
        return { sheet: sheet.toJSON(), help: help.toJSON(), nav, scroll: box.toJSON(),
          scrollHeight: scroll.scrollHeight, clientHeight: scroll.clientHeight,
          horizontal: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth || scroll.scrollWidth > scroll.clientWidth };
      })()`);
      if (process.env.CARD_ESTESA_SHOTS) {
        const shot = await send("Page.captureScreenshot", { format: "png" });
        await writeFile(join(process.env.CARD_ESTESA_SHOTS, `card-estesa-${width}x${height}.png`), Buffer.from(shot.data, "base64"));
      }
      assert.equal(geometry.horizontal, false);
      assert.deepEqual(geometry.nav.map((item) => item.href), ["/oggi", "/menu"]);
      assert(geometry.nav.every((item) => item.box.width >= 44 && item.box.height >= 44));
      helpLayouts.push({ width, clear: geometry.help.left >= geometry.sheet.left + geometry.sheet.width * .72,
        inViewport: geometry.help.right <= width - 4 });
      assert(geometry.scrollHeight > geometry.clientHeight, "Il fascicolo deve poter scorrere");
      await evaluate("document.querySelector('[aria-label^=\"Fascicolo di\"]').scrollTop = 100000");
      assert.equal(await evaluate("document.querySelector('[aria-label^=\"Fascicolo di\"]').scrollTop > 0"), true);
      assert.equal(await evaluate("document.querySelector('[aria-label^=\"Fascicolo di\"]').innerText.includes('Nota esclusivamente TEST')"), true);
      const bottom = await evaluate(`(() => {
        const scroll = document.querySelector('[aria-label^="Fascicolo di"]');
        const last = scroll.lastElementChild.querySelector('h3').getBoundingClientRect();
        const box = scroll.getBoundingClientRect();
        return { lastTop: last.top, lastBottom: last.bottom, boxTop: box.top, boxBottom: box.bottom,
          scrollTop: scroll.scrollTop, maxScroll: scroll.scrollHeight - scroll.clientHeight };
      })()`);
      assert(bottom.lastTop >= bottom.boxTop && bottom.lastBottom <= bottom.boxBottom,
        `L'ultima sezione deve essere raggiungibile: ${JSON.stringify(bottom)}`);
    }
    assert(helpLayouts.every((item) => item.clear && item.inViewport),
      `AIUTO copre il titolo illustrato: ${JSON.stringify(helpLayouts)}`);
    await evaluate("document.querySelector('button[aria-controls=\"context-help\"]').click()");
    await until("document.querySelector('aside#context-help') !== null");
    await evaluate("document.querySelector('button[aria-label=\"Chiudi aiuto\"]').click()");
    await until("document.querySelector('aside#context-help') === null");
    assert.equal(await evaluate("localStorage.getItem('semprini:students')"), raw);
    if (process.env.CARD_ESTESA_SHOTS) {
      await send("Page.navigate", { url: new URL("/studenti/card-estesa-TEST", baseUrl).href });
      await until("document.querySelector('nav[aria-label=\"Navigazione Card Studente\"]') !== null");
      for (const [width, height] of [[390, 844], [430, 764]]) {
        await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: true });
        await until(`innerWidth === ${width} && innerHeight === ${height}`);
        const shot = await send("Page.captureScreenshot", { format: "png" });
        await writeFile(join(process.env.CARD_ESTESA_SHOTS, `card-studente-${width}x${height}.png`), Buffer.from(shot.data, "base64"));
      }
    }
  } finally {
    socket?.close(); browser.kill(); await delay(700);
    await rm(profile, { recursive: true, force: true, maxRetries: 5 });
  }
});
