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
const { studentLessonProposal, compatibleLessonTariff, newLessonAmountCents } =
  require("../app/calendario/nuova/lesson-selection.ts");

const student = { id: "student-test", subjects: ["Fisica"], lessonMode: "online",
  lessonDurationMinutes: 90, lessonRateCents: 2600, tariffId: "preferred" };
const tariff = { id: "preferred", code: "T1", subject: "Fisica", schoolBand: "Secondaria",
  mode: "online", format: "singola", hourlyRateCents: 2400, active: true };

test("complete preferences use the exact compatible tariff and duration", () => {
  assert.deepEqual(studentLessonProposal(student, [tariff]), {
    subject: "Fisica", duration: "90", mode: "online", tariffId: "preferred", hourlyRate: "24.00",
  });
  assert.equal(newLessonAmountCents("24.00", "90"), 3600);
});

test("partial preferences keep sensible defaults and ask only for missing price", () => {
  assert.deepEqual(studentLessonProposal({ ...student, lessonMode: undefined,
    lessonDurationMinutes: undefined, lessonRateCents: undefined, tariffId: undefined }, []), {
    subject: "Fisica", duration: "60", mode: "casa", tariffId: "", hourlyRate: "",
  });
});

test("multiple subjects stay unselected even when a preferred tariff names one", () => {
  const multiple = { ...student, subjects: ["Fisica", "Matematica"] };
  assert.deepEqual(studentLessonProposal(multiple, [tariff]), {
    subject: "", duration: "90", mode: "online", tariffId: "", hourlyRate: "26.00",
  });
  assert.equal(studentLessonProposal(multiple, [tariff], "Fisica").tariffId, "preferred");
  assert.equal(studentLessonProposal(multiple, [tariff], "Matematica").tariffId, "");
});

test("an inactive historical tariff remains usable by exact preferred ID", () => {
  assert.equal(compatibleLessonTariff({ ...tariff, active: false }, "Fisica", "online"), true);
  assert.deepEqual(studentLessonProposal(student, [{ ...tariff, active: false }]), {
    subject: "Fisica", duration: "90", mode: "online", tariffId: "preferred", hourlyRate: "24.00",
  });
});

test("missing, wrong mode, wrong subject, and group tariffs are never linked", () => {
  for (const candidate of [undefined,
    { ...tariff, mode: "casa" }, { ...tariff, subject: "Matematica" },
    { ...tariff, format: "gruppo" }]) {
    const proposal = studentLessonProposal(student, candidate ? [candidate] : []);
    assert.equal(proposal.tariffId, "");
    assert.equal(proposal.hourlyRate, "26.00");
  }
  assert.equal(compatibleLessonTariff(tariff, "Fisica", "online"), true);
  assert.equal(compatibleLessonTariff(tariff, "Fisica", "casa"), false);
});

test("an exact ID is required; a matching code or rate cannot choose a tariff", () => {
  assert.equal(studentLessonProposal({ ...student, tariffId: "gone" },
    [{ ...tariff, id: "another", code: "gone", hourlyRateCents: 2600 }]).tariffId, "");
});

test("amount uses the same cent rounding for 30 to 180 minutes and rejects invalid input", () => {
  assert.equal(newLessonAmountCents("25,01", "90"), 3752);
  assert.equal(newLessonAmountCents("20", "30"), 1000);
  assert.equal(newLessonAmountCents("20", "180"), 6000);
  assert.equal(newLessonAmountCents("", "60"), null);
  assert.equal(newLessonAmountCents("abc", "60"), null);
  assert.equal(newLessonAmountCents("20", "0"), null);
});
