import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const tariff = {
  id: "tariff-one", code: "T1", subject: "Matematica", schoolBand: "Liceo",
  mode: "casa", format: "singola", hourlyRateCents: 2500, active: true,
  createdAt: "2026-10-01T12:00:00.000Z", updatedAt: "2026-10-01T12:00:00.000Z",
};

function memoryStorage({ failWrite = false } = {}) {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { if (failWrite) throw new Error("write denied"); data.set(key, value); },
    removeItem: (key) => data.delete(key),
    data,
  };
}

function setup(localStorage, sessionStorage) {
  const cache = new Map();
  const browserWindow = { sessionStorage };
  Object.defineProperty(browserWindow, "localStorage", {
    get: () => { if (localStorage === null) throw new Error("local storage denied"); return localStorage; },
  });
  function load(file) {
    const path = resolve(root, file);
    if (cache.has(path)) return cache.get(path);
    const exports = {};
    cache.set(path, exports);
    const code = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    new Function("require", "exports", "window", code)(
      (name) => load(resolve(dirname(path), `${name}.ts`)), exports,
      browserWindow,
    );
    return exports;
  }
  return load("app/data/tariffario/tariff-storage.ts");
}

test("tariff saves report persistent, temporary and failed storage without changing the archive key", () => {
  const local = memoryStorage(), session = memoryStorage();
  const persistent = setup(local, session);
  assert.equal(persistent.TARIFF_STORAGE_KEY, "semprini:tariffs:v1");
  assert.deepEqual(persistent.saveTariffsResult([tariff]), { status: "saved" });
  assert.equal(persistent.loadTariffs()[0].hourlyRateCents, 2500);
  assert.equal(session.getItem(persistent.TARIFF_STORAGE_KEY), null);

  const blockedLocal = memoryStorage({ failWrite: true }), fallback = memoryStorage();
  const temporary = setup(blockedLocal, fallback);
  assert.deepEqual(temporary.saveTariffsResult([tariff]), { status: "temporary" });
  assert.equal(temporary.loadTariffs()[0].code, "T1");

  const sessionOnly = memoryStorage();
  const noLocalAccess = setup(null, sessionOnly);
  assert.deepEqual(noLocalAccess.saveTariffsResult([tariff]), { status: "temporary" });
  assert.equal(noLocalAccess.loadTariffs()[0].code, "T1");

  const blockedSession = memoryStorage({ failWrite: true });
  const failed = setup(blockedLocal, blockedSession);
  assert.deepEqual(failed.saveTariffsResult([tariff]), { status: "failed" });
  assert.equal(blockedLocal.getItem(failed.TARIFF_STORAGE_KEY), null);
  assert.equal(blockedSession.getItem(failed.TARIFF_STORAGE_KEY), null);
});
