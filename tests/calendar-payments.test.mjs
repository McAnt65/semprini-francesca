import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const stamp = "2026-09-01T09:00:00.000Z";

function memoryStorage() {
  const data = new Map();
  return { data, writes: 0, rejectWrite: false, rejectRead: false,
    getItem(key) { if (this.rejectRead) throw Error("read rejected"); return data.get(key) ?? null; },
    setItem(key, value) { if (this.rejectWrite) throw Error("write rejected"); this.writes++; data.set(key, value); },
    removeItem(key) { data.delete(key); },
  };
}

function setup() {
  const local = memoryStorage(), session = memoryStorage(), cache = new Map();
  const browser = { localStorage: local, sessionStorage: session };
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
  return { local, session, storage: load("app/data/calendario/calendar-storage.ts"),
    students: load("app/data/student-storage.ts"),
    payments: load("app/data/calendario/calendar-payments.ts"),
    recurrence: load("app/data/calendario/calendar-recurrence.ts"),
    selectors: load("app/data/calendario/calendar-selectors.ts") };
}

function lesson(id, date = "2026-09-15", extra = {}) {
  return { id, studentId: "student-1", studentNameSnapshot: "Ada Esempio", subject: "Fisica",
    date, startTime: "15:00", durationMinutes: 60, mode: "casa", status: "svolta",
    topic: "", notes: "", hourlyRateCents: 2500, lessonAmountCents: 2500,
    paidAmountCents: 0, paymentStatus: "non_pagata", source: "manuale",
    createdAt: stamp, updatedAt: stamp, ...extra };
}

function weekly(id = "series-1", extra = {}) {
  const { date, ...rest } = lesson(id, "2026-09-14", extra);
  void date;
  return { ...rest, startsOn: "2026-09-14", recurrence: { frequency: "weekly", intervalWeeks: 1, endsOn: "2026-10-12" } };
}

const target = (id, date = "2026-09-15") => ({ occurrenceId: `appointment:${id}`, date });
const payInput = (id, operationId, paymentDate = "2026-09-15") =>
  ({ target: target(id), operationId, paymentDate, recordedAt: "2026-10-20T12:00:00.000Z" });

test("full settlement stores one dated movement, preserves lesson value and does not mark a lesson as taught", () => {
  const c = setup();
  c.storage.saveCalendarAppointmentsResult([lesson("one", "2026-09-15", { status: "confermata" })]);
  assert.equal(c.payments.settleLessonPayment(payInput("one", "full-1", "2026-10-20")).status, "saved");
  const saved = c.storage.loadCalendarAppointments()[0];
  assert.equal(saved.status, "confermata");
  assert.equal(saved.lessonAmountCents, 2500);
  assert.equal(saved.paidAmountCents, 2500);
  assert.equal(saved.paymentStatus, "pagata");
  assert.equal(saved.historicalPaidAmountCents, 0);
  assert.equal(saved.paymentMovements[0].paymentDate, "2026-10-20");
  assert.equal(saved.paymentMovements[0].recordedAt, "2026-10-20T12:00:00.000Z");
  assert.equal(c.payments.settleLessonPayment(payInput("one", "full-1", "2026-10-20")).reason, "already_applied");
  assert.equal(c.payments.settleLessonPayment(payInput("one", "full-2", "2026-10-20")).reason, "already_settled");
  assert.equal(c.storage.loadCalendarAppointments()[0].paymentMovements.length, 1);
});

test("two partial payments, residual settlement and correction preserve preceding installments", () => {
  const c = setup();
  c.storage.saveCalendarAppointmentsResult([lesson("one")]);
  assert.equal(c.payments.recordPartialLessonPayment({ ...payInput("one", "part-1"), amountCents: 700 }).status, "saved");
  assert.equal(c.payments.recordPartialLessonPayment({ ...payInput("one", "part-2"), amountCents: 300 }).status, "saved");
  assert.equal(c.storage.loadCalendarAppointments()[0].paidAmountCents, 1000);
  assert.equal(c.storage.loadCalendarAppointments()[0].paymentStatus, "parziale");
  const secondId = c.storage.loadCalendarAppointments()[0].paymentMovements[1].id;
  const correction = { target: target("one"), movementId: secondId, operationId: "reverse-2" };
  assert.equal(c.payments.reverseLessonPayment(correction).status, "saved");
  let saved = c.storage.loadCalendarAppointments()[0];
  assert.equal(saved.paidAmountCents, 700);
  assert.equal(saved.paymentStatus, "parziale");
  assert.equal(saved.paymentMovements.length, 3);
  assert.equal(saved.paymentMovements[2].originalMovementId, secondId);
  assert.equal(c.payments.reverseLessonPayment({ ...correction, operationId: "reverse-again" }).reason, "already_reversed");
  assert.equal(c.payments.recordPartialLessonPayment({ ...payInput("one", "too-much"), amountCents: 1801 }).reason, "exceeds_outstanding");
  assert.equal(c.payments.settleLessonPayment(payInput("one", "residual")).status, "saved");
  saved = c.storage.loadCalendarAppointments()[0];
  assert.equal(saved.paymentMovements.at(-1).amountCents, 1800);
  assert.equal(saved.paidAmountCents, 2500);
  assert.equal(c.payments.reverseLessonPayment({ target: target("one"), movementId: saved.paymentMovements.at(-1).id,
    operationId: "undo-residual" }).status, "saved");
  assert.equal(c.storage.loadCalendarAppointments()[0].paidAmountCents, 700);
});

test("legacy paid balance stays undated, can be corrected explicitly, and does not enter receipts", () => {
  const c = setup();
  c.storage.saveCalendarAppointmentsResult([lesson("legacy", "2026-09-15", { paidAmountCents: 1000, paymentStatus: "parziale" })]);
  assert.equal(c.payments.selectReceiptMonthTotals(c.storage.loadCalendarAppointments(), "2026-09-01").receivedCents, 0);
  assert.equal(c.payments.correctUndatedPayment({ target: target("legacy"), amountCents: 200,
    operationId: "legacy-fix" }).status, "saved");
  assert.equal(c.payments.settleLessonPayment(payInput("legacy", "legacy-residual", "2026-10-20")).status, "saved");
  const saved = c.storage.loadCalendarAppointments()[0];
  assert.equal(saved.historicalPaidAmountCents, 1000);
  assert.equal(saved.paymentMovements[0].kind, "legacy_adjustment");
  assert.equal(saved.paymentMovements[0].paymentDate, undefined);
  assert.equal(saved.paymentMovements[1].amountCents, 1700);
  assert.equal(c.payments.selectReceiptMonthTotals([saved], "2026-10-01").receivedCents, 1700);
  assert.equal(c.payments.selectReceiptMonthTotals([saved], "2026-09-01").receivedCents, 0);
  assert.equal(c.payments.correctUndatedPayment({ target: target("legacy"), amountCents: 801,
    operationId: "too-large" }).reason, "exceeds_legacy_balance");
});

test("legacy fully paid lessons and cancelled, not due, zero amount lessons reject quick settlement", () => {
  const c = setup();
  c.storage.saveCalendarAppointmentsResult([
    lesson("paid", "2026-09-15", { paidAmountCents: 2500, paymentStatus: "pagata" }),
    lesson("cancelled", "2026-09-15", { status: "annullata" }),
    lesson("free", "2026-09-15", { paymentStatus: "non_dovuta" }),
    lesson("zero", "2026-09-15", { lessonAmountCents: 0 }),
  ]);
  assert.equal(c.payments.settleLessonPayment(payInput("paid", "op-paid")).reason, "already_settled");
  for (const id of ["cancelled", "free", "zero"])
    assert.equal(c.payments.settleLessonPayment(payInput(id, `op-${id}`)).reason, "not_payable");
  assert.equal(c.payments.recordPartialLessonPayment({ ...payInput("paid", "invalid"), amountCents: 0 }).reason, "invalid_input");
  assert.equal(c.payments.settleLessonPayment(payInput("paid", "bad-date", "2026-02-30")).reason, "invalid_input");
  assert.equal(c.local.writes, 1);
});

test("a recurring payment creates one exception; a moved exception remains in its effective month", () => {
  const c = setup();
  c.storage.saveCalendarSeriesResult([weekly()]);
  const original = c.selectors.selectDayOccurrences([], c.storage.loadCalendarSeries(), "2026-09-14")[0];
  assert.equal(c.payments.settleLessonPayment({ target: { occurrenceId: original.occurrenceId, date: original.date },
    operationId: "series-payment", paymentDate: "2026-10-02" }).status, "saved");
  let appointments = c.storage.loadCalendarAppointments();
  assert.equal(appointments.length, 1);
  assert.equal(appointments[0].seriesId, "series-1");
  assert.equal(appointments[0].originalOccurrenceDate, "2026-09-14");
  assert.equal(c.selectors.selectDayOccurrences(appointments, c.storage.loadCalendarSeries(), "2026-09-14").length, 1);
  assert.equal(c.selectors.selectDayOccurrences(appointments, c.storage.loadCalendarSeries(), "2026-09-21")[0].paidAmountCents, 0);
  const moved = { ...appointments[0], date: "2026-10-01", updatedAt: "2026-10-21T00:00:00.000Z" };
  c.storage.saveCalendarAppointmentsResult([moved]);
  appointments = c.storage.loadCalendarAppointments();
  assert.equal(c.payments.selectLessonMonthPaymentTotals(appointments, c.storage.loadCalendarSeries(), "2026-09-01", "2026-09-01").all.lessonCount, 2);
  assert.equal(c.payments.selectLessonMonthPaymentTotals(appointments, c.storage.loadCalendarSeries(), "2026-10-01", "2026-09-01").all.lessonCount, 3);
  assert.equal(c.payments.selectReceiptMonthTotals(appointments, "2026-10-01").receivedCents, 2500);
  assert.equal(c.payments.settleLessonPayment({ target: { occurrenceId: `appointment:${moved.id}`, date: moved.date },
    operationId: "second-payment", paymentDate: "2026-10-02" }).reason, "already_settled");
});

test("payment received in October for September lesson is separated from lesson-month totals", () => {
  const c = setup();
  c.storage.saveCalendarAppointmentsResult([lesson("sept", "2026-09-30")]);
  assert.equal(c.payments.settleLessonPayment({ ...payInput("sept", "late", "2026-10-01"),
    target: target("sept", "2026-09-30") }).status, "saved");
  const appointments = c.storage.loadCalendarAppointments();
  const september = c.payments.selectLessonMonthPaymentTotals(appointments, [], "2026-09-01", "2026-09-01");
  assert.equal(september.all.valueCents, 2500);
  assert.equal(september.all.paidAttributedCents, 2500);
  assert.equal(september.all.outstandingCents, 0);
  assert.equal(c.payments.selectReceiptMonthTotals(appointments, "2026-09-01").receivedCents, 0);
  assert.equal(c.payments.selectReceiptMonthTotals(appointments, "2026-10-01").receivedCents, 2500);
});

test("student totals include archived student IDs and separate completed from future confirmed", () => {
  const c = setup();
  assert.equal(c.students.saveStoredStudentResult({ id: "student-1", firstName: "Ada", status: "archived" }).status, "saved");
  assert.equal(c.students.getStoredStudentById("student-1").status, "archived");
  c.storage.saveCalendarAppointmentsResult([
    lesson("completed", "2026-10-01"),
    lesson("future", "2026-10-28", { status: "confermata", durationMinutes: 90 }),
    lesson("not-due", "2026-10-02", { paymentStatus: "non_dovuta" }),
    lesson("cancelled", "2026-10-03", { status: "annullata" }),
  ]);
  const totals = c.payments.selectLessonMonthPaymentTotals(c.storage.loadCalendarAppointments(), [], "2026-10-01", "2026-10-20");
  assert.equal(totals.all.lessonCount, 3);
  assert.equal(totals.all.durationMinutes, 210);
  assert.equal(totals.all.valueCents, 7500);
  assert.equal(totals.all.dueCents, 5000);
  assert.equal(totals.completed.lessonCount, 2);
  assert.equal(totals.futureConfirmed.lessonCount, 1);
  assert.equal(totals.byStudent[0].studentId, "student-1");
  assert.equal(totals.byStudent[0].totals.outstandingCents, 5000);
});

test("price change preserves receipts, exposes residual or excess, and reconciles status without a refund", () => {
  const c = setup();
  c.storage.saveCalendarAppointmentsResult([lesson("edit")]);
  c.payments.recordPartialLessonPayment({ ...payInput("edit", "part"), amountCents: 1500 });
  const saved = c.storage.loadCalendarAppointments()[0];
  const more = c.payments.reconcileLessonPayment({ ...saved, lessonAmountCents: 3000 });
  assert.equal(more.inspection.outstandingCents, 1500);
  assert.equal(more.lesson.paymentStatus, "parziale");
  assert.equal(more.lesson.paidAmountCents, 1500);
  const less = c.payments.reconcileLessonPayment({ ...saved, lessonAmountCents: 1000 });
  assert.equal(less.inspection.excessCents, 500);
  assert.equal(less.lesson.paymentStatus, "pagata");
  assert.equal(less.lesson.paymentMovements.length, 1);
  assert.equal(c.payments.selectReceiptMonthTotals([less.lesson], "2026-09-01").receivedCents, 1500);
});

test("the existing lesson save reconciles payment status after a price change", () => {
  const c = setup();
  c.storage.saveCalendarAppointmentsResult([lesson("priced")]);
  assert.equal(c.payments.settleLessonPayment(payInput("priced", "price-payment")).status, "saved");
  const paid = c.storage.loadCalendarAppointments()[0];
  assert.equal(c.storage.upsertCalendarAppointmentResult({ ...paid, lessonAmountCents: 3000 }).status, "saved");
  const increased = c.storage.loadCalendarAppointments()[0];
  assert.equal(increased.paymentStatus, "parziale");
  assert.equal(increased.paidAmountCents, 2500);
  assert.deepEqual(increased.paymentMovements, paid.paymentMovements);
  assert.equal(c.storage.upsertCalendarAppointmentResult({ ...increased, lessonAmountCents: 2000 }).status, "saved");
  const decreased = c.storage.loadCalendarAppointments()[0];
  assert.equal(decreased.paymentStatus, "pagata");
  assert.equal(c.payments.inspectLessonPayment(decreased).excessCents, 500);
});

test("three lessons settle through one verified write; retries and insufficient allocation cannot duplicate receipts", () => {
  const c = setup();
  const lessons = [lesson("a"), lesson("b"), lesson("c")];
  c.storage.saveCalendarAppointmentsResult(lessons);
  const targets = lessons.map((item) => target(item.id));
  const input = { targets, studentId: "student-1", receivedAmountCents: 7500,
    paymentDate: "2026-10-20", operationId: "batch-1" };
  assert.equal(c.payments.settleStudentLessons({ ...input, receivedAmountCents: 7000 }).reason, "allocation_required");
  const before = c.local.writes;
  assert.equal(c.payments.settleStudentLessons(input).status, "saved");
  assert.equal(c.local.writes, before + 1);
  const saved = c.storage.loadCalendarAppointments();
  assert.equal(saved.length, 3);
  assert(saved.every((item) => item.paidAmountCents === 2500 && item.paymentStatus === "pagata"));
  assert(saved.every((item) => item.paymentMovements[0].operationId === "batch-1"));
  assert.equal(c.payments.selectReceiptMonthTotals(saved, "2026-10-01").receivedCents, 7500);
  assert.equal(c.payments.settleStudentLessons(input).reason, "already_applied");
  assert.equal(c.local.writes, before + 1);
  assert.equal(c.payments.settleStudentLessons({ ...input, operationId: "batch-2" }).reason, "already_settled");
});

test("batch rejects mixed students and duplicate targets without writing", () => {
  const c = setup();
  c.storage.saveCalendarAppointmentsResult([lesson("a"), lesson("b", "2026-09-15", { studentId: "student-2" })]);
  const before = c.local.writes;
  const base = { studentId: "student-1", receivedAmountCents: 5000,
    paymentDate: "2026-09-15", operationId: "bad-batch" };
  assert.equal(c.payments.settleStudentLessons({ ...base, targets: [target("a"), target("b")] }).reason, "stale_or_other_student");
  assert.equal(c.payments.settleStudentLessons({ ...base, targets: [target("a"), target("a")] }).reason, "duplicate_target");
  assert.equal(c.local.writes, before);
});

test("persistent, temporary, and failed saves report distinct outcomes and temporary retry is idempotent", () => {
  const c = setup();
  c.storage.saveCalendarAppointmentsResult([lesson("one")]);
  c.local.rejectWrite = true;
  const input = payInput("one", "temporary-op");
  assert.equal(c.payments.settleLessonPayment(input).status, "temporary");
  assert.equal(c.payments.settleLessonPayment(input).reason, "already_applied");
  assert.equal(c.session.data.has(c.storage.CALENDAR_APPOINTMENTS_STORAGE_KEY), true);
  assert.equal(c.local.data.has(c.storage.CALENDAR_APPOINTMENTS_STORAGE_KEY), true);
  assert.equal(c.payments.selectReceiptMonthTotals(c.storage.loadCalendarAppointments(), "2026-09-01").receivedCents, 2500);
  c.session.rejectWrite = true;
  const correction = { target: target("one"), movementId: c.storage.loadCalendarAppointments()[0].paymentMovements[0].id,
    operationId: "failed-correction" };
  assert.equal(c.payments.reverseLessonPayment(correction).status, "failed");
  assert.equal(c.storage.loadCalendarAppointments()[0].paidAmountCents, 2500);
  c.local.rejectWrite = false;
  c.session.rejectWrite = false;
  assert.equal(c.payments.reverseLessonPayment(correction).status, "saved");
  assert.equal(c.storage.loadCalendarAppointments()[0].paidAmountCents, 0);
});

test("generic lesson updates preserve the movement history and malformed ledgers block payment writes", () => {
  const c = setup();
  c.storage.saveCalendarAppointmentsResult([lesson("one")]);
  c.payments.settleLessonPayment(payInput("one", "safe"));
  const before = c.storage.loadCalendarAppointments()[0];
  assert.equal(c.storage.upsertCalendarAppointmentResult({ ...before, notes: "Nuova nota" }).status, "saved");
  assert.deepEqual(c.storage.loadCalendarAppointments()[0].paymentMovements, before.paymentMovements);
  assert.equal(c.storage.upsertCalendarAppointmentResult({ ...before, paidAmountCents: 0,
    paymentStatus: "non_pagata" }).status, "failed");
  assert.equal(c.storage.loadCalendarAppointments()[0].paidAmountCents, 2500);
  const corrupted = { ...before, paymentMovements: [{ id: "broken", kind: "payment" }] };
  c.storage.saveCalendarAppointmentsResult([corrupted]);
  assert.equal(c.payments.settleLessonPayment(payInput("one", "unsafe")).reason, "invalid_ledger");
  assert.equal(c.payments.selectReceiptMonthTotals(c.storage.loadCalendarAppointments(), "2026-09-01").invalidLedgerIds[0], "one");
});
