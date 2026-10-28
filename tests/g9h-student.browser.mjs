import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.STUDENT_BROWSER_URL;
const chrome = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

test("G9H: a real new-student page enables save for valid required fields", {
  skip: !baseUrl || !existsSync(chrome) || typeof WebSocket !== "function",
}, async () => {
  const profile = await mkdtemp(join(tmpdir(), "semprini-g9h-test-"));
  const browser = spawn(chrome, ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--disable-extensions",
    "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let socket;
  try {
    let port;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { port = Number((await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); break; }
      catch { if (browser.exitCode !== null) throw new Error("Chrome closed before DevTools started"); await delay(100); }
    }
    assert.ok(port, "Chrome DevTools port");
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(pages.find((item) => item.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let id = 0;
    const pending = new Map();
    const runtimeErrors = [];
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.method === "Runtime.exceptionThrown") runtimeErrors.push(message.params.exceptionDetails.text);
      if (!message.id || !pending.has(message.id)) return;
      const item = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const commandId = ++id;
      pending.set(commandId, { resolve, reject });
      socket.send(JSON.stringify({ id: commandId, method, params }));
    });
    async function evaluate(expression) {
      const response = await send("Runtime.evaluate", { expression, returnByValue: true });
      if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
      return response.result.value;
    }
    async function until(expression) {
      for (let attempt = 0; attempt < 120; attempt++) {
        try { if (await evaluate(expression)) return; } catch { /* Navigation replaces the context. */ }
        await delay(150);
      }
      throw new Error(`Timed out: ${expression}`);
    }
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.navigate", { url: new URL("/studenti/nuovo", baseUrl).href });
    await until(`!!document.querySelector('input[aria-label="Nome dello studente"]')`);
    await until(`document.querySelector('section[aria-labelledby="nuovo-allievo"]')?.textContent.includes('2026')`);
    assert.equal(await evaluate(`document.querySelector('input[type="file"]') === null`), true);
    const save = `[...document.querySelectorAll('button')].find(x => x.textContent.trim()==='SALVA')`;
    assert.equal(await evaluate(`${save}.disabled`), false);
    await evaluate(`${save}.click()`);
    await until(`document.querySelector('[role="status"]')?.textContent.includes('Nome e cognome sono obbligatori')`);
    assert.equal(await evaluate(`document.querySelector('input[aria-label="Nome dello studente"]').getAttribute('aria-invalid')`), "true");
    await evaluate(`document.querySelector('input[aria-label="Nome dello studente"]').focus()`);
    await send("Input.insertText", { text: "G9H Test" });
    await until(`document.querySelector('input[aria-label="Nome dello studente"]').value === 'G9H Test'`);
    await evaluate(`[...document.querySelectorAll('button')].find(x => x.textContent.trim()==='AVANTI').click()`);
    await until(`!!document.querySelector('input[aria-label="Cognome dello studente"]')`);
    await evaluate(`document.querySelector('input[aria-label="Cognome dello studente"]').focus()`);
    await send("Input.insertText", { text: "Fittizio" });
    await until(`document.querySelector('input[aria-label="Cognome dello studente"]').value === 'Fittizio'`);
    assert.equal(await evaluate(`${save}.disabled`), false, "SALVA must be reachable after name and surname");
    await evaluate(`${save}.click()`);
    await until(`document.querySelector('[role="status"]')?.textContent.includes('Studente custodito nel registro')`);
    const created = await evaluate(`JSON.parse(localStorage.getItem('semprini:students')).find(x => x.firstName === 'G9H Test')`);
    assert.equal(created.lastName, "Fittizio");
    assert.equal(created.birthDate, "");
    const lessonArchive = JSON.stringify([{ id: "g9h-lesson", studentId: created.id, date: "2026-11-02",
      subject: "Matematica", amountCents: 2500, paymentStatus: "parziale", paidAmountCents: 1000 }]);
    await evaluate(`localStorage.setItem('semprini:calendar:appointments:v1', ${JSON.stringify(lessonArchive)})`);
    await evaluate(`localStorage.setItem('semprini:students', JSON.stringify([
      ...JSON.parse(localStorage.getItem('semprini:students')),
      {...${JSON.stringify(created)}, id:'g9h-other', firstName:'Altra', lastName:'Fittizia'}]))`);
    await send("Page.reload", { ignoreCache: true });
    await until(`!!document.querySelector('input[aria-label="Nome dello studente"]')`);
    await until(`document.querySelector('section[aria-labelledby="nuovo-allievo"]')?.textContent.includes('2026')`);
    // The new record is available after a full reload through its editor URL.
    await send("Page.navigate", { url: new URL(`/studenti/nuovo?id=${encodeURIComponent(created.id)}`, baseUrl).href });
    await until(`!!document.querySelector('button[aria-label="Modifica i dati dello studente"]')`);
    await evaluate(`document.querySelector('button[aria-label="Modifica i dati dello studente"]').click()`);
    await until(`!!document.querySelector('input[aria-label="Indirizzo email"]')`);
    await evaluate(`document.querySelector('input[aria-label="Indirizzo email"]').focus()`);
    await send("Input.insertText", { text: "g9h@example.invalid" });
    await until(`document.querySelector('input[aria-label="Indirizzo email"]').value === 'g9h@example.invalid'`);
    await evaluate(`${save}.click()`);
    await until(`document.querySelector('[role="status"]')?.textContent.includes('Studente custodito nel registro')`);
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem('semprini:students')).find(x => x.id === ${JSON.stringify(created.id)}).email`), "g9h@example.invalid");
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem('semprini:students')).find(x => x.id === 'g9h-other').firstName`), "Altra");
    assert.equal(await evaluate(`localStorage.getItem('semprini:calendar:appointments:v1')`), lessonArchive,
      "linked lesson and payment values remain byte-for-byte intact");
    await send("Page.reload", { ignoreCache: true });
    await until(`document.body.textContent.includes('g9h@example.invalid')`);
    await evaluate(`document.querySelector('button[aria-label="Modifica i dati dello studente"]').click()`);
    await until(`!!document.querySelector('input[aria-label="Indirizzo email"]')`);
    await evaluate(`document.querySelector('input[aria-label="Indirizzo email"]').select()`);
    await send("Input.insertText", { text: "temporary@example.invalid" });
    await evaluate(`(() => { window.__g9hSetItem=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value) { if (key==='semprini:students' && this===localStorage) throw Error('TEST quota');
        return window.__g9hSetItem.call(this,key,value); }; })()`);
    await evaluate(`${save}.click()`);
    await until(`document.querySelector('[role="status"]')?.textContent.includes('soltanto in questa sessione')`);
    assert.equal(await evaluate(`JSON.parse(sessionStorage.getItem('semprini:students')).find(x => x.id === ${JSON.stringify(created.id)}).email`), "temporary@example.invalid");
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem('semprini:students')).find(x => x.id === ${JSON.stringify(created.id)}).email`), "g9h@example.invalid");
    await evaluate(`document.querySelector('input[aria-label="Indirizzo email"]').select()`);
    await send("Input.insertText", { text: "failed@example.invalid" });
    await evaluate(`Storage.prototype.setItem=function(key,value) { if (key==='semprini:students') throw Error('TEST quota');
      return window.__g9hSetItem.call(this,key,value); }`);
    await evaluate(`${save}.click()`);
    await until(`document.querySelector('[role="status"]')?.textContent.includes('Salvataggio non riuscito')`);
    assert.equal(await evaluate(`document.querySelector('input[aria-label="Indirizzo email"]').value`), "failed@example.invalid");
    assert.equal(await evaluate(`JSON.parse(sessionStorage.getItem('semprini:students')).find(x => x.id === ${JSON.stringify(created.id)}).email`), "temporary@example.invalid");
    await evaluate(`Storage.prototype.setItem=window.__g9hSetItem`);

    for (const [width, height] of [[390, 844], [430, 764]]) {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: true });
      await until(`Math.round(window.innerWidth) === ${width} && Math.round(window.innerHeight) === ${height}`);
      if (process.env.G9H_SCREENSHOTS) {
        await mkdir(process.env.G9H_SCREENSHOTS, { recursive: true });
        const image = await send("Page.captureScreenshot", { format: "png" });
        await writeFile(join(process.env.G9H_SCREENSHOTS, `g9h-${width}x${height}.png`), Buffer.from(image.data, "base64"));
      }
      await send("Emulation.setDeviceMetricsOverride", { width, height: 450, deviceScaleFactor: 1, mobile: true });
      await until(`Math.round(window.visualViewport.height) === 450`);
      await until(`document.querySelector('main').style.getPropertyValue('--student-visible-height') === '450px'`);
      await evaluate(`document.querySelector('textarea[aria-label="Obiettivi didattici"]').focus()`);
      await until(`(() => { const r=document.querySelector('textarea[aria-label="Obiettivi didattici"]').getBoundingClientRect();
        return r.top >= 0 && r.bottom <= window.visualViewport.height; })()`);
      if (process.env.G9H_SCREENSHOTS) {
        const image = await send("Page.captureScreenshot", { format: "png" });
        await writeFile(join(process.env.G9H_SCREENSHOTS, `g9h-${width}x450-keyboard.png`), Buffer.from(image.data, "base64"));
      }
      assert.equal(await evaluate(`document.documentElement.scrollWidth <= window.innerWidth`), true, `no horizontal scroll at ${width}px`);
      await evaluate(`${save}.scrollIntoView({block:'center'})`);
      await until(`(() => { const r=${save}.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.visualViewport.height; })()`);
      assert.equal(await evaluate(`document.querySelector('main').scrollHeight > document.querySelector('main').clientHeight`), true,
        `page scrolls with simulated keyboard at ${width}px`);
    }
    assert.deepEqual(runtimeErrors, [], "student editor has no uncaught browser JavaScript errors");
  } finally {
    socket?.close();
    browser.kill();
    if (browser.exitCode === null && browser.signalCode === null) await new Promise((resolve) => browser.once("exit", resolve));
    assert.ok(profile.startsWith(tmpdir() + sep));
    await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});
