import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.BACKUP_BROWSER_URL;
const chrome = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

test("isolated browser exports encrypted TEST archives and restores them with a legacy Blob", {
  skip: !baseUrl || !existsSync(chrome) || typeof WebSocket !== "function",
}, async () => {
  const profile = await mkdtemp(join(tmpdir(), "semprini-backup-test-"));
  const browser = spawn(chrome, ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run",
    "--disable-extensions", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"],
  { windowsHide: true, stdio: "ignore" });
  let socket;
  try {
    let port;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { port = Number((await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); break; }
      catch { if (browser.exitCode !== null) throw new Error("Chrome closed before DevTools started"); await delay(100); }
    }
    assert.ok(port);
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(pages.find((item) => item.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let id = 0;
    const pending = new Map();
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (!message.id || !pending.has(message.id)) return;
      const item = pending.get(message.id); pending.delete(message.id);
      if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const commandId = ++id; pending.set(commandId, { resolve, reject });
      socket.send(JSON.stringify({ id: commandId, method, params }));
    });
    async function evaluate(expression) {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    }
    async function until(expression) {
      for (let attempt = 0; attempt < 120; attempt++) {
        try { if (await evaluate(expression)) return; } catch { /* navigation */ }
        await delay(150);
      }
      throw new Error(`Timed out: ${expression}`);
    }
    async function input(index, value) {
      assert.equal(await evaluate(`(() => { const item=document.querySelectorAll('input[type=password]')[${index}];
        if (!item) return false; item.focus(); return true; })()`), true);
      await send("Input.insertText", { text: value });
      await until(`document.querySelectorAll('input[type=password]')[${index}]?.value === ${JSON.stringify(value)}`);
    }
    async function replaceInput(index, value) {
      assert.equal(await evaluate(`(() => {const item=document.querySelectorAll('input[type=password]')[${index}];
        if (!item) return false; const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
        setter.call(item,${JSON.stringify(value)}); item.dispatchEvent(new Event('input',{bubbles:true})); return true})()`), true);
      await until(`document.querySelectorAll('input[type=password]')[${index}]?.value === ${JSON.stringify(value)}`);
    }
    async function click(label) {
      assert.equal(await evaluate(`(() => {const button=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(label)});
        if (!button || button.disabled) return false; button.click(); return true})()`), true, label);
    }
    async function file() {
      for (let attempt = 0; attempt < 100; attempt++) {
        const names = (await readdir(profile)).filter((name) => name.endsWith(".frbackup"));
        if (names.length) return join(profile, names.sort().at(-1));
        await delay(100);
      }
      throw new Error("Download not found");
    }
    await send("Page.enable"); await send("Runtime.enable");
    await send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: profile });
    await send("Page.navigate", { url: new URL("/impostazioni", baseUrl).href });
    await until("!!document.querySelector('a[href=\"/impostazioni/salvataggio\"]')");
    await evaluate("document.querySelector('a[href=\"/impostazioni/salvataggio\"]').click()");
    await until("location.pathname === '/impostazioni/salvataggio'");
    await until("document.querySelector('h1')?.textContent === 'Salvataggio e ripristino'");
    await until("document.querySelectorAll('input[type=password]').length === 3 && !!document.querySelector('dl')");
    const source = await evaluate(`(async () => {
      const student={id:'TEST-student',firstName:'Prova',lastName:'Fittizia',status:'active',subjects:['Matematica'],
        avatarUrl:'student-photo:v1:TEST-student/original/one'};
      const lesson={id:'TEST-lesson',studentId:'TEST-student',studentNameSnapshot:'Prova Fittizia',subject:'Matematica',
        mode:'casa',status:'svolta',paymentStatus:'parziale',date:'2026-10-27',startTime:'10:00',source:'manuale',
        paidAmountCents:1000,lessonAmountCents:3000,paymentMovements:[{id:'TEST-pay',kind:'payment',amountCents:1000,
          paymentDate:'2026-10-27',recordedAt:'2026-10-27T10:00:00Z',operationId:'TEST-op'}]};
      localStorage.setItem('semprini:students',JSON.stringify([student]));
      localStorage.setItem('semprini:calendar:appointments:v1',JSON.stringify([lesson]));
      localStorage.setItem('semprini:materie:v1:matematica:topic:Algebra','Nota TEST');
      const request=indexedDB.open('semprini:student-photos',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('photos',{keyPath:'key'}).createIndex('studentId','studentId');
      const db=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
      await new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').add({
        key:'TEST-student/original/one',studentId:'TEST-student',kind:'original',createdAt:'2026-10-27T10:00:00Z',
        blob:new Blob(['TEST IMAGE'],{type:'image/png'})});tx.oncomplete=resolve;tx.onerror=reject});db.close();
      return JSON.stringify({students:localStorage.getItem('semprini:students'),
        lessons:localStorage.getItem('semprini:calendar:appointments:v1'),
        notes:localStorage.getItem('semprini:materie:v1:matematica:topic:Algebra')});
    })()`);
    await input(0, "password-fittizia-lunga"); await input(1, "password-fittizia-lunga");
    await click("SCARICA COPIA CIFRATA");
    try { await until("document.body.textContent.includes('Download avviato')"); }
    catch (error) { throw new Error(`${error.message}; status=${await evaluate("document.querySelector('[role=status]')?.textContent")}`); }
    const exported = await file();
    const encrypted = await readFile(exported, "utf8");
    assert.equal(encrypted.includes("Prova Fittizia"), false);
    assert.equal(await evaluate(`JSON.stringify({students:localStorage.getItem('semprini:students'),
      lessons:localStorage.getItem('semprini:calendar:appointments:v1'),
      notes:localStorage.getItem('semprini:materie:v1:matematica:topic:Algebra')})`), source);
    assert.equal(await evaluate(`document.body.textContent.includes('Fotografie legacy conservate') &&
      [...document.querySelectorAll('dd')].some(x=>x.textContent==='1')`), true);
    const { root } = await send("DOM.getDocument");
    const { nodeId } = await send("DOM.querySelector", { nodeId: root.nodeId, selector: "input[type=file]" });
    await send("DOM.setFileInputFiles", { nodeId, files: [exported] });
    await input(2, "wrong-password"); await click("VERIFICA E MOSTRA IL CONTENUTO");
    try { await until("document.body.textContent.includes('Password errata')"); }
    catch (error) { throw new Error(`${error.message}; status=${await evaluate("document.querySelector('[role=status]')?.textContent")}`); }
    await replaceInput(2, "password-fittizia-lunga"); await click("VERIFICA E MOSTRA IL CONTENUTO");
    try { await until("document.body.textContent.includes('File verificato')"); }
    catch (error) { throw new Error(`${error.message}; status=${await evaluate("document.querySelector('[role=status]')?.textContent")}`); }
    assert.equal(await evaluate("document.body.textContent.includes('Fotografie legacy conservate')"), true);
    // Only this isolated TEST profile is cleared to exercise restore onto an empty origin.
    await evaluate(`(() => {for(const key of ['semprini:students','semprini:calendar:appointments:v1',
      'semprini:materie:v1:matematica:topic:Algebra']) localStorage.removeItem(key)})()`);
    await input(0, "seconda-password-fittizia"); await input(1, "seconda-password-fittizia");
    await click("SCARICA COPIA CIFRATA");
    await until("document.body.textContent.includes('Download avviato')");
    assert.equal(await evaluate(`(() => {document.querySelectorAll('input[type=checkbox]').forEach(x=>x.click());
      window.confirm=()=>false;return [...document.querySelectorAll('input[type=checkbox]')].every(x=>x.checked)})()`), true);
    await click("RIPRISTINA GLI ARCHIVI");
    await until("document.body.textContent.includes('Ripristino annullato')");
    assert.equal(await evaluate("localStorage.getItem('semprini:students')"), null);
    await evaluate("window.confirm=()=>true");
    await click("RIPRISTINA GLI ARCHIVI");
    await until("document.body.textContent.includes('Ripristino completato')");
    assert.equal(await evaluate(`JSON.stringify({students:localStorage.getItem('semprini:students'),
      lessons:localStorage.getItem('semprini:calendar:appointments:v1'),
      notes:localStorage.getItem('semprini:materie:v1:matematica:topic:Algebra')})`), source);
    assert.equal(await evaluate(`(async()=>{const request=indexedDB.open('semprini:student-photos');
      const db=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
      const record=await new Promise((resolve,reject)=>{const tx=db.transaction('photos','readonly');
        const get=tx.objectStore('photos').get('TEST-student/original/one');tx.oncomplete=()=>resolve(get.result);tx.onerror=reject});
      db.close();return await record.blob.text()})()`), "TEST IMAGE");
  } finally {
    socket?.close(); browser.kill();
    for (let attempt = 0; attempt < 20; attempt++) {
      try { await rm(profile, { recursive: true, force: true }); break; }
      catch { await delay(200); }
    }
  }
});
