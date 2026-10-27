import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");

function loadModule(relativePath, cache = new Map()) {
  const path = resolve(root, relativePath);
  if (cache.has(path)) return cache.get(path);
  const cjs = { exports: {} };
  cache.set(path, cjs.exports);
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (specifier) => {
    if (!specifier.startsWith(".")) throw new Error("Unexpected dependency: " + specifier);
    return loadModule(resolve(dirname(path), specifier + ".ts"), cache);
  };
  new Function("exports", "require", "module", code)(cjs.exports, localRequire, cjs);
  return cjs.exports;
}

function memory() {
  const entries = new Map();
  return {
    entries, writes: 0,
    getItem(key) { return entries.get(key) ?? null; },
    setItem(key, value) { this.writes++; entries.set(key, String(value)); },
    removeItem(key) { this.writes++; entries.delete(key); },
  };
}

function setup() {
  const localStorage = memory();
  const sessionStorage = memory();
  globalThis.window = { localStorage, sessionStorage };
  return {
    localStorage, sessionStorage,
    checks: loadModule("app/assistenza/checklist-model.ts").readSetupChecks,
    progress: loadModule("app/assistenza/progress.ts"),
    tours: loadModule("app/assistenza/content.ts").TOURS,
  };
}

const student = (subjects = ["Matematica"]) => ({
  id: "test-student", firstName: "Prova", lastName: "Temporaneo", status: "active",
  subjects, updatedAt: "2026-10-20T10:00:00Z",
});
const tariff = (extra = {}) => ({
  id: "test-tariff", code: "T1", subject: "Matematica", schoolBand: "Liceo",
  mode: "studio", hourlyRateCents: 2500, updatedAt: "2026-10-20T10:00:00Z", ...extra,
});
const appointment = (extra = {}) => ({
  id: "test-lesson", studentId: "test-student", studentNameSnapshot: "Prova Temporaneo",
  subject: "Matematica", mode: "casa", status: "confermata",
  paymentStatus: "non_pagata", date: "2026-11-02", startTime: "15:00",
  source: "manuale", updatedAt: "2026-10-20T10:00:00Z", ...extra,
});
const put = (storage, key, value) => storage.entries.set(key, JSON.stringify(value));
const statuses = (checks) => checks.map((check) => check.status);

test("valid student, subject, legacy tariff, lesson and saved location complete all five checks", () => {
  const { localStorage: local, checks } = setup();
  put(local, "semprini:students", [student()]);
  put(local, "semprini:tariffs:v1", [tariff()]);
  put(local, "semprini:calendar:appointments:v1", [appointment()]);
  put(local, "semprini:preferences:v1", { lessonLocation: {
    street: "Via Test", streetNumber: "1", city: "Rimini", province: "RN", country: "Italia",
  } });
  assert.deepEqual(statuses(checks()), Array(5).fill("completed"));
  assert.equal(local.writes, 0);
});

test("valid but incomplete setup stays to-do; no payment is required", () => {
  const { localStorage: local, checks } = setup();
  put(local, "semprini:students", [student([])]);
  assert.deepEqual(statuses(checks()), ["completed", "todo", "todo", "todo", "todo"]);
  put(local, "semprini:calendar:appointments:v1", [appointment()]);
  assert.equal(checks()[3].status, "completed");
  assert.equal(checks().length, 5);
});

test("damaged archives are unreadable, not missing configuration", () => {
  const { localStorage: local, checks } = setup();
  local.entries.set("semprini:students", "{bad");
  local.entries.set("semprini:tariffs:v1", "{bad");
  local.entries.set("semprini:calendar:appointments:v1", "{bad");
  local.entries.set("semprini:preferences:v1", "{bad");
  assert.deepEqual(statuses(checks()), Array(5).fill("unreadable"));
  assert.equal(local.writes, 0);
});

test("invalid student and lesson records do not count as completed", () => {
  const { localStorage: local, checks } = setup();
  put(local, "semprini:students", [{ firstName: "Senza ID", subjects: ["Matematica"] }]);
  put(local, "semprini:calendar:appointments:v1", [appointment({ date: "non-una-data" })]);
  assert.deepEqual(statuses(checks()).slice(0, 2), ["unreadable", "unreadable"]);
  assert.equal(checks()[3].status, "unreadable");
});

test("temporary tariff snapshot takes precedence over local tariff and recognizes legacy defaults", () => {
  const { localStorage: local, sessionStorage: session, checks } = setup();
  put(local, "semprini:tariffs:v1", [tariff()]);
  put(session, "semprini:tariffs:v1", []);
  session.entries.set("semprini:tariffs:v1:temporary-snapshot", "yes");
  assert.equal(checks()[2].status, "todo");
  put(session, "semprini:tariffs:v1", [tariff({ id: "session-legacy", active: undefined, format: undefined })]);
  assert.equal(checks()[2].status, "completed");
  local.entries.set("semprini:tariffs:v1", "{bad");
  assert.equal(checks()[2].status, "completed");
});

test("checklist never recovers legacy student narratives or changes existing archives", () => {
  const { localStorage: local, sessionStorage: session, checks } = setup();
  put(local, "semprini:students", [student()]);
  put(local, "semprini:student-narrative:v1:test-student", {
    version: 1, studentId: "test-student", passions: "Scacchi",
  });
  put(session, "semprini:calendar:appointments:v1", [appointment()]);
  const before = [new Map(local.entries), new Map(session.entries)];
  checks();
  assert.deepEqual(local.entries, before[0]);
  assert.deepEqual(session.entries, before[1]);
  assert.equal(local.writes + session.writes, 0);
});

test("legacy tour progress migrates and two thematic tours retain independent steps", () => {
  const { progress } = setup();
  let state = progress.parseProgress({
    dismissedWelcome: true, activeTour: null, pausedTour: "studenti", step: 1,
    completedTours: ["primi-passi"],
  });
  assert.equal(state.steps.studenti, 1);
  assert.deepEqual(state.pausedTours, ["studenti"]);
  state = progress.startTourProgress(state, "materie");
  state = progress.moveTourProgress(state, 1);
  state = progress.pauseTourProgress(state);
  state = progress.startTourProgress(state, "studenti", true);
  assert.equal(state.steps.studenti, 1);
  assert.equal(state.steps.materie, 1);
  assert.deepEqual(state.pausedTours, ["materie"]);
  state = progress.pauseTourProgress(state);
  state = progress.startTourProgress(state, "materie", true);
  assert.equal(state.steps.materie, 1);
  state = progress.startTourProgress(state, "materie");
  assert.equal(state.steps.materie, 0);
  assert.equal(state.steps.studenti, 1);
  state = progress.moveTourProgress(state, 2);
  assert.ok(state.completedTours.includes("materie"));
  assert.ok(state.completedTours.includes("primi-passi"));
  assert.equal(state.steps.studenti, 1);
});

test("all tour destinations exist and automatic navigation avoids write-on-visit pages", () => {
  const { tours } = setup();
  assert.deepEqual(tours["primi-passi"].steps.map((step) => step.href), [
    "/menu", "/impostazioni", "/studenti", "/lezioni", "/calendario/mese",
    "/lezioni/storico", "/pagamenti/tariffario",
  ]);
  const unsafe = new Set(["/oggi", "/studenti/elenco", "/studenti/archivio", "/studenti/nuovo", "/calendario/nuova"]);
  for (const tour of Object.values(tours)) for (const step of tour.steps) {
    assert.ok(!unsafe.has(step.href), step.href);
    const route = resolve(root, "app", step.href.slice(1), "page.tsx");
    assert.ok(readFileSync(route).length > 0, step.href);
  }
});

test("manual links resolve and contextual help matches the current page", () => {
  const { HELP_TOPICS, topicForPath } = loadModule("app/assistenza/content.ts");
  assert.ok(HELP_TOPICS.length >= 15);
  for (const topic of HELP_TOPICS) for (const link of topic.links) {
    const path = link.href.split("?")[0];
    assert.ok(readFileSync(resolve(root, "app", path.slice(1), "page.tsx")).length > 0, link.href);
  }
  assert.equal(topicForPath("/calendario/nuova")?.id, "nuova-lezione");
  assert.equal(topicForPath("/calendario/example/modifica")?.id, "modifica-lezione");
  assert.equal(topicForPath("/materie/programmi")?.id, "programmi");
  assert.equal(topicForPath("/materie/argomenti")?.id, "argomenti");
  assert.equal(topicForPath("/materie/studenti")?.id, "studenti-per-materia");
  assert.equal(topicForPath("/studenti/archivio")?.id, "archivio-studenti");
  assert.equal(topicForPath("/lezioni/diario")?.id, "diario");
  assert.equal(topicForPath("/lezioni/storico")?.id, "storico");
  assert.equal(topicForPath("/pagamenti/previsioni")?.id, "previsioni");
  assert.equal(topicForPath("/pagamenti/statistiche")?.id, "statistiche");
});
