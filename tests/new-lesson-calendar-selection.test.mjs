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
const selection = require("../app/calendario/nuova/lesson-selection.ts");
const token = "00000000-0000-4000-8000-000000000001";
const draft = { studentId: "student-test", subject: "Fisica", date: "", time: "", duration: "60",
  mode: "domicilio", status: "confermata", topic: "Argomento [TEST]", notes: "Nota [TEST]",
  tariffId: "tariff-test", hourlyRate: "25,00", weekly: false, intervalWeeks: "1", endsOn: "" };
const base = { studentId: "student-test", studentNameSnapshot: "Studente [TEST]", subject: "Fisica",
  durationMinutes: 60, mode: "domicilio", status: "confermata", topic: "", notes: "",
  hourlyRateCents: 2500, lessonAmountCents: 2500, paymentStatus: "non_pagata", source: "manuale",
  createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" };
const appointment = (id, date, startTime, extra = {}) => ({ ...base, id, date, startTime, ...extra });

test("week opens first and month, week, day links retain selection", () => {
  assert.equal(selection.calendarSelectionHref("week", "2026-10-19", token), `/calendario/settimana?data=2026-10-19&seleziona=${token}`);
  assert.equal(selection.calendarSelectionHref("month", "2026-10-19", token), `/calendario/mese?data=2026-10-19&seleziona=${token}`);
  assert.equal(selection.calendarSelectionHref("day", "2026-10-19", token), `/calendario/giorno?data=2026-10-19&seleziona=${token}`);
  assert.equal(selection.returnToNewLessonHref(token, "2026-10-19", "15:00"), `/calendario/nuova?bozza=${token}&data=2026-10-19&ora=15%3A00`);
});

test("Italian date is displayed in long form and Chemistry follows student subjects", () => {
  assert.equal(selection.formatItalianLessonDate("2026-10-20"), "20 ottobre 2026");
  assert.deepEqual(selection.supportedSubjectsForStudent(["Fisica", "CHIMICA"]), ["Fisica", "Chimica"]);
  assert.deepEqual(selection.supportedSubjectsForStudent(["Matematica", "Fisica"]), ["Matematica", "Fisica"]);
  assert.deepEqual(selection.supportedSubjectsForStudent([]), ["Matematica", "Fisica", "Chimica"]);
});

test("free slot returns, occupied slot is refused, and duration changes are rechecked", () => {
  const lessons = [appointment("one", "2026-10-19", "16:00")];
  assert.equal(selection.evaluateCalendarSelection(draft, "2026-10-19", "14:00", lessons, []).state, "available");
  assert.equal(selection.evaluateCalendarSelection(draft, "2026-10-19", "15:30", lessons, []).state, "conflict");
  assert.equal(selection.evaluateCalendarSelection({ ...draft, duration: "90" }, "2026-10-19", "15:00", lessons, []).state, "conflict");
});

test("recurrences and cancelled exceptions use the same availability logic", () => {
  const series = [{ ...base, id: "series", startsOn: "2026-10-19", startTime: "15:00",
    recurrence: { frequency: "weekly", intervalWeeks: 1, endsOn: "2026-11-02" } }];
  const cancelled = appointment("exception", "2026-10-26", "15:00", {
    seriesId: "series", originalOccurrenceDate: "2026-10-26", status: "annullata",
  });
  assert.equal(selection.evaluateCalendarSelection(draft, "2026-10-19", "15:00", [cancelled], series).state, "conflict");
  assert.equal(selection.evaluateCalendarSelection(draft, "2026-10-26", "15:00", [cancelled], series).state, "available");
});

test("draft survives route changes, keeps other fields, and cancellation clears only its token", () => {
  const values = new Map();
  globalThis.window = { sessionStorage: {
    setItem: (key, value) => values.set(key, value),
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
  } };
  assert.equal(selection.saveNewLessonDraft(token, draft), true);
  const chosen = { ...selection.loadNewLessonDraft(token), date: "2026-10-19", time: "15:00" };
  selection.saveNewLessonDraft(token, chosen);
  assert.deepEqual(selection.loadNewLessonDraft(token), chosen);
  assert.equal(chosen.topic, draft.topic);
  assert.equal(chosen.tariffId, draft.tariffId);
  selection.clearNewLessonDraft(token);
  assert.equal(selection.loadNewLessonDraft(token), null);
  delete globalThis.window;
});
