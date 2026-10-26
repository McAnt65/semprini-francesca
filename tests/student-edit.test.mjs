import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function moduleCode(path) {
  return ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
}
const storageCode = moduleCode("../app/data/student-storage.ts");
const resultCode = moduleCode("../app/data/save-result.ts");
const editCode = moduleCode("../app/studenti/student-edit.ts");
const narrativeCode = moduleCode("../app/studenti/nuovo/narrative-storage.ts");

function memory() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
    data,
  };
}
function setup() {
  const local = memory(), session = memory(), storage = {}, edit = {}, narrative = {};
  const result = {};
  new Function("exports", resultCode)(result);
  new Function("exports", "require", "window", storageCode)(storage, () => result, { localStorage: local, sessionStorage: session });
  new Function("exports", editCode)(edit);
  new Function("exports", "require", narrativeCode)(narrative, () => storage);
  const original = {
    id: "student-test-1", status: "active", enrollmentDate: "2026-01-01", firstName: "Ada", lastName: "Prova",
    birthDate: "2010-01-01", school: "Scuola inventata", schoolName: "Scuola inventata", gradeClass: "2",
    phone: "000000", whatsapp: "000000", email: "ada@example.invalid", address: "Via di prova 1",
    postalCode: "00000", city: "Comune fittizio", province: "ZZ", subjects: ["Matematica"],
    primaryParent: "Referente", primaryParentPhone: "000001", primaryParentWhatsapp: "000001",
    primaryParentEmail: "referente@example.invalid", textbooks: { math: "Libro precedente" },
    books: [{ title: "Algebra", publisher: "Editore A", edition: "seconda" }, { title: "Geometria", publisher: "Editore B" }],
    personalNotes: "Nota personale", familyNotes: "Nota famiglia", lessonMode: "casa", updatedAt: "2026-01-01T00:00:00Z",
  };
  assert(storage.saveStoredStudent(original));
  local.setItem("semprini:calendar:appointments:v1", JSON.stringify([{ id: "lesson-test-1", studentId: original.id }]));
  return { local, storage, edit, narrative, original };
}
function saveEdit(context, edited, fields) {
  const { record, replaceFields } = context.edit.prepareStudentFormSave(edited, edited.id, new Set(fields));
  assert(context.storage.saveStoredStudent(record, { replaceFields }));
  return context.storage.getStoredStudentById(edited.id);
}

test("opening and saving unchanged preserves the complete record", () => {
  const c = setup();
  const before = c.storage.getStoredStudentById(c.original.id);
  const after = saveEdit(c, before, []);
  for (const key of Object.keys(before)) if (key !== "updatedAt") assert.deepEqual(after[key], before[key], key);
});
test("editing only a book title preserves its publisher", () => {
  const c = setup();
  const student = c.edit.changeBookField(c.storage.getStoredStudentById(c.original.id), 0, "title", "Analisi");
  const after = saveEdit(c, student, ["books"]);
  assert.equal(after.books[0].title, "Analisi");
  assert.equal(after.books[0].publisher, "Editore A");
});
test("editing only a publisher preserves its title", () => {
  const c = setup();
  const student = c.edit.changeBookField(c.storage.getStoredStudentById(c.original.id), 0, "publisher", "Editore Nuovo");
  const after = saveEdit(c, student, ["books"]);
  assert.equal(after.books[0].title, "Algebra");
  assert.equal(after.books[0].publisher, "Editore Nuovo");
});
test("other existing book attributes survive a field edit and reload", () => {
  const c = setup();
  const student = c.edit.changeBookField(c.storage.getStoredStudentById(c.original.id), 0, "title", "Analisi");
  assert.equal(saveEdit(c, student, ["books"]).books[0].edition, "seconda");
});
test("adding a book leaves the existing books intact", () => {
  const c = setup();
  let student = c.edit.addStudentBook(c.storage.getStoredStudentById(c.original.id));
  student = c.edit.changeBookField(student, 2, "title", "Fisica");
  student = c.edit.changeBookField(student, 2, "publisher", "Editore C");
  const after = saveEdit(c, student, ["books"]);
  assert.equal(after.books.length, 3);
  assert.deepEqual(after.books[2], { title: "Fisica", publisher: "Editore C" });
});
test("removing one book keeps the other book and its metadata", () => {
  const c = setup();
  const student = c.edit.removeStudentBook(c.storage.getStoredStudentById(c.original.id), 1);
  const after = saveEdit(c, student, ["books"]);
  assert.equal(after.books.length, 1);
  assert.equal(after.books[0].edition, "seconda");
});
test("removing the last book also prevents a legacy textbook from reappearing", () => {
  const c = setup();
  let student = c.edit.removeStudentBook(c.storage.getStoredStudentById(c.original.id), 1);
  student = c.edit.removeStudentBook(student, 0);
  const after = saveEdit(c, student, ["books", "textbooks"]);
  assert.deepEqual(after.books, []);
  assert.deepEqual(after.textbooks, { math: "", physics: "", chemistry: "" });
  assert.deepEqual(c.edit.booksForEditing(after), []);
});
test("clearing the final book fields does not restore a legacy textbook", () => {
  const c = setup();
  let student = c.edit.removeStudentBook(c.storage.getStoredStudentById(c.original.id), 1);
  student = c.edit.changeBookField(student, 0, "title", "");
  student = c.edit.changeBookField(student, 0, "publisher", "");
  const after = saveEdit(c, student, ["books"]);
  assert.deepEqual(after.books, []);
  assert.deepEqual(c.edit.booksForEditing(after), []);
});
test("clearing phone and email persists empty values", () => {
  const c = setup();
  const before = c.storage.getStoredStudentById(c.original.id);
  const after = saveEdit(c, { ...before, phone: "", whatsapp: "", email: "" }, ["phone", "whatsapp", "email"]);
  assert.equal(after.phone, ""); assert.equal(after.whatsapp, ""); assert.equal(after.email, "");
});
test("clearing address details and editable notes persists empty values", () => {
  const c = setup();
  const before = c.storage.getStoredStudentById(c.original.id);
  const after = saveEdit(c, { ...before, address: "", postalCode: "", city: "", province: "", personalNotes: "" },
    ["address", "postalCode", "city", "province", "personalNotes"]);
  for (const key of ["address", "postalCode", "city", "province", "personalNotes"]) assert.equal(after[key], "");
});
test("untouched values are preserved when one field is cleared", () => {
  const c = setup();
  const before = c.storage.getStoredStudentById(c.original.id);
  const after = saveEdit(c, { ...before, email: "" }, ["email"]);
  for (const key of ["subjects", "status", "books", "familyNotes", "primaryParentPhone", "postalCode"]) assert.deepEqual(after[key], before[key]);
});
test("student ID and linked lessons remain unchanged", () => {
  const c = setup();
  const beforeLessons = c.local.getItem("semprini:calendar:appointments:v1");
  const before = c.storage.getStoredStudentById(c.original.id);
  const after = saveEdit(c, { ...before, email: "" }, ["email"]);
  assert.equal(after.id, c.original.id);
  assert.equal(c.local.getItem("semprini:calendar:appointments:v1"), beforeLessons);
});
test("narrative changes still save through the same record after form edits", () => {
  const c = setup();
  const before = c.storage.getStoredStudentById(c.original.id);
  saveEdit(c, { ...before, email: "" }, ["email"]);
  assert(c.narrative.saveNarrative(c.original.id, { description: "Nuova impressione" }));
  const after = c.storage.getStoredStudentById(c.original.id);
  assert.equal(after.email, "");
  assert.equal(after.books[0].publisher, "Editore A");
  assert.equal(after.firstImpressions, "Nuova impressione");
});
