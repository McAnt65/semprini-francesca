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

test("G10G: guided entry, draft and saved edit on both Android viewports", { skip: !url || !existsSync(chrome) }, async () => {
  const profile = await mkdtemp(join(tmpdir(), "semprini-g10g-"));
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
        await writeFile(join(process.env.G10G_SCREENSHOTS, `g10g-${width}x${height}.png`), Buffer.from(shot.data, "base64"));
      }
    }
    await send("Page.enable"); await send("Runtime.enable");
    await send("Page.navigate", { url: new URL("/studenti/nuovo", url).href });
    await until("!!document.querySelector('#guided-answer')");
    await viewport(390, 844);
    await viewport(390, 450);
    await until("Math.round(document.querySelector('main').getBoundingClientRect().height) === 450");
    const shortViewport = await evaluate("(() => { const main = document.querySelector('main'); const work = main.querySelector('[class*=workArea]'); return { mainHeight: main.clientHeight, mainScroll: main.scrollHeight, workHeight: work?.clientHeight, workScroll: work?.scrollHeight, innerHeight }; })()");
    assert.equal(shortViewport.mainScroll > shortViewport.mainHeight, true, `short viewport remains scrollable: ${JSON.stringify(shortViewport)}`);
    await viewport(390, 844);
    assert.equal(await evaluate(`${button("SALVA")}.disabled`), true);
    await evaluate("document.querySelector('#guided-answer').focus()");
    await send("Input.insertText", { text: "G10G" });
    await click("AVANTI");
    await until("document.querySelector('#question-title')?.textContent.includes('Cognome')");
    await evaluate("document.querySelector('#guided-answer').focus()");
    await send("Input.insertText", { text: "Prova" });
    await click("AVANTI");
    await until("document.querySelector('#question-title')?.textContent.includes('Data di nascita')");
    assert.equal(await evaluate(`${button("SALVA")}.disabled`), false);
    await click("SALTA DATO");
    await until("document.querySelector('#question-title')?.textContent.includes('Anno scolastico')");
    assert.equal(await evaluate("document.body.innerText.includes('G10G') && document.body.innerText.includes('Prova')"), true);
    assert.equal(await evaluate("JSON.parse(localStorage.getItem('semprini:student-guided-draft:v1')).version"), 1);
    await evaluate(`(() => { const key='semprini:student-guided-draft:v1'; const draft=JSON.parse(localStorage.getItem(key));
      draft.student.familyContacts=[{id:'legacy-contact',firstName:'',lastName:'',whatsapp:'3330001111',legacyAttribute:'keep'},
        {id:'legacy-relation',firstName:'',lastName:'',relationship:'nonno'}];
      draft.student.teachers=[{id:'legacy-teacher',firstName:'',lastName:'',subject:'',email:'teacher@example.invalid'}];
      draft.student.books=[{title:'',publisher:'',edition:'legacy'}];localStorage.setItem(key,JSON.stringify(draft));})()`);
    await send("Page.reload", { ignoreCache: true });
    await until("document.body.innerText.includes('Una bozza ti aspetta')");
    await click("RIPRENDI");
    await until("document.querySelector('#question-title')?.textContent.includes('Anno scolastico')");
    await viewport(430, 764);
    await click("SALVA");
    await until("location.search.includes('id=') && document.body.innerText.includes('Studente custodito nel registro')");
    assert.equal(await evaluate("localStorage.getItem('semprini:student-guided-draft:v1')"), null);
    assert.deepEqual(await evaluate(`(() => { const student=JSON.parse(localStorage.getItem('semprini:students'))[0];
      return [student.familyContacts[0].legacyAttribute,student.familyContacts[0].whatsapp,
        student.familyContacts[1].relationship,
        student.teachers[0].email,student.books[0].edition];})()`), ["keep","3330001111","nonno","teacher@example.invalid","legacy"]);
    assert.equal(await evaluate("!![...document.querySelectorAll('button')].find(x => x.textContent.trim()==='MODIFICA')"), true);
    await send("Page.navigate", { url: new URL("/studenti/nuovo", url).href });
    await until("document.querySelector('#question-title')?.textContent.includes('Nome dello studente')");
    async function type(text) { await evaluate("document.querySelector('#guided-answer').focus()"); await send("Input.insertText", { text }); }
    async function select(value) { await evaluate(`(() => { const element = document.querySelector('#guided-answer'); element.value = ${JSON.stringify(value)}; element.dispatchEvent(new Event('change', { bubbles: true })); })()`); }
    async function advanceTo(label) {
      for (let attempt = 0; attempt < 100; attempt++) {
        if (await evaluate(`document.querySelector('#question-title')?.textContent.includes(${JSON.stringify(label)})`)) return;
        await click("SALTA DATO");
      }
      throw Error(`Step not found: ${label}`);
    }
    await type("Completa"); await click("AVANTI");
    await type("Verifica"); await click("AVANTI");
    await advanceTo("Cellulare studente");
    await type("3331234567"); await click("AVANTI");
    await select("yes"); await click("AVANTI");
    await advanceTo("Aggiungere un altro contatto");
    await click("+ AGGIUNGI CONTATTO");
    await until("document.querySelector('#question-title')?.textContent.includes('Nome')");
    await type("Anna"); await click("AVANTI");
    await advanceTo("Cellulare"); await type("3337654321"); await click("AVANTI");
    await advanceTo("Aggiungere un libro");
    await click("+ AGGIUNGI LIBRO");
    await type("Algebra"); await click("AVANTI");
    await type("Editore Prova"); await click("AVANTI");
    await advanceTo("Aggiungere un professore");
    await click("+ AGGIUNGI PROFESSORE");
    await type("Matematica"); await click("AVANTI");
    await type("Luca"); await click("AVANTI");
    await advanceTo("Modalità abituale");
    await select("online"); await click("AVANTI");
    await select("90"); await click("AVANTI");
    await click("SALVA");
    await until("location.search.includes('id=') && document.body.innerText.includes('Studente custodito nel registro')");
    const records = await evaluate("JSON.parse(localStorage.getItem('semprini:students'))");
    const complete = records.find((item) => item.firstName === "Completa");
    assert.ok(complete);
    assert.equal(complete.whatsapp, "3331234567");
    assert.equal(complete.familyContacts.some((item) => item.firstName === "Anna" && item.phone === "3337654321"), true);
    assert.deepEqual(complete.books, [{ title: "Algebra", publisher: "Editore Prova" }]);
    assert.equal(complete.teachers.some((item) => item.subject === "Matematica" && item.firstName === "Luca"), true);
    assert.equal(complete.lessonMode, "online");
    assert.equal(complete.lessonDurationMinutes, 90);
    assert.deepEqual(errors, []);
  } finally {
    socket?.close(); browser.kill(); await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});
