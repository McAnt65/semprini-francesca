import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const typescript = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const code = typescript.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 },
  }).outputText;
  module._compile(code, filename);
};

const { findTodayLesson, todayLessonSummary } = require("../app/oggi/today-summary.ts");
const { selectDayOccurrences } = require("../app/data/calendario/calendar-selectors.ts");
const stamp = "2026-10-21T09:00:00.000Z";
const base = { studentId: "student-1", studentNameSnapshot: "Ada Esempio", subject: "Matematica",
  durationMinutes: 60, mode: "casa", status: "confermata", topic: "Funzioni", notes: "Da ripassare",
  hourlyRateCents: 2500, lessonAmountCents: 2500, paidAmountCents: 0,
  paymentStatus: "non_pagata", source: "manuale", createdAt: stamp, updatedAt: stamp };
const single = { ...base, id: "single-1", date: "2026-10-21", startTime: "15:00" };
const weekly = { ...base, id: "series-1", startsOn: "2026-10-21", startTime: "16:00",
  recurrence: { frequency: "weekly", intervalWeeks: 1, endsOn: "2026-11-11" } };

test("opens the exact single lesson and computes partial payment without changing data", () => {
  const lesson = { ...single, paidAmountCents: 700, paymentStatus: "parziale" };
  const appointments = Object.freeze([Object.freeze(lesson)]);
  const visible = selectDayOccurrences(appointments, [], lesson.date)[0];
  const before = JSON.stringify(appointments);
  const found = findTodayLesson(visible, appointments, []);
  assert.equal(found.appointmentId, lesson.id);
  assert.equal(found.studentId, lesson.studentId);
  assert.equal(found.subject, lesson.subject);
  assert.equal(found.startTime, lesson.startTime);
  assert.equal(found.durationMinutes, lesson.durationMinutes);
  assert.equal(found.mode, lesson.mode);
  assert.equal(found.status, "confermata");
  assert.deepEqual(todayLessonSummary(found), { completed: false, amountCents: 2500,
    paidAmountCents: 700, outstandingCents: 1800, paymentReadable: true,
    paymentMismatch: false, notDue: false });
  assert.equal(JSON.stringify(appointments), before);
  assert.equal(findTodayLesson({ ...visible, date: "2026-10-22" }, appointments, []), null);
  assert.equal(findTodayLesson({ ...visible, appointmentId: "another" }, appointments, []), null);
});

test("resolves one recurring occurrence by series and original date", () => {
  const series = Object.freeze([Object.freeze(weekly)]);
  const occurrence = selectDayOccurrences([], series, "2026-10-28")[0];
  assert.equal(occurrence.occurrenceId, "series:series-1:2026-10-28");
  assert.equal(occurrence.originalOccurrenceDate, "2026-10-28");
  assert.equal(findTodayLesson(occurrence, [], series)?.seriesId, "series-1");
  assert.equal(findTodayLesson({ ...occurrence, originalOccurrenceDate: "2026-10-21" }, [], series), null);
  assert.equal(series[0].status, "confermata");
});

test("a moved, completed exception uses its effective date and keeps the original series reference", () => {
  const moved = { ...base, id: "exception-1", seriesId: weekly.id,
    originalOccurrenceDate: "2026-10-28", date: "2026-10-29", startTime: "17:00",
    status: "svolta", paidAmountCents: 2500, paymentStatus: "pagata" };
  const appointments = Object.freeze([Object.freeze(moved)]);
  const series = Object.freeze([Object.freeze(weekly)]);
  const visible = selectDayOccurrences(appointments, series, moved.date)[0];
  assert.equal(findTodayLesson(visible, appointments, series)?.appointmentId, moved.id);
  assert.equal(visible.seriesId, weekly.id);
  assert.equal(visible.originalOccurrenceDate, "2026-10-28");
  assert.equal(visible.date, "2026-10-29");
  assert.equal(visible.isException, true);
  assert.equal(todayLessonSummary(visible).completed, true);
  assert.equal(todayLessonSummary(visible).outstandingCents, 0);
  assert.equal(findTodayLesson({ ...visible, occurrenceId: "series:series-1:2026-10-28" }, appointments, series), null);
  assert.equal(series[0].status, "confermata");
  assert.equal(JSON.stringify(appointments[0]), JSON.stringify(moved));
});

test("cancelled lessons cannot be opened and an invalid ledger is flagged", () => {
  const cancelled = { ...single, status: "annullata" };
  const visible = selectDayOccurrences([cancelled], [], cancelled.date)[0];
  assert.equal(findTodayLesson(visible, [cancelled], []), null);
  const invalid = { ...single, historicalPaidAmountCents: 0, paidAmountCents: 100,
    paymentMovements: [], paymentStatus: "parziale" };
  assert.equal(todayLessonSummary(selectDayOccurrences([invalid], [], invalid.date)[0]).paymentReadable, false);
});
