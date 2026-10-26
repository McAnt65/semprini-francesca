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
const { checkLessonAvailability: check } = require("../app/data/calendario/calendar-availability.ts");
const base = { studentId: "test", studentNameSnapshot: "Studente [TEST]", subject: "Matematica",
  durationMinutes: 60, mode: "casa", status: "confermata", topic: "", notes: "",
  hourlyRateCents: 2000, lessonAmountCents: 2000, paymentStatus: "non_pagata",
  source: "manuale", createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" };
const appointment = (id, date, startTime, extra = {}) => ({ ...base, id, date, startTime, ...extra });
const series = (id, endsOn, extra = {}) => ({ ...base, id, startsOn: "2026-10-19", startTime: "15:00",
  recurrence: { frequency: "weekly", intervalWeeks: 1, endsOn }, ...extra });
const slot = (date, startTime, durationMinutes = 60, recurrence) => ({ date, startTime, durationMinutes, recurrence });

test("total, partial and adjoining intervals", () => {
  const items = [appointment("one", "2026-10-19", "15:00")];
  assert.equal(check(slot("2026-10-19", "15:00"), items, []).state, "conflict");
  assert.equal(check(slot("2026-10-19", "15:30"), items, []).state, "conflict");
  assert.equal(check(slot("2026-10-19", "14:30"), items, []).state, "conflict");
  assert.equal(check(slot("2026-10-19", "16:00"), items, []).state, "available");
  assert.equal(check(slot("2026-10-19", "14:00"), items, []).state, "available");
});

test("weekly series, cancellation and moved exceptions", () => {
  const recurring = [series("weekly", "2026-11-02")];
  const cancelled = appointment("cancelled", "2026-10-26", "15:00", { seriesId: "weekly", originalOccurrenceDate: "2026-10-26", status: "annullata" });
  const moved = appointment("moved", "2026-11-02", "16:00", { seriesId: "weekly", originalOccurrenceDate: "2026-11-02" });
  assert.equal(check(slot("2026-10-26", "15:00"), [cancelled, moved], recurring).state, "available");
  assert.equal(check(slot("2026-11-02", "16:00"), [cancelled, moved], recurring).state, "conflict");
  assert.equal(check(slot("2026-10-19", "15:30"), [cancelled, moved], recurring).state, "conflict");
});

test("new recurrence checks every defined occurrence and open series states its horizon", () => {
  const existing = [appointment("late", "2026-11-02", "15:30")];
  assert.equal(check(slot("2026-10-19", "15:00", 60, { intervalWeeks: 1, endsOn: "2026-11-09" }), existing, []).state, "conflict");
  const open = check(slot("2026-10-19", "15:00", 60, { intervalWeeks: 1 }), [], []);
  assert.deepEqual(open, { state: "available", checkedThrough: "2027-10-19", limited: true });
});

test("editing excludes its original occurrence but detects other lessons", () => {
  const own = appointment("own", "2026-10-19", "15:00");
  assert.equal(check(slot("2026-10-19", "15:00"), [own], [], { appointmentId: "own" }).state, "available");
  assert.equal(check(slot("2026-10-19", "15:00"), [own, appointment("other", "2026-10-19", "15:30")], [], { appointmentId: "own" }).state, "conflict");
});

test("incomplete dates and duration never claim availability", () => {
  assert.equal(check(slot("", "15:00"), [], []).state, "incomplete");
  assert.equal(check(slot("2026-10-19", "bad"), [], []).state, "incomplete");
  assert.equal(check(slot("2026-10-19", "15:00", 0), [], []).state, "incomplete");
});
