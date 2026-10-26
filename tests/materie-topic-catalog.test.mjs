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

const { TOPIC_CATALOG_KEY, addTopic, findTopic, readTopicCatalog, removeTopic, renameTopic, topicNoteKey } =
  require("../app/materie/topic-catalog.ts");

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    snapshot: () => values.get(TOPIC_CATALOG_KEY),
  };
}

test("argomenti predefiniti: ID stabile, rinomina senza perdere appunti o vecchi link", () => {
  const store = storage();
  const original = readTopicCatalog(store).topics.matematica[0];
  assert.equal(original.name, "Algebra");
  assert.equal(topicNoteKey("matematica", original), "semprini:materie:v1:matematica:topic:Algebra");
  assert.equal(renameTopic(store, "matematica", original.id, "Algebra avanzata").ok, true);
  const renamed = findTopic(readTopicCatalog(store).topics.matematica, original.id);
  assert.equal(renamed.name, "Algebra avanzata");
  assert.equal(topicNoteKey("matematica", renamed), topicNoteKey("matematica", original));
  assert.equal(findTopic(readTopicCatalog(store).topics.matematica, undefined, "Algebra")?.id, original.id);
  assert.equal(addTopic(store, "matematica", "algebra", "new-conflict").ok, false);
  assert.equal(readTopicCatalog(store).topics.fisica[0].name, "Cinematica");
});

test("aggiunta, duplicati, eliminazione e ricaricamento isolati per materia", () => {
  const store = storage();
  for (const slug of ["matematica", "fisica", "chimica"]) {
    assert.equal(addTopic(store, slug, " ", `${slug}-blank`).ok, false);
    assert.equal(addTopic(store, slug, " Nuovo tema ", `${slug}-new`).ok, true);
    assert.equal(addTopic(store, slug, "nuovo TEMA", `${slug}-duplicate`).ok, false);
    assert.equal(renameTopic(store, slug, `${slug}-new`, "Tema aggiornato").ok, true);
    const current = readTopicCatalog(store).topics[slug];
    assert.equal(findTopic(current, `${slug}-new`)?.name, "Tema aggiornato");
    assert.equal(removeTopic(store, slug, `${slug}-new`).ok, true);
    assert.equal(findTopic(readTopicCatalog(store).topics[slug], `${slug}-new`), undefined);
    const firstDefault = readTopicCatalog(store).topics[slug][0];
    assert.equal(removeTopic(store, slug, firstDefault.id).ok, true);
    assert.equal(findTopic(readTopicCatalog(store).topics[slug], firstDefault.id), undefined);
  }
  assert.ok(store.snapshot());
});

test("archivio illeggibile o scrittura non verificabile non altera gli argomenti", () => {
  const store = storage();
  store.setItem(TOPIC_CATALOG_KEY, "{bad");
  assert.equal(readTopicCatalog(store).status, "error");
  assert.equal(addTopic(store, "fisica", "Test", "id").ok, false);
  const rejected = { getItem: () => null, setItem: () => {} };
  assert.equal(removeTopic(rejected, "fisica", "default:fisica:Cinematica").ok, false);
});
