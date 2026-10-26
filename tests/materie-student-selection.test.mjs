import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const code = ts.transpileModule(readFileSync(new URL("../app/materie/studenti/student-selection.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const selection = {};
new Function("exports", code)(selection);

const student = (id, lastName, subjects, status = "active") => ({
  id, firstName: "Ada", lastName, subjects, status,
});

test("materia e archivio filtrano gli stessi ID senza duplicare studenti con più materie", () => {
  const records = [
    student("b", "Zeta", ["matematica", "FISICA"]),
    student("a", "Alfa", [" Matematica "]),
    student("c", "Beta", ["Matematica"], "archived"),
    student("d", "Gamma", ["Chimica"]),
  ];

  assert.deepEqual(selection.selectStudentsForSubject(records, "Matematica", false).map((item) => item.id), ["a", "b"]);
  assert.deepEqual(selection.selectStudentsForSubject(records, "Matematica", true).map((item) => item.id), ["a", "c", "b"]);
  assert.deepEqual(selection.selectStudentsForSubject(records, "Fisica", false).map((item) => item.id), ["b"]);
  assert.deepEqual(records.map((item) => item.id), ["b", "a", "c", "d"]);
});
