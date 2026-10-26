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

const { calendarArchiveReadable, predefinedTopics, lessonTopics } = require("../app/materie/argomenti/topic-selection.ts");
const { contentKey } = require("../app/materie/materie-data.ts");
const { lessonEditHref } = require("../app/calendario/lesson-navigation.ts");
const { CALENDAR_APPOINTMENTS_STORAGE_KEY: appointmentsKey,
  CALENDAR_SERIES_STORAGE_KEY: seriesKey } = require("../app/data/calendario/calendar-storage.ts");

const base = { studentId: "archived-student", studentNameSnapshot: "Anna Verdi", subject: "Matematica",
  durationMinutes: 60, travelMinutes: 0, mode: "online", status: "svolta", topic: "Algebra", notes: "Nota della lezione",
  hourlyRateCents: 2000, lessonAmountCents: 2000, paidAmountCents: 0, paymentStatus: "non_pagata",
  source: "manuale", createdAt: "2026-10-01T12:00:00Z", updatedAt: "2026-10-01T12:00:00Z" };
const appointment = (id, date, extra = {}) => ({ ...base, id, date, startTime: "15:00", ...extra });
const weekly = { ...base, id: "weekly", startsOn: "2026-10-05", startTime: "15:00",
  recurrence: { frequency: "weekly", intervalWeeks: 1, endsOn: "2026-10-26" } };
const now = new Date(2026, 9, 25, 12, 0);

test("predefined topics use exact editor names and existing note keys; search stays within subject", () => {
  assert.deepEqual(predefinedTopics("matematica", "GEOM"), ["Geometria"]);
  assert.deepEqual(predefinedTopics("fisica", "ott"), ["Ottica"]);
  assert.deepEqual(predefinedTopics("chimica", "algebra"), []);
  assert.equal(contentKey("matematica", "topic:Equazioni"), "semprini:materie:v1:matematica:topic:Equazioni");
  assert.equal(`/materie/matematica/argomento?nome=${encodeURIComponent("Equazioni")}`,
    "/materie/matematica/argomento?nome=Equazioni");
});

test("completed single and recurring occurrences include moves and notes, without cancelled, future or duplicate rows", () => {
  const items = [
    appointment("single", "2026-10-20", { subject: " MATEMATICA ", topic: "Problema libero" }),
    appointment("single", "2026-10-20", { subject: " MATEMATICA ", topic: "Problema libero" }),
    appointment("cancel", "2026-10-12", { seriesId: weekly.id, originalOccurrenceDate: "2026-10-12", status: "annullata" }),
    appointment("moved", "2026-10-18", { seriesId: weekly.id, originalOccurrenceDate: "2026-10-19", topic: "Esperimento" }),
    appointment("unfinished", "2026-10-21", { status: "confermata" }),
    appointment("future", "2026-10-27"),
    appointment("blank", "2026-10-22", { topic: " " }),
  ];
  const result = lessonTopics(items, [weekly], now, "matematica", "");
  assert.deepEqual(result.lessons.map((item) => [item.date, item.topic]), [
    ["2026-10-20", "Problema libero"], ["2026-10-18", "Esperimento"], ["2026-10-05", "Algebra"],
  ]);
  assert.equal(result.withoutTopic, 1);
  assert.equal(result.lessons[0].studentNameSnapshot, "Anna Verdi"); // retained for archived students
  assert.equal(result.lessons[0].notes, "Nota della lezione");
  assert.match(lessonEditHref(result.lessons[1], "/lezioni/storico"), /\/calendario\/moved\/modifica\?data=2026-10-18/);
  assert.deepEqual(lessonTopics(items, [weekly], now, "matematica", "esper").lessons.map((item) => item.topic), ["Esperimento"]);
  assert.equal(lessonTopics(items, [weekly], now, "fisica", "").lessons.length, 0);
});

test("calendar read errors are distinct from an empty archive", () => {
  const empty = { getItem: () => null };
  assert.equal(calendarArchiveReadable([empty, empty]), true);
  assert.equal(calendarArchiveReadable([empty]), false);
  assert.equal(calendarArchiveReadable([empty, { getItem: () => { throw Error("denied"); } }]), false);
  assert.equal(calendarArchiveReadable([empty, { getItem: (key) => key === appointmentsKey ? "{bad" : null }]), false);
  assert.equal(calendarArchiveReadable([empty, { getItem: (key) => key === seriesKey ? "{}" : null }]), false);
  assert.equal(calendarArchiveReadable([empty, { getItem: (key) => key === appointmentsKey ? "[{}]" : null }]), false);
  assert.equal(calendarArchiveReadable([empty, { getItem: (key) => key === appointmentsKey ? JSON.stringify([appointment("ok", "2026-10-20")]) : null }]), true);
});
