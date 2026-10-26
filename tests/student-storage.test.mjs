import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const code = ts.transpileModule(readFileSync(new URL("../app/data/student-storage.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const resultCode = ts.transpileModule(readFileSync(new URL("../app/data/save-result.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const adapterCode = ts.transpileModule(readFileSync(new URL("../app/studenti/nuovo/narrative-storage.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mainKey = "semprini:students";
const legacyKey = (id) => `semprini:student-narrative:v1:${id}`;
function memory() {
  const data = new Map();
  return { data, writes: 0, blocked: false,
    getItem(key) { return data.get(key) ?? null; },
    setItem(key, value) { if (this.blocked) throw new Error("quota"); this.writes++; data.set(key, value); },
    removeItem() { throw new Error("Tests must never delete stored data"); },
  };
}
function setup() {
  const local = memory(), session = memory(), api = {}, adapter = {};
  const result = {};
  new Function("exports", resultCode)(result);
  new Function("exports", "require", "window", code)(api, () => result, { localStorage: local, sessionStorage: session });
  new Function("exports", "require", adapterCode)(adapter, () => api);
  return { local, session, api, adapter };
}
const student = (id = "fictional-a") => ({
  id, firstName: "Test", lastName: "Studente", enrollmentDate: "2025-09-01",
  birthDate: "2010-01-10", school: "Scuola fittizia", gradeClass: "2", section: "B",
  phone: "000000", whatsapp: "000000", email: "test@example.invalid",
  address: "Indirizzo fittizio", city: "Test", province: "TT", subjects: ["Fisica"],
  primaryParent: "Referente storico", primaryParentPhone: "111", primaryParentWhatsapp: "111",
  primaryParentEmail: "parent@example.invalid", personalNotes: "Nota originale", familyNotes: "Famiglia",
  textbooks: { math: "Libro originale", physics: "", chemistry: "" }, books: [{ title: "Test", publisher: "Editore" }],
  lessonMode: "online", lessonRateCents: 2500, lessonDurationMinutes: 60, updatedAt: "2025-10-01T00:00:00.000Z",
});
const narrative = (id) => ({ version: 1, studentId: id, description: "Curioso", passion: "Fisica",
  interests: "Arte", freeTime: "Leggere", gender: "neutro", studyCourse: "Scientifico",
  origin: "Test", character: "Riflessivo", strengths: "Logica", ambitions: "Ricerca",
  preferences: "Mattina", tariffId: "tariff-test" });

test("existing records and calendar/payment keys remain intact", () => {
  const { local, api } = setup();
  const initial = student();
  local.data.set(mainKey, JSON.stringify([initial]));
  local.data.set("calendar-fixture", JSON.stringify([{ studentId: initial.id }]));
  local.data.set("payments-fixture", JSON.stringify([{ studentId: initial.id, cents: 2500 }]));
  const unrelated = [local.getItem("calendar-fixture"), local.getItem("payments-fixture")];
  assert.equal(api.loadStoredStudents()[0].id, initial.id);
  assert(api.saveStoredStudent({ id: initial.id, firstName: "Aggiornato" }));
  const loaded = api.loadStoredStudents()[0];
  for (const [key, value] of Object.entries(initial)) if (!["firstName", "updatedAt"].includes(key)) assert.deepEqual(loaded[key], value);
  assert.deepEqual([local.getItem("calendar-fixture"), local.getItem("payments-fixture")], unrelated);
});

test("all optional fields, family contacts and multiple teachers survive reload", () => {
  const { api } = setup();
  const record = { ...student(), ...api.narrativeToStudentFields(narrative("fictional-a")),
    householdMembers: "zia e fratello", primaryContactId: "aunt",
    familyContacts: [{ id: "aunt", firstName: "Test", lastName: "Tutrice", relationship: "tutrice", phone: "222", whatsapp: "333", email: "aunt@example.invalid" }],
    teachers: [{ id: "t1", firstName: "Uno", lastName: "Test", subject: "Fisica" }, { id: "t2", firstName: "Due", lastName: "Test", subject: "Matematica", email: "teacher@example.invalid" }],
    topicsToDeepen: "Equazioni", learningStartDate: "2026-10-01", learningGoals: "Autonomia",
  };
  assert(api.saveStoredStudent(record));
  const loaded = api.loadStoredStudents()[0];
  assert.equal(loaded.familyContacts[0].id, "aunt");
  assert.equal(loaded.primaryContactId, "aunt");
  assert.equal(loaded.teachers.length, 2);
  for (const key of ["householdMembers", "learningGoals", "topicsToDeepen", "learningStartDate", "firstImpressions", "preferredActivities", "passions", "studyCourse"]) assert.equal(loaded[key], record[key]);
  assert(!("age" in loaded));
  assert(api.saveStoredStudent({ id: record.id, familyContacts: [{ id: "aunt", firstName: "Nuovo", lastName: "" }], teachers: [{ id: "t1", firstName: "Uno", lastName: "Test", subject: "Fisica", phone: "444" }] }));
  const updated = api.loadStoredStudents()[0];
  assert.equal(updated.familyContacts[0].lastName, "Tutrice");
  assert.equal(updated.familyContacts[0].email, "aunt@example.invalid");
  assert.equal(updated.teachers.length, 2);
  assert(api.saveStoredStudent(student("fictional-b")));
  assert.equal(api.loadStoredStudents().find((item) => item.id === "fictional-b").familyContacts, undefined);
});

test("multiple books survive repeated saves and individual removal on the same record", () => {
  const { api } = setup();
  const initial = { ...student(), books: [
    { title: "Primo", publisher: "Editore A" },
    { title: "Secondo", publisher: "Editore B" },
  ], avatarUrl: "photo:test-existing" };
  assert(api.saveStoredStudent(initial));
  const reopened = api.getStoredStudentById(initial.id);
  assert.deepEqual(reopened.books, initial.books);
  assert(api.saveStoredStudent({ ...reopened, books: [reopened.books[1]] }, { replaceFields: ["books"] }));
  const again = api.getStoredStudentById(initial.id);
  assert.equal(api.loadStoredStudents().length, 1);
  assert.deepEqual(again.books, [{ title: "Secondo", publisher: "Editore B" }]);
  assert.equal(again.avatarUrl, initial.avatarUrl);
});

test("empty incomplete forms preserve values; explicit clears remain possible", () => {
  const { api } = setup();
  assert(api.saveStoredStudent({ ...student(), interests: "Scienza" }));
  assert(api.saveStoredStudent({ id: "fictional-a", personalNotes: "", interests: undefined, subjects: [], textbooks: {}, enrollmentDate: "2030-01-01", lessonRateCents: 0 }));
  let loaded = api.loadStoredStudents()[0];
  assert.equal(loaded.personalNotes, "Nota originale");
  assert.equal(loaded.interests, "Scienza");
  assert.equal(loaded.enrollmentDate, "2025-09-01");
  assert.equal(loaded.lessonRateCents, 0);
  assert.deepEqual(loaded.subjects, ["Fisica"]);
  assert(api.saveStoredStudent({ id: loaded.id, personalNotes: "" }, { replaceFields: ["personalNotes"] }));
  loaded = api.loadStoredStudents()[0];
  assert.equal(loaded.personalNotes, "");
});

test("legacy recovery uses IDs, is idempotent and preserves original bytes", () => {
  const { local, api } = setup();
  local.data.set(mainKey, JSON.stringify([{ ...student(), firstImpressions: "Già presente" }, student("fictional-b")]));
  const original = JSON.stringify(narrative("fictional-a"));
  local.data.set(legacyKey("fictional-a"), original);
  local.data.set(legacyKey("orphan"), JSON.stringify(narrative("orphan")));
  const report = api.recoverLegacyStudentNarratives();
  assert.deepEqual(report.importedIds, ["fictional-a"]);
  const writes = local.writes;
  const loaded = api.loadStoredStudents();
  assert.equal(local.writes, writes);
  assert.equal(loaded.length, 2);
  assert.equal(loaded.find((s) => s.id === "fictional-a").firstImpressions, "Già presente");
  assert.equal(loaded.find((s) => s.id === "fictional-a").passions, "Fisica");
  assert.equal(loaded.find((s) => s.id === "fictional-b").passions, undefined);
  assert.equal(local.getItem(legacyKey("fictional-a")), original);
  assert(api.saveStoredStudent({ id: "fictional-a", passions: "" }, { replaceFields: ["passions"] }));
  assert(!api.loadStoredStudents().find((s) => s.id === "fictional-a").passions);
});

test("mismatched or malformed legacy records are not imported", () => {
  const { local, api } = setup();
  local.data.set(mainKey, JSON.stringify([student()]));
  local.data.set(legacyKey("fictional-a"), JSON.stringify(narrative("fictional-b")));
  assert.deepEqual(api.recoverLegacyStudentNarratives().invalidIds, ["fictional-a"]);
  assert.equal(local.writes, 0);
});

test("failed migration keeps main and legacy archives unchanged and can be retried", () => {
  const { local, session, api } = setup();
  const original = JSON.stringify([student()]);
  local.data.set(mainKey, original);
  local.data.set(legacyKey("fictional-a"), JSON.stringify(narrative("fictional-a")));
  local.blocked = session.blocked = true;
  const report = api.recoverLegacyStudentNarratives();
  assert(report.blocked);
  assert.deepEqual(report.pendingIds, ["fictional-a"]);
  assert.equal(local.getItem(mainKey), original);
  local.blocked = false;
  assert.deepEqual(api.recoverLegacyStudentNarratives().importedIds, ["fictional-a"]);
});

test("corrupt main archive refuses writes without replacing recoverable data", () => {
  const { local, api } = setup();
  local.data.set(mainKey, "{broken");
  assert.equal(api.saveStoredStudent(student()), false);
  assert.equal(local.getItem(mainKey), "{broken");
});

test("session fallback preserves both students and does not resurrect intentional clears", () => {
  const { local, session, api } = setup();
  local.data.set(mainKey, JSON.stringify([student(), student("fictional-b")]));
  local.blocked = true;
  assert(api.saveStoredStudent({ id: "fictional-a", personalNotes: "" }, { replaceFields: ["personalNotes"] }));
  assert(session.getItem(mainKey));
  assert.equal(api.loadStoredStudents().find((s) => s.id === "fictional-a").personalNotes, "");
  assert.equal(api.loadStoredStudents().length, 2);
});

test("compatibility narrative adapter writes only the main archive", () => {
  const { local, api, adapter } = setup();
  assert(api.saveStoredStudent(student()));
  assert(adapter.saveNarrative("fictional-a", narrative("fictional-a")));
  assert.equal(adapter.loadNarrative("fictional-a").description, "Curioso");
  assert.equal(local.getItem(legacyKey("fictional-a")), null);
  assert.equal(adapter.saveNarrative("missing", narrative("missing")), false);
});

test("optional fields and invalid family references are handled safely", () => {
  const { api } = setup();
  assert(api.saveStoredStudent({ id: "minimal", firstName: "Test" }));
  assert.equal(api.loadStoredStudents()[0].teachers, undefined);
  assert.equal(api.saveStoredStudent({ id: "minimal", primaryContactId: "other-student-contact" }), false);
  assert.equal(api.saveStoredStudent({ id: "minimal", teachers: [{ firstName: "Missing ID" }] }), false);
  assert.equal(api.loadStoredStudents()[0].primaryContactId, undefined);
});
