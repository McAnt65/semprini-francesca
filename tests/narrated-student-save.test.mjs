import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function load(path, requireModule = () => ({}), window = {}) {
  const output = {};
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function("exports", "require", "window", code)(output, requireModule, window);
  return output;
}
function memory() {
  const values = new Map();
  return { blocked: false, getItem: (key) => values.get(key) ?? null, setItem(key, value) { if (this.blocked) throw Error("quota"); values.set(key, value); }, removeItem: (key) => values.delete(key), values };
}
function setup() {
  const local = memory(), session = memory();
  const result = load("../app/data/save-result.ts");
  const storage = load("../app/data/student-storage.ts", () => result, { localStorage: local, sessionStorage: session });
  const edit = load("../app/studenti/student-edit.ts");
  const prepare = load("../app/studenti/nuovo/narrated-student-save.ts").prepareNarratedStudentSave;
  const base = { id: "narrated-test", enrollmentDate: "2026-01-01", status: "archived", firstName: "Ada", lastName: "Prova", birthDate: "2010-01-01", school: "Scuola prova", gradeClass: "2", phone: "000", whatsapp: "111", email: "test@example.invalid", address: "Via prova", city: "Città prova", subjects: ["Fisica"], textbooks: {}, primaryParent: "Storico", familyContacts: [{ id: "madre", firstName: "Maria", lastName: "Prova", relationship: "madre", phone: "222", note: "storica" }, { id: "zio", firstName: "Leo", lastName: "Prova", relationship: "zio", phone: "333" }], primaryContactId: "zio", books: [{ title: "Fisica", publisher: "Editore A", edition: "terza" }], lessonMode: "online", lessonDurationMinutes: 60, lessonRateCents: 2000 };
  function save(student, previous = null) { const { record, replaceFields } = prepare(student, previous, student.id, "2026-10-18"); return storage.saveStoredStudentResult(record, { replaceFields }); }
  return { local, session, storage, edit, prepare, base, save };
}

test("creation persists and rereads a structured student", () => { const c = setup(); assert.equal(c.save(c.base).status, "saved"); assert.equal(c.storage.getStoredStudentById(c.base.id).firstName, "Ada"); });
test("editing keeps ID, status, linked appointments and untouched fields", () => { const c = setup(); c.save(c.base); c.local.setItem("semprini:calendar:appointments:v1", JSON.stringify([{ id: "lesson", studentId: c.base.id }])); const before = c.storage.getStoredStudentById(c.base.id); const draft = { ...before, email: "changed@example.invalid" }; assert.equal(c.save(draft, before).status, "saved"); const after = c.storage.getStoredStudentById(c.base.id); assert.equal(after.id, before.id); assert.equal(after.status, "archived"); assert.deepEqual(after.subjects, before.subjects); assert.equal(after.address, before.address); assert.match(c.local.getItem("semprini:calendar:appointments:v1"), /lesson/); });
test("book title and publisher edits preserve other attributes", () => { const c = setup(); c.save(c.base); const before = c.storage.getStoredStudentById(c.base.id); const title = c.edit.changeBookField(before, 0, "title", "Algebra"); const publisher = c.edit.changeBookField(title, 0, "publisher", "Editore B"); c.save(publisher, before); assert.deepEqual(c.storage.getStoredStudentById(c.base.id).books[0], { title: "Algebra", publisher: "Editore B", edition: "terza" }); });
test("book addition and last book removal persist", () => { const c = setup(); c.save(c.base); let before = c.storage.getStoredStudentById(c.base.id); let draft = c.edit.addStudentBook(before); draft = c.edit.changeBookField(draft, 1, "title", "Chimica"); c.save(draft, before); before = c.storage.getStoredStudentById(c.base.id); assert.equal(before.books.length, 2); draft = c.edit.removeStudentBook(c.edit.removeStudentBook(before, 1), 0); c.save(draft, before); assert.deepEqual(c.storage.getStoredStudentById(c.base.id).books, []); });
test("phone, WhatsApp and email remain independent, including explicit clearing", () => { const c = setup(); c.save(c.base); const before = c.storage.getStoredStudentById(c.base.id); c.save({ ...before, phone: "", email: "" }, before); const after = c.storage.getStoredStudentById(c.base.id); assert.equal(after.phone, ""); assert.equal(after.email, ""); assert.equal(after.whatsapp, "111"); });
test("family contacts and primary contact survive unrelated changes", () => { const c = setup(); c.save(c.base); const before = c.storage.getStoredStudentById(c.base.id); c.save({ ...before, firstName: "Adele" }, before); const after = c.storage.getStoredStudentById(c.base.id); assert.deepEqual(after.familyContacts, before.familyContacts); assert.equal(after.primaryContactId, "zio"); assert.equal(after.primaryParent, "Storico"); });
test("lesson preferences update without changing appointments", () => { const c = setup(); c.save(c.base); c.local.setItem("semprini:calendar:appointments:v1", "[{\"id\":\"lesson\",\"amountCents\":2000}]"); const before = c.storage.getStoredStudentById(c.base.id); c.save({ ...before, lessonMode: "domicilio", lessonDurationMinutes: 90, lessonRateCents: 2500 }, before); const after = c.storage.getStoredStudentById(c.base.id); assert.equal(after.lessonMode, "domicilio"); assert.equal(after.lessonDurationMinutes, 90); assert.equal(after.lessonRateCents, 2500); assert.match(c.local.getItem("semprini:calendar:appointments:v1"), /2000/); });
test("temporary save and failure leave the draft available", () => { const c = setup(); const draft = { ...c.base, firstName: "Bozza" }; c.local.blocked = true; assert.equal(c.save(draft).status, "temporary"); assert.equal(draft.firstName, "Bozza"); c.session.blocked = true; assert.equal(c.save({ ...draft, firstName: "Seconda bozza" }).status, "failed"); assert.equal(draft.firstName, "Bozza"); });
test("unexposed historical fields survive a narrated edit", () => { const c = setup(); const original = { ...c.base, postalCode: "47800", province: "RN", familyNotes: "Nota storica", usefulReferences: "Riferimento storico" }; c.save(original); const before = c.storage.getStoredStudentById(original.id); const { record, replaceFields } = c.prepare({ ...before, personalNotes: "Nota aggiornata" }, before, before.id, "2026-10-18"); for (const key of ["postalCode", "province", "familyNotes", "usefulReferences"]) assert(!replaceFields.includes(key)); assert.equal(c.storage.saveStoredStudentResult(record, { replaceFields }).status, "saved"); const after = c.storage.getStoredStudentById(original.id); for (const key of ["postalCode", "province", "familyNotes", "usefulReferences"]) assert.equal(after[key], original[key]); assert.equal(after.personalNotes, "Nota aggiornata"); });

test("a missing legacy photo Blob never blocks editing, reloading or archiving", () => {
  const c = setup();
  const reference = "student-photo:v1:narrated-test:missing-blob";
  c.local.setItem("semprini:students", JSON.stringify([{ ...c.base, avatarUrl: reference }]));
  const before = c.storage.getStoredStudentById(c.base.id);
  const { record, replaceFields } = c.prepare({ ...before, personalNotes: "Appunto fittizio aggiornato" }, before, before.id, "2026-10-18");
  assert(!replaceFields.includes("avatarUrl"));
  assert.equal(c.storage.saveStoredStudentResult(record, { replaceFields }).status, "saved");
  assert.equal(c.storage.getStoredStudentById(c.base.id).avatarUrl, reference);
  assert.equal(c.storage.archiveStoredStudentResult(c.base.id).status, "saved");
  assert.equal(c.storage.getStoredStudentById(c.base.id).avatarUrl, reference);
  assert.equal(c.storage.getStoredStudentById(c.base.id).status, "archived");
});

test("historical data URL remains byte for byte unchanged after an ordinary edit", () => {
  const c = setup();
  const legacy = "  data:image/png;base64,VEVTVA==  ";
  c.local.setItem("semprini:students", JSON.stringify([{ ...c.base, avatarUrl: legacy }]));
  const before = c.storage.getStoredStudentById(c.base.id);
  assert.equal(c.save({ ...before, phone: "999" }, before).status, "saved");
  assert.equal(c.storage.getStoredStudentById(c.base.id).avatarUrl, legacy);
});

test("a legacy photo reference does not change the temporary or failed save result", () => {
  const c = setup();
  const legacy = "student-photo:v1:narrated-test:unreadable";
  c.local.setItem("semprini:students", JSON.stringify([{ ...c.base, avatarUrl: legacy }]));
  const before = c.storage.getStoredStudentById(c.base.id);
  c.local.blocked = true;
  assert.equal(c.save({ ...before, phone: "999" }, before).status, "temporary");
  assert.equal(c.storage.getStoredStudentById(c.base.id).avatarUrl, legacy);
  c.session.blocked = true;
  assert.equal(c.save({ ...before, phone: "888" }, before).status, "failed");
  assert.equal(c.local.getItem("semprini:students"), JSON.stringify([{ ...c.base, avatarUrl: legacy }]));
});
