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

const model = require("../app/materie/programmi/program-model.ts");
const store = require("../app/materie/programmi/program-storage.ts");
const { contentKey } = require("../app/materie/materie-data.ts");
const { STUDENTS_STORAGE_KEY } = require("../app/data/student-storage.ts");
const { CALENDAR_APPOINTMENTS_STORAGE_KEY } = require("../app/data/calendario/calendar-storage.ts");
const at = "2026-10-21T10:00:00.000Z";
const later = new Date("2026-10-21T10:10:00.000Z");

function memory(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
}
function sources(local = memory(), session = memory()) {
  return [{ storage: local, persistent: true }, { storage: session, persistent: false }];
}
function namedModel() {
  return model.addProgramTopic({ ...model.createModel("model-1", at), name: "Quinta scientifico", gradeClass: "5",
    schoolType: "Liceo scientifico" }, "topic-1", "Algebra");
}

test("create, edit, duplicate and reorder a model without changing the original", () => {
  const original = namedModel();
  const added = model.addProgramTopic(original, "topic-2", "Argomento libero");
  const moved = model.moveProgramTopic(added, "topic-2", -1);
  assert.deepEqual(moved.topics.map((topic) => topic.name), ["Argomento libero", "Algebra"]);
  assert.deepEqual(original.topics.map((topic) => topic.name), ["Algebra"]);
  assert.deepEqual(model.moveProgramTopic(moved, "topic-2", -1).topics, moved.topics);
  const removed = model.removeProgramTopic(moved, "topic-1");
  assert.deepEqual(removed.topics.map((topic) => topic.name), ["Argomento libero"]);
  const ids = ["copy-topic-1", "copy-topic-2"][Symbol.iterator]();
  const copy = model.duplicateModel(moved, "model-2", at, () => ids.next().value);
  assert.equal(copy.name, "Copia di Quinta scientifico");
  assert.equal(copy.id, "model-2");
  assert.deepEqual(copy.topics.map((topic) => topic.id), ["copy-topic-1", "copy-topic-2"]);
  assert.deepEqual(moved.topics.map((topic) => topic.id), ["topic-2", "topic-1"]);
});

test("personal copy is independent, tracks source and status, and supports a program from zero", () => {
  const original = namedModel();
  const personal = model.copyModelToStudent(original, "personal-1", at, "student-42", () => "own-topic-1");
  assert.equal(personal.studentId, "student-42");
  assert.equal(personal.sourceModelId, original.id);
  assert.equal(personal.topics[0].status, "da_affrontare");
  const progressed = { ...personal, topics: [{ ...personal.topics[0], name: "Algebra personale", status: "completato" }] };
  assert.equal(model.completedTopics(progressed), 1);
  assert.equal(original.topics[0].name, "Algebra");
  const empty = model.createPersonal("personal-2", at, "student-42", "fisica");
  assert.equal(empty.sourceModelId, undefined);
  assert.equal(empty.topics.length, 0);
  const withTopic = model.addProgramTopic(empty, "topic-3", "Moto circolare");
  assert.equal(withTopic.topics[0].status, "da_affrontare");
  assert.equal(model.completedTopics(withTopic), 0);
  assert.deepEqual(model.TOPIC_STATUSES, ["da_affrontare", "in_corso", "completato", "da_ripassare"]);
});

test("student association uses existing ID and subjects, including archived students", () => {
  const archived = { id: "student-42", status: "archived", subjects: [" mAtEmAtIcA ", "FISICA"] };
  assert.deepEqual(model.studentProgramSubjects(archived), ["matematica", "fisica"]);
});

test("save and reload models and personal programs; deleting a model retains its personal copies", () => {
  const local = memory(), session = memory();
  const stores = sources(local, session);
  const first = store.saveProgram(stores, namedModel(), new Date(at));
  assert.equal(first.result.status, "saved");
  assert.equal(store.readProgramArchive(stores).programs.length, 1);
  const changed = { ...first.program, name: "Quinta aggiornato" };
  assert.equal(store.saveProgram(stores, changed, later).result.status, "saved");
  const updated = store.readProgramArchive(stores).programs.find((program) => program.id === "model-1");
  assert.equal(updated.name, "Quinta aggiornato");
  const personal = model.copyModelToStudent(updated, "personal-1", at, "student-42", () => "own-topic");
  const firstPersonal = store.saveProgram(stores, personal, later);
  assert.equal(firstPersonal.result.status, "saved");
  const progressed = { ...firstPersonal.program, topics: firstPersonal.program.topics.map((topic) =>
    ({ ...topic, status: "completato" })) };
  assert.equal(store.saveProgram(stores, progressed, later).result.status, "saved");
  assert.equal(model.completedTopics(store.readProgramArchive(stores).programs.find((program) => program.id === "personal-1")), 1);
  const deleted = store.deleteProgram(stores, "model-1", later);
  assert.equal(deleted.result.status, "saved");
  const remaining = store.readProgramArchive(stores).programs;
  assert.deepEqual(remaining.map((program) => program.id), ["personal-1"]);
  assert.equal(remaining[0].sourceModelId, "model-1");
  assert.equal(store.deleteProgram(stores, "personal-1", later).result.status, "saved");
  assert.deepEqual(store.readProgramArchive(stores).programs, []);
  assert.equal(store.saveProgram(stores, namedModel(), later).result.status, "failed"); // deleted ID cannot reappear
});

test("a stale editor cannot overwrite a newer saved program", () => {
  const stores = sources();
  const first = store.saveProgram(stores, namedModel(), new Date(at)).program;
  const current = store.saveProgram(stores, { ...first, name: "Nuova versione" }, later).program;
  assert.equal(store.saveProgram(stores, { ...first, name: "Versione vecchia" }, later).result.status, "failed");
  assert.equal(store.readProgramArchive(stores).programs[0].name, current.name);
});

test("temporary fallback, failed writes and unreadable archives never claim permanent success", () => {
  const local = memory(), session = memory();
  local.setItem = () => { throw Error("blocked"); };
  const stores = sources(local, session);
  const temporary = store.saveProgram(stores, namedModel(), new Date(at));
  assert.equal(temporary.result.status, "temporary");
  assert.equal(store.readProgramArchive(stores).programs[0].name, "Quinta scientifico");
  session.setItem = () => { throw Error("full"); };
  assert.equal(store.saveProgram(stores, { ...namedModel(), name: "Uncommitted" }, later).result.status, "failed");
  assert.equal(store.readProgramArchive(stores).programs[0].name, "Quinta scientifico");
  const broken = memory({ [store.PROGRAMS_STORAGE_KEY]: "{broken" });
  assert.equal(store.readProgramArchive(sources(broken, memory())).status, "error");
  assert.equal(store.saveProgram(sources(broken, memory()), namedModel()).result.status, "failed");
  assert.equal(store.readProgramArchive([]).status, "error");
});

test("program storage is isolated from students, calendar, and existing topic notes", () => {
  const studentRaw = '[{"id":"student-42"}]';
  const calendarRaw = '[{"id":"lesson-1"}]';
  const noteKey = contentKey("matematica", "topic:Algebra");
  const local = memory({ [STUDENTS_STORAGE_KEY]: studentRaw, [CALENDAR_APPOINTMENTS_STORAGE_KEY]: calendarRaw,
    [noteKey]: "Appunto precedente" });
  assert.equal(store.saveProgram(sources(local, memory()), namedModel()).result.status, "saved");
  assert.equal(local.getItem(STUDENTS_STORAGE_KEY), studentRaw);
  assert.equal(local.getItem(CALENDAR_APPOINTMENTS_STORAGE_KEY), calendarRaw);
  assert.equal(local.getItem(noteKey), "Appunto precedente");
  assert.equal(JSON.parse(local.getItem(store.PROGRAMS_STORAGE_KEY)).version, 1);
});
