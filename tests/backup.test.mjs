import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const code = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  module._compile(code, filename);
};
const { collectArchives } = require("../app/data/backup/archives.ts");
const { makePayload, summarize } = require("../app/data/backup/format.ts");
const { encryptBackup, decryptBackup } = require("../app/data/backup/encryption.ts");
const { prepareRestore, restoreArchives, validateSafetyExport } = require("../app/data/backup/restore.ts");
globalThis.indexedDB = { databases: async () => [] };

function memory(initial = {}, fail = () => false) {
  const data = new Map(Object.entries(initial));
  let writes = 0;
  return {
    data, get writes() { return writes; }, get length() { return data.size; }, key(index) { return [...data.keys()][index] ?? null; },
    getItem(key) { return data.get(key) ?? null; },
    setItem(key, value) { if (fail(key, value)) throw new Error("TEST quota"); writes++; data.set(key, String(value)); },
    removeItem(key) { writes++; data.delete(key); },
  };
}
function setup(local = {}, session = {}, fail) {
  const l = memory(local, fail), s = memory(session);
  globalThis.window = { localStorage: l, sessionStorage: s };
  return { local: l, session: s };
}
const json = (value) => JSON.stringify(value);
const stamp = "2026-10-27T10:00:00.000Z";
const student = { id: "test-1", firstName: "Prova", lastName: "Fittizia", status: "active", updatedAt: stamp, subjects: ["Matematica"] };
const lesson = { id: "lesson-1", studentId: "test-1", studentNameSnapshot: "Prova Fittizia",
  subject: "Matematica", mode: "casa", status: "svolta", paymentStatus: "parziale",
  date: "2026-10-27", startTime: "10:00", source: "manuale", lessonAmountCents: 3000,
  paidAmountCents: 1000, paymentMovements: [{ id: "pay-1", kind: "payment", amountCents: 1000,
    paymentDate: "2026-10-27", recordedAt: stamp, operationId: "op-1" }], updatedAt: stamp };
const series = { ...lesson, id: "series-1", startsOn: "2026-10-27", recurrence: { frequency: "weekly", intervalWeeks: 1 } };
const program = { version: 1, entries: [{ kind: "deleted", id: "model-1", updatedAt: stamp }] };

test("export reads both archives without writing and includes unknown keys", async () => {
  const c = setup({ "semprini:students": json([student]), "semprini:future:v2": "opaque" },
    { "semprini:new-lesson-draft:abc": json({ savedAt: 1, draft: {} }) });
  const before = [new Map(c.local.data), new Map(c.session.data)];
  const archives = await collectArchives();
  assert.deepEqual(archives.local["semprini:students"], json([student]));
  assert.equal(archives.unknownLocal["semprini:future:v2"], "opaque");
  assert.equal(c.local.writes + c.session.writes, 0);
  assert.deepEqual(c.local.data, before[0]); assert.deepEqual(c.session.data, before[1]);
});

test("an unreadable required source cannot produce a complete backup", async () => {
  const c = setup({ "semprini:students": json([student]) });
  const previous = globalThis.indexedDB;
  globalThis.indexedDB = { databases: async () => { throw new Error("TEST blocked"); } };
  try { await assert.rejects(collectArchives()); }
  finally { globalThis.indexedDB = previous; }
  assert.equal(c.local.writes + c.session.writes, 0);
});

test("full payload preserves payments, recurrence exceptions, notes and tombstones", async () => {
  setup({ "semprini:students": json([student]),
    "semprini:calendar:appointments:v1": json([{ ...lesson, seriesId: "series-1", originalOccurrenceDate: "2026-10-27" }]),
    "semprini:calendar:series:v1": json([series]),
    "semprini:materie:programmi:v1": json(program),
    "semprini:materie:v1:matematica:topic:Algebra": "Nota TEST" });
  const payload = makePayload(await collectArchives(), "TEST");
  const result = summarize(payload);
  assert.equal(result.students, 1); assert.equal(result.appointments, 1);
  assert.equal(result.series, 1); assert.equal(result.paymentMovements, 1);
  assert.equal(result.deletedPrograms, 1); assert.equal(result.subjectNotes, 1);
  assert.deepEqual(prepareRestore(payload).local["semprini:calendar:appointments:v1"],
    json([{ ...lesson, seriesId: "series-1", originalOccurrenceDate: "2026-10-27" }]));
});

test("temporary tariff snapshot wins and becomes persistent on restore", async () => {
  const older = { id: "t", code: "T1", subject: "Matematica", schoolBand: "Liceo", mode: "casa", hourlyRateCents: 2000, updatedAt: stamp };
  const newer = { ...older, hourlyRateCents: 3000 };
  setup({ "semprini:tariffs:v1": json([older]) },
    { "semprini:tariffs:v1": json([newer]), "semprini:tariffs:v1:temporary-snapshot": "yes" });
  const payload = makePayload(await collectArchives(), "TEST");
  const plan = prepareRestore(payload);
  assert.equal(plan.local["semprini:tariffs:v1"], json([newer]));
  assert.equal(plan.session["semprini:tariffs:v1"], undefined);
  assert.equal(payload.archives.local["semprini:tariffs:v1"], json([older]));
});

test("all operational key families and temporary drafts are included", async () => {
  const catalog = { version: 1, topics: { matematica: [], fisica: [], chimica: [] } };
  const local = { "semprini:students": json([student]),
    "semprini:calendar:appointments:v1": json([lesson]),
    "semprini:calendar:series:v1": json([series]),
    "semprini:calendar:requests:v1": "[]",
    "semprini:calendar:monthly-notes:v1": json({ "2026-10": "Nota TEST" }),
    "semprini:tariffs:v1": "[]", "semprini:materie:programmi:v1": json(program),
    "semprini:materie:argomenti:v1": json(catalog),
    "semprini:materie:v1:matematica:topic:Algebra": "Appunto TEST",
    "semprini:materie:v1:fisica:quick:Formule": "Formula TEST",
    "semprini:preferences:v1": json({ lessonLocation: { street: "Via TEST" } }),
    "semprini:assistenza:v1": json({ dismissedWelcome: true }),
    "semprini:student-guided-draft:v1": json({ version: 1, student: { firstName: "Bozza", lastName: "" }, confirmed: [], stepId: "lastName", pending: {} }),
    "semprini:student-narrative:v1:test-1": json({ version: 1, studentId: "test-1" }),
    "semprini:test-dati:manifest:v1": json({ students: ["test-1"] }),
    "semprini:test-dati:trasferimento:v1": json({ test: true }) };
  const session = { "semprini:new-student:personal-data": json({ firstName: "Bozza" }),
    "semprini:new-lesson-draft:abc": json({ savedAt: 1, draft: {} }) };
  setup(local, session);
  const payload = makePayload(await collectArchives(), "TEST");
  assert.deepEqual(Object.keys(payload.archives.local).sort(), Object.keys(local).sort());
  assert.deepEqual(Object.keys(payload.archives.session).sort(), Object.keys(session).sort());
  assert.equal(prepareRestore(payload).session["semprini:new-lesson-draft:abc"], session["semprini:new-lesson-draft:abc"]);
  assert.equal(prepareRestore(payload).local["semprini:student-guided-draft:v1"], local["semprini:student-guided-draft:v1"]);
});

test("a program deletion marker wins over an older model during promotion", async () => {
  const model = { id: "model-1", kind: "model", name: "TEST", subject: "matematica",
    gradeClass: "1", schoolType: "Liceo", topics: [], notes: "", createdAt: stamp,
    updatedAt: "2026-10-26T10:00:00.000Z" };
  setup({ "semprini:materie:programmi:v1": json({ version: 1, entries: [model] }) },
    { "semprini:materie:programmi:v1": json(program) });
  const plan = prepareRestore(makePayload(await collectArchives(), "TEST"));
  assert.deepEqual(JSON.parse(plan.local["semprini:materie:programmi:v1"]).entries, program.entries);
});

test("legacy narrative fields from both browser archives remain recoverable", async () => {
  const key = "semprini:student-narrative:v1:test-1";
  setup({ [key]: json({ version: 1, studentId: "test-1", interests: "TEST local" }) },
    { [key]: json({ version: 1, studentId: "test-1", passion: "TEST session" }) });
  const plan = prepareRestore(makePayload(await collectArchives(), "TEST"));
  assert.deepEqual(JSON.parse(plan.local[key]), { version: 1, studentId: "test-1",
    passion: "TEST session", interests: "TEST local" });
  assert.equal(plan.session[key], undefined);
});

test("encrypted round trip, wrong password and tampering", async () => {
  setup({ "semprini:students": json([student]) });
  const payload = makePayload(await collectArchives(), "TEST");
  const file = await encryptBackup(payload, "password-fittizia-lunga");
  assert.deepEqual(await decryptBackup(file, "password-fittizia-lunga"), payload);
  assert.equal(file.includes("Prova Fittizia"), false);
  await assert.rejects(decryptBackup(file, "password-sbagliata"), /Password errata/);
  const altered = JSON.parse(file);
  altered.ciphertext = altered.ciphertext.slice(0, -4) + "AAAA";
  await assert.rejects(decryptBackup(JSON.stringify(altered), "password-fittizia-lunga"), /file alterato/);
  altered.header.version = 2;
  await assert.rejects(decryptBackup(JSON.stringify(altered), "password-fittizia-lunga"), /versione/);
});

test("encrypted backup and restore retain historical student attributes and linked records", async () => {
  const historical = { ...student, tariffId: "tariff-TEST", customOrigin: "storico",
    familyContacts: [{ id: "madre", firstName: "M", lastName: "TEST", legacyAttribute: "keep" }],
    teachers: [{ id: "prof", firstName: "P", lastName: "TEST", subject: "Fisica", historicalRoom: "A1" }],
    books: [{ title: "", publisher: "", edition: "storica" }],
    textbooks: { math: "Algebra", latin: "Latino" } };
  const stored = json([historical]);
  setup({ "semprini:students": stored, "semprini:calendar:appointments:v1": json([lesson]) });
  const payload = makePayload(await collectArchives(), "TEST");
  const encrypted = await encryptBackup(payload, "password-TEST-lunga");
  const restored = await decryptBackup(encrypted, "password-TEST-lunga");
  const target = setup();
  await restoreArchives(restored);
  assert.equal(target.local.getItem("semprini:students"), stored);
  assert.equal(target.local.getItem("semprini:calendar:appointments:v1"), json([lesson]));
});

test("incompatible payload version is refused before any write", async () => {
  const c = setup({ "semprini:students": json([student]) });
  const payload = makePayload(await collectArchives(), "TEST");
  assert.throws(() => prepareRestore({ ...payload, version: 2 }), /versione/);
  assert.equal(c.local.writes, 0);
});

test("restore replaces known archives but leaves unknown keys untouched", async () => {
  const payload = makePayload({ local: { "semprini:students": json([student]) }, session: {},
    unknownLocal: { "semprini:future:v2": "from-file" }, unknownSession: {}, legacyPhotos: [] }, "TEST");
  const c = setup({ "semprini:students": json([{ ...student, firstName: "Vecchio" }]),
    "semprini:tariffs:v1": "[]", "semprini:future:v2": "existing" });
  await restoreArchives(payload);
  assert.equal(c.local.getItem("semprini:students"), json([student]));
  assert.equal(c.local.getItem("semprini:tariffs:v1"), null);
  assert.equal(c.local.getItem("semprini:future:v2"), "existing");
});

test("restore to an empty archive makes a temporary student permanent", async () => {
  const payload = makePayload({ local: {}, session: { "semprini:students": json([student]) },
    unknownLocal: {}, unknownSession: {}, legacyPhotos: [] }, "TEST");
  const c = setup();
  await restoreArchives(payload);
  assert.equal(c.local.getItem("semprini:students"), json([student]));
  assert.equal(c.session.getItem("semprini:students"), null);
});

test("restore promotes a complete temporary student without resurrecting cleared fields", async () => {
  const older = { ...student, tariffId: "old-tariff", updatedAt: "2026-10-27T10:00:00.000Z" };
  const newer = { ...student, sempriniStudentSnapshotVersion: 1, updatedAt: "2026-10-28T10:00:00.000Z" };
  const payload = makePayload({ local: { "semprini:students": json([older]) },
    session: { "semprini:students": json([newer]) }, unknownLocal: {}, unknownSession: {}, legacyPhotos: [] }, "TEST");
  assert.deepEqual(validateSafetyExport(payload), { studentConflict: false });
  const target = setup();
  await restoreArchives(payload);
  assert.deepEqual(JSON.parse(target.local.getItem("semprini:students")), [newer]);
  assert.equal(target.session.getItem("semprini:students"), null);
});

test("restore refuses conflicting historical student copies without writing", async () => {
  const older = { ...student, teachers: [{ id: "prof", firstName: "P", historicalRoom: "A1" }] };
  const newer = { ...student, updatedAt: "2026-10-28T10:00:00.000Z",
    teachers: [{ id: "prof", firstName: "P" }] };
  const payload = makePayload({ local: { "semprini:students": json([older]) },
    session: { "semprini:students": json([newer]) }, unknownLocal: {}, unknownSession: {}, legacyPhotos: [] }, "TEST");
  assert.deepEqual(validateSafetyExport(payload), { studentConflict: true });
  const encrypted = await encryptBackup(payload, "TEST-password-12345");
  const recovered = await decryptBackup(encrypted, "TEST-password-12345");
  assert.equal(recovered.archives.local["semprini:students"], json([older]));
  assert.equal(recovered.archives.session["semprini:students"], json([newer]));
  const target = setup();
  await assert.rejects(restoreArchives(payload), /conflitto/);
  assert.equal(target.local.writes + target.session.writes, 0);
});

test("invalid archive aborts before writing", async () => {
  const c = setup({ "semprini:students": json([student]) });
  const payload = makePayload({ local: { "semprini:students": "not-json" }, session: {},
    unknownLocal: {}, unknownSession: {}, legacyPhotos: [] }, "TEST");
  await assert.rejects(restoreArchives(payload), /non leggibile/);
  assert.equal(c.local.getItem("semprini:students"), json([student]));
  assert.equal(c.local.writes, 0);
});

test("validation errors do not reveal identifiers embedded in archive keys", async () => {
  const privateIdentifier = "nome-cognome-test";
  const key = `semprini:student-narrative:v1:${privateIdentifier}`;
  const c = setup({ "semprini:students": json([student]) });
  const payload = makePayload({ local: { [key]: "not-json" }, session: {},
    unknownLocal: {}, unknownSession: {}, legacyPhotos: [] }, "TEST");
  let message = "";
  try { await restoreArchives(payload); } catch (error) { message = error.message; }
  assert.match(message, /non leggibile/);
  assert.equal(message.includes(privateIdentifier), false);
  assert.equal(c.local.writes + c.session.writes, 0);
});

test("restore refuses a current archive changed after the safety copy", async () => {
  const c = setup({ "semprini:students": json([student]) });
  const before = await collectArchives();
  c.local.setItem("semprini:students", json([{ ...student, firstName: "Modificata" }]));
  const writes = c.local.writes;
  const payload = makePayload({ local: { "semprini:students": json([student]) }, session: {},
    unknownLocal: {}, unknownSession: {}, legacyPhotos: [] }, "TEST");
  await assert.rejects(restoreArchives(payload, before), /sono cambiati/);
  assert.equal(c.local.writes, writes);
});

test("write failure rolls back and verifies the prior state", async () => {
  const original = json([student]);
  const replacement = json([{ ...student, firstName: "Nuova" }]);
  const c = setup({ "semprini:students": original }, {}, (key, value) =>
    key === "semprini:tariffs:v1" && value === "[]");
  const payload = makePayload({ local: { "semprini:students": replacement,
    "semprini:tariffs:v1": "[]" }, session: {}, unknownLocal: {}, unknownSession: {}, legacyPhotos: [] }, "TEST");
  await assert.rejects(restoreArchives(payload), /archivi precedenti/);
  assert.equal(c.local.getItem("semprini:students"), original);
  assert.equal(c.local.getItem("semprini:tariffs:v1"), null);
});

test("preview and preparation do not write or restore without an explicit call", async () => {
  const c = setup({ "semprini:students": json([student]) });
  const payload = makePayload(await collectArchives(), "TEST");
  summarize(payload); prepareRestore(payload);
  assert.equal(c.local.writes + c.session.writes, 0);
});
