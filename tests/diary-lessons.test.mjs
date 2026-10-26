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
const { selectCompletedLessons } = require("../app/lezioni/storico/history-lessons.ts");
const { appointmentWithUpdatedNotes, filterAndSortDiary } = require("../app/lezioni/diario/diary-lessons.ts");
const { selectDayOccurrences } = require("../app/data/calendario/calendar-selectors.ts");
const { lessonEditorHref } = require("../app/lezioni/in-programma/upcoming-lessons.ts");

const base = { studentId: "test-student", studentNameSnapshot: "Giulia Rossi [TEST]", subject: "Matematica",
  durationMinutes: 60, mode: "domicilio", status: "svolta", topic: "Algebra", notes: "Nota iniziale",
  hourlyRateCents: 2000, lessonAmountCents: 2000, paidAmountCents: 1000, paymentStatus: "parziale",
  source: "manuale", createdAt: "2026-10-01T12:00:00Z", updatedAt: "2026-10-01T12:00:00Z" };
const appointment = (id, date, extra = {}) => ({ ...base, id, date, startTime: "15:00", ...extra });
const weekly = { ...base, id: "series-test", startsOn: "2026-10-05", startTime: "15:00",
  recurrence: { frequency: "weekly", intervalWeeks: 1, endsOn: "2026-10-26" } };
const now = new Date(2026, 9, 25, 12, 0);

test("diary includes completed lessons only and honors recurring exceptions", () => {
  const items = [appointment("single", "2026-10-20", { notes: "" }),
    appointment("uncompleted", "2026-10-19", { status: "confermata" }),
    appointment("cancelled", "2026-10-12", { seriesId: weekly.id, originalOccurrenceDate: "2026-10-12", status: "annullata" }),
    appointment("exception", "2026-10-19", { seriesId: weekly.id, originalOccurrenceDate: "2026-10-19", notes: "Osservazione" }),
    appointment("future", "2026-10-27")];
  const lessons = selectCompletedLessons(items, [weekly], now);
  assert.deepEqual(lessons.map((item) => item.date), ["2026-10-05", "2026-10-19", "2026-10-20"]);
  assert.equal(lessons.at(-1).notes, "");
  assert.equal(lessonEditorHref(lessons[0], "/lezioni/diario"), "/calendario/series%3Aseries-test%3A2026-10-05/modifica?data=2026-10-05&ritorno=%2Flezioni%2Fdiario");
  assert.equal(lessonEditorHref(lessons[1], "/lezioni/diario"), "/calendario/exception/modifica?data=2026-10-19&ritorno=%2Flezioni%2Fdiario");
});

test("student, subject and actual text search; both chronological orders and long notes", () => {
  const long = "osservazione ".repeat(400);
  const lessons = selectCompletedLessons([
    appointment("a", "2026-10-20", { studentNameSnapshot: "Lorenzo Bianchi [TEST]", subject: "Fisica", notes: long }),
    appointment("b", "2026-10-19", { notes: "" }),
  ], [], now);
  assert.equal(filterAndSortDiary(lessons, "student", "lorenzo", "recent").length, 1);
  assert.equal(filterAndSortDiary(lessons, "subject", "fisica", "recent").length, 1);
  assert.equal(filterAndSortDiary(lessons, "text", "osservazione", "recent").length, 1);
  assert.equal(filterAndSortDiary(lessons, "text", "algebra", "recent").length, 2);
  assert.equal(filterAndSortDiary(lessons, "text", "non presente", "recent").length, 0);
  assert.deepEqual(filterAndSortDiary(lessons, "student", "", "recent").map((item) => item.date), ["2026-10-20", "2026-10-19"]);
  assert.deepEqual(filterAndSortDiary(lessons, "student", "", "oldest").map((item) => item.date), ["2026-10-19", "2026-10-20"]);
});

test("saving changes only notes on a single appointment", () => {
  const original = appointment("single", "2026-10-20");
  const occurrence = selectDayOccurrences([original], [], original.date)[0];
  const changed = appointmentWithUpdatedNotes(occurrence, "Nuova nota", [original], [], "unused", "2026-10-25T12:00:00Z");
  assert.deepEqual(changed, { ...original, notes: "Nuova nota", updatedAt: "2026-10-25T12:00:00Z" });
  assert.equal(original.notes, "Nota iniziale");
});

test("a series note creates one occurrence exception and leaves other lessons intact", () => {
  const first = selectDayOccurrences([], [weekly], "2026-10-05")[0];
  const changed = appointmentWithUpdatedNotes(first, "Solo questa settimana", [], [weekly], "note-exception", "2026-10-25T12:00:00Z");
  assert.equal(changed.id, "note-exception");
  assert.equal(changed.seriesId, weekly.id);
  assert.equal(changed.originalOccurrenceDate, "2026-10-05");
  assert.equal(changed.paidAmountCents, weekly.paidAmountCents);
  assert.equal(weekly.notes, "Nota iniziale");
  assert.equal(selectDayOccurrences([changed], [weekly], "2026-10-05")[0].notes, "Solo questa settimana");
  assert.equal(selectDayOccurrences([changed], [weekly], "2026-10-19")[0].notes, "Nota iniziale");
  assert.equal(appointmentWithUpdatedNotes(first, "stale", [changed], [weekly], "another", "2026-10-25T12:01:00Z"), null);
});
