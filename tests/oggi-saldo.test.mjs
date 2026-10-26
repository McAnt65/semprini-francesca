import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import test from "node:test";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const stamp = "2026-10-20T09:00:00.000Z";
const base = { studentId: "student-test", studentNameSnapshot: "Ada [TEST]", subject: "Matematica",
  durationMinutes: 60, mode: "casa", status: "confermata", topic: "Previsto", topicKind: "planned",
  coveredTopic: "Affrontato", notes: "Appunti TEST", hourlyRateCents: 2400,
  lessonAmountCents: 2400, paidAmountCents: 0, paymentStatus: "non_pagata",
  source: "manuale", createdAt: stamp, updatedAt: stamp };

function memory() {
  const data = new Map();
  return { writes: 0, fail: false, getItem(key) { return data.get(key) ?? null; },
    setItem(key, value) { if (this.fail) throw Error("storage unavailable"); this.writes++; data.set(key, value); },
    removeItem(key) { data.delete(key); } };
}

function setup() {
  const cache = new Map();
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
      (name) => load(resolve(dirname(path), `${name}.ts`)), exports, browser, { randomUUID });
    return exports;
  }
  return { browser, storage: load("app/data/calendario/calendar-storage.ts"),
    selectors: load("app/data/calendario/calendar-selectors.ts"),
    quick: load("app/oggi/today-payment.ts"), payments: load("app/data/calendario/calendar-payments.ts"),
    history: load("app/lezioni/storico/history-lessons.ts"),
    summary: load("app/pagamenti/riepilogo/summary-model.ts"),
    statistics: load("app/pagamenti/statistiche/statistics-model.ts"),
    forecast: load("app/pagamenti/previsioni/forecast-model.ts") };
}

const lesson = (id = "single", date = "2026-10-22", extra = {}) =>
  ({ ...base, id, date, startTime: "15:00", ...extra });
const weekly = (extra = {}) => ({ ...base, id: "weekly", startsOn: "2026-10-22", startTime: "15:00",
  recurrence: { frequency: "weekly", intervalWeeks: 1, endsOn: "2026-11-19" }, ...extra });
function occurrence(app, date = "2026-10-22") {
  return app.selectors.selectDayOccurrences(app.storage.loadCalendarAppointments(), app.storage.loadCalendarSeries(), date)[0];
}
function prepare(app, opened = occurrence(app), paymentDate = "2026-10-22") {
  const prepared = app.quick.prepareTodayPayment(opened, paymentDate);
  assert.equal(prepared.status, "ready");
  return prepared.confirmation;
}

test("full settlement is reviewed first, dated, independent of SVOLTA and visible in derived totals", () => {
  const app = setup();
  app.storage.saveCalendarAppointmentsResult([lesson()]);
  const opened = occurrence(app);
  assert.equal(app.quick.todayPaymentState(opened).label, "DA SALDARE");
  assert.equal(app.quick.todayPaymentState(opened).action, "SEGNA SALDATA");
  const confirmation = prepare(app, opened);
  assert.equal(app.storage.loadCalendarAppointments()[0].paidAmountCents, 0);
  assert.equal(app.quick.confirmTodayPayment(confirmation).status, "saved");
  const saved = app.storage.loadCalendarAppointments()[0];
  assert.equal(saved.status, "confermata");
  assert.equal(saved.paymentStatus, "pagata");
  assert.equal(saved.paymentMovements[0].paymentDate, "2026-10-22");
  assert.equal(saved.paymentMovements[0].operationId, confirmation.operationId);
  assert.equal(saved.topic, "Previsto");
  assert.equal(saved.coveredTopic, "Affrontato");
  assert.equal(saved.notes, "Appunti TEST");
  assert.equal(app.quick.todayPaymentState(occurrence(app)).label, "SALDATA");
  assert.equal(app.quick.todayPaymentState(occurrence(app)).action, null);
  assert.equal(app.summary.selectSummaryData([saved], [], "2026-10-01", "2026-10-22").monthly.all.outstandingCents, 0);
  assert.equal(app.summary.selectSummaryData([saved], [], "2026-10-01", "2026-10-22").receipts.receivedCents, 2400);
  assert.equal(app.statistics.selectPaymentStatistics([saved], [], { year: 2026, month: 10 }, "2026-10-23", "12:00").receivedCents, 2400);
});

test("partial payment is preserved and quick action settles only the residual", () => {
  const app = setup();
  const prior = { id: "prior", kind: "payment", amountCents: 900,
    paymentDate: "2026-10-01", operationId: "prior-op", recordedAt: stamp };
  app.storage.saveCalendarAppointmentsResult([lesson("single", "2026-10-22", {
    paidAmountCents: 900, paymentStatus: "parziale", historicalPaidAmountCents: 0, paymentMovements: [prior], status: "svolta",
  })]);
  assert.equal(app.quick.todayPaymentState(occurrence(app)).action, "SALDA RESIDUO");
  const confirmation = prepare(app);
  assert.equal(confirmation.amountCents, 1500);
  assert.equal(app.quick.confirmTodayPayment(confirmation).status, "saved");
  const saved = app.storage.loadCalendarAppointments()[0];
  assert.equal(saved.status, "svolta");
  assert.equal(saved.paidAmountCents, 2400);
  assert.equal(saved.paymentMovements.length, 2);
  assert.deepEqual(saved.paymentMovements[0], prior);
  assert.equal(saved.paymentMovements[1].amountCents, 1500);
  assert.equal(app.history.selectCompletedLessons([saved], [], new Date("2026-10-23T12:00:00Z"))[0].paymentStatus, "pagata");
});

test("settled, not due, zero amount and inconsistent ledger do not offer a command", () => {
  const app = setup();
  const cases = [
    [lesson("settled", "2026-10-22", { paidAmountCents: 2400, paymentStatus: "pagata" }), "SALDATA"],
    [lesson("not-due", "2026-10-22", { paymentStatus: "non_dovuta" }), "NON DOVUTA"],
    [lesson("zero", "2026-10-22", { lessonAmountCents: 0 }), "NESSUN IMPORTO DOVUTO"],
    [lesson("broken", "2026-10-22", { paidAmountCents: 500, paymentStatus: "non_pagata" }), "DA VERIFICARE"],
  ];
  app.storage.saveCalendarAppointmentsResult(cases.map(([item]) => item));
  const writes = app.browser.localStorage.writes;
  for (const [item, label] of cases) {
    const opened = app.selectors.selectDayOccurrences(app.storage.loadCalendarAppointments(), [], item.date)
      .find((entry) => entry.appointmentId === item.id);
    assert.equal(app.quick.todayPaymentState(opened).label, label);
    assert.equal(app.quick.todayPaymentState(opened).action, null);
    assert.equal(app.quick.prepareTodayPayment(opened, "2026-10-22").status, "unavailable");
  }
  assert.equal(app.browser.localStorage.writes, writes);
});

test("advance payment updates future forecast without marking the lesson completed", () => {
  const app = setup();
  app.storage.saveCalendarAppointmentsResult([lesson("future", "2026-11-12")]);
  const before = app.forecast.selectForecastMonths(app.storage.loadCalendarAppointments(), [],
    "2026-11-01", "2026-10-22", "12:00")[0];
  assert.equal(before.outstandingCents, 2400);
  const confirmation = prepare(app, occurrence(app, "2026-11-12"), "2026-10-22");
  assert.equal(app.quick.confirmTodayPayment(confirmation).status, "saved");
  const saved = app.storage.loadCalendarAppointments()[0];
  const after = app.forecast.selectForecastMonths([saved], [], "2026-11-01", "2026-10-22", "12:00")[0];
  assert.equal(after.paidCents, 2400);
  assert.equal(after.outstandingCents, 0);
  assert.equal(saved.status, "confermata");
  assert.equal(app.history.selectCompletedLessons([saved], [], new Date("2026-11-13T12:00:00Z")).length, 0);
});

test("weekly payment creates one exception, keeps series link and leaves next week unpaid", () => {
  const app = setup();
  app.storage.saveCalendarSeriesResult([weekly()]);
  const confirmation = prepare(app);
  assert.equal(app.quick.confirmTodayPayment(confirmation).status, "saved");
  assert.equal(app.storage.loadCalendarAppointments().length, 1);
  assert.equal(app.quick.confirmTodayPayment(confirmation).status, "unchanged");
  assert.equal(app.storage.loadCalendarAppointments().length, 1);
  const paid = occurrence(app);
  assert.equal(paid.seriesId, "weekly");
  assert.equal(paid.originalOccurrenceDate, "2026-10-22");
  assert.equal(paid.paymentStatus, "pagata");
  assert.equal(occurrence(app, "2026-10-29").paymentStatus, "non_pagata");
  assert.equal(app.storage.loadCalendarSeries()[0].paymentStatus, "non_pagata");
});

test("moved exception is paid on its effective date without creating another exception", () => {
  const app = setup();
  app.storage.saveCalendarSeriesResult([weekly()]);
  app.storage.saveCalendarAppointmentsResult([lesson("moved", "2026-10-23", {
    seriesId: "weekly", originalOccurrenceDate: "2026-10-22", startTime: "17:00",
  })]);
  const confirmation = prepare(app, occurrence(app, "2026-10-23"));
  assert.equal(app.quick.confirmTodayPayment(confirmation).status, "saved");
  assert.equal(app.storage.loadCalendarAppointments().length, 1);
  const moved = occurrence(app, "2026-10-23");
  assert.equal(moved.seriesId, "weekly");
  assert.equal(moved.originalOccurrenceDate, "2026-10-22");
  assert.equal(moved.date, "2026-10-23");
  assert.equal(occurrence(app, "2026-10-29").paymentStatus, "non_pagata");
});

test("same operation is idempotent across double confirmation and retry", () => {
  const app = setup();
  app.storage.saveCalendarAppointmentsResult([lesson()]);
  const confirmation = prepare(app);
  assert.equal(app.quick.confirmTodayPayment(confirmation).status, "saved");
  const writes = app.browser.localStorage.writes;
  assert.equal(app.quick.confirmTodayPayment(confirmation).status, "unchanged");
  assert.equal(app.browser.localStorage.writes, writes);
  assert.equal(app.storage.loadCalendarAppointments()[0].paymentMovements.length, 1);
});

test("failed storage keeps the confirmation retryable; temporary storage has its own outcome", () => {
  const app = setup();
  app.storage.saveCalendarAppointmentsResult([lesson()]);
  const confirmation = prepare(app);
  app.browser.localStorage.fail = true;
  app.browser.sessionStorage.fail = true;
  assert.equal(app.quick.confirmTodayPayment(confirmation).status, "failed");
  assert.equal(app.storage.loadCalendarAppointments()[0].paidAmountCents, 0);
  app.browser.localStorage.fail = false;
  assert.equal(app.quick.confirmTodayPayment(confirmation).status, "saved");
  assert.equal(app.storage.loadCalendarAppointments()[0].paymentMovements.length, 1);

  const temporary = setup();
  temporary.storage.saveCalendarAppointmentsResult([lesson()]);
  const pending = prepare(temporary);
  temporary.browser.localStorage.fail = true;
  assert.equal(temporary.quick.confirmTodayPayment(pending).status, "temporary");
  assert.equal(temporary.quick.confirmTodayPayment(pending).status, "unchanged");
  assert.equal(temporary.storage.loadCalendarAppointments()[0].paymentMovements.length, 1);
});

test("changed residual cancels the old confirmation and requires a fresh amount", () => {
  const app = setup();
  app.storage.saveCalendarAppointmentsResult([lesson()]);
  const old = prepare(app);
  const partial = app.payments.recordPartialLessonPayment({ target: { occurrenceId: old.reference.occurrenceId,
    date: old.reference.date }, paymentDate: "2026-10-22", operationId: "outside-op", amountCents: 700 });
  assert.equal(partial.status, "saved");
  const changed = app.quick.confirmTodayPayment(old);
  assert.equal(changed.status, "changed");
  assert.equal(changed.lesson.paidAmountCents, 700);
  assert.equal(app.storage.loadCalendarAppointments()[0].paymentMovements.length, 1);
  const fresh = prepare(app, changed.lesson);
  assert.equal(fresh.amountCents, 1700);
  assert.equal(app.quick.confirmTodayPayment(fresh).status, "saved");
  assert.equal(app.storage.loadCalendarAppointments()[0].paymentMovements.length, 2);
});

test("edits to didactic state and notes after opening the review survive the payment", () => {
  const app = setup();
  app.storage.saveCalendarAppointmentsResult([lesson()]);
  const confirmation = prepare(app);
  const changed = { ...app.storage.loadCalendarAppointments()[0], status: "svolta",
    coveredTopic: "Nuovo argomento affrontato", notes: "Nuovi appunti",
    updatedAt: "2026-10-22T16:00:00.000Z" };
  assert.equal(app.storage.upsertCalendarAppointmentResult(changed).status, "saved");
  assert.equal(app.quick.confirmTodayPayment(confirmation).status, "saved");
  const saved = app.storage.loadCalendarAppointments()[0];
  assert.equal(saved.status, "svolta");
  assert.equal(saved.topic, "Previsto");
  assert.equal(saved.coveredTopic, "Nuovo argomento affrontato");
  assert.equal(saved.notes, "Nuovi appunti");
  assert.equal(saved.paymentStatus, "pagata");
  assert.equal(app.history.selectCompletedLessons([saved], [], new Date("2026-10-23T12:00:00Z"))[0].notes, "Nuovi appunti");
});

test("payment month follows the editable receipt date, not the lesson month", () => {
  const app = setup();
  app.storage.saveCalendarAppointmentsResult([lesson()]);
  const confirmation = prepare(app, occurrence(app), "2026-11-02");
  assert.equal(app.quick.confirmTodayPayment(confirmation).status, "saved");
  const saved = app.storage.loadCalendarAppointments();
  assert.equal(app.summary.selectSummaryData(saved, [], "2026-10-01", "2026-10-22").monthly.all.paidAttributedCents, 2400);
  assert.equal(app.summary.selectSummaryData(saved, [], "2026-10-01", "2026-10-22").receipts.receivedCents, 0);
  assert.equal(app.summary.selectSummaryData(saved, [], "2026-11-01", "2026-11-02").receipts.receivedCents, 2400);
  assert.equal(app.statistics.selectPaymentStatistics(saved, [], { year: 2026, month: 11 }, "2026-11-03", "12:00").receivedCents, 2400);
});

test("invalid date and stale or cancelled occurrence cannot record money", () => {
  const app = setup();
  app.storage.saveCalendarAppointmentsResult([lesson()]);
  const confirmation = prepare(app);
  assert.equal(app.quick.confirmTodayPayment({ ...confirmation, paymentDate: "2026-02-30" }).status, "invalid_date");
  app.storage.saveCalendarAppointmentsResult([lesson("single", "2026-10-22", { status: "annullata" })]);
  assert.equal(app.quick.confirmTodayPayment(confirmation).status, "stale");
  assert.equal(app.storage.loadCalendarAppointments()[0].paidAmountCents, 0);
});
