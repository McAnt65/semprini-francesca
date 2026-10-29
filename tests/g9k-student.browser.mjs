import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.STUDENT_BROWSER_URL;
const chrome = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

test("G9K: sparse and complete student narratives read cleanly on Android viewports", {
  skip: !baseUrl || !existsSync(chrome) || typeof WebSocket !== "function",
}, async () => {
  const profile = await mkdtemp(join(tmpdir(), "semprini-g9k-"));
  const browser = spawn(chrome, ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--disable-extensions",
    "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let socket;
  try {
    let port;
    for (let i = 0; i < 100; i++) {
      try { port = Number((await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); break; }
      catch { if (browser.exitCode !== null) throw new Error("Chrome closed before DevTools started"); await delay(100); }
    }
    assert.ok(port);
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(pages.find((item) => item.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let commandId = 0;
    const pending = new Map();
    const errors = [];
    socket.onmessage = ({ data }) => {
      const result = JSON.parse(data);
      if (result.method === "Runtime.exceptionThrown") errors.push(result.params.exceptionDetails.text);
      const wait = pending.get(result.id);
      if (!wait) return;
      pending.delete(result.id);
      if (result.error) wait.reject(Error(result.error.message)); else wait.resolve(result.result);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++commandId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
    async function evaluate(expression) {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true });
      if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    }
    async function until(expression) {
      for (let i = 0; i < 120; i++) {
        try { if (await evaluate(expression)) return; } catch { /* A navigation can replace the execution context. */ }
        await delay(150);
      }
      throw Error(`Timed out: ${expression}; visible=${await evaluate(`document.body.innerText.slice(0, 1000)`)}; inputs=${await evaluate(`[...document.querySelectorAll('input')].map(x => [x.ariaLabel, x.value])`)}`);
    }
    // Keep selectors independent of CSS module names.
    const action = (label) => `[...document.querySelectorAll('button')].find(x => x.textContent.trim() === ${JSON.stringify(label)})`;
    const visibleText = `document.querySelector('[aria-label="Diario dello studente"]').innerText`;
    async function goTo(label, chapter) {
      for (let i = 0; i < 100; i++) {
        if (await evaluate(`document.querySelector('#question-title')?.textContent.trim().replace(/\\s*\\*$/, '') === ${JSON.stringify(label)} && (!${JSON.stringify(chapter || '')} || document.querySelector('[class*="progress"]')?.textContent.includes(${JSON.stringify(chapter || '')}))`)) return;
        await evaluate(`(${action("SALTA DATO")} || ${action("AVANTI")}).click()`);
        await delay(30);
      }
      throw Error(`Step not found: ${chapter || ''} ${label}`);
    }
    async function edit(label, chapter) {
      const selector = `[...document.querySelectorAll('[aria-label=${JSON.stringify('Modifica ' + label)}]')].find(x => !${JSON.stringify(chapter || '')} || x.closest('section')?.querySelector('h3')?.textContent === ${JSON.stringify(chapter || '')})`;
      assert.equal(await evaluate(`!!${selector}`), true, `editable ${label}`);
      await evaluate(`${selector}.click()`);
      await until(`document.querySelector('#question-title')?.textContent.includes(${JSON.stringify(label)})`);
    }
    async function fill(label, value) {
      await goTo(label);
      await evaluate(`document.querySelector('#guided-answer').focus(); document.querySelector('#guided-answer').select()`);
      await send("Input.insertText", { text: value });
      await until(`document.querySelector('#guided-answer').value === ${JSON.stringify(value)}`);
    }
    async function choose(value) {
      await evaluate(`(() => { const element = document.querySelector('#guided-answer'); element.value = ${JSON.stringify(value)}; element.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    }
    async function viewport(width, height, file) {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: true });
      await until(`Math.round(innerWidth) === ${width} && Math.round(innerHeight) === ${height}`);
      assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, `no horizontal scroll at ${width}`);
      assert.equal(await evaluate(`!!document.querySelector('a[href="/oggi"]') && !!document.querySelector('a[href="/menu"]')`), true);
      if (process.env.G9K_SCREENSHOTS) {
        await mkdir(process.env.G9K_SCREENSHOTS, { recursive: true });
        const screenshot = await send("Page.captureScreenshot", { format: "png" });
        await writeFile(join(process.env.G9K_SCREENSHOTS, file), Buffer.from(screenshot.data, "base64"));
      }
    }
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await send("Page.navigate", { url: new URL("/studenti/nuovo", baseUrl).href });
    await until(`document.querySelector('#question-title')?.textContent.includes("Nome dello studente")`);
    await fill("Nome dello studente", "G9K Pochi");
    await evaluate(`${action("AVANTI")}.click()`);
    await until(`document.querySelector('#question-title')?.textContent.includes("Cognome dello studente")`);
    await fill("Cognome dello studente", "Campi");
    await evaluate(`${action("AVANTI")}.click()`);
    await until(`document.querySelector('#guided-answer')?.type === 'date'`);
    assert.equal(await evaluate(`document.querySelector('#guided-answer').max.startsWith(String(new Date().getFullYear()))`), true);
    await evaluate(`${action("SALVA")}.click()`);
    await until(`document.querySelector('[role="status"]')?.textContent.includes('Studente custodito nel registro')`);
    await until(`!!document.querySelector('button[aria-label="Modifica i dati dello studente"]')`);
    assert.equal(await evaluate(`!!${action("SALVA")}`), false);
    assert.equal(await evaluate(`!!document.querySelector('a[href^="/studenti/studente-"]')`), true);
    const sparse = await evaluate(visibleText);
    assert.match(sparse, /G9K Pochi Campi/);
    assert.doesNotMatch(sparse, /\.\.\.|…|LA SUA FAMIGLIA|I SUOI LIBRI|I PROFESSORI|QUALCHE PENSIERO|IL NOSTRO PERCORSO|Ci dedicheremo/);
    await viewport(390, 844, "sparse-390x844.png");
    await viewport(430, 764, "sparse-430x764.png");

    await evaluate(`document.querySelector('button[aria-label="Modifica i dati dello studente"]').click()`);
    await until(`!!document.querySelector('#guided-answer')`);
    assert.equal(await evaluate(`!!${action("MODIFICA")} && !!${action("SALVA")}`), false);
    await goTo("Cellulare", "Madre");
    assert.equal(await evaluate(`document.querySelector('#guided-answer').type`), "tel");
    await evaluate(`${action("ANNULLA")}.click()`);
    await until(`!!document.querySelector('button[aria-label="Modifica i dati dello studente"]')`);
    await evaluate(`document.querySelector('button[aria-label="Modifica i dati dello studente"]').click()`);
    await until(`!!document.querySelector('#guided-answer')`);
    await fill("Email studente", "pochi@example.invalid");
    await evaluate(`${action("SALVA")}.click()`);
    await until(`!!document.querySelector('button[aria-label="Modifica i dati dello studente"]')`);
    const partial = await evaluate(visibleText);
    assert.match(partial, /Il suo indirizzo di posta elettronica è pochi@example\.invalid\./);
    assert.doesNotMatch(partial, /\.\.\.|…|LA SUA FAMIGLIA|I PROFESSORI/);

    const sparseRecord = await evaluate(`JSON.parse(localStorage.getItem('semprini:students')).find(x => x.firstName === 'G9K Pochi')`);
    const partialRecord = { ...sparseRecord, address: "Via Breve 2", familyContacts: [
      { id: "madre", relationship: "madre", firstName: "", lastName: "", whatsapp: "3330001111", email: "legacy@example.invalid", legacyAttribute: "preserve" },
    ], teachers: [{ id: "solo-materia", subject: "Fisica", firstName: "", lastName: "" }] };
    await evaluate(`localStorage.setItem('semprini:students', JSON.stringify(JSON.parse(localStorage.getItem('semprini:students')).map(x => x.id === ${JSON.stringify(sparseRecord.id)} ? ${JSON.stringify(partialRecord)} : x)))`);
    await send("Page.navigate", { url: new URL(`/studenti/nuovo?id=${encodeURIComponent(sparseRecord.id)}`, baseUrl).href });
    await until(`document.querySelector('[aria-label="Diario dello studente"]')?.innerText.includes('Via Breve 2')`);
    const partialSections = await evaluate(visibleText);
    assert.match(partialSections, /Abita in Via Breve 2\./);
    assert.match(partialSections, /Il cellulare della mamma è 3330001111\./);
    assert.equal(await evaluate(`document.querySelector('[aria-label="Diario dello studente"] a[href="https://wa.me/393330001111"]')?.textContent`), "WhatsApp");
    assert.match(partialSections, /La materia di riferimento a scuola è Fisica\./);
    assert.doesNotMatch(partialSections, /\.\.\.|…|si chiama \.|insegnante di  è/);
    await evaluate(`document.querySelector('button[aria-label="Modifica i dati dello studente"]').click()`);
    await until(`!!document.querySelector('#guided-answer')`);
    await edit("Cellulare", "Madre");
    assert.equal(await evaluate(`document.querySelector('#guided-answer').value`), "3330001111");
    await edit("Usa WhatsApp?", "Madre");
    await evaluate(`${action("RIMUOVI DATO")}.click()`);
    assert.equal(await evaluate(`document.querySelector('#guided-answer').value`), "no");
    await evaluate(`${action("SALVA")}.click()`);
    await until(`!!document.querySelector('button[aria-label="Modifica i dati dello studente"]')`);
    assert.deepEqual(await evaluate(`(() => { const p = JSON.parse(localStorage.getItem('semprini:students')).find(x => x.id === ${JSON.stringify(sparseRecord.id)}).familyContacts[0]; return [p.phone, p.whatsapp]; })()`), ["3330001111", ""]);

    const legacySaved = await evaluate(`JSON.parse(localStorage.getItem('semprini:students')).find(x => x.id === ${JSON.stringify(sparseRecord.id)})`);
    const legacyBefore = partialRecord.familyContacts[0];
    assert.deepEqual(legacySaved.familyContacts[0], { ...legacyBefore, phone: "3330001111", whatsapp: "" }, "WhatsApp removal preserves the historical number and all contact attributes");
    await send("Page.reload", { ignoreCache: true });
    await until(`document.querySelector('[aria-label="Diario dello studente"]')?.innerText.includes('3330001111')`);
    assert.equal(await evaluate(`!!document.querySelector('[aria-label="Diario dello studente"] a[href="https://wa.me/393330001111"]')`), false);

    const complete = { ...sparseRecord, id: "g9k-completo", firstName: "G9K Completo", lastName: "Profilo", birthDate: "2010-04-12",
      gradeClass: "3° anno", section: "B", schoolName: "Liceo Aurora", city: "Rimini", studyCourse: "scientifico",
      phone: "+39 333 111 2222", whatsapp: "3339998888", email: "completo@example.invalid", subjects: ["Matematica", "Fisica"],
      address: "Via delle Rose 4", familyContacts: [
        { id: "madre", relationship: "madre", firstName: "Maria", lastName: "Rossi", phone: "0039 333 222 3333", whatsapp: "3332223333", email: "maria@example.invalid" },
        { id: "padre", relationship: "padre", firstName: "Luca", lastName: "Rossi", phone: "12345", email: "luca@example.invalid" },
      ], primaryContactId: "madre", books: [{ title: "Algebra", publisher: "Editore Uno" }], topicsToDeepen: "equazioni",
      teachers: [{ id: "prof", subject: "Matematica", firstName: "Anna", lastName: "Bianchi", phone: "0541123456" }],
      firstImpressions: "curioso/a", interests: "scienza", passions: "musica", preferredActivities: "leggere", personalNotes: "ama gli esempi",
      learningStartDate: "2026-11-02", learningGoals: "le frazioni", lessonMode: "online", lessonDurationMinutes: 60, lessonRateCents: 2500 };
    await evaluate(`localStorage.setItem('semprini:students', JSON.stringify([...JSON.parse(localStorage.getItem('semprini:students')), ${JSON.stringify(complete)}]))`);
    await send("Page.navigate", { url: new URL("/studenti/nuovo?id=g9k-completo", baseUrl).href });
    await until(`document.querySelector('[aria-label="Diario dello studente"]')?.innerText.includes('G9K Completo')`);
    const completeText = await evaluate(visibleText);
    for (const value of ["Liceo Aurora", "scientifico", "Via delle Rose 4", "Maria Rossi", "Luca Rossi", "Algebra", "equazioni", "Anna Bianchi", "scienza", "le frazioni"]) assert.ok(completeText.includes(value), value);
    assert.doesNotMatch(completeText, /3339998888|numero WhatsApp|12345.*WhatsApp/);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('[aria-label="Diario dello studente"] a[href^="https://wa.me/"]')].map(x => x.href)`),
      ["https://wa.me/393331112222", "https://wa.me/393332223333"]);
    assert.equal(await evaluate(`document.querySelector('[aria-label="Diario dello studente"] a[href="mailto:completo@example.invalid"]')?.textContent`), "completo@example.invalid");
    assert.equal(await evaluate(`(() => { const area = document.querySelector('[aria-label="Diario dello studente"]');
      const email = area.querySelector('a[href="mailto:completo@example.invalid"]');
      const value = area.querySelector('span[class*="value"]');
      return getComputedStyle(email).color === getComputedStyle(value).color; })()`), true, "email keeps the narrative text color");
    assert.doesNotMatch(completeText, /\.\.\.|…/);
    assert.equal(await evaluate(`!!${action("SALVA")}`), false);
    assert.deepEqual(await evaluate(`JSON.parse(localStorage.getItem('semprini:students')).find(x => x.id === 'g9k-completo')`), complete);
    await evaluate(`document.querySelector('button[aria-label="Modifica i dati dello studente"]').click()`);
    await until(`!!document.querySelector('#guided-answer')`);
    assert.equal(await evaluate(`document.querySelectorAll('input[type="tel"][aria-label*="WhatsApp"]').length`), 0);
    await edit("Usa WhatsApp sul cellulare?");
    assert.equal(await evaluate(`document.querySelector('#guided-answer').value`), "yes");
    await edit("Usa WhatsApp?", "Madre");
    assert.equal(await evaluate(`document.querySelector('#guided-answer').value`), "yes");
    await edit("Usa WhatsApp?", "Padre");
    assert.equal(await evaluate(`document.querySelector('#guided-answer option[value="yes"]').disabled`), true);
    await edit("Cellulare studente");
    await fill("Cellulare studente", "3335556666");
    await evaluate(`${action("AVANTI")}.click()`);
    await edit("Usa WhatsApp sul cellulare?"); await evaluate(`${action("RIMUOVI DATO")}.click()`); await choose("yes"); await evaluate(`${action("AVANTI")}.click()`);
    await edit("Cellulare", "Padre"); await fill("Cellulare", "3334445555"); await evaluate(`${action("AVANTI")}.click()`);
    await edit("Usa WhatsApp?", "Padre"); await choose("yes"); await evaluate(`${action("AVANTI")}.click()`);
    await edit("Email studente"); await fill("Email studente", "aggiornato@example.invalid");
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 520, deviceScaleFactor: 1, mobile: true });
    await evaluate(`document.querySelector('#guided-answer').focus()`);
    await until(`(() => { const r = document.querySelector('#guided-answer').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })()`);
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true);
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await evaluate(`${action("SALVA")}.click()`);
    await until(`!!document.querySelector('button[aria-label="Modifica i dati dello studente"]')`);
    const completeAfterSave = await evaluate(visibleText);
    for (const value of ["aggiornato@example.invalid", "Liceo Aurora", "Via delle Rose 4", "Maria Rossi", "Algebra", "Anna Bianchi", "le frazioni"]) assert.ok(completeAfterSave.includes(value), value);
    assert.doesNotMatch(completeAfterSave, /\.\.\.|…/);
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem('semprini:students')).find(x => x.id === 'g9k-completo').email`), "aggiornato@example.invalid");
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem('semprini:students')).find(x => x.id === 'g9k-completo').whatsapp`), "3335556666");
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem('semprini:students')).find(x => x.id === 'g9k-completo').familyContacts.find(x => x.id === 'padre').whatsapp`), "3334445555");
    assert.equal(await evaluate(`document.querySelector('[aria-label="Diario dello studente"] a[href="https://wa.me/393335556666"]')?.textContent`), "WhatsApp");
    assert.equal(await evaluate(`document.querySelector('[aria-label="Diario dello studente"] a[href="https://wa.me/393334445555"]')?.textContent`), "WhatsApp");
    await viewport(390, 844, "complete-390x844.png");
    await viewport(430, 764, "complete-430x764.png");
    await evaluate(`document.querySelector('[aria-label="Diario dello studente"]').scrollTop = document.querySelector('[aria-label="Diario dello studente"]').scrollHeight`);
    await until(`(() => { const area = document.querySelector('[aria-label="Diario dello studente"]').getBoundingClientRect();
      const last = document.querySelector('section[aria-labelledby="percorso"]').getBoundingClientRect();
      return last.bottom <= area.bottom + 1 && last.top >= area.top - 1; })()`);
    assert.equal(await evaluate(`document.querySelector('section[aria-labelledby="percorso"]').innerText.includes('le frazioni')`), true);
    await viewport(430, 764, "complete-bottom-430x764.png");
    await send("Page.navigate", { url: new URL("/studenti/nuovo", baseUrl).href });
    await until(`document.querySelector('#question-title')?.textContent.includes("Nome dello studente")`);
    await fill("Nome dello studente", "G9K Nuovo");
    await evaluate(`${action("AVANTI")}.click()`);
    await until(`document.querySelector('#question-title')?.textContent.includes("Cognome dello studente")`);
    await fill("Cognome dello studente", "Contatto");
    await evaluate(`${action("AVANTI")}.click()`);
    await fill("Cellulare studente", "+39 333 777 8888");
    await evaluate(`${action("AVANTI")}.click()`);
    await until(`document.querySelector('#question-title')?.textContent.includes('Usa WhatsApp')`);
    assert.equal(await evaluate(`document.querySelectorAll('input[type="tel"][aria-label*="WhatsApp"]').length`), 0);
    await choose("yes");
    await evaluate(`${action("SALVA")}.click()`);
    await until(`!!document.querySelector('button[aria-label="Modifica i dati dello studente"]')`);
    assert.equal(await evaluate(`document.querySelector('[aria-label="Diario dello studente"] a[href="https://wa.me/393337778888"]')?.textContent`), "WhatsApp");
    assert.deepEqual(errors, [], "no uncaught browser JavaScript errors");
  } finally {
    socket?.close();
    browser.kill();
    if (browser.exitCode === null && browser.signalCode === null) await new Promise((resolve) => browser.once("exit", resolve));
    await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});
