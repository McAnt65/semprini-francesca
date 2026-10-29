import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const key = "semprini:students";

function memory() {
  const data = new Map();
  return {
    data, writes: 0,
    getItem(name) { return data.get(name) ?? null; },
    setItem(name, value) { this.writes++; data.set(name, value); },
    removeItem() { throw new Error("La lettura non deve cancellare archivi TEST"); },
  };
}

function setup() {
  const local = memory(), session = memory(), cache = new Map();
  const browser = { localStorage: local, sessionStorage: session };
  function load(file) {
    const path = resolve(root, file);
    if (cache.has(path)) return cache.get(path).exports;
    const loadedModule = { exports: {} };
    cache.set(path, loadedModule);
    const code = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const requireLocal = (name) => {
      if (!name.startsWith(".")) throw Error(`Import inatteso: ${name}`);
      return load(resolve(dirname(path), `${name}.ts`));
    };
    new Function("require", "module", "exports", "window", code)(requireLocal, loadedModule, loadedModule.exports, browser);
    return loadedModule.exports;
  }
  return { local, session, read: load("app/studenti/[id]/card-estesa-read.ts") };
}

const student = (id) => ({
  id, firstName: "Ada", lastName: "TEST", enrollmentDate: "2025-09-01",
  subjects: ["Fisica"], textbooks: { math: "Libro storico TEST" },
  books: [{ title: "Libro TEST", publisher: "Editore TEST", edition: "storica" }],
  familyContacts: [{ id: "zia", firstName: "Anna", lastName: "TEST", historicalNote: "conservare" }],
  teachers: [{ id: "prof", firstName: "Pia", lastName: "TEST", subject: "Fisica", historicalRoom: "A1" }],
  familyNotes: "Nota TEST", tariffId: "tariffa-TEST", legacyAttribute: "conservare",
});
const lesson = (id, studentId) => ({
  id, studentId, studentNameSnapshot: "Ada TEST", date: "2026-10-01", startTime: "10:00",
  subject: "Fisica", durationMinutes: 60, mode: "casa", status: "svolta",
  topic: "Ottica TEST", coveredTopic: "Lenti TEST", notes: "Nota lezione TEST",
  hourlyRateCents: 3000, lessonAmountCents: 3000, paidAmountCents: 1000,
  paymentStatus: "parziale", paymentMovements: [{ id: "pay-TEST", kind: "payment", amountCents: 1000,
    paymentDate: "2026-10-01", recordedAt: "2026-10-01T10:00:00Z", operationId: "op-TEST" }],
  source: "manuale", createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:00:00Z",
});

test("Card Estesa reads the full historical student and linked lesson/payment without writes", () => {
  const c = setup(), source = student("student-TEST"), appointment = lesson("lesson-TEST", source.id);
  const rawStudents = JSON.stringify([source]);
  const rawLessons = JSON.stringify([appointment, lesson("other-lesson", "other-TEST")]);
  c.local.data.set(key, rawStudents);
  c.local.data.set("semprini:calendar:appointments:v1", rawLessons);
  const result = c.read.readExtendedStudentCard(source.id, new Date(2026, 9, 17, 12));
  assert.equal(result.status, "ready");
  assert.equal(result.student.legacyAttribute, "conservare");
  assert.equal(result.student.familyContacts[0].historicalNote, "conservare");
  assert.equal(result.student.teachers[0].historicalRoom, "A1");
  assert.equal(result.student.books[0].edition, "storica");
  assert.equal(result.student.tariffId, "tariffa-TEST");
  assert.deepEqual(result.lessons.map((item) => item.appointmentId), ["lesson-TEST"]);
  assert.equal(result.lessons[0].coveredTopic, "Lenti TEST");
  assert.equal(result.lessons[0].paymentMovements[0].amountCents, 1000);
  assert.equal(result.payment.status, "Parzialmente saldato");
  assert.equal(c.local.getItem(key), rawStudents);
  assert.equal(c.local.getItem("semprini:calendar:appointments:v1"), rawLessons);
  assert.equal(c.local.writes + c.session.writes, 0);
});

test("Card Estesa blocks only a conflicting student, without merging copies", () => {
  const c = setup(), older = { ...student("conflict-TEST"), familyNotes: "Prima copia TEST" };
  const newer = { ...older, familyNotes: "Seconda copia TEST", updatedAt: "2026-10-29T10:00:00Z" };
  const other = student("other-TEST");
  const localRaw = JSON.stringify([older, other]), sessionRaw = JSON.stringify([newer]);
  c.local.data.set(key, localRaw); c.session.data.set(key, sessionRaw);
  assert.deepEqual(c.read.readExtendedStudentCard(older.id), { status: "conflict" });
  assert.equal(c.read.readExtendedStudentCard(other.id).status, "ready");
  assert.deepEqual(c.read.readExtendedStudentCard("absent-TEST"), { status: "missing" });
  assert.equal(c.local.getItem(key), localRaw); assert.equal(c.session.getItem(key), sessionRaw);
  assert.equal(c.local.writes + c.session.writes, 0);
});

test("Card Estesa includes recurring lessons linked to the student ID", () => {
  const c = setup(), source = student("series-student-TEST");
  const recurring = {
    ...lesson("series-TEST", source.id), startsOn: "2026-10-08",
    recurrence: { frequency: "weekly", intervalWeeks: 1, endsOn: "2026-10-22" },
  };
  delete recurring.date;
  c.local.data.set(key, JSON.stringify([source]));
  c.local.data.set("semprini:calendar:series:v1", JSON.stringify([recurring]));
  const result = c.read.readExtendedStudentCard(source.id, new Date(2026, 9, 17, 12));
  assert.equal(result.status, "ready");
  assert.deepEqual(result.lessons.map((item) => item.date), ["2026-10-08", "2026-10-15", "2026-10-22"]);
  assert(result.lessons.every((item) => item.studentId === source.id));
  assert.equal(c.local.writes + c.session.writes, 0);
});

test("Card Estesa refuses an unreadable archive without writing", () => {
  const c = setup();
  c.local.data.set(key, "{invalid TEST");
  assert.deepEqual(c.read.readExtendedStudentCard("student-TEST"), { status: "unreadable" });
  assert.equal(c.local.getItem(key), "{invalid TEST");
  assert.equal(c.local.writes + c.session.writes, 0);
});

test("Card Estesa refuses unreadable or discordant calendar copies without writing", () => {
  const c = setup(), source = student("calendar-TEST");
  c.local.data.set(key, JSON.stringify([source]));
  c.local.data.set("semprini:calendar:appointments:v1", "{invalid TEST");
  assert.deepEqual(c.read.readExtendedStudentCard(source.id), { status: "unreadable" });
  const first = lesson("same-TEST", source.id);
  c.local.data.set("semprini:calendar:appointments:v1", JSON.stringify([first]));
  c.session.data.set("semprini:calendar:appointments:v1", JSON.stringify([{ ...first, notes: "Discordante TEST" }]));
  assert.deepEqual(c.read.readExtendedStudentCard(source.id), { status: "unreadable" });
  assert.equal(c.local.writes + c.session.writes, 0);
});
