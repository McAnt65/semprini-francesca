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
const { selectCompletedLessons, filterAndSortHistory, lessonPaymentLabel } = require("../app/lezioni/storico/history-lessons.ts");
const { groupOccurrencesByDate } = require("../app/data/calendario/calendar-selectors.ts");
const { lessonEditorHref } = require("../app/lezioni/in-programma/upcoming-lessons.ts");

const base = { studentId: "test-student", studentNameSnapshot: "Giulia Rossi [TEST]", subject: "Matematica",
  durationMinutes: 60, mode: "domicilio", status: "svolta", topic: "Algebra", notes: "",
  hourlyRateCents: 2000, lessonAmountCents: 2000, paidAmountCents: 0, paymentStatus: "non_pagata",
  source: "manuale", createdAt: "2026-10-01T12:00:00Z", updatedAt: "2026-10-01T12:00:00Z" };
const appointment = (id, date, startTime, extra = {}) => ({ ...base, id, date, startTime, ...extra });
const weekly = { ...base, id: "series-test", startsOn: "2026-10-05", startTime: "15:00",
  recurrence: { frequency: "weekly", intervalWeeks: 1, endsOn: "2026-10-26" } };
const now = new Date(2026, 9, 25, 12, 0);

test("a lesson marked completed is available in history immediately, even before its scheduled hour", () => {
  const result = selectCompletedLessons([appointment("just-done", "2026-10-25", "18:00")], [], now);
  assert.equal(result.length, 1);
  assert.equal(result[0].appointmentId, "just-done");
});

test("only completed lessons are shown; recurrence cancellations and exceptions are applied", () => {
  const items = [
    appointment("single", "2026-10-20", "11:00", { studentNameSnapshot: "Lorenzo Bianchi [TEST]", subject: "Fisica" }),
    appointment("past-unfinished", "2026-10-19", "10:00", { status: "confermata" }),
    appointment("cancelled", "2026-10-12", "15:00", { seriesId: weekly.id, originalOccurrenceDate: "2026-10-12", status: "annullata" }),
    appointment("exception", "2026-10-19", "16:00", { seriesId: weekly.id, originalOccurrenceDate: "2026-10-19", paidAmountCents: 1000, paymentStatus: "parziale" }),
    appointment("future-done", "2026-10-27", "10:00"),
  ];
  const result = selectCompletedLessons(items, [weekly], now);
  assert.deepEqual(result.map((item) => [item.date, item.startTime]), [
    ["2026-10-05", "15:00"], ["2026-10-19", "16:00"], ["2026-10-20", "11:00"],
  ]);
  assert.equal(result.filter((item) => item.date === "2026-10-19").length, 1);
  assert.equal(lessonEditorHref(result[0], "/lezioni/storico"), "/calendario/series%3Aseries-test%3A2026-10-05/modifica?data=2026-10-05&ritorno=%2Flezioni%2Fstorico");
  assert.equal(lessonEditorHref(result[1], "/lezioni/storico"), "/calendario/exception/modifica?data=2026-10-19&ritorno=%2Flezioni%2Fstorico");
});

test("student, subject, period, and both chronological orders retain the correct groups", () => {
  const items = selectCompletedLessons([
    appointment("a", "2026-10-20", "11:00", { studentNameSnapshot: "Lorenzo Bianchi [TEST]", subject: "Fisica" }),
    appointment("b", "2026-10-19", "16:00"),
    appointment("c", "2026-10-19", "14:00"),
  ], [], now);
  assert.deepEqual(filterAndSortHistory(items, "student", "giulia", "", "", "recent").map((item) => item.id ?? item.appointmentId), ["b", "c"]);
  assert.deepEqual(filterAndSortHistory(items, "subject", "Fisica", "", "", "recent").map((item) => item.appointmentId), ["a"]);
  assert.deepEqual(filterAndSortHistory(items, "period", "", "2026-10-19", "2026-10-19", "oldest").map((item) => item.appointmentId), ["c", "b"]);
  assert.deepEqual([...groupOccurrencesByDate(filterAndSortHistory(items, "student", "", "", "", "recent"))].map(([date]) => date), ["2026-10-20", "2026-10-19"]);
});

test("payment labels follow actual due and paid amounts", () => {
  const occurrences = selectCompletedLessons([
    appointment("due", "2026-10-19", "10:00"),
    appointment("partial", "2026-10-19", "11:00", { paidAmountCents: 1000, paymentStatus: "parziale" }),
    appointment("paid", "2026-10-19", "12:00", { paidAmountCents: 2000, paymentStatus: "pagata" }),
    appointment("not-due", "2026-10-19", "13:00", { paymentStatus: "non_dovuta" }),
    appointment("unknown", "2026-10-19", "14:00", { lessonAmountCents: 0 }),
  ], [], now);
  assert.deepEqual(occurrences.map(lessonPaymentLabel), [
    "Da saldare", "Parzialmente saldato", "Saldato", "Non dovuta", "Nessun pagamento registrato",
  ]);
});
