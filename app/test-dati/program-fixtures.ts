import { addProgramTopic, copyModelToStudent, createModel,
  type ModelProgram, type PersonalProgram, type TopicStatus } from "../materie/programmi/program-model";
import { TEST_MANIFEST } from "./fixtures";

export const TEST_PROGRAM_MODEL_ID = "test-dati-2026-programma-matematica-quarta";
export const TEST_PROGRAM_PERSONAL_ID = "test-dati-2026-percorso-matematica";
export const TEST_PROGRAM_MODEL_NAME = "TEST – Matematica quarta superiore";
export const TEST_PROGRAM_PERSONAL_NAME = "TEST – Percorso individuale di Matematica";

const topicNames = [
  "Funzioni e loro proprietà",
  "Esponenziali e logaritmi",
  "Equazioni e disequazioni logaritmiche",
  "Goniometria",
  "Trigonometria",
  "Geometria analitica",
  "Introduzione ai limiti",
] as const;
const personalStatuses: TopicStatus[] = [
  "completato", "completato", "da_ripassare", "in_corso",
  "da_affrontare", "da_affrontare", "da_affrontare",
];

export const TEST_PROGRAM_STUDENT_IDS = [TEST_MANIFEST.students[0], TEST_MANIFEST.students[2]] as const;

export function testModelProgram(now: string): ModelProgram {
  let model: ModelProgram = {
    ...createModel(TEST_PROGRAM_MODEL_ID, now),
    name: TEST_PROGRAM_MODEL_NAME,
    subject: "matematica",
    gradeClass: "Quarta",
    schoolType: "Liceo scientifico",
    notes: "Programma dimostrativo per verificare il funzionamento del Registro. Non utilizzare come programma didattico definitivo.",
  };
  topicNames.forEach((name, index) => {
    model = addProgramTopic(model, `test-dati-2026-modello-argomento-${index + 1}`, name);
  });
  return model;
}

export function testPersonalProgram(model: ModelProgram, studentId: string, now: string): PersonalProgram {
  let index = 0;
  const personal = copyModelToStudent(model, TEST_PROGRAM_PERSONAL_ID, now, studentId,
    () => `test-dati-2026-personale-argomento-${++index}`);
  return { ...personal, name: TEST_PROGRAM_PERSONAL_NAME,
    topics: personal.topics.map((topic, position) => ({ ...topic, status: personalStatuses[position] })) };
}
