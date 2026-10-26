import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
function storage() {
  const data = new Map();
  return { data, rejectWrite: false, rejectRead: false,
    getItem(key) { if (this.rejectRead) throw new Error("read denied"); return data.get(key) ?? null; },
    setItem(key, value) { if (this.rejectWrite) throw new Error("quota"); data.set(key, value); },
    removeItem(key) { data.delete(key); },
  };
}
function setup() {
  const local = storage(), session = storage(), cache = new Map();
  const browser = { localStorage: local, sessionStorage: session };
  function load(file) {
    const path = resolve(root, file);
    if (cache.has(path)) return cache.get(path);
    const exports = {};
    cache.set(path, exports);
    const code = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    new Function("require", "exports", "window", code)(
      (name) => load(resolve(dirname(path), `${name}.ts`)), exports, browser,
    );
    return exports;
  }
  return { local, session, students: load("app/data/student-storage.ts"), lessons: load("app/data/calendario/calendar-storage.ts"), result: load("app/data/save-result.ts") };
}
const student = (id) => ({ id, firstName: "Ada", lastName: "Prova", subjects: ["Fisica"],
  books: [{ title: "Fisica", publisher: "Editore" }], notes: "Nota", enrollmentDate: "2026-01-01" });
const lesson = (id) => ({ id, studentId: "student-test", studentNameSnapshot: "Ada Prova", subject: "Fisica",
  date: "2026-10-18", startTime: "10:00", durationMinutes: 60, mode: "online", status: "svolta",
  topic: "Ottica", notes: "Annotazione", hourlyRateCents: 2000, lessonAmountCents: 2000,
  paidAmountCents: 500, paymentStatus: "parziale", source: "manuale", createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z" });

test("verified persistent saves survive reload and preserve other records", () => {
  const c = setup();
  assert.equal(c.students.saveStoredStudentResult(student("first")).status, "saved");
  assert.equal(c.students.saveStoredStudentResult(student("second")).status, "saved");
  assert.equal(c.lessons.upsertCalendarAppointmentResult(lesson("one")).status, "saved");
  assert.equal(c.lessons.upsertCalendarAppointmentResult(lesson("two")).status, "saved");
  assert.deepEqual(c.students.loadStoredStudents().map((x) => x.id).sort(), ["first", "second"]);
  assert.deepEqual(c.lessons.loadCalendarAppointments().map((x) => x.id).sort(), ["one", "two"]);
  assert.equal(c.lessons.loadCalendarAppointments()[0].notes, "Annotazione");
});

test("rejected persistent writes fall back only to verified session storage", () => {
  const c = setup();
  c.local.rejectWrite = true;
  assert.equal(c.students.saveStoredStudentResult(student("first")).status, "temporary");
  assert.equal(c.lessons.upsertCalendarAppointmentResult(lesson("one")).status, "temporary");
  assert.equal(c.students.getStoredStudentById("first").id, "first");
  assert.equal(c.lessons.loadCalendarAppointments()[0].notes, "Annotazione");
  assert.equal(c.local.data.size, 0);
  assert.match(c.result.TEMPORARY_SAVE_WARNING, /soltanto in questa sessione/);
});

test("failed fallback and unreadable writes never report saved", () => {
  const c = setup();
  c.local.rejectWrite = true;
  c.session.rejectWrite = true;
  assert.equal(c.students.saveStoredStudentResult(student("first")).status, "failed");
  assert.equal(c.lessons.upsertCalendarAppointmentResult(lesson("one")).status, "failed");
  c.session.rejectWrite = false;
  c.local.rejectRead = true;
  assert.equal(c.lessons.upsertCalendarAppointmentResult(lesson("one")).status, "temporary");
  assert.equal(c.local.data.has(c.lessons.CALENDAR_APPOINTMENTS_STORAGE_KEY), false);
});

test("readback mismatch rejects persistent success and retains session fallback", () => {
  const c = setup();
  c.local.getItem = () => null;
  assert.equal(c.students.saveStoredStudentResult(student("first")).status, "temporary");
  assert.equal(c.lessons.upsertCalendarAppointmentResult(lesson("one")).status, "temporary");
  assert.equal(c.session.data.has(c.students.STUDENTS_STORAGE_KEY), true);
  assert.equal(c.session.data.has(c.lessons.CALENDAR_APPOINTMENTS_STORAGE_KEY), true);
});

test("a failed update leaves existing student, appointment and recurring series untouched", () => {
  const c = setup();
  const series = { ...lesson("weekly"), startsOn: "2026-10-19", recurrence: { frequency: "weekly", intervalWeeks: 1 },
    startTime: "11:00" };
  delete series.date;
  assert.equal(c.students.saveStoredStudentResult(student("first")).status, "saved");
  assert.equal(c.lessons.upsertCalendarAppointmentResult(lesson("one")).status, "saved");
  assert.equal(c.lessons.upsertCalendarSeriesResult(series).status, "saved");
  const before = new Map(c.local.data);
  c.local.rejectWrite = true;
  c.session.rejectWrite = true;
  assert.equal(c.students.saveStoredStudentResult({ id: "first", firstName: "Changed" }).status, "failed");
  assert.equal(c.lessons.upsertCalendarAppointmentResult({ ...lesson("one"), notes: "Changed" }).status, "failed");
  assert.equal(c.lessons.upsertCalendarSeriesResult({ ...series, notes: "Changed" }).status, "failed");
  assert.deepEqual(c.local.data, before);
  assert.equal(c.students.getStoredStudentById("first").firstName, "Ada");
  assert.equal(c.lessons.loadCalendarAppointments()[0].notes, "Annotazione");
  assert.equal(c.lessons.loadCalendarSeries()[0].notes, "Annotazione");
});
