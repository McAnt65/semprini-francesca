import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import test from "node:test";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const stamp = "2026-10-20T09:00:00.000Z";
const base = { studentId: "student-1", studentNameSnapshot: "Ada [TEST]", subject: "Matematica",
  durationMinutes: 60, mode: "casa", status: "confermata", topic: "Equazioni previste", topicKind: "planned",
  notes: "", hourlyRateCents: 2400, lessonAmountCents: 2400, paidAmountCents: 0,
  paymentStatus: "non_pagata", source: "manuale", createdAt: stamp, updatedAt: stamp };

function setup() {
  const cache = new Map();
  const memory = () => {
    const values = new Map();
    let fail = false;
    return { getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { if (fail) throw new Error("storage unavailable"); values.set(key, value); },
      removeItem: (key) => values.delete(key), set fail(value) { fail = value; } };
  };
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
      (name) => load(resolve(dirname(path), `${name}.ts`)), exports, browser, { randomUUID },
    );
    return exports;
  }
  return { browser, storage: load("app/data/calendario/calendar-storage.ts"),
    selectors: load("app/data/calendario/calendar-selectors.ts"),
    today: load("app/oggi/today-summary.ts"),
    topics: load("app/data/calendario/calendar-topics.ts"),
    subjectTopics: load("app/materie/argomenti/topic-selection.ts"),
    history: load("app/lezioni/storico/history-lessons.ts"),
    diary: load("app/lezioni/diario/diary-lessons.ts") };
}

function lesson(id = "single") {
  return { ...base, id, date: "2026-10-21", startTime: "15:00" };
}

function draft(opened, coveredTopic = "", notes = "") {
  return { originalCoveredTopic: opened.coveredTopic, originalNotes: opened.notes, coveredTopic, notes };
}

test("SEGNA SVOLTA alone leaves a planned topic unconfirmed", () => {
  const app = setup();
  const first = lesson();
  app.storage.saveCalendarAppointmentsResult([first]);
  const opened = app.selectors.selectDayOccurrences([first], [], first.date)[0];
  const result = app.today.completeTodayLesson(opened);
  assert.equal(result.status, "saved");
  assert.equal(result.lesson.status, "svolta");
  assert.equal(result.lesson.coveredTopic, undefined);
  assert.equal(app.topics.plannedTopicOf(result.lesson), first.topic);
  assert.equal(app.subjectTopics.lessonTopics(app.storage.loadCalendarAppointments(), [],
    new Date("2026-10-22T12:00:00Z"), "matematica", "").lessons.length, 0);
});

test("topic alone differs from the plan and reaches history, both diaries, calendar and MATERIE", () => {
  const app = setup();
  const first = lesson();
  app.storage.saveCalendarAppointmentsResult([first]);
  const opened = app.selectors.selectDayOccurrences([first], [], first.date)[0];
  const taught = app.today.saveTodayTeaching(opened, draft(opened, "Funzioni affrontate"));
  assert.equal(taught.status, "saved");
  assert.equal(taught.lesson.topic, first.topic);
  assert.equal(taught.lesson.coveredTopic, "Funzioni affrontate");
  assert.equal(taught.lesson.notes, "");
  const completed = app.today.completeTodayLesson(taught.lesson);
  assert.equal(completed.status, "saved");
  const appointments = app.storage.loadCalendarAppointments();
  const calendar = app.selectors.selectDayOccurrences(appointments, [], first.date);
  const history = app.history.selectCompletedLessons(appointments, [], new Date("2026-10-22T12:00:00Z"));
  assert.equal(calendar[0].coveredTopic, "Funzioni affrontate");
  assert.equal(history[0].coveredTopic, "Funzioni affrontate");
  assert.equal(app.diary.filterAndSortDiary(history, "text", "Funzioni affrontate", "recent").length, 1);
  assert.equal(history.filter((item) => item.studentId === first.studentId)[0].coveredTopic, "Funzioni affrontate");
  assert.equal(app.subjectTopics.lessonTopics(appointments, [], new Date("2026-10-22T12:00:00Z"),
    "matematica", "Funzioni").lessons.length, 1);
  assert.equal(app.subjectTopics.lessonTopics(appointments, [], new Date("2026-10-22T12:00:00Z"),
    "matematica", "Equazioni").lessons.length, 0);
});

test("notes alone and later corrections preserve current payment and unrelated fields", () => {
  const app = setup();
  const paid = { ...lesson(), paidAmountCents: 600, paymentStatus: "parziale",
    historicalPaidAmountCents: 0, paymentMovements: [{ id: "payment-1", kind: "payment", amountCents: 600,
      paymentDate: "2026-10-20", recordedAt: stamp, operationId: "operation-1" }] };
  app.storage.saveCalendarAppointmentsResult([paid]);
  const opened = app.selectors.selectDayOccurrences([paid], [], paid.date)[0];
  const first = app.today.saveTodayTeaching(opened, draft(opened, "", "Primi appunti"));
  assert.equal(first.status, "saved");
  assert.equal(first.lesson.coveredTopic, undefined);
  assert.equal(first.lesson.notes, "Primi appunti");
  const corrected = app.today.saveTodayTeaching(first.lesson, draft(first.lesson, "", "Appunti corretti"));
  assert.equal(corrected.status, "saved");
  assert.equal(corrected.lesson.notes, "Appunti corretti");
  assert.equal(corrected.lesson.paidAmountCents, 600);
  assert.deepEqual(corrected.lesson.paymentMovements, paid.paymentMovements);
  assert.equal(corrected.lesson.topic, paid.topic);
});

test("later DIARIO LEZIONI note edits leave the confirmed topic intact", () => {
  const app = setup();
  const completed = { ...lesson(), status: "svolta", coveredTopic: "Funzioni", notes: "Prima nota" };
  app.storage.saveCalendarAppointmentsResult([completed]);
  const opened = app.selectors.selectDayOccurrences([completed], [], completed.date)[0];
  const updated = app.diary.appointmentWithUpdatedNotes(opened, "Nota successiva",
    app.storage.loadCalendarAppointments(), [], randomUUID(), "2026-10-22T12:00:00Z");
  assert.equal(app.storage.upsertCalendarAppointmentResult(updated).status, "saved");
  const saved = app.storage.loadCalendarAppointments()[0];
  assert.equal(saved.coveredTopic, "Funzioni");
  assert.equal(saved.notes, "Nota successiva");
});

test("historical topic remains unclassified until an explicit actual topic is saved", () => {
  const app = setup();
  const historical = { ...lesson(), status: "svolta", topic: "Algebra", topicKind: undefined };
  app.storage.saveCalendarAppointmentsResult([historical]);
  const opened = app.selectors.selectDayOccurrences(app.storage.loadCalendarAppointments(), [], historical.date)[0];
  assert.equal(app.topics.coveredTopicOf(opened), "");
  assert.equal(app.topics.unclassifiedHistoricalTopicOf(opened), "Algebra");
  assert.equal(app.subjectTopics.lessonTopics(app.storage.loadCalendarAppointments(), [],
    new Date("2026-10-22T12:00:00Z"), "matematica", "Algebra").lessons.length, 1);
  const result = app.today.saveTodayTeaching(opened, draft(opened, "Algebra confermata"));
  assert.equal(result.status, "saved");
  assert.equal(app.topics.unclassifiedHistoricalTopicOf(result.lesson), "");
  assert.equal(app.topics.coveredTopicOf(result.lesson), "Algebra confermata");
  assert.equal(result.lesson.topic, "Algebra");
});

test("one weekly occurrence and a moved exception keep their series links", () => {
  const app = setup();
  const weekly = { ...base, id: "weekly", startsOn: "2026-10-21", startTime: "15:00",
    recurrence: { frequency: "weekly", intervalWeeks: 1, endsOn: "2026-11-11" } };
  app.storage.saveCalendarSeriesResult([weekly]);
  const opened = app.selectors.selectDayOccurrences([], [weekly], "2026-10-21")[0];
  const first = app.today.saveTodayTeaching(opened, draft(opened, "Algebra", "Appunti"));
  assert.equal(first.status, "saved");
  assert.equal(first.lesson.seriesId, weekly.id);
  assert.equal(first.lesson.originalOccurrenceDate, "2026-10-21");
  assert.equal(app.selectors.selectDayOccurrences(app.storage.loadCalendarAppointments(), [weekly], "2026-10-28")[0].coveredTopic,
    undefined);
  const moved = { ...base, id: "moved", seriesId: weekly.id, originalOccurrenceDate: "2026-10-28",
    date: "2026-10-29", startTime: "17:00" };
  app.storage.upsertCalendarAppointmentResult(moved);
  const moveOccurrence = app.selectors.selectDayOccurrences(app.storage.loadCalendarAppointments(), [weekly], moved.date)[0];
  const changed = app.today.saveTodayTeaching(moveOccurrence, draft(moveOccurrence, "Funzioni"));
  assert.equal(changed.status, "saved");
  assert.equal(changed.lesson.date, moved.date);
  assert.equal(changed.lesson.originalOccurrenceDate, moved.originalOccurrenceDate);
  assert.equal(app.storage.loadCalendarAppointments().length, 2);
});

test("concurrent notes are kept; failures retain the draft and temporary writes are reported", () => {
  const app = setup();
  const first = lesson();
  app.storage.saveCalendarAppointmentsResult([first]);
  const opened = app.selectors.selectDayOccurrences([first], [], first.date)[0];
  const newer = { ...first, notes: "Nota aggiornata altrove", updatedAt: "2026-10-21T16:00:00Z" };
  app.storage.upsertCalendarAppointmentResult(newer);
  assert.equal(app.today.saveTodayTeaching(opened, draft(opened, "", "Mio testo")).status, "conflict");
  assert.equal(app.storage.loadCalendarAppointments()[0].notes, newer.notes);
  const topicOnly = app.today.saveTodayTeaching(opened, draft(opened, "Geometria", ""));
  assert.equal(topicOnly.status, "saved");
  assert.equal(topicOnly.lesson.notes, newer.notes);
  app.browser.localStorage.fail = true;
  const temporary = app.today.saveTodayTeaching(topicOnly.lesson, draft(topicOnly.lesson, "Analisi", newer.notes));
  assert.equal(temporary.status, "temporary");
  assert.equal(temporary.lesson.coveredTopic, "Analisi");

  const failed = setup();
  failed.storage.saveCalendarAppointmentsResult([first]);
  failed.browser.localStorage.fail = true;
  failed.browser.sessionStorage.fail = true;
  assert.equal(failed.today.saveTodayTeaching(opened, draft(opened, "Testo da conservare")).status, "failed");
  assert.equal(failed.storage.loadCalendarAppointments()[0].coveredTopic, undefined);
});
