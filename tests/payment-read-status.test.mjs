import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
function load(file, cache = new Map()) {
  const path = resolve(root, file);
  if (cache.has(path)) return cache.get(path);
  const exports = {};
  cache.set(path, exports);
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("require", "exports", "window", code)(
    (name) => load(resolve(dirname(path), `${name}.ts`), cache), exports, undefined,
  );
  return exports;
}

test("calendar read status distinguishes no data from unavailable or damaged storage", () => {
  const status = load("app/pagamenti/riepilogo/calendar-read-status.ts").calendarReadStatus;
  const appointments = "semprini:calendar:appointments:v1";
  const empty = { getItem: () => null };
  const broken = { getItem: (key) => key === appointments ? "{invalid" : null };
  const valid = { getItem: (key) => key === appointments ? "[]" : null };
  const denied = { getItem: () => { throw Error("storage denied"); } };
  assert.equal(status([empty]), "ready");
  assert.equal(status([broken]), "invalid");
  assert.equal(status([broken, valid]), "ready");
  assert.equal(status([denied]), "unavailable");
  assert.equal(status([denied, empty]), "ready");
});
