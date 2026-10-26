import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import test from "node:test";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const stamp = "2026-10-20T09:00:00.000Z";
const base = { studentId: "student-1", studentNameSnapshot: "Ada [TEST]", subject: "Matematica",
  durationMinutes: 60, mode: "casa", status: "confermata", topic: "Equazioni", notes: "Nota iniziale",
  hourlyRateCents: 2400, lessonAmountCents: 2400, paidAmountCents: 0, paymentStatus: "non_pagata",
  source: "manuale", createdAt: stamp, updatedAt: stamp };

function setup() {
  const cache = new Map();
  const memory = () => {
    const values = new Map();
    let writes = 0;
    let fail = false;
    return { getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { if (fail) throw new Error("storage unavailable"); writes++; values.set(key, value); },
      removeItem: (key) => values.delete(key),
      get writes() { return writes; }, set fail(value) { fail = value; } };
  };
  const browser = { localStorage: memory(), sessionStorage: memory() };
  function load(file) {
    const path = resolve(root, file);
    if (cache.has(path)) return cache.get(path);
    const exports = {};
    cache.set(path, exports);
    const code = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    new Function("require", "exports", "window", "crypto", code)(
      (name) => load(resolve(dirname(path), `${name}.ts`)), exports, browser, { randomUUID },
    );
    return exports;
  }
  return { browser, storage: load("app/data/calendario/calendar-storage.ts"),
    selectors: load("app/data/calendario/calendar-selectors.ts"),
    today: load("app/oggi/today-summary.ts"),
    history: load("app/lezioni/storico/history-lessons.ts"),
    diary: load("app/lezioni/diario/diary-lessons.ts"),
    statistics: load("app/pagamenti/statistiche/statistics-model.ts") };
}

test("single lesson: re-reads newer notes and payments, then feeds the derived views", () => {
  const app = setup();
  const first = { ...base, id: "single", date: "2026-10-21", startTime: "15:00" };
  assert.equal(app.storage.saveCalendarAppointmentsResult([first]).status, "saved");
  const opened = app.selectors.selectDayOccurrences(app.storage.loadCalendarAppointments(), [], first.date)[0];
  const newer = { ...first, notes: "Appunti aggiunti dopo l'apertura", paidAmountCents: 900,
    paymentStatus: "parziale", historicalPaidAmountCents: 0,
    paymentMovements: [{ id: "payment-1", kind: "payment", amountCents: 900, paymentDate: first.date,
      operationId: "operation-1", recordedAt: stamp }], updatedAt: "2026-10-21T16:00:00.000Z" };
  assert.equal(app.storage.upsertCalendarAppointmentResult(newer).status, "saved");
  const result = app.today.completeTodayLesson(opened);
  assert.equal(result.status, "saved");
  const saved = app.storage.loadCalendarAppointments()[0];
  assert.equal(saved.status, "svolta");
  assert.equal(saved.notes, newer.notes);
  assert.equal(saved.topic, first.topic);
  assert.equal(saved.paidAmountCents, 900);
  assert.deepEqual(saved.paymentMovements, newer.paymentMovements);
  const calendar = app.selectors.selectDayOccurrences([saved], [], first.date);
  const history = app.history.selectCompletedLessons([saved], [], new Date("2026-10-22T12:00:00Z"));
  assert.equal(calendar[0].status, "svolta");
  assert.equal(history.length, 1);
  assert.equal(app.diary.filterAndSortDiary(history, "student", "Ada", "recent").length, 1);
  assert.equal(history.filter((lesson) => lesson.studentId === first.studentId).length, 1);
  assert.equal(app.statistics.selectPaymentStatistics([saved], [], { year: 2026, month: 10 },
    "2026-10-22", "12:00").lessonCount, 1);
});

test("already completed and cancelled lessons never create a second write", () => {
  const app = setup();
  const done = { ...base, id: "done", date: "2026-10-21", startTime: "15:00", status: "svolta" };
  const cancelled = { ...base, id: "cancelled", date: "2026-10-21", startTime: "16:30", status: "annullata" };
  app.storage.saveCalendarAppointmentsResult([done, cancelled]);
  const [doneOccurrence, cancelledOccurrence] = app.selectors.selectDayOccurrences(
    app.storage.loadCalendarAppointments(), [], done.date);
  const writes = app.browser.localStorage.writes;
  assert.equal(app.today.completeTodayLesson(doneOccurrence).status, "unchanged");
  assert.equal(app.today.completeTodayLesson(cancelledOccurrence).status, "stale");
  assert.equal(app.browser.localStorage.writes, writes);
});

test("weekly occurrence creates one exception, preserves series and ignores a repeated tap", () => {
  const app = setup();
  const weekly = { ...base, id: "weekly", startsOn: "2026-10-21", startTime: "15:00",
    recurrence: { frequency: "weekly", intervalWeeks: 1, endsOn: "2026-11-11" } };
  app.storage.saveCalendarSeriesResult([weekly]);
  const opened = app.selectors.selectDayOccurrences([], [weekly], "2026-10-21")[0];
  const first = app.today.completeTodayLesson(opened);
  assert.equal(first.status, "saved");
  assert.equal(first.lesson.seriesId, weekly.id);
  assert.equal(first.lesson.originalOccurrenceDate, "2026-10-21");
  const writes = app.browser.localStorage.writes;
  assert.equal(app.today.completeTodayLesson(opened).status, "stale");
  assert.equal(app.today.completeTodayLesson(first.lesson).status, "unchanged");
  assert.equal(app.browser.localStorage.writes, writes);
  assert.equal(app.storage.loadCalendarAppointments().length, 1);
  assert.equal(app.storage.loadCalendarSeries()[0].status, "confermata");
  assert.equal(app.selectors.selectDayOccurrences(app.storage.loadCalendarAppointments(), [weekly], "2026-10-28")[0].status,
    "confermata");
});

test("moved recurring exception keeps its original series date", () => {
  const app = setup();
  const weekly = { ...base, id: "weekly", startsOn: "2026-10-21", startTime: "15:00",
    recurrence: { frequency: "weekly", intervalWeeks: 1, endsOn: "2026-11-11" } };
  const moved = { ...base, id: "moved", seriesId: weekly.id, originalOccurrenceDate: "2026-10-21",
    date: "2026-10-22", startTime: "17:00" };
  app.storage.saveCalendarSeriesResult([weekly]);
  app.storage.saveCalendarAppointmentsResult([moved]);
  const opened = app.selectors.selectDayOccurrences([moved], [weekly], moved.date)[0];
  const result = app.today.completeTodayLesson(opened);
  assert.equal(result.status, "saved");
  assert.equal(result.lesson.date, moved.date);
  assert.equal(result.lesson.originalOccurrenceDate, moved.originalOccurrenceDate);
  assert.equal(app.storage.loadCalendarAppointments().length, 1);
  assert.equal(app.selectors.selectDayOccurrences(app.storage.loadCalendarAppointments(), [weekly], "2026-10-28")[0].status,
    "confermata");
});

test("temporary storage is reported separately; total write failure leaves lesson open", () => {
  const app = setup();
  const first = { ...base, id: "single", date: "2026-10-21", startTime: "15:00" };
  app.storage.saveCalendarAppointmentsResult([first]);
  const opened = app.selectors.selectDayOccurrences([first], [], first.date)[0];
  app.browser.localStorage.fail = true;
  const temporary = app.today.completeTodayLesson(opened);
  assert.equal(temporary.status, "temporary");
  assert.equal(temporary.lesson.status, "svolta");

  const other = setup();
  other.storage.saveCalendarAppointmentsResult([first]);
  other.browser.localStorage.fail = true;
  other.browser.sessionStorage.fail = true;
  assert.equal(other.today.completeTodayLesson(opened).status, "failed");
  assert.equal(other.storage.loadCalendarAppointments()[0].status, "confermata");
});
