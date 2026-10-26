import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const cache = new Map();
function load(file) {
  const path = resolve(root, file);
  if (cache.has(path)) return cache.get(path);
  const exports = {};
  cache.set(path, exports);
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("require", "exports", code)((name) => load(resolve(dirname(path), `${name}.ts`)), exports);
  return exports;
}
const nav = load("app/calendario/lesson-navigation.ts");
const fixture = { occurrenceId: "series-test@2026-10-19", date: "2026-10-19" };

test("OGGI and DOMANI retain the selected day", () => {
  for (const target of ["/oggi", "/oggi?giorno=domani"]) {
    const href = nav.lessonEditHref(fixture, target);
    assert.equal(nav.lessonReturnHref(new URL(href, "https://registro.invalid").searchParams.get("ritorno"), fixture.date), target);
  }
});

test("each lesson section returns to its own route", () => {
  for (const target of ["/lezioni/in-programma", "/lezioni/storico", "/lezioni/diario"]) {
    const href = nav.lessonEditHref(fixture, target);
    assert.equal(nav.lessonReturnHref(new URL(href, "https://registro.invalid").searchParams.get("ritorno"), fixture.date), target);
  }
});

test("student diary returns with the same student ID", () => {
  assert.equal(nav.lessonReturnHref("/studenti/diario?id=student-test", fixture.date), "/studenti/diario?id=student-test");
  assert.equal(nav.lessonReturnHref("/studenti/student-test/lezioni", fixture.date), "/studenti/student-test/lezioni");
});

test("calendar month, week and day preserve the source view and selected date", () => {
  for (const target of ["/calendario/mese?data=2026-10-19", "/calendario/settimana?data=2026-10-19", "/calendario/giorno?data=2026-10-19"]) {
    assert.equal(nav.lessonReturnHref(target, fixture.date), target);
  }
  assert.equal(nav.lessonReturnHref("/calendario?data=2026-10-19", fixture.date), "/calendario/mese?data=2026-10-19");
});

test("a recurring occurrence keeps its own date and edit identifier", () => {
  const href = new URL(nav.lessonEditHref(fixture, "/lezioni/in-programma"), "https://registro.invalid");
  assert.equal(href.pathname, "/calendario/series-test%402026-10-19/modifica");
  assert.equal(href.searchParams.get("data"), fixture.date);
  const exception = { ...fixture, appointmentId: "exception-test" };
  assert.equal(new URL(nav.lessonEditHref(exception, "/lezioni/storico"), "https://registro.invalid").pathname,
    "/calendario/exception-test/modifica");
});

test("successful save returns, temporary or failed save stays in the editor", () => {
  const target = "/lezioni/diario";
  assert.equal(nav.lessonSaveDestination({ status: "saved" }, target), target);
  assert.equal(nav.lessonSaveDestination({ status: "temporary" }, target), null);
  assert.equal(nav.lessonSaveDestination({ status: "failed" }, target), null);
  assert.equal(nav.lessonReturnHref(target, fixture.date), target); // ANNULLA needs no storage write.
});

test("missing, malformed and external return targets fall back to the selected calendar day", () => {
  const fallback = "/calendario/giorno?data=2026-10-19";
  for (const raw of [null, "", "https://outside.invalid/oggi", "//outside.invalid/oggi", "/unknown",
    "/studenti/diario?id=", "/calendario?data=bad", "/oggi#frag", "/studenti/a%2Fb/lezioni",
    "/oggi?giorno=altro", "/lezioni/storico?next=outside", "/altro/../oggi"]) {
    assert.equal(nav.lessonReturnHref(raw, fixture.date), fallback, String(raw));
  }
});
