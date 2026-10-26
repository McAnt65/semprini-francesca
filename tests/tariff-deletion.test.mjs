import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const base = {
  id: "tariff-1", code: "T1", subject: "Matematica", schoolBand: "Liceo",
  mode: "casa", format: "singola", hourlyRateCents: 2500, active: false,
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
};
const keys = {
  tariffs: "semprini:tariffs:v1",
  students: "semprini:students",
  appointments: "semprini:calendar:appointments:v1",
  series: "semprini:calendar:series:v1",
  requests: "semprini:calendar:requests:v1",
};

function memoryStorage(failWrite = false) {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { if (failWrite) throw new Error("write denied"); data.set(key, value); },
    removeItem: (key) => data.delete(key),
  };
}

function setup({ students = [], appointments = [], series = [], requests = [], failLocal = false, failSession = false } = {}) {
  const localSeed = new Map();
  const local = memoryStorage(failLocal), session = memoryStorage(failSession);
  local.getItem = (key) => localSeed.get(key) ?? null;
  local.removeItem = (key) => localSeed.delete(key);
  local.setItem = (key, value) => { if (failLocal) throw new Error("write denied"); localSeed.set(key, value); };
  const seed = (key, value) => localSeed.set(key, JSON.stringify(value));
  seed(keys.tariffs, [base]);
  seed(keys.students, students);
  seed(keys.appointments, appointments);
  seed(keys.series, series);
  seed(keys.requests, requests);
  const browserWindow = { localStorage: local, sessionStorage: session };
  const cache = new Map();
  function load(path) {
    const file = resolve(root, path);
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const code = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    new Function("require", "exports", "window", code)(
      (name) => load(resolve(dirname(file), `${name}.ts`)), exports, browserWindow,
    );
    return exports;
  }
  return { deletion: load("app/data/tariffario/tariff-deletion.ts"), storage: load("app/data/tariffario/tariff-storage.ts"), local, session };
}

test("unused inactive tariff is deleted and a second confirmation cannot delete another tariff", () => {
  const { deletion, storage } = setup();
  assert.equal(storage.loadTariffs()[0].active, false);
  assert.equal(deletion.deleteTariffResult(base.id).status, "saved");
  assert.deepEqual(storage.loadTariffs(), []);
  assert.equal(deletion.deleteTariffResult(base.id).status, "missing");
});

test("closing the confirmation without calling delete preserves the archive", () => {
  const { deletion, storage } = setup();
  assert.equal(deletion.inspectTariffUsage(base.id).historicalLessons, 0);
  assert.deepEqual(storage.loadTariffs(), [base]);
});

test("historical lesson snapshots and payment history remain unchanged", () => {
  const lesson = { id: "old-lesson", tariffId: base.id, tariffCode: base.code, date: "2020-01-01", startTime: "10:00",
    hourlyRateCents: 2500, lessonAmountCents: 2500, paymentStatus: "pagata", paidAmountCents: 2500,
    paymentMovements: [{ id: "pay-1", amountCents: 2500 }] };
  const { deletion, local } = setup({ appointments: [lesson] });
  const before = local.getItem(keys.appointments);
  assert.equal(deletion.inspectTariffUsage(base.id).historicalLessons, 1);
  assert.equal(deletion.deleteTariffResult(base.id).status, "saved");
  assert.equal(local.getItem(keys.appointments), before);
});

test("future lessons, recurring series and proposals block deletion", () => {
  const { deletion } = setup({
    appointments: [{ id: "future", tariffId: base.id, date: "2099-01-01", startTime: "10:00" }],
    series: [{ id: "series", tariffId: base.id, startsOn: "2099-01-01", recurrence: { frequency: "weekly", intervalWeeks: 1 } }],
    requests: [{ id: "request", tariffId: base.id, proposedDate: "2099-01-01" }],
  });
  const result = deletion.deleteTariffResult(base.id);
  assert.equal(result.status, "blocked");
  assert.deepEqual([result.usage.futureLessons, result.usage.futureSeries, result.usage.futureRequests], [1, 1, 1]);
});

test("student tariff preference blocks deletion", () => {
  const { deletion, storage } = setup({ students: [{ id: "student", tariffId: base.id }] });
  assert.equal(deletion.deleteTariffResult(base.id).status, "blocked");
  assert.equal(storage.loadTariffs().length, 1);
});

test("failed storage write keeps the tariff in the list", () => {
  const { deletion, storage } = setup({ failLocal: true, failSession: true });
  assert.equal(deletion.deleteTariffResult(base.id).status, "failed");
  assert.equal(storage.loadTariffs().length, 1);
});

test("temporary deletion remains absent from the loaded tariff list", () => {
  const { deletion, storage } = setup({ failLocal: true });
  assert.equal(deletion.deleteTariffResult(base.id).status, "temporary");
  assert.deepEqual(storage.loadTariffs(), []);
});
