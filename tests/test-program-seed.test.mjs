import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const typescript = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const code = typescript.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 },
  }).outputText;
  module._compile(code, filename);
};

const { testStudents } = require("../app/test-dati/fixtures.ts");
const fixtures = require("../app/test-dati/program-fixtures.ts");
const { seedTestPrograms } = require("../app/test-dati/seed-test-programs.ts");
const store = require("../app/materie/programmi/program-storage.ts");
const at = new Date("2026-10-21T10:00:00.000Z");

function memory(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
}
function setup(local = memory(), session = memory()) {
  return { local, session, sources: [{ storage: local, persistent: true }, { storage: session, persistent: false }] };
}
function programs(sources) { return store.readProgramArchive(sources).programs; }

test("model TEST uses the existing archive, has seven ordered topics, and does not duplicate", () => {
  const { local, sources } = setup(memory({ "unrelated:record": "untouched" }));
  assert.deepEqual(seedTestPrograms(sources, [], at), { model: "created", personal: "no-test-student", studentName: undefined });
  const [model] = programs(sources);
  assert.equal(model.id, fixtures.TEST_PROGRAM_MODEL_ID);
  assert.equal(model.name, "TEST – Matematica quarta superiore");
  assert.equal(model.subject, "matematica");
  assert.equal(model.gradeClass, "Quarta");
  assert.equal(model.schoolType, "Liceo scientifico");
  assert.deepEqual(model.topics.map((topic) => topic.name), [
    "Funzioni e loro proprietà", "Esponenziali e logaritmi", "Equazioni e disequazioni logaritmiche",
    "Goniometria", "Trigonometria", "Geometria analitica", "Introduzione ai limiti",
  ]);
  assert.equal(local.getItem("unrelated:record"), "untouched");
  const before = local.getItem(store.PROGRAMS_STORAGE_KEY);
  assert.equal(seedTestPrograms(sources, [], at).model, "existing");
  assert.equal(local.getItem(store.PROGRAMS_STORAGE_KEY), before);
});

test("personal TEST belongs to Giulia and remains independent and editable", () => {
  const { sources } = setup();
  const first = seedTestPrograms(sources, testStudents, at);
  assert.deepEqual(first, { model: "created", personal: "created", studentName: "Giulia Rossi [TEST]" });
  let [model, personal] = programs(sources);
  assert.equal(personal.studentId, testStudents[0].id);
  assert.equal(personal.sourceModelId, model.id);
  assert.equal(personal.name, "TEST – Percorso individuale di Matematica");
  assert.deepEqual(personal.topics.map((topic) => topic.status), [
    "completato", "completato", "da_ripassare", "in_corso",
    "da_affrontare", "da_affrontare", "da_affrontare",
  ]);
  const modified = { ...personal, topics: personal.topics.map((topic, index) =>
    index === 3 ? { ...topic, status: "completato" } : topic) };
  assert.equal(store.saveProgram(sources, modified, new Date(at.getTime() + 1000)).result.status, "saved");
  assert.equal(seedTestPrograms(sources, testStudents, new Date(at.getTime() + 2000)).personal, "existing");
  [model, personal] = programs(sources);
  assert.equal(personal.topics[3].status, "completato");
  assert.equal(model.topics[3].status, "da_affrontare");
  assert.equal(programs(sources).length, 2);
});

test("only the fixture's recognizable mathematics student receives a personal program", () => {
  const wrongName = { ...testStudents[0], lastName: "Rossi" };
  const wrongSubject = { ...testStudents[2], subjects: ["Fisica"] };
  const { sources } = setup();
  assert.equal(seedTestPrograms(sources, [wrongName, wrongSubject], at).personal, "no-test-student");
  assert.equal(programs(sources).length, 1);
  assert.equal(seedTestPrograms(sources, [testStudents[2]], at).studentName, "Sofia Conti [TEST]");
  assert.equal(programs(sources).find((item) => item.kind === "personal").studentId, testStudents[2].id);
});

test("collisions and an unreadable archive stop before writing", () => {
  const initial = fixtures.testModelProgram(at.toISOString());
  const differentId = { ...initial, id: "someone-else" };
  const local = memory();
  const sources = setup(local).sources;
  assert.equal(store.saveProgram(sources, differentId, at).result.status, "saved");
  const before = local.getItem(store.PROGRAMS_STORAGE_KEY);
  assert.throws(() => seedTestPrograms(sources, testStudents, at), /occupato/);
  assert.equal(local.getItem(store.PROGRAMS_STORAGE_KEY), before);
  const broken = setup(memory({ [store.PROGRAMS_STORAGE_KEY]: "{broken" }));
  assert.throws(() => seedTestPrograms(broken.sources, [], at), /non leggibile/);
  assert.equal(broken.local.getItem(store.PROGRAMS_STORAGE_KEY), "{broken");
});

test("temporary program storage cannot be reported as persistent", () => {
  const local = memory();
  local.setItem = () => { throw new Error("blocked"); };
  const { sources } = setup(local);
  assert.throws(() => seedTestPrograms(sources, [], at), /temporaneamente/);
  assert.equal(local.getItem(store.PROGRAMS_STORAGE_KEY), null);
});
