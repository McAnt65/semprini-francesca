// Real IndexedDB tests in two separate Chromium processes, using a disposable, isolated profile.
// No application server, real student records, personal photographs or third-party requests.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const modules = ["student-storage", "student-photos", "save-student-photo", "vintage-classic", "portrait-illustrated"].map((name) => {
  const source = readFileSync(new URL(`../app/data/${name}.ts`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  return `modules[${JSON.stringify(name)}] = {}; (function(exports, require) { ${code}\n})(modules[${JSON.stringify(name)}], name => modules[name.replace('./', '')]);`;
}).join("\n");

async function browserTests(phase, storage, photos, saver, vintageFilter, portraitFilter) {
  const passed = [];
  const check = (condition, name) => { if (!condition) throw new Error(name); passed.push(name); };
  const originalFetch = window.fetch;
  let networkCalls = 0;
  window.fetch = (...args) => { networkCalls++; return originalFetch(...args); };
  const bytes = async (blob) => [...new Uint8Array(await blob.arrayBuffer())].join(",");
  const equal = async (left, right) => left.type === right.type && await bytes(left) === await bytes(right);
  const image = (color) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 2;
    const context = canvas.getContext("2d");
    context.fillStyle = color;
    context.fillRect(0, 0, 2, 2);
    return canvas.toDataURL("image/png");
  };
  const fixture = (id, avatarUrl) => ({
    id, firstName: "Fittizio", lastName: "Test", avatarUrl,
    enrollmentDate: "2026-01-01", subjects: [], textbooks: {}, legacyNarrativeImported: true,
  });
  const key = storage.STUDENTS_STORAGE_KEY;
  const red = image("red"), blue = image("blue");
  if (phase === 1) {
    const source = photos.legacyPhotoBlob(red);
    const vintageBlob = await vintageFilter.createVintageClassic(source);
    check(vintageBlob.type === "image/jpeg" && vintageBlob.size > 0 && !await equal(vintageBlob, source), "Filtro locale: nuovo Blob JPEG elaborato");
    const decoded = await createImageBitmap(vintageBlob);
    check(decoded.width === 2 && decoded.height === 2, "Anteprima vintage: proporzioni conservate");
    decoded.close();
    const largeCanvas = document.createElement("canvas");
    largeCanvas.width = 2000; largeCanvas.height = 1000;
    largeCanvas.getContext("2d").fillStyle = "#ad897d";
    largeCanvas.getContext("2d").fillRect(0, 0, 2000, 1000);
    const large = await new Promise(resolve => largeCanvas.toBlob(resolve, "image/png"));
    const scaled = await createImageBitmap(await vintageFilter.createVintageClassic(large));
    check(scaled.width === 1600 && scaled.height === 800, "Foto grande: ridimensionata senza deformazioni");
    scaled.close();
    const preview = await photos.readPhotoFile(new File([source], "fittizia.png", { type: "image/png" }));
    check(await equal(photos.legacyPhotoBlob(preview), source), "Selezione e anteprima: byte originali conservati");
    let invalid = false;
    try { await photos.readPhotoFile(new File(["fake"], "fittizia.heic", { type: "image/heic" })); } catch { invalid = true; }
    check(invalid, "Formato mobile non supportato: errore");
    let tooLarge = false;
    try { await photos.readPhotoFile(new File([new Uint8Array(20 * 1024 * 1024 + 1)], "grande.png", { type: "image/png" })); } catch { tooLarge = true; }
    check(tooLarge, "File troppo grande: errore");
    check(await saver.saveStudentWithPhoto(fixture("fictional-a", red)), "Salvataggio confermato");
    const first = storage.getStoredStudentById("fictional-a");
    check(photos.isStoredPhoto(first.avatarUrl) && !localStorage.getItem(key).includes("data:image"), "Record con riferimento breve, senza data URL");
    check(await equal(await photos.getStudentPhoto(first.avatarUrl, first.id), source), "Blob riletto identico all'originale");
    check(await saver.saveStudentWithPhoto({ ...first, avatarUrl: blue }), "Sostituzione confermata");
    const replaced = storage.getStoredStudentById(first.id);
    check(replaced.id === first.id && storage.loadStoredStudents().length === 1, "Stesso ID e nessuno studente duplicato");
    check(await equal(await photos.getStudentPhoto(first.avatarUrl), source), "Versione precedente conservata");
    check(await equal(await photos.getStudentPhoto(replaced.avatarUrl), photos.legacyPhotoBlob(blue)), "Nuova fotografia recuperabile");

    const snapshot = localStorage.getItem(key);
    const originalAdd = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function(...args) {
      const request = originalAdd.apply(this, args);
      this.transaction.abort();
      return request;
    };
    try { check(!await saver.saveStudentWithPhoto({ ...replaced, avatarUrl: red }), "Transazione annullata: nessun falso successo"); }
    finally { IDBObjectStore.prototype.add = originalAdd; }
    check(localStorage.getItem(key) === snapshot, "Errore IndexedDB: record e riferimento precedenti intatti");

    IDBObjectStore.prototype.add = function() { throw new DOMException("Quota immagini esaurita simulata", "QuotaExceededError"); };
    try { check(!await saver.saveStudentWithPhoto({ ...replaced, avatarUrl: red }), "Spazio IndexedDB esaurito: errore senza falso successo"); }
    finally { IDBObjectStore.prototype.add = originalAdd; }
    check(localStorage.getItem(key) === snapshot, "Spazio immagini esaurito: fotografia precedente intatta");

    const originalGet = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function() { throw new DOMException("Errore di lettura simulato", "UnknownError"); };
    try { check(!await saver.saveStudentWithPhoto({ ...replaced, avatarUrl: red }), "Verifica dopo scrittura fallita: nessun falso successo"); }
    finally { IDBObjectStore.prototype.get = originalGet; }
    check(localStorage.getItem(key) === snapshot, "Verifica fallita: riferimento precedente conservato");

    const originalSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function(name, value) {
      if (this === localStorage && name === key) throw new DOMException("Spazio esaurito simulato", "QuotaExceededError");
      return originalSet.call(this, name, value);
    };
    try { check(!await saver.saveStudentWithPhoto({ ...replaced, avatarUrl: red }), "Quota dati esaurita: errore e nessun fallback temporaneo"); }
    finally { Storage.prototype.setItem = originalSet; }
    check(localStorage.getItem(key) === snapshot && sessionStorage.getItem(key) === null, "Salvataggio fallito: nessuna associazione solo in sessionStorage");
    check(await saver.saveStudentWithPhoto({ ...replaced, avatarUrl: red }), "Riprova dopo errore riuscita");

    const legacy = fixture("fictional-legacy", blue);
    localStorage.setItem(key, JSON.stringify([...storage.loadStoredStudents(), legacy]));
    const legacySnapshot = localStorage.getItem(key);
    const originalOpen = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function() { throw new DOMException("Accesso negato simulato", "SecurityError"); };
    try { check(!await saver.saveStudentWithPhoto(legacy), "IndexedDB non disponibile: migrazione rifiutata"); }
    finally { IDBFactory.prototype.open = originalOpen; }
    check(localStorage.getItem(key) === legacySnapshot, "Vecchio data URL intatto dopo migrazione fallita");
    check(await saver.saveStudentWithPhoto(legacy), "Migrazione compatibile del data URL precedente");
    check(await equal(await photos.getStudentPhoto(storage.getStoredStudentById(legacy.id).avatarUrl), photos.legacyPhotoBlob(blue)), "Vecchia foto recuperabile dopo migrazione");
    const legacyReplacement = fixture("fictional-replace-legacy", red);
    localStorage.setItem(key, JSON.stringify([...storage.loadStoredStudents(), legacyReplacement]));
    check(await saver.saveStudentWithPhoto({ ...legacyReplacement, avatarUrl: blue }), "Sostituzione di una fotografia precedente in data URL");
    const history = await new Promise((resolve, reject) => {
      const request = indexedDB.open(photos.PHOTO_DATABASE, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("photos", "readonly");
        const entries = transaction.objectStore("photos").index("studentId").getAll(legacyReplacement.id);
        transaction.oncomplete = () => { db.close(); resolve(entries.result); };
        transaction.onabort = () => { db.close(); reject(transaction.error); };
      };
    });
    const retained = await Promise.all(history.map(entry => equal(entry.blob, photos.legacyPhotoBlob(red))));
    check(retained.some(Boolean), "Originale legacy conservato anche quando viene sostituito");
    check(!await saver.saveStudentWithPhoto(fixture("fictional-other", first.avatarUrl)), "Associazione con ID diverso rifiutata");
    check(!await saver.saveStudentWithPhoto(fixture("fictional-temp", "blob:temporary")), "URL temporaneo non salvato");
    const original = await photos.getLatestOriginalPhoto(first.id);
    const vintage = await photos.storeStudentPhoto(first.id, vintageBlob, "vintage", original);
    check(vintage.includes("/vintage/") && (await photos.getPhotoRecord(vintage, first.id)).sourceOriginalKey === original, "Variante vintage collegata all'originale");
    check(await saver.saveStudentWithPhoto({ ...storage.getStoredStudentById(first.id), avatarUrl: vintage }), "Conferma vintage nella scheda");
    check(await equal(await photos.getStudentPhoto(storage.getStoredStudentById(first.id).avatarUrl), vintageBlob), "Riapertura anteprima vintage confermata");
    check(await saver.saveStudentWithPhoto({ ...storage.getStoredStudentById(first.id), avatarUrl: original }), "Ripristino originale nella scheda");
    check(await equal(await photos.getStudentPhoto(storage.getStoredStudentById(first.id).avatarUrl), photos.legacyPhotoBlob(red)), "Originale recuperato dopo ripristino");
    const portraitBlob = await portraitFilter.createIllustratedPortrait(source);
    check(portraitBlob.type === "image/jpeg" && portraitBlob.size > 0 && !await equal(portraitBlob, source), "Ritratto illustrato locale generato dall'originale");
    const largePortrait = await createImageBitmap(await portraitFilter.createIllustratedPortrait(large));
    check(largePortrait.width === 1400 && largePortrait.height === 700, "Ritratto grande: ridimensionato senza deformazioni");
    largePortrait.close();
    const portrait = await photos.storeStudentPhoto(first.id, portraitBlob, "illustrated", original);
    check((await photos.getPhotoRecord(portrait, first.id)).sourceOriginalKey === original, "Ritratto collegato all'originale dello stesso studente");
    check(await photos.getLatestPhotoByKind(first.id, "illustrated", original) === portrait, "Disegno recuperabile per fotografia originale");
    let wrongStudent = false;
    try { await photos.getStudentPhoto(portrait, "fictional-legacy"); } catch { wrongStudent = true; }
    check(wrongStudent, "Ritratto non accessibile da un altro studente");
    check(await saver.saveStudentWithPhoto({ ...storage.getStoredStudentById(first.id), avatarUrl: portrait }), "Conferma ritratto nella scheda");
    check(await equal(await photos.getStudentPhoto(storage.getStoredStudentById(first.id).avatarUrl), portraitBlob), "Ritratto recuperato dopo conferma");
    check(await saver.saveStudentWithPhoto({ ...storage.getStoredStudentById(first.id), avatarUrl: original }), "Ripristino originale dopo ritratto");
    check(await equal(await photos.getStudentPhoto(original, first.id), source) && await equal(await photos.getStudentPhoto(portrait, first.id), portraitBlob), "Originale e disegno entrambi conservati");
    localStorage.setItem("photo-test-portrait", portrait);
    localStorage.setItem("photo-test-reference", storage.getStoredStudentById(first.id).avatarUrl);
    sessionStorage.setItem("photo-test-session", "first-process");
  } else {
    check(sessionStorage.getItem("photo-test-session") === null, "Secondo processo: nuova sessione browser");
    const reopened = storage.getStoredStudentById("fictional-a");
    check(reopened.avatarUrl === localStorage.getItem("photo-test-reference"), "Associazione conservata dopo riavvio browser");
    check(await equal(await photos.getStudentPhoto(reopened.avatarUrl), photos.legacyPhotoBlob(red)), "Blob conservato dopo riavvio browser");
    const portrait = localStorage.getItem("photo-test-portrait");
    check(await photos.getLatestPhotoByKind(reopened.id, "illustrated", reopened.avatarUrl) === portrait, "Ritratto ancora associato allo studente dopo riavvio");
    check((await photos.getStudentPhoto(portrait, reopened.id)).size > 0, "Ritratto recuperabile dopo riavvio");
    const legacy = storage.getStoredStudentById("fictional-legacy");
    check(await equal(await photos.getStudentPhoto(legacy.avatarUrl), photos.legacyPhotoBlob(blue)), "Foto migrata conservata dopo riavvio browser");
    check(storage.loadStoredStudents().length === 3, "Nessuna duplicazione dopo riavvio");
  }
  check(networkCalls === 0, "Trasformazione e archivio senza richieste di rete");
  window.fetch = originalFetch;
  return passed;
}

let receive;
const server = createServer((request, response) => {
  if (request.url === "/result" && request.method === "POST") {
    let body = "";
    request.on("data", chunk => { body += chunk; });
    request.on("end", () => { response.end("ok"); receive(JSON.parse(body)); });
    return;
  }
  const phase = Number(new URL(request.url, "http://localhost").searchParams.get("phase"));
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(`<!doctype html><title>Isolated photo storage test</title><script>
    const modules = {}; ${modules}
    (${browserTests.toString()})(${phase}, modules['student-storage'], modules['student-photos'], modules['save-student-photo'], modules['vintage-classic'], modules['portrait-illustrated'])
      .then(passed => fetch('/result', { method: 'POST', body: JSON.stringify({ passed }) }))
      .catch(error => fetch('/result', { method: 'POST', body: JSON.stringify({ error: error.message, stack: error.stack }) }));
    </script>`);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const profile = mkdtempSync(join(tmpdir(), "semprini-photo-test-"));
const edge = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
async function run(phase) {
  let child;
  let socket;
  let timer;
  const resultPromise = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error("Browser test timed out")), 45000);
    receive = result => { clearTimeout(timer); resolve(result); };
  });
  resultPromise.catch(() => {});
  try {
    const portFile = join(profile, "DevToolsActivePort");
    const previousPort = existsSync(portFile) ? readFileSync(portFile, "utf8") : "";
    child = spawn(edge, ["--headless=new", "--no-first-run", "--no-sandbox", "--disable-gpu-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-extensions", "--disable-background-networking", "--disable-sync", "--remote-debugging-port=0", `--user-data-dir=${profile}`, `http://127.0.0.1:${server.address().port}/?phase=${phase}`], { windowsHide: true });
    let portText = "";
    for (let attempt = 0; attempt < 150; attempt++) {
      if (existsSync(portFile)) portText = readFileSync(portFile, "utf8");
      if (portText && portText !== previousPort) break;
      await delay(100);
    }
    if (!portText || portText === previousPort) throw new Error("Edge debugging endpoint unavailable");
    const [port, path] = portText.trim().split(/\r?\n/);
    const debugUrl = `ws://127.0.0.1:${port}${path}`;
    socket = new WebSocket(debugUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", () => reject(new Error("Edge debugging connection failed")), { once: true });
    });
    const result = await resultPromise;
    const closed = child.exitCode !== null ? Promise.resolve() : new Promise(resolve => child.once("exit", resolve));
    socket.send(JSON.stringify({ id: 1, method: "Browser.close" }));
    await closed;
    if (result.error) throw new Error(result.error + "\n" + result.stack);
    result.passed.forEach(name => console.log(`PASS ${name}`));
    return result.passed.length;
  } finally {
    clearTimeout(timer);
    socket?.close();
    if (child && child.exitCode === null) child.kill();
  }
}
try {
  const count = await run(1) + await run(2);
  console.log(`${count} checks passed across two separate browser processes.`);
} finally { server.close(); }
