import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const memory = () => {
  const data = new Map();
  return {
    data,
    writes: 0,
    getItem(key) { return data.get(key) ?? null; },
    setItem(key, value) { this.writes++; data.set(key, value); },
    removeItem() { throw new Error("Il test non deve cancellare dati"); },
  };
};

function setup() {
  const local = memory();
  const session = memory();
  const browser = { localStorage: local, sessionStorage: session };
  const cache = new Map();
  function load(file) {
    const path = resolve(root, file);
    if (cache.has(path)) return cache.get(path).exports;
    const loadedModule = { exports: {} };
    cache.set(path, loadedModule);
    const code = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const requireLocal = (name) => {
      if (!name.startsWith(".")) throw new Error(`Import inatteso: ${name}`);
      return load(resolve(dirname(path), `${name}.ts`));
    };
    new Function("require", "module", "exports", "window", code)(
      requireLocal, loadedModule, loadedModule.exports, browser
    );
    return loadedModule.exports;
  }
  return {
    local,
    students: load("app/data/student-storage.ts"),
    calendar: load("app/data/calendario/calendar-storage.ts"),
    dates: load("app/data/calendario/calendar-dates.ts"),
    utils: load("app/studenti/student-utils.ts"),
    actions: load("app/studenti/archive-actions.ts"),
  };
}

const student = (id = "fictional-student") => ({
  id, firstName: "Ada", lastName: "Esempio", enrollmentDate: "2025-09-01",
  birthDate: "2010-01-10", school: "Scuola fittizia", gradeClass: "2",
  subjects: ["Matematica"], books: [{ title: "Libro fittizio", publisher: "Editore" }],
  personalNotes: "Nota conservata", phone: "000", whatsapp: "", email: "",
  address: "", city: "", primaryParent: "Maria", primaryParentPhone: "",
  primaryParentWhatsapp: "", primaryParentEmail: "", textbooks: {},
});
const lesson = (id, studentId, date, status = "svolta", paidAmountCents = 0) => ({
  id, studentId, studentNameSnapshot: "Ada Esempio", date, startTime: "10:00",
  subject: "Matematica", durationMinutes: 60, mode: "online", status,
  topic: "Argomento fittizio", notes: "Nota fittizia", hourlyRateCents: 3000,
  lessonAmountCents: 3000, paidAmountCents,
  paymentStatus: paidAmountCents >= 3000 ? "pagata" : paidAmountCents > 0 ? "parziale" : "non_pagata",
  source: "manuale", createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

test("annullamento, archiviazione e ripristino conservano lo stesso record e le lezioni", () => {
  const { local, students, calendar, actions } = setup();
  const record = student();
  assert(students.saveStoredStudent(record));
  const fixtures = [lesson("lesson-1", record.id, "2026-10-01", "svolta", 1000)];
  local.data.set(calendar.CALENDAR_APPOINTMENTS_STORAGE_KEY, JSON.stringify(fixtures));
  const calendarBefore = local.getItem(calendar.CALENDAR_APPOINTMENTS_STORAGE_KEY);
  const writesBefore = local.writes;
  let prompt = "";
  assert.equal(actions.archiveStudentAfterConfirmation(record.id, true, (message) => { prompt = message; return false; }), "cancelled");
  assert.match(prompt, /pagamenti in sospeso/);
  assert.equal(local.writes, writesBefore);
  assert.equal(students.getStoredStudentById(record.id).status, "active");
  assert.equal(actions.archiveStudentAfterConfirmation(record.id, true, () => true), "saved");
  const archived = students.getStoredStudentById(record.id);
  assert.equal(archived.id, record.id);
  assert.equal(archived.status, "archived");
  assert.deepEqual(archived.books, record.books);
  assert.equal(archived.personalNotes, record.personalNotes);
  assert.equal(students.loadStoredStudents().length, 1);
  assert.equal(local.getItem(calendar.CALENDAR_APPOINTMENTS_STORAGE_KEY), calendarBefore);
  assert.equal(actions.restoreStudentAfterConfirmation(archived, () => false), "cancelled");
  assert.equal(students.getStoredStudentById(record.id).status, "archived");
  assert.equal(actions.restoreStudentAfterConfirmation(archived, () => true), "saved");
  assert.equal(students.getStoredStudentById(record.id).status, "active");
  assert.equal(students.loadStoredStudents().length, 1);
  assert.equal(local.getItem(calendar.CALENDAR_APPOINTMENTS_STORAGE_KEY), calendarBefore);
});

test("il suggerimento usa lezioni svolte, 90 giorni locali e assenza di lezioni future", () => {
  const { local, calendar, dates, utils } = setup();
  const now = new Date(2026, 9, 17, 12);
  const today = dates.toLocalDate(now);
  assert.equal(utils.loadStudentArchiveOverview("fictional-student", now).suggestArchiving, false);
  local.data.set(calendar.CALENDAR_APPOINTMENTS_STORAGE_KEY, JSON.stringify([
    lesson("recent", "fictional-student", dates.addDays(today, -89)),
  ]));
  assert.equal(utils.loadStudentArchiveOverview("fictional-student", now).suggestArchiving, false);
  const old = lesson("old", "fictional-student", dates.addDays(today, -90));
  local.data.set(calendar.CALENDAR_APPOINTMENTS_STORAGE_KEY, JSON.stringify([old]));
  assert.equal(utils.loadStudentArchiveOverview("fictional-student", now).suggestArchiving, true);
  const future = lesson("future", "fictional-student", dates.addDays(today, 1), "confermata");
  local.data.set(calendar.CALENDAR_APPOINTMENTS_STORAGE_KEY, JSON.stringify([old, future]));
  assert.equal(utils.loadStudentArchiveOverview("fictional-student", now).suggestArchiving, false);
  local.data.set(calendar.CALENDAR_APPOINTMENTS_STORAGE_KEY, JSON.stringify([future]));
  assert.equal(utils.loadStudentArchiveOverview("fictional-student", now).suggestArchiving, false);
});

test("il riepilogo contabile usa importi reali delle lezioni non annullate", () => {
  const { local, calendar, utils } = setup();
  const fixtures = [
    lesson("paid", "fictional-student", "2026-10-01", "svolta", 3000),
    lesson("due", "fictional-student", "2026-10-02", "svolta", 0),
    lesson("cancelled", "fictional-student", "2026-10-03", "annullata", 0),
  ];
  local.data.set(calendar.CALENDAR_APPOINTMENTS_STORAGE_KEY, JSON.stringify(fixtures));
  const overview = utils.loadStudentArchiveOverview("fictional-student", new Date(2026, 9, 17, 12));
  assert.equal(utils.summarizeStudentPayments(overview.lessons).status, "Parzialmente saldato");
  assert.equal(utils.summarizeStudentPayments(overview.lessons).hasOutstanding, true);
});
