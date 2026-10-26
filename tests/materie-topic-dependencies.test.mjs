import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const code = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  module._compile(code, filename);
};

const { topicDeletionBlocker } = require("../app/materie/topic-dependencies.ts");
const { readTopicCatalog, topicNoteKey } = require("../app/materie/topic-catalog.ts");
const { PROGRAMS_STORAGE_KEY } = require("../app/materie/programmi/program-storage.ts");
const { CALENDAR_APPOINTMENTS_STORAGE_KEY } = require("../app/data/calendario/calendar-storage.ts");

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("eliminazione bloccata da appunti, lezioni, programmi, studenti e archivi illeggibili", () => {
  const local = storage();
  const session = storage();
  const previousWindow = globalThis.window;
  globalThis.window = { localStorage: local, sessionStorage: session };
  try {
    const topic = readTopicCatalog(local).topics.fisica[0];
    const sources = [{ storage: local, persistent: true }, { storage: session, persistent: false }];
    const block = () => topicDeletionBlocker("fisica", topic, local, session, sources);
    assert.equal(block(), null);
    local.setItem(topicNoteKey("fisica", topic), "Appunti conservati");
    assert.match(block(), /appunti/);
    local.removeItem(topicNoteKey("fisica", topic));

    const now = "2026-10-25T12:00:00.000Z";
    local.setItem(CALENDAR_APPOINTMENTS_STORAGE_KEY, JSON.stringify([{
      id: "lesson-1", date: "2026-10-25", startTime: "15:00", source: "manuale",
      studentId: "student-1", studentNameSnapshot: "Ada Test", subject: "Fisica",
      durationMinutes: 60, mode: "online", status: "svolta", topic: "Cinematica",
      notes: "", hourlyRateCents: 2000, lessonAmountCents: 2000, paymentStatus: "non_pagata",
      createdAt: now, updatedAt: now,
    }]));
    assert.match(block(), /lezione|ricorrenza/);
    local.removeItem(CALENDAR_APPOINTMENTS_STORAGE_KEY);

    local.setItem(PROGRAMS_STORAGE_KEY, JSON.stringify({ version: 1, entries: [{
      id: "model-1", kind: "model", name: "Modello", subject: "fisica", gradeClass: "", schoolType: "",
      topics: [{ id: "p1", name: "Cinematica", status: "da_affrontare" }],
      notes: "", createdAt: now, updatedAt: now,
    }] }));
    assert.match(block(), /programma/);
    local.removeItem(PROGRAMS_STORAGE_KEY);

    local.setItem("semprini:students", JSON.stringify([{
      id: "student-1", firstName: "Ada", lastName: "Test", subjects: ["Fisica"],
      topicsToDeepen: "Cinematica",
    }]));
    assert.match(block(), /studente/);
    local.removeItem("semprini:students");

    local.setItem(CALENDAR_APPOINTMENTS_STORAGE_KEY, "{bad");
    assert.match(block(), /non leggibile/);
  } finally {
    globalThis.window = previousWindow;
  }
});
