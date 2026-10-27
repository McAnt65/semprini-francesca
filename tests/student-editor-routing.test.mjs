import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function source(path) { return readFileSync(new URL(path, import.meta.url), "utf8"); }
function loadRedirectPage(path, calls) {
  const code = ts.transpileModule(source(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  new Function("exports", "require", code)(exports, () => ({ redirect(href) { calls.push(href); throw Error("redirect"); } }));
  return exports.default;
}

for (const [name, path, params] of [
  ["edit", "../app/studenti/[id]/modifica/page.tsx", { id: "studente prova/1" }],
  ["section", "../app/studenti/[id]/modifica/[sezione]/page.tsx", { id: "studente prova/1", sezione: "famiglia" }],
]) {
  test(`${name} old URL redirects to the same narrated student without writes`, async () => {
    const calls = [];
    const page = loadRedirectPage(path, calls);
    await assert.rejects(page({ params: Promise.resolve(params) }), /redirect/);
    assert.deepEqual(calls, ["/studenti/nuovo?id=studente%20prova%2F1"]);
    assert(!source(path).includes("saveStoredStudent"));
  });
}

test("Card offers the narrated sheet without the old edit command", () => {
  const card = source("../app/studenti/[id]/page.tsx");
  assert(!card.includes("MODIFICA DATI"));
  assert(card.includes("/studenti/nuovo?id=${encodeURIComponent(student.id)}"));
  for (const component of ["StudentCard", "StudentJourney", "StudentDetail"]) {
    const text = source(`../app/components/${component}.tsx`);
    assert(!text.includes("/modifica"), component);
    assert(text.includes("/studenti/nuovo?id=${encodeURIComponent(student.id)}"), component);
  }
});

test("reachable student pages use no photo service or photo controls", () => {
  for (const path of ["../app/studenti/nuovo/page.tsx", "../app/studenti/nuovo/diario/page.tsx",
    "../app/components/StudentJourney.tsx", "../app/studenti/[id]/page.tsx",
    "../app/studenti/elenco/page.tsx", "../app/studenti/archivio/page.tsx"]) {
    const text = source(path);
    assert(!/student-photos|save-student-photo|StudentPhoto|WatercolorPortrait|type="file"/.test(text), path);
  }
  assert(source("../app/studenti/nuovo/page.tsx").includes("saveStoredStudentResult"));
  assert(source("../app/studenti/nuovo/diario/page.tsx").includes("saveStoredStudentResult"));
});
