import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const typescript = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const source = readFileSync(filename, "utf8");
  const code = typescript.transpileModule(source, {
    compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 },
  }).outputText;
  module._compile(code, filename);
};

const { groupOccurrencesByDate } = require("../app/data/calendario/calendar-selectors.ts");
const { initialScheduleEnd, lessonEditorHref, selectProgrammedLessons } = require("../app/lezioni/in-programma/upcoming-lessons.ts");

const common = {
  studentId: "synthetic-student",
  studentNameSnapshot: "Alice Esempio",
  subject: "Matematica",
  durationMinutes: 60,
  mode: "casa",
  status: "confermata",
  topic: "",
  notes: "",
  hourlyRateCents: 3000,
  lessonAmountCents: 3000,
  paymentStatus: "non_pagata",
  source: "manuale",
  createdAt: "2026-10-01T12:00:00.000Z",
  updatedAt: "2026-10-01T12:00:00.000Z",
};

const appointment = (id, date, startTime, changes = {}) => ({
  ...common, id, date, startTime, ...changes,
});

test("today remains chronological including completed lessons; past completed and cancelled are excluded", () => {
  const appointments = [
    appointment("later", "2026-10-18", "09:00"),
    appointment("past", "2026-10-18", "08:00"),
    appointment("done", "2026-10-18", "10:00", { status: "svolta" }),
    appointment("cancelled", "2026-10-18", "11:00", { status: "annullata" }),
    appointment("earlier-next-day", "2026-10-19", "10:00"),
  ];
  const series = [{
    ...common,
    id: "weekly",
    startsOn: "2026-10-19",
    startTime: "11:00",
    recurrence: { frequency: "weekly", intervalWeeks: 1, endsOn: "2026-11-02" },
  }];
  appointments.push(
    appointment("replacement", "2026-10-26", "14:00", { seriesId: "weekly", originalOccurrenceDate: "2026-10-26" }),
    appointment("cancelled-occurrence", "2026-11-02", "11:00", { seriesId: "weekly", originalOccurrenceDate: "2026-11-02", status: "annullata" }),
  );

  const lessons = selectProgrammedLessons(appointments, series, "2026-10-18", "08:30", "2026-11-02");
  assert.deepEqual(lessons.map((item) => [item.date, item.startTime]), [
    ["2026-10-18", "08:00"],
    ["2026-10-18", "09:00"],
    ["2026-10-18", "10:00"],
    ["2026-10-19", "10:00"],
    ["2026-10-19", "11:00"],
    ["2026-10-26", "14:00"],
  ]);
  assert.deepEqual([...groupOccurrencesByDate(lessons)].map(([date, items]) => [date, items.length]), [
    ["2026-10-18", 3], ["2026-10-19", 2], ["2026-10-26", 1],
  ]);
  assert.equal(lessons.filter((item) => item.date === "2026-10-26").length, 1);
  assert.equal(lessonEditorHref(lessons[4]), "/calendario/series%3Aweekly%3A2026-10-19/modifica?data=2026-10-19&ritorno=%2Flezioni%2Fin-programma");
  assert.equal(lessonEditorHref(lessons[5]), "/calendario/replacement/modifica?data=2026-10-26&ritorno=%2Flezioni%2Fin-programma");
});

test("empty schedule and future finite lessons", () => {
  assert.deepEqual(selectProgrammedLessons([], [], "2026-10-18", "08:30", "2027-10-18"), []);
  assert.equal(initialScheduleEnd([appointment("distant", "2028-01-05", "09:00")], [], "2026-10-18"), "2028-01-05");
});

test("a completed first lesson stays beside the next appointment until midnight", () => {
  const first = appointment("first", "2026-10-18", "15:00", { status: "svolta" });
  const second = appointment("second", "2026-10-18", "16:30");
  const lessons = selectProgrammedLessons([first, second], [], "2026-10-18", "23:59", "2026-10-19");
  assert.deepEqual(lessons.map((item) => item.appointmentId), ["first", "second"]);
  assert.deepEqual(selectProgrammedLessons([first, second], [], "2026-10-19", "00:00", "2026-10-20"), []);
});
