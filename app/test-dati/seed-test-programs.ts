import type { StudentRecord } from "../data/students";
import { studentProgramSubjects, type ModelProgram, type PersonalProgram, type ProgramRecord } from "../materie/programmi/program-model";
import { readProgramArchive, saveProgram, type ProgramSource } from "../materie/programmi/program-storage";
import { TEST_MANIFEST, testStudents } from "./fixtures";
import { TEST_PROGRAM_MODEL_ID, TEST_PROGRAM_MODEL_NAME, TEST_PROGRAM_PERSONAL_ID,
  TEST_PROGRAM_PERSONAL_NAME, TEST_PROGRAM_STUDENT_IDS, testModelProgram, testPersonalProgram } from "./program-fixtures";

export type TestProgramSeedResult = {
  model: "created" | "existing";
  personal: "created" | "existing" | "no-test-student";
  studentName?: string;
};

function sameModel(actual: ProgramRecord, expected: ModelProgram): actual is ModelProgram {
  return actual.kind === "model" && actual.name === expected.name && actual.subject === expected.subject &&
    actual.gradeClass === expected.gradeClass && actual.schoolType === expected.schoolType &&
    actual.notes === expected.notes &&
    JSON.stringify(actual.topics) === JSON.stringify(expected.topics);
}

function samePersonal(actual: ProgramRecord, expected: PersonalProgram) {
  return actual.kind === "personal" && actual.name === expected.name && actual.subject === expected.subject &&
    actual.studentId === expected.studentId && actual.sourceModelId === expected.sourceModelId;
}

function testStudent(students: StudentRecord[], id: string) {
  const fixture = testStudents.find((student) => student.id === id);
  const actual = students.find((student) => student.id === id);
  return fixture && actual?.firstName === fixture.firstName && actual.lastName === fixture.lastName &&
    studentProgramSubjects(actual).includes("matematica") ? actual : undefined;
}

/** Invoked only by the explicit local development button; never changes an existing program. */
export function seedTestPrograms(sources: ProgramSource[], students: StudentRecord[], now = new Date()): TestProgramSeedResult {
  if (!sources.some((source) => source.persistent)) throw new Error("Archivio persistente dei programmi non disponibile.");
  const archive = readProgramArchive(sources);
  if (archive.status === "error") throw new Error("Archivio dei programmi non leggibile: nessun programma inserito.");
  const timestamp = now.toISOString();
  const expectedModel = testModelProgram(timestamp);
  const existingModel = archive.programs.find((program) => program.id === TEST_PROGRAM_MODEL_ID);
  const existingPersonal = archive.programs.find((program) => program.id === TEST_PROGRAM_PERSONAL_ID);
  const occupied = archive.entries.some((entry) => entry.kind === "deleted" &&
    (entry.id === TEST_PROGRAM_MODEL_ID || entry.id === TEST_PROGRAM_PERSONAL_ID));
  if (occupied || (existingModel && !sameModel(existingModel, expectedModel)) ||
    archive.programs.some((program) => program.kind === "model" && program.name === TEST_PROGRAM_MODEL_NAME &&
      program.id !== TEST_PROGRAM_MODEL_ID) ||
    archive.programs.some((program) => program.kind === "personal" && program.name === TEST_PROGRAM_PERSONAL_NAME &&
      program.id !== TEST_PROGRAM_PERSONAL_ID)) {
    throw new Error("Un ID o nome riservato ai programmi TEST è già occupato: nessun dato sovrascritto.");
  }

  const previousStudentId = existingPersonal?.kind === "personal" ? existingPersonal.studentId : undefined;
  const selectedStudent = previousStudentId
    ? testStudent(students, previousStudentId)
    : TEST_PROGRAM_STUDENT_IDS.map((id) => testStudent(students, id)).find(Boolean);
  if (existingPersonal && (!selectedStudent || !samePersonal(existingPersonal,
    testPersonalProgram(existingModel ?? expectedModel, selectedStudent.id, timestamp)))) {
    throw new Error("Il programma personale TEST esistente non corrisponde alla fixture: nessun dato sovrascritto.");
  }
  if (existingPersonal && !TEST_MANIFEST.students.some((id) => id === previousStudentId)) {
    throw new Error("Il programma personale TEST usa uno studente non previsto: nessun dato sovrascritto.");
  }

  const persistentArchive = readProgramArchive(sources.filter((source) => source.persistent));
  if (persistentArchive.status === "error") {
    throw new Error("Archivio persistente dei programmi non leggibile: nessun programma inserito.");
  }

  let model = existingModel;
  if (!model || !persistentArchive.programs.some((program) => program.id === model?.id &&
    program.updatedAt === model.updatedAt)) {
    const saved = saveProgram(sources, model ?? expectedModel, now);
    if (saved.result.status !== "saved" || !saved.program || saved.program.kind !== "model") {
      throw new Error(saved.result.status === "temporary"
        ? "Modello salvato solo temporaneamente nella sessione: riprova quando l'archivio persistente è disponibile."
        : "Salvataggio del programma modello non riuscito.");
    }
    model = saved.program;
  }

  if (selectedStudent && (!existingPersonal || !persistentArchive.programs.some((program) =>
    program.id === existingPersonal.id && program.updatedAt === existingPersonal.updatedAt))) {
    const personal = existingPersonal ?? testPersonalProgram(model, selectedStudent.id, timestamp);
    const saved = saveProgram(sources, personal, now);
    if (saved.result.status !== "saved") {
      throw new Error(saved.result.status === "temporary"
        ? "Modello persistente; programma personale salvato solo nella sessione. Riprova per completare."
        : "Modello persistente; salvataggio del programma personale non riuscito. Riprova per completare.");
    }
  }

  const verification = readProgramArchive(sources);
  if (verification.status !== "ready" || !verification.programs.some((program) => program.id === TEST_PROGRAM_MODEL_ID) ||
    (selectedStudent && !verification.programs.some((program) => program.id === TEST_PROGRAM_PERSONAL_ID))) {
    throw new Error("Verifica dei programmi TEST non riuscita: controlla PROGRAMMI e riprova.");
  }
  return {
    model: existingModel ? "existing" : "created",
    personal: selectedStudent ? existingPersonal ? "existing" : "created" : "no-test-student",
    studentName: selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : undefined,
  };
}
