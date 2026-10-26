import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const timestamp = "2026-09-01T12:00:00.000Z";

function setup() {
  const cache = new Map();
  function memoryStorage() {
    const data = new Map();
    return {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
      removeItem: (key) => data.delete(key),
    };
  }
  const localStorage = memoryStorage(), sessionStorage = memoryStorage();
  function load(file) {
    const path = resolve(root, file);
    if (cache.has(path)) return cache.get(path);
    const exports = {};
    cache.set(path, exports);
    const code = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    new Function("require", "exports", "window", "crypto", code)(
      (name) => load(resolve(dirname(path), `${name}.ts`)), exports,
      { localStorage, sessionStorage }, { randomUUID },
    );
    return exports;
  }
  return {
    storage: load("app/data/calendario/calendar-storage.ts"),
    payments: load("app/data/calendario/calendar-payments.ts"),
    summary: load("app/pagamenti/riepilogo/summary-model.ts"),
  };
}

function lesson(id, date, extra = {}) {
  return { id, date, studentId: "archived-student", studentNameSnapshot: "Ada Archiviata",
    subject: "Matematica", startTime: "10:00", durationMinutes: 60, mode: "casa",
    status: "svolta", topic: "", notes: "", hourlyRateCents: 2500,
    lessonAmountCents: 2500, paidAmountCents: 0, paymentStatus: "non_pagata",
    source: "manuale", createdAt: timestamp, updatedAt: timestamp, ...extra };
}

test("month selection, completed totals, filters, archived student snapshot and late receipts", () => {
  const c = setup();
  assert.equal(c.summary.shiftSummaryMonth("2026-09-01", 1), "2026-10-01");
  assert.equal(c.summary.shiftSummaryMonth("2026-01-01", -1), "2025-12-01");
  assert.equal(c.summary.parseEuroCents("25,50"), 2550);
  assert.equal(c.summary.parseEuroCents("25,501"), null);
  assert.equal(c.storage.saveCalendarAppointmentsResult([
    lesson("due", "2026-09-10"),
    lesson("paid", "2026-09-12"),
    lesson("future", "2026-09-28", { status: "confermata" }),
    lesson("cancelled", "2026-09-14", { status: "annullata" }),
    lesson("not-due", "2026-09-15", { paymentStatus: "non_dovuta" }),
    lesson("legacy", "2026-09-16", { paidAmountCents: 2500, paymentStatus: "pagata" }),
  ]).status, "saved");
  assert.equal(c.storage.loadCalendarAppointments().length, 6);
  assert.equal(c.payments.settleLessonPayment({ target: { occurrenceId: "appointment:paid", date: "2026-09-12" },
    paymentDate: "2026-10-03", operationId: "late" }).status, "saved");
  const data = c.summary.selectSummaryData(c.storage.loadCalendarAppointments(), [], "2026-09-01", "2026-09-20");
  assert.equal(data.monthly.completed.lessonCount, 4);
  assert.equal(data.monthly.completed.valueCents, 10000);
  assert.equal(data.monthly.completed.dueCents, 7500);
  assert.equal(data.monthly.completed.paidAttributedCents, 5000);
  assert.equal(data.monthly.completed.outstandingCents, 2500);
  assert.equal(data.receipts.receivedCents, 0);
  assert.equal(c.summary.filterSummaryLessons(data.completed, "dovuti").length, 1);
  assert.equal(c.summary.filterSummaryLessons(data.completed, "saldati").length, 2);
  assert.equal(c.summary.filterSummaryLessons(data.completed, "studente", "archived-student").length, 4);
  assert.equal(c.summary.filterSummaryLessons(data.completed, "studente", "other").length, 0);
  const october = c.summary.selectSummaryData(c.storage.loadCalendarAppointments(), [], "2026-10-01", "2026-10-01");
  assert.equal(october.monthly.completed.lessonCount, 0);
  assert.equal(october.receipts.receivedCents, 2500);
});

test("group settlement updates the same summary after one shared payment operation", () => {
  const c = setup();
  assert.equal(c.storage.saveCalendarAppointmentsResult([lesson("a", "2026-10-03"), lesson("b", "2026-10-04")]).status, "saved");
  assert.equal(c.storage.loadCalendarAppointments().length, 2);
  const before = c.summary.selectSummaryData(c.storage.loadCalendarAppointments(), [], "2026-10-01", "2026-10-20");
  assert.equal(before.monthly.completed.outstandingCents, 5000);
  const input = { targets: [{ occurrenceId: "appointment:a", date: "2026-10-03" },
    { occurrenceId: "appointment:b", date: "2026-10-04" }], studentId: "archived-student",
    receivedAmountCents: 5000, paymentDate: "2026-10-20", operationId: "summary-group" };
  assert.equal(c.payments.settleStudentLessons(input).status, "saved");
  assert.equal(c.payments.settleStudentLessons(input).reason, "already_applied");
  const after = c.summary.selectSummaryData(c.storage.loadCalendarAppointments(), [], "2026-10-01", "2026-10-20");
  assert.equal(after.monthly.completed.outstandingCents, 0);
  assert.equal(after.monthly.completed.paidAttributedCents, 5000);
  assert.equal(after.receipts.receivedCents, 5000);
  assert.equal(c.summary.filterSummaryLessons(after.completed, "saldati").length, 2);
});
