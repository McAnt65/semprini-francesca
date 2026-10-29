import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

const url = process.env.STUDENT_BROWSER_URL;
const chrome = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

test("G10L-H: explicit optional removals remain removed after reload", { skip: !url || !existsSync(chrome) }, async () => {
  const profile = await mkdtemp(join(tmpdir(), "semprini-g10lh-"));
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
    const button = (label) => `[...document.querySelectorAll('button')].find(x => x.textContent.trim() === ${JSON.stringify(label)})`;
    const click = (label) => evaluate(`${button(label)}.click()`);
    const record = (id) => `JSON.parse(localStorage.getItem('semprini:students')).find(x => x.id === ${JSON.stringify(id)})`;
    const open = async (id) => { await send("Page.navigate", { url: new URL(`/studenti/nuovo?id=${id}`, url).href }); await until(`${button("MODIFICA")} !== undefined`); };
    const edit = async (label) => { await click("MODIFICA"); await until("!!document.querySelector('#guided-answer')"); await evaluate(`[...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === ${JSON.stringify(`Modifica ${label}`)}).click()`); await until(`document.querySelector('#question-title').textContent.trim() === ${JSON.stringify(label)}`); };
    const remove = async () => { await click("RIMUOVI DATO"); await until("document.querySelector('[role=status]').textContent.includes('Dato rimosso')"); await click("SALVA"); await until(`${button("MODIFICA")} !== undefined`); };
    await send("Page.enable"); await send("Runtime.enable");
    await send("Page.navigate", { url: new URL("/studenti/nuovo", url).href });
    await until("!!document.querySelector('#guided-answer')");
    const records = [
      { id: "legacy-school", firstName: "Ada", lastName: "Test", school: "Scuola storica", city: "Roma", email: "ada@example.invalid", subjects: ["Fisica"], textbooks: { math: "Libro storico" }, customLegacy: "intatto" },
      { id: "dual-school", firstName: "Lia", lastName: "Test", schoolName: "Scuola nuova", school: "Scuola storica", subjects: [], textbooks: {} },
    ];
    await evaluate(`localStorage.setItem('semprini:students', ${JSON.stringify(JSON.stringify(records))})`);
    for (const id of ["legacy-school", "dual-school"]) {
      await open(id);
      await edit("Nome della scuola");
      await remove();
      await open(id);
      const saved = await evaluate(record(id));
      assert.equal(saved.schoolName, "");
      assert.equal(saved.school, "");
      assert.equal(await evaluate("document.querySelector('[aria-label=\"Diario dello studente\"]').innerText.includes('Scuola storica')"), false);
      if (id === "legacy-school") {
        assert.equal(saved.customLegacy, "intatto");
        assert.deepEqual(saved.subjects, ["Fisica"]);
        assert.equal(saved.textbooks.math, "Libro storico");
        assert.equal(saved.city, "Roma");
        assert.equal(saved.email, "ada@example.invalid");
        assert.match(await evaluate("document.querySelector('[aria-label=\"Diario dello studente\"]').innerText"), /Studia nella città di Roma/);
      }
    }
    await open("legacy-school");
    for (const [label, key, empty] of [["Città", "city", ""], ["Email studente", "email", ""], ["Materie, separate da virgole", "subjects", []]]) {
      await edit(label);
      await remove();
      await open("legacy-school");
      assert.deepEqual((await evaluate(record("legacy-school")))[key], empty);
    }
    assert.equal((await evaluate(record("legacy-school"))).customLegacy, "intatto");
    assert.deepEqual(errors, []);
  } finally { socket?.close(); browser.kill(); await delay(700); await rm(profile, { recursive: true, force: true, maxRetries: 5 }); }
});
