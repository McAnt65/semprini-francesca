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
  return {
    forecast: load("app/pagamenti/previsioni/forecast-model.ts"),
    recurrence: load("app/data/calendario/calendar-recurrence.ts"),
  };
}

function lesson(id, date, extra = {}) {
  return {
    id, date, startTime: "14:00", studentId: "archived-student", studentNameSnapshot: "Ada Archiviata",
    subject: "Matematica", durationMinutes: 60, mode: "casa", status: "confermata",
    topic: "", notes: "", hourlyRateCents: 2500, lessonAmountCents: 2500,
    paidAmountCents: 0, paymentStatus: "non_pagata", source: "manuale",
    createdAt: timestamp, updatedAt: timestamp, ...extra,
  };
}

function series(id, startsOn, extra = {}) {
  const snapshot = lesson(id, startsOn);
  delete snapshot.date;
  return { ...snapshot, id, startsOn, recurrence: { frequency: "weekly", intervalWeeks: 1, endsOn: "2026-11-18" }, ...extra };
}

test("six local months count only future confirmed payable lessons, including paid and zero-value activity", () => {
  const { forecast } = setup();
  const appointments = [
    lesson("past-day", "2026-10-19"),
    lesson("past-time", "2026-10-20", { startTime: "10:00" }),
    lesson("future-time", "2026-10-20"),
    lesson("partial", "2026-10-25", { durationMinutes: 90, lessonAmountCents: 3000,
      paidAmountCents: 1000, paymentStatus: "parziale" }),
    lesson("paid", "2026-10-26", { paidAmountCents: 2500, paymentStatus: "pagata" }),
    lesson("zero", "2026-10-27", { durationMinutes: 45, lessonAmountCents: 0 }),
    lesson("cancelled", "2026-10-28", { status: "annullata" }),
    lesson("requested", "2026-10-29", { status: "richiesta" }),
    lesson("waiting", "2026-10-30", { status: "attesa" }),
    lesson("not-due", "2026-10-31", { paymentStatus: "non_dovuta" }),
    lesson("november", "2026-11-02", { studentId: "student-b", studentNameSnapshot: "Bea",
      durationMinutes: 30, lessonAmountCents: 4000 }),
  ];
  const months = forecast.selectForecastMonths(appointments, [], "2026-10-01", "2026-10-20", "12:00");
  assert.equal(months.length, 6);
  assert.equal(months[0].month, "2026-10-01");
  assert.equal(months[5].month, "2027-03-01");
  assert.deepEqual([months[0].lessonCount, months[0].durationMinutes, months[0].valueCents,
    months[0].paidCents, months[0].outstandingCents], [4, 255, 8000, 3500, 4500]);
  assert.equal(months[0].students[0].name, "Ada Archiviata");
  assert.equal(months[0].students[0].lessonCount, 4);
  assert.deepEqual([months[1].lessonCount, months[1].durationMinutes, months[1].valueCents], [1, 30, 4000]);
  assert.equal(months[2].lessonCount, 0);
  const changed = appointments.map((item) => item.id === "partial"
    ? { ...item, durationMinutes: 120, lessonAmountCents: 5000, paidAmountCents: 2000 } : item);
  const updated = forecast.selectForecastMonths(changed, [], "2026-10-01", "2026-10-20", "12:00")[0];
  assert.deepEqual([updated.durationMinutes, updated.valueCents, updated.paidCents, updated.outstandingCents],
    [285, 10000, 4500, 5500]);
});

test("weekly occurrences, moved exceptions and duplicate exception records count once in the effective month", () => {
  const { forecast, recurrence } = setup();
  const weekly = series("weekly", "2026-10-28");
  const movedOctober = recurrence.createSingleOccurrenceException(weekly, "2026-10-28", "moved-october",
    { date: "2026-11-02", durationMinutes: 120, lessonAmountCents: 5000 });
  const cancelled = recurrence.createSingleOccurrenceException(weekly, "2026-11-11", "cancelled",
    { status: "annullata" });
  const older = recurrence.createSingleOccurrenceException(weekly, "2026-11-04", "older",
    { date: "2026-12-02" }, "2026-10-01T12:00:00.000Z");
  const newer = recurrence.createSingleOccurrenceException(weekly, "2026-11-04", "newer",
    { date: "2026-12-03", lessonAmountCents: 4000, paidAmountCents: 1000, paymentStatus: "parziale" },
    "2026-10-02T12:00:00.000Z");
  assert.ok(movedOctober && cancelled && older && newer);
  const months = forecast.selectForecastMonths([movedOctober, cancelled, older, newer], [weekly],
    "2026-10-01", "2026-10-20", "12:00");
  assert.equal(months[0].lessonCount, 0);
  assert.deepEqual([months[1].lessonCount, months[1].durationMinutes, months[1].valueCents], [2, 180, 7500]);
  assert.deepEqual([months[2].lessonCount, months[2].valueCents, months[2].paidCents, months[2].outstandingCents],
    [1, 4000, 1000, 3000]);
  assert.equal(forecast.shiftForecastMonth("2026-12-01", 1), "2027-01-01");
});

test("an old open-ended weekly series expands only the requested six-month window", () => {
  const { forecast } = setup();
  const longSeries = series("long", "2020-01-01", { recurrence: { frequency: "weekly", intervalWeeks: 1 } });
  const months = forecast.selectForecastMonths([], [longSeries], "2026-10-01", "2026-10-20", "12:00");
  const total = months.reduce((sum, month) => sum + month.lessonCount, 0);
  assert.equal(months.length, 6);
  assert.ok(total > 20 && total < 30);
});
