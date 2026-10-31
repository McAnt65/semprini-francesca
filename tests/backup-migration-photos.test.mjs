import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { IDBFactory } from "fake-indexeddb";
const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { collectArchives, PHOTO_DATABASE } = require("../app/data/backup/archives.ts");
const { makePayload } = require("../app/data/backup/format.ts");
const { encryptBackup, decryptBackup } = require("../app/data/backup/encryption.ts");
const { restoreArchives } = require("../app/data/backup/restore.ts");
function storage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return { get length() { return map.size; }, key: index => [...map.keys()][index] ?? null,
    getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key) };
}
function environment(local = {}) {
  return { database: new IDBFactory(), browser: { localStorage: storage(local), sessionStorage: storage() } };
}
function use(env) { globalThis.indexedDB = env.database; globalThis.window = env.browser; }
async function database(env) {
  const request = env.database.open(PHOTO_DATABASE, 1);
  request.onupgradeneeded = () => request.result.createObjectStore("photos", { keyPath: "key" }).createIndex("studentId", "studentId");
  return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}
async function writePhoto(env, record) {
  const db = await database(env);
  try { await new Promise((resolve, reject) => {
    const tx = db.transaction("photos", "readwrite"); tx.objectStore("photos").add(record);
    tx.oncomplete = resolve; tx.onerror = tx.onabort = () => reject(tx.error);
  }); } finally { db.close(); }
}
async function readPhoto(env, key) {
  const db = await database(env);
  try { return await new Promise((resolve, reject) => {
    const tx = db.transaction("photos", "readonly"); const request = tx.objectStore("photos").get(key);
    tx.oncomplete = () => resolve(request.result); tx.onerror = () => reject(tx.error);
  }); } finally { db.close(); }
}
const stamp = "2026-10-31T10:00:00.000Z";
const photoKey = "TEST-person/original/1";
const student = { id: "TEST-person", firstName: "TEST", lastName: "Fittizio", status: "active", subjects: ["Matematica"], avatarUrl: "student-photo:v1:" + photoKey };
const lesson = { id: "TEST-lesson", studentId: student.id, studentNameSnapshot: "TEST Fittizio", subject: "Matematica",
  mode: "casa", status: "svolta", paymentStatus: "parziale", date: "2026-10-31", startTime: "10:00", source: "manuale",
  lessonAmountCents: 3000, paidAmountCents: 1000, paymentMovements: [{ id: "TEST-payment", kind: "payment", amountCents: 1000,
    paymentDate: "2026-10-31", recordedAt: stamp, operationId: "TEST-operation" }] };
const photo = { key: photoKey, studentId: student.id, kind: "original", createdAt: stamp, blob: new Blob([new Uint8Array([0, 255, 12, 34, 128])], { type: "image/png" }) };

test("encrypted migration to a separate archive preserves photo bytes and student/lesson/payment links", async () => {
  const local = { "semprini:students": JSON.stringify([student]), "semprini:calendar:appointments:v1": JSON.stringify([lesson]),
    "semprini:materie:v1:matematica:topic:Algebra": "Nota TEST", "semprini:future:TEST": "opaque" };
  const source = environment(local); use(source); await writePhoto(source, photo);
  const collected = await collectArchives();
  assert.equal(collected.legacyPhotos.length, 1);
  const encrypted = await encryptBackup(makePayload(collected, "TEST-MIGRATION"), "TEST-password-migrazione");
  assert.ok(!encrypted.includes(student.id));
  const payload = await decryptBackup(encrypted, "TEST-password-migrazione");
  const destination = environment(); use(destination);
  await restoreArchives(payload, await collectArchives());
  for (const [key, value] of Object.entries(local)) {
    if (key === "semprini:future:TEST") {
      assert.equal(payload.archives.unknownLocal[key], value);
      assert.equal(destination.browser.localStorage.getItem(key), null);
    } else assert.equal(destination.browser.localStorage.getItem(key), value, key);
    assert.equal(source.browser.localStorage.getItem(key), value, "source must remain intact");
  }
  const restored = await readPhoto(destination, photoKey);
  assert.equal(restored.studentId, student.id);
  assert.equal(restored.blob.type, photo.blob.type);
  assert.deepEqual(await restored.blob.arrayBuffer(), await photo.blob.arrayBuffer());
  const restoredStudent = JSON.parse(destination.browser.localStorage.getItem("semprini:students"))[0];
  const restoredLesson = JSON.parse(destination.browser.localStorage.getItem("semprini:calendar:appointments:v1"))[0];
  assert.equal(restoredStudent.avatarUrl, "student-photo:v1:" + restored.key);
  assert.equal(restoredLesson.studentId, restoredStudent.id);
  assert.equal(restoredLesson.paymentMovements[0].id, "TEST-payment");
  await restoreArchives(payload, await collectArchives()); // re-import is idempotent for photos
  assert.deepEqual(await (await readPhoto(destination, photoKey)).blob.arrayBuffer(), await photo.blob.arrayBuffer());
});

test("a photo collision blocks restore before replacing existing operational records", async () => {
  const source = environment({ "semprini:students": JSON.stringify([student]) }); use(source);
  await writePhoto(source, photo);
  const payload = makePayload(await collectArchives(), "TEST-COLLISION");
  const previousStudents = JSON.stringify([{ id: "TEST-existing", firstName: "Existing" }]);
  const destination = environment({ "semprini:students": previousStudents }); use(destination);
  await writePhoto(destination, { ...photo, blob: new Blob(["different TEST photo"], { type: "image/png" }) });
  await assert.rejects(restoreArchives(payload, await collectArchives()), /Fotografie legacy non ripristinate/);
  assert.equal(destination.browser.localStorage.getItem("semprini:students"), previousStudents);
  assert.equal(await (await readPhoto(destination, photoKey)).blob.text(), "different TEST photo");
});
