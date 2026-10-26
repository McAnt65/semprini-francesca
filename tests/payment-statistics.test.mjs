import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const timestamp = "2026-10-01T12:00:00.000Z";

function setup() {
  const cache = new Map();
  function load(file) {
    const path = resolve(root, file);
    if (cache.has(path)) return cache.get(path);
    const exports = {};
    cache.set(path, exports);
    const code = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    new Function("require", "exports", "window", code)(
      (name) => load(resolve(dirname(path), `${name}.ts`)), exports,
      { localStorage: null, sessionStorage: null },
    );
    return exports;
  }
  return { statistics: load("app/pagamenti/statistiche/statistics-model.ts"),
    recurrence: load("app/data/calendario/calendar-recurrence.ts") };
}

function lesson(id, date, extra = {}) {
  return {
    id, date, startTime: "14:00", studentId: "archived-ada", studentNameSnapshot: "Ada Archiviata",
    subject: "Matematica", durationMinutes: 60, mode: "domicilio", status: "svolta",
    topic: "", notes: "", hourlyRateCents: 3000, lessonAmountCents: 3000,
    paidAmountCents: 0, paymentStatus: "non_pagata", source: "manuale",
    createdAt: timestamp, updatedAt: timestamp, ...extra,
  };
}

function weekly(id, startsOn, endsOn) {
  const source = lesson(id, startsOn);
  delete source.date;
  return { ...source, id, startsOn, recurrence: { frequency: "weekly", intervalWeeks: 1, endsOn } };
}

test("empty month reports zero activity, undefined averages and no invented travel distance", () => {
  const { statistics } = setup();
  const result = statistics.selectPaymentStatistics([], [], { year: 2026, month: 2 }, "2026-10-20", "12:00");
  assert.equal(result.lessonCount, 0);
  assert.equal(result.durationMinutes, 0);
  assert.equal(result.students.length, 0);
  assert.equal(result.receivedCents, 0);
  assert.equal(result.kilometersRecorded, null);
  assert.equal(result.travelExpenseCents, null);
  assert.equal(result.lessonsWithTravelMinutes, 0);
});

test("completed lessons include archived IDs, duration, subjects, modes and attributed partial or undated balances", () => {
  const { statistics } = setup();
  const partial = lesson("partial", "2026-10-03", { travelMinutes: 25,
    paidAmountCents: 1000, paymentStatus: "parziale", historicalPaidAmountCents: 0,
    paymentMovements: [{ id: "payment-partial", kind: "payment", amountCents: 1000,
      paymentDate: "2026-11-05", recordedAt: timestamp, operationId: "operation-partial" }] });
  const legacy = lesson("legacy", "2026-10-10", { studentId: "archived-ada", mode: "casa",
    subject: "Fisica", durationMinutes: 90, lessonAmountCents: 4500, paidAmountCents: 4500,
    paymentStatus: "pagata" });
  const septemberReceipt = lesson("september", "2026-09-15", { studentId: "student-bea",
    paidAmountCents: 2000, paymentStatus: "parziale", historicalPaidAmountCents: 0,
    paymentMovements: [{ id: "payment-september", kind: "payment", amountCents: 2000,
      paymentDate: "2026-10-11", recordedAt: timestamp, operationId: "operation-september" }] });
  const ignored = [
    lesson("future-completed", "2026-10-25"),
    lesson("today-future", "2026-10-20", { startTime: "18:00" }),
    lesson("confirmed", "2026-10-04", { status: "confermata" }),
    lesson("requested", "2026-10-05", { status: "richiesta" }),
    lesson("waiting", "2026-10-06", { status: "attesa" }),
    lesson("cancelled", "2026-10-07", { status: "annullata" }),
  ];
  const result = statistics.selectPaymentStatistics([partial, legacy, septemberReceipt, ...ignored], [],
    { year: 2026, month: 10 }, "2026-10-20", "12:00");
  assert.deepEqual([result.lessonCount, result.durationMinutes, result.valueCents,
    result.paidAttributedCents, result.outstandingCents], [2, 150, 7500, 5500, 2000]);
  assert.deepEqual([result.receivedCents, result.receiptCount], [2000, 1]);
  assert.deepEqual(result.subjects.map((item) => item.name), ["Fisica", "Matematica"]);
  assert.deepEqual(result.modes, { casa: 1, domicilio: 1, online: 0 });
  assert.deepEqual([result.lessonsWithTravelMinutes, result.travelMinutesRecorded], [1, 25]);
  assert.equal(result.students.length, 1);
  assert.equal(result.students[0].studentId, "archived-ada");
  assert.equal(result.students[0].lessonCount, 2);
  assert.equal(Math.round(result.durationMinutes / result.lessonCount), 75);
  assert.equal(Math.round(result.valueCents * 60 / result.durationMinutes), 3000);
});

test("weekly series, cancellation, moved occurrence and duplicate exception count once by effective month", () => {
  const { statistics, recurrence } = setup();
  const series = weekly("weekly", "2026-10-01", "2026-11-05");
  const cancelled = recurrence.createSingleOccurrenceException(series, "2026-10-08", "cancelled",
    { status: "annullata" });
  const older = recurrence.createSingleOccurrenceException(series, "2026-10-15", "older",
    { date: "2026-10-20" }, "2026-10-01T12:00:00.000Z");
  const moved = recurrence.createSingleOccurrenceException(series, "2026-10-15", "moved",
    { date: "2026-11-02", durationMinutes: 120, lessonAmountCents: 6000 },
    "2026-10-02T12:00:00.000Z");
  assert.ok(cancelled && older && moved);
  const appointments = [cancelled, older, moved];
  const october = statistics.selectPaymentStatistics(appointments, [series], { year: 2026, month: 10 },
    "2026-12-31", "23:59");
  const november = statistics.selectPaymentStatistics(appointments, [series], { year: 2026, month: 11 },
    "2026-12-31", "23:59");
  const annual = statistics.selectPaymentStatistics(appointments, [series], { year: 2026, month: null },
    "2026-12-31", "23:59");
  assert.deepEqual([october.lessonCount, october.valueCents], [3, 9000]);
  assert.deepEqual([november.lessonCount, november.durationMinutes, november.valueCents], [2, 180, 9000]);
  assert.deepEqual([annual.lessonCount, annual.durationMinutes, annual.valueCents], [5, 360, 18000]);
});

test("annual view includes an exception moved across the year boundary without repeating the original", () => {
  const { statistics, recurrence } = setup();
  const series = weekly("boundary", "2025-12-31", "2026-01-14");
  const moved = recurrence.createSingleOccurrenceException(series, "2025-12-31", "moved-year",
    { date: "2026-01-02" });
  assert.ok(moved);
  const annual = statistics.selectPaymentStatistics([moved], [series], { year: 2026, month: null },
    "2026-12-31", "23:59");
  assert.equal(annual.lessonCount, 3);
  assert.equal(annual.valueCents, 9000);
  assert.equal(statistics.shiftStatisticsPeriod({ year: 2025, month: 12 }, 1).month, 1);
  assert.deepEqual(statistics.shiftStatisticsPeriod({ year: 2025, month: null }, 1),
    { year: 2026, month: null });
});

test("yearly receipts sum movement months once and keep undated legacy payments out of cash", () => {
  const { statistics } = setup();
  const october = lesson("october", "2026-10-02", { paidAmountCents: 3000,
    paymentStatus: "pagata", historicalPaidAmountCents: 0,
    paymentMovements: [{ id: "pay-oct", kind: "payment", amountCents: 3000,
      paymentDate: "2026-10-10", recordedAt: timestamp, operationId: "op-oct" }] });
  const november = lesson("november", "2026-11-02", { paidAmountCents: 1000,
    paymentStatus: "parziale", historicalPaidAmountCents: 0,
    paymentMovements: [{ id: "pay-nov", kind: "payment", amountCents: 1000,
      paymentDate: "2026-12-10", recordedAt: timestamp, operationId: "op-nov" }] });
  const legacy = lesson("legacy", "2026-11-05", { paidAmountCents: 3000, paymentStatus: "pagata" });
  const result = statistics.selectPaymentStatistics([october, november, legacy], [],
    { year: 2026, month: null }, "2026-12-31", "23:59");
  assert.deepEqual([result.lessonCount, result.valueCents, result.paidAttributedCents,
    result.outstandingCents, result.receivedCents, result.receiptCount], [3, 9000, 7000, 2000, 4000, 2]);
});
