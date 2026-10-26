import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const timestamp = "2026-10-20T08:00:00.000Z";

function setup() {
  const cache = new Map();
  const memory = () => {
    const data = new Map();
    return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value),
      removeItem: (key) => data.delete(key) };
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
  return { storage: load("app/data/calendario/calendar-storage.ts"),
    payments: load("app/data/calendario/calendar-payments.ts"),
    summary: load("app/pagamenti/riepilogo/summary-model.ts"),
    forecast: load("app/pagamenti/previsioni/forecast-model.ts"),
    statistics: load("app/pagamenti/statistiche/statistics-model.ts") };
}

test("an advance payment updates receipts and forecast, then moves into completed lesson statistics", () => {
  const app = setup();
  const future = { id: "future", date: "2026-10-25", startTime: "15:00", studentId: "archived-student",
    studentNameSnapshot: "Ada Archiviata", subject: "Matematica", durationMinutes: 60, mode: "casa",
    status: "confermata", topic: "", notes: "", hourlyRateCents: 2500, lessonAmountCents: 2500,
    paidAmountCents: 0, paymentStatus: "non_pagata", source: "manuale",
    createdAt: timestamp, updatedAt: timestamp };
  assert.equal(app.storage.saveCalendarAppointmentsResult([future]).status, "saved");
  const input = { target: { occurrenceId: "appointment:future", date: "2026-10-25" },
    amountCents: 1000, paymentDate: "2026-10-20", operationId: "advance-payment", recordedAt: timestamp };
  assert.equal(app.payments.recordPartialLessonPayment(input).status, "saved");
  assert.equal(app.payments.recordPartialLessonPayment(input).reason, "already_applied");

  let lessons = app.storage.loadCalendarAppointments();
  const beforeSummary = app.summary.selectSummaryData(lessons, [], "2026-10-01", "2026-10-20");
  const beforeForecast = app.forecast.selectForecastMonths(lessons, [], "2026-10-01", "2026-10-20", "12:00")[0];
  const beforeStatistics = app.statistics.selectPaymentStatistics(lessons, [],
    { year: 2026, month: 10 }, "2026-10-20", "12:00");
  assert.deepEqual([beforeSummary.monthly.completed.lessonCount, beforeSummary.receipts.receivedCents], [0, 1000]);
  assert.deepEqual([beforeForecast.lessonCount, beforeForecast.valueCents,
    beforeForecast.paidCents, beforeForecast.outstandingCents], [1, 2500, 1000, 1500]);
  assert.deepEqual([beforeStatistics.lessonCount, beforeStatistics.valueCents, beforeStatistics.receivedCents],
    [0, 0, 1000]);

  assert.equal(app.storage.saveCalendarAppointmentsResult([{ ...lessons[0], date: "2026-10-18",
    status: "svolta", updatedAt: "2026-10-20T09:00:00.000Z" }]).status, "saved");
  lessons = app.storage.loadCalendarAppointments();
  const afterSummary = app.summary.selectSummaryData(lessons, [], "2026-10-01", "2026-10-20");
  const afterForecast = app.forecast.selectForecastMonths(lessons, [], "2026-10-01", "2026-10-20", "12:00")[0];
  const afterStatistics = app.statistics.selectPaymentStatistics(lessons, [],
    { year: 2026, month: 10 }, "2026-10-20", "12:00");
  assert.deepEqual([afterSummary.monthly.completed.lessonCount, afterSummary.monthly.completed.paidAttributedCents,
    afterSummary.receipts.receivedCents], [1, 1000, 1000]);
  assert.equal(afterForecast.lessonCount, 0);
  assert.deepEqual([afterStatistics.lessonCount, afterStatistics.valueCents,
    afterStatistics.paidAttributedCents, afterStatistics.outstandingCents, afterStatistics.receivedCents],
    [1, 2500, 1000, 1500, 1000]);
});
