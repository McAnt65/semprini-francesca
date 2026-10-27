import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.STUDENT_BROWSER_URL;
const chrome = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

test("current student sheet saves, reloads and archives without reading a legacy photo", {
  skip: !baseUrl || !existsSync(chrome) || typeof WebSocket !== "function",
}, async () => {
  const profile = await mkdtemp(join(tmpdir(), "semprini-student-profile-"));
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
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
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
    async function navigate(path) {
      await send("Page.navigate", { url: new URL(path, baseUrl).href });
      await until(`location.pathname === ${JSON.stringify(path.split("?")[0])} && !!document.querySelector('main')`);
    }
    async function editEmail(value) {
      assert.equal(await evaluate(`(() => { const input=document.querySelector('input[aria-label="Indirizzo email"]');
        if (!input) return false; input.focus(); input.select(); return true; })()`), true);
      await send("Input.insertText", { text: value });
      await until(`document.querySelector('input[aria-label="Indirizzo email"]')?.value === ${JSON.stringify(value)}`);
    }
    const reference = "student-photo:v1:test-browser:blob-not-present";
    await send("Page.enable");
    await send("Runtime.enable");
    await navigate("/studenti");
    await evaluate(`localStorage.setItem('semprini:students', JSON.stringify([{id:'test-browser',status:'active',enrollmentDate:'2026-10-27',firstName:'Fittizia',lastName:'Prova',birthDate:'2010-01-01',school:'Scuola TEST',gradeClass:'2',phone:'000',whatsapp:'000',email:'before@example.invalid',address:'',city:'',subjects:['Matematica'],textbooks:{},avatarUrl:${JSON.stringify(reference)}}]))`);
    await navigate("/studenti/nuovo?id=test-browser");
    await until(`!!document.querySelector('button[aria-label="Modifica i dati dello studente"]')`);
    assert.equal(await evaluate(`document.querySelector('input[type="file"]') === null`), true);
    await evaluate(`document.querySelector('button[aria-label="Modifica i dati dello studente"]').click()`);
    await editEmail("after@example.invalid");
    assert.equal(await evaluate(`(() => { const button=[...document.querySelectorAll('button')].find(x => x.textContent.trim()==='SALVA');
      if (!button || button.disabled) return false; button.click(); return true; })()`), true);
    await until(`document.querySelector('[role="status"]')?.textContent.includes('Studente custodito nel registro')`);
    const saved = await evaluate(`JSON.parse(localStorage.getItem('semprini:students'))[0]`);
    assert.equal(saved.email, "after@example.invalid");
    assert.equal(saved.avatarUrl, reference);
    await evaluate(`document.querySelector('button[aria-label="Modifica i dati dello studente"]').click()`);
    await editEmail("temporary@example.invalid");
    await evaluate(`(() => { window.__originalSetItem=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value) { if (key==='semprini:students' && this===localStorage) throw Error('TEST quota');
        return window.__originalSetItem.call(this,key,value); }; })()`);
    await evaluate(`[...document.querySelectorAll('button')].find(x => x.textContent.trim()==='SALVA').click()`);
    await until(`[...document.querySelectorAll('[role="status"]')].some(x => x.textContent.includes('soltanto in questa sessione'))`);
    assert.equal(await evaluate(`JSON.parse(sessionStorage.getItem('semprini:students'))[0].avatarUrl`), reference);
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem('semprini:students'))[0].email`), "after@example.invalid");
    await editEmail("failed@example.invalid");
    await evaluate(`Storage.prototype.setItem=function(key,value) { if (key==='semprini:students') throw Error('TEST quota');
      return window.__originalSetItem.call(this,key,value); }`);
    await evaluate(`[...document.querySelectorAll('button')].find(x => x.textContent.trim()==='SALVA').click()`);
    await until(`[...document.querySelectorAll('[role="status"]')].some(x => x.textContent.includes('Salvataggio non riuscito'))`);
    assert.equal(await evaluate(`JSON.parse(sessionStorage.getItem('semprini:students'))[0].email`), "temporary@example.invalid");
    await evaluate(`Storage.prototype.setItem=window.__originalSetItem`);
    await navigate("/studenti/nuovo?id=test-browser");
    await until(`!!document.querySelector('button[aria-label="Modifica i dati dello studente"]')`);
    assert.equal(await evaluate(`document.body.textContent.includes('temporary@example.invalid')`), true);
    await navigate("/studenti/test-browser");
    await until(`!![...document.querySelectorAll('button')].find(x => x.textContent.trim()==='ARCHIVIA STUDENTE')`);
    await evaluate(`window.confirm=() => true`);
    await evaluate(`[...document.querySelectorAll('button')].find(x => x.textContent.trim()==='ARCHIVIA STUDENTE').click()`);
    await until(`JSON.parse(localStorage.getItem('semprini:students'))[0].status === 'archived'`);
    const archived = await evaluate(`JSON.parse(localStorage.getItem('semprini:students'))[0]`);
    assert.equal(archived.avatarUrl, reference);
    assert.equal(archived.email, "temporary@example.invalid");
    const draftReference = "student-photo:v1:test-draft:missing-blob";
    await evaluate(`localStorage.setItem('semprini:new-student:personal-data', JSON.stringify({firstName:'Bozza',lastName:'Legacy',photo:${JSON.stringify(draftReference)}}))`);
    await navigate("/studenti/nuovo/diario");
    await until(`JSON.parse(localStorage.getItem('semprini:students')).some(x => x.firstName==='Bozza' && x.lastName==='Legacy')`);
    const draftStudent = await evaluate(`JSON.parse(localStorage.getItem('semprini:students')).find(x => x.firstName==='Bozza')`);
    assert.equal(draftStudent.avatarUrl, draftReference);
    await until(`location.pathname === '/studenti/' + ${JSON.stringify(draftStudent.id)}`);
    assert.equal(await evaluate(`localStorage.getItem('semprini:new-student:personal-data')`), null);
  } finally {
    socket?.close();
    browser.kill();
    if (browser.exitCode === null && browser.signalCode === null) await new Promise((resolve) => browser.once("exit", resolve));
    assert.ok(profile.startsWith(tmpdir() + sep));
    await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});
