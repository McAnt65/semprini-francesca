import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

const url = process.env.STUDENT_BROWSER_URL;
const chrome = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

test("G10L-B: isolated guided editing, preservation and mobile", { skip: !url || !existsSync(chrome) }, async () => {
  const profile = await mkdtemp(join(tmpdir(), "semprini-g10lb-"));
  const browser = spawn(chrome, ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--disable-extensions", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let socket;
  try {
    let port;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { port = Number((await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); break; }
      catch { if (browser.exitCode !== null) throw Error("Chrome closed before DevTools started"); await delay(100); }
    }
    assert.ok(port);
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(pages.find((item) => item.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let id = 0;
    const pending = new Map();
    const errors = [];
    socket.onmessage = ({ data }) => {
      const result = JSON.parse(data);
      if (result.method === "Runtime.exceptionThrown") errors.push(result.params.exceptionDetails.text);
      if (!pending.has(result.id)) return;
      const waiting = pending.get(result.id); pending.delete(result.id);
      if (result.error) waiting.reject(Error(result.error.message)); else waiting.resolve(result.result);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => { const commandId = ++id; pending.set(commandId, { resolve, reject }); socket.send(JSON.stringify({ id: commandId, method, params })); });
    async function evaluate(expression) {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true });
      if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    }
    async function until(expression) {
      for (let attempt = 0; attempt < 120; attempt++) { try { if (await evaluate(expression)) return; } catch { /* Navigation may replace the context. */ } await delay(150); }
      throw Error(`Timed out: ${expression}; body=${await evaluate("document.body.innerText.slice(0,500)")}`);
    }
    const button = (text) => `[...document.querySelectorAll('button')].find(x => x.textContent.trim() === ${JSON.stringify(text)})`;
    const click = (text) => evaluate(`${button(text)}.click()`);
    async function viewport(width, height) {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: true });
      await until(`innerWidth === ${width} && innerHeight === ${height}`);
      assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
      assert.equal(await evaluate("!!document.querySelector('a[href=\"/oggi\"]') && !!document.querySelector('a[href=\"/menu\"]')"), true);
      assert.equal(await evaluate("document.querySelector('#guided-answer')?.getBoundingClientRect().width > 220"), true);
      if (process.env.G10G_SCREENSHOTS) {
        const shot = await send("Page.captureScreenshot", { format: "png" });
        await writeFile(join(process.env.G10G_SCREENSHOTS, `g10lb-${width}x${height}.png`), Buffer.from(shot.data, "base64"));
      }
    }
    await send("Page.enable"); await send("Runtime.enable");
    await send("Page.navigate", { url: new URL("/studenti/nuovo", url).href });
    await until("!!document.querySelector('#guided-answer')");
    const records = [
      { id:"complete", firstName:"Ada",lastName:"Test",school:"Legacy school",subjects:["Fisica"],textbooks:{math:"Libro storico"}, phone:"3331111111",whatsapp:"3332222222", primaryParent:"Referente",familyContacts:[{id:"zia",firstName:"Anna",lastName:"Zia",phone:"3333333333",whatsapp:"3334444444",legacyAttribute:"keep"}], books:[{title:"Libro",publisher:"Editore",edition:"legacy"}],teachers:[{id:"prof",firstName:"P",lastName:"T",subject:"Fisica",email:"p@example.it",historicalRoom:"A1"}],lessonRateCents:2250,tariffId:"tariffa",customLegacy:"keep" },
      {id:"incomplete",firstName:"I",lastName:"Test",subjects:[],textbooks:{}},
      {id:"legacy",firstName:"L",lastName:"Test",school:"Antica",subjects:[],textbooks:{math:"Matematica"},primaryParent:"Mario",primaryParentWhatsapp:"3335555555"}
    ];
    await evaluate(`localStorage.setItem('semprini:students',${JSON.stringify(JSON.stringify(records))}); localStorage.setItem('semprini:student-guided-draft:v1','{"draft":"unrelated"}'); localStorage.setItem('semprini:calendar:appointments:v1','[{"id":"lesson","studentId":"complete"}]');localStorage.setItem('payment-fixture','complete')`);
    for (const record of records) {
      await send("Page.navigate", {url:new URL(`/studenti/nuovo?id=${record.id}`,url).href});
      await until(`${button("MODIFICA")} !== undefined`);
      const before=await evaluate(`localStorage.getItem('semprini:students')`);
      await click("MODIFICA"); await until("!!document.querySelector('#guided-answer')");
      await viewport(390,844); await viewport(430,764); await viewport(390,450); await viewport(390,844);
      await evaluate("document.querySelector('#guided-answer').select()");await send("Input.insertText",{text:"Discarded"});
      await click("ANNULLA"); await until(`${button("MODIFICA")} !== undefined`);
      assert.equal(await evaluate("localStorage.getItem('semprini:students')"),before);
      await click("MODIFICA"); await until("!!document.querySelector('#guided-answer')");
      await evaluate("document.querySelector('#guided-answer').select()");await send("Input.insertText",{text:"Updated"});await click("AVANTI");await click("SALVA");
      await until(`${button("MODIFICA")} !== undefined`);
      const saved=await evaluate(`JSON.parse(localStorage.getItem('semprini:students')).find(x=>x.id===${JSON.stringify(record.id)})`);
      const previous=JSON.parse(before).find(x=>x.id===record.id);
      assert.equal(saved.firstName,"Updated"); delete saved.updatedAt; delete previous.updatedAt;previous.firstName="Updated";function retained(actual, expected) { for(const [key,value] of Object.entries(expected)) { if(value && typeof value==='object') retained(actual[key],value); else assert.equal(actual[key],value,`preserve ${key}`); } } retained(saved,previous);
      await click("MODIFICA");await until("!!document.querySelector('#guided-answer')");
      if(record.id==='complete') {
        await evaluate(`[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='Modifica Email studente')?.click()`);
        await evaluate(`[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='Modifica Cellulare studente').click()`);
        await until("document.querySelector('#question-title').textContent.includes('Cellulare studente')");
        await evaluate("document.querySelector('#guided-answer').select()");await send("Input.insertText",{text:"999"});await click("SALTA DATO");await click("SALVA");await until(`${button("MODIFICA")} !== undefined`);
        assert.equal(await evaluate("JSON.parse(localStorage.getItem('semprini:students')).find(x=>x.id==='complete').phone"),'3331111111');
        await click("MODIFICA");await until("!!document.querySelector('#guided-answer')");await evaluate(`[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='Modifica Cellulare studente').click()`);await click("RIMUOVI DATO");await click("SALVA");await until(`${button("MODIFICA")} !== undefined`);
        assert.equal(await evaluate("JSON.parse(localStorage.getItem('semprini:students')).find(x=>x.id==='complete').phone"),'');
        assert.equal(await evaluate("JSON.parse(localStorage.getItem('semprini:students')).find(x=>x.id==='complete').whatsapp"),'3332222222');
      } else { await click("ANNULLA"); }
    }
    await send("Page.navigate",{url:new URL('/studenti/nuovo?id=incomplete',url).href});await until(`${button("MODIFICA")} !== undefined`);await click("MODIFICA");await until("!!document.querySelector('#guided-answer')");
    for(let i=0;i<70;i++) { if(await evaluate("document.querySelector('#question-title').textContent.includes('Aggiungere un libro')")) break; if(await evaluate(`${button("SALTA DATO")} !== undefined`)) await click("SALTA DATO"); else await click("AVANTI"); }
    await click("+ AGGIUNGI LIBRO");await until("document.querySelector('#question-title').textContent.includes('Titolo')");await evaluate("document.querySelector('#guided-answer').focus()");await send("Input.insertText",{text:"Nuovo libro"});await until("document.querySelector('#guided-answer').value === 'Nuovo libro'");await click("AVANTI");await click("SALVA");await until(`${button("MODIFICA")} !== undefined`);
    assert.equal(await evaluate("JSON.parse(localStorage.getItem('semprini:students')).find(x=>x.id==='incomplete').books[0].title"),'Nuovo libro');
    await click("MODIFICA");await until("!!document.querySelector('#guided-answer')");await click("Elimina libro Nuovo libro");await click("SALVA");await until(`${button("MODIFICA")} !== undefined`);assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('semprini:students')).find(x=>x.id==='incomplete').books"),[]);
    assert.equal(await evaluate("localStorage.getItem('semprini:student-guided-draft:v1')"),'{"draft":"unrelated"}');
    assert.equal(await evaluate("localStorage.getItem('payment-fixture')"),'complete');
    assert.match(await evaluate("localStorage.getItem('semprini:calendar:appointments:v1')"),/lesson/);
    await send("Page.navigate",{url:new URL('/studenti/nuovo?id=complete',url).href});await until(`${button("MODIFICA")} !== undefined`);await click("MODIFICA");await until("!!document.querySelector('#guided-answer')");
    const beforeBook=await evaluate("JSON.parse(localStorage.getItem('semprini:students')).find(x=>x.id==='complete')");
    await click("Elimina libro Libro");
    assert.match(await evaluate("document.querySelector('[role=status]').textContent"),/rimozione è sospesa/);
    assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('semprini:students')).find(x=>x.id==='complete').books"),beforeBook.books);
    await click("ANNULLA");
    const conflicting={...beforeBook,familyNotes:'Copia discordante TEST',updatedAt:'2099-01-01T00:00:00.000Z'};delete conflicting.sempriniStudentSnapshotVersion;
    const sessionRaw=JSON.stringify([conflicting]);
    await evaluate(`sessionStorage.setItem('semprini:students',${JSON.stringify(sessionRaw)})`);
    await send("Page.navigate",{url:new URL('/studenti/nuovo?id=complete',url).href});
    await until("document.body.innerText.includes('Due copie storiche')");
    assert.equal(await evaluate("!!document.querySelector('a[href=\"/impostazioni/salvataggio\"]')"),true);
    assert.equal(await evaluate(`${button("SALVA")} === undefined`),true);
    await send("Page.navigate",{url:new URL('/studenti/nuovo?id=incomplete',url).href});await until(`${button("MODIFICA")} !== undefined`);await click("MODIFICA");await until("!!document.querySelector('#guided-answer')");
    await evaluate("document.querySelector('#guided-answer').select()");await send("Input.insertText",{text:"Other"});await click("SALVA");await until(`${button("MODIFICA")} !== undefined`);
    assert.equal(await evaluate("JSON.parse(localStorage.getItem('semprini:students')).find(x=>x.id==='incomplete').firstName"),'Other');
    assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('semprini:students')).find(x=>x.id==='complete')"),beforeBook);
    assert.equal(await evaluate("sessionStorage.getItem('semprini:students')"),sessionRaw);
    await evaluate(`localStorage.setItem('semprini:calendar:appointments:v1',JSON.stringify([{id:'lesson',studentId:'complete',studentNameSnapshot:'Ada Test',subject:'Matematica',mode:'casa',status:'svolta',paymentStatus:'parziale',date:'2026-10-27',startTime:'10:00',source:'manuale',paidAmountCents:1000,lessonAmountCents:3000,paymentMovements:[{id:'TEST-pay',kind:'payment',amountCents:1000,paymentDate:'2026-10-27',recordedAt:'2026-10-27T10:00:00Z',operationId:'TEST-op'}]}]))`);
    await send("Page.navigate",{url:new URL('/impostazioni/salvataggio',url).href});await until("document.body.innerText.includes('SCARICA COPIA CIFRATA')");
    await evaluate("document.querySelectorAll('input[type=password]')[0].focus()");await send("Input.insertText",{text:"TEST-password-12345"});
    await evaluate("document.querySelectorAll('input[type=password]')[1].focus()");await send("Input.insertText",{text:"TEST-password-12345"});
    await click("SCARICA COPIA CIFRATA");await until("document.querySelector('p[role=status]')?.textContent.length > 0");
    assert.match(await evaluate("document.querySelector('p[role=status]').textContent"),/file cifrato conserva entrambe le copie discordanti/);
    await send("Page.navigate",{url:new URL('/studenti/nuovo?id=missing',url).href});await until("document.body.innerText.includes('Studente non trovato')");assert.equal(await evaluate(`${button("SALVA")} === undefined`),true);
    assert.deepEqual(errors,[]);
  } finally { socket?.close(); browser.kill(); await delay(700); await rm(profile,{recursive:true,force:true,maxRetries:5}); }
});
