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
const { selectDayOccurrences } = require("../app/data/calendario/calendar-selectors.ts");
const { appointmentWithChangedStatus, restoredLessonStatus } = require("../app/data/calendario/calendar-status.ts");
const { evaluateCalendarSelection, saveNewLessonDraft, loadNewLessonDraft, returnToNewLessonHref } = require("../app/calendario/nuova/lesson-selection.ts");

const base = { studentId: "student-test", studentNameSnapshot: "Giulia [TEST]", subject: "Matematica",
  durationMinutes: 60, mode: "domicilio", status: "confermata", topic: "Equazioni", notes: "Nota conservata",
  hourlyRateCents: 2000, lessonAmountCents: 2000, paidAmountCents: 1000, paymentStatus: "parziale",
  source: "manuale", createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:00:00Z" };
const first = { ...base, id: "first", date: "2026-10-19", startTime: "15:00", travelMinutes: 20 };
const second = { ...base, id: "second", date: "2026-10-19", startTime: "16:30", studentId: "another" };
const weekly = { ...base, id: "weekly", startsOn: "2026-10-19", startTime: "15:00",
  status: "attesa", recurrence: { frequency: "weekly", intervalWeeks: 1, endsOn: "2026-11-02" } };

test("confirmation and correction change only one appointment's status", () => {
  const selected = selectDayOccurrences([first, second], [], first.date)[0];
  const done = appointmentWithChangedStatus(selected, "svolta", [first, second], [], "unused", "2026-10-19T17:00:00Z");
  assert.deepEqual(done, { ...first, status: "svolta", updatedAt: "2026-10-19T17:00:00Z" });
  assert.deepEqual(second, { ...base, id: "second", date: "2026-10-19", startTime: "16:30", studentId: "another" });
  const correction = appointmentWithChangedStatus(selectDayOccurrences([done, second], [], first.date)[0],
    "confermata", [done, second], [], "unused", "2026-10-19T17:01:00Z");
  assert.equal(correction.status, "confermata");
  assert.equal(correction.paidAmountCents, 1000);
  assert.equal(correction.notes, "Nota conservata");
});

test("recurrence confirmation creates an exception for one date and leaves the next week unchanged", () => {
  const occurrence = selectDayOccurrences([], [weekly], "2026-10-19")[0];
  const done = appointmentWithChangedStatus(occurrence, "svolta", [], [weekly], "exception-test", "2026-10-19T17:00:00Z");
  assert.equal(done.seriesId, "weekly");
  assert.equal(done.originalOccurrenceDate, "2026-10-19");
  assert.equal(done.paidAmountCents, 1000);
  assert.equal(selectDayOccurrences([done], [weekly], "2026-10-19")[0].status, "svolta");
  assert.equal(selectDayOccurrences([done], [weekly], "2026-10-26")[0].status, "attesa");
  assert.equal(restoredLessonStatus(occurrence, [weekly]), "attesa");
  assert.equal(appointmentWithChangedStatus({ ...occurrence, status: "annullata" }, "svolta", [
    { ...done, status: "annullata" }], [weekly], "other", "2026-10-19T17:01:00Z"), null);
});

test("calendar selection returns to the original edit route with the draft and excludes the edited slot", () => {
  const items = new Map();
  global.window = { sessionStorage: { getItem: (key) => items.get(key) ?? null, setItem: (key, value) => items.set(key, value), removeItem: (key) => items.delete(key) } };
  const token = "11111111-1111-4111-8111-111111111111";
  const draft = { studentId: first.studentId, subject: first.subject, date: first.date, time: first.startTime,
    duration: "60", mode: first.mode, status: first.status, topic: first.topic, notes: first.notes,
    tariffId: "tariff-test", hourlyRate: "20", weekly: false, intervalWeeks: "1", endsOn: "",
    editing: { href: "/calendario/first/modifica?ritorno=%2Flezioni%2Fdiario", originalDate: first.date,
      record: first, exclude: { appointmentId: first.id } } };
  assert.equal(saveNewLessonDraft(token, draft), true);
  assert.equal(loadNewLessonDraft(token).editing.record.notes, "Nota conservata");
  assert.equal(evaluateCalendarSelection(draft, first.date, first.startTime, [first, second], []).state, "available");
  assert.equal(evaluateCalendarSelection(draft, first.date, "16:30", [first, second], []).state, "conflict");
  const href = returnToNewLessonHref(token, "2026-10-20", "14:00");
  const url = new URL(href, "http://local.test");
  assert.equal(url.pathname, "/calendario/first/modifica");
  assert.equal(url.searchParams.get("ritorno"), "/lezioni/diario");
  assert.equal(url.searchParams.get("data"), first.date);
  assert.equal(url.searchParams.get("sceltaData"), "2026-10-20");
  assert.equal(url.searchParams.get("sceltaOra"), "14:00");
  delete global.window;
});
