import type { StudentRecord } from "../../data/students";
import { subjects, type SubjectSlug } from "../materie-data";

export type ProgramId = string;
export type TopicStatus = "da_affrontare" | "in_corso" | "completato" | "da_ripassare";
export const TOPIC_STATUSES: TopicStatus[] = ["da_affrontare", "in_corso", "completato", "da_ripassare"];
export const STATUS_LABELS: Record<TopicStatus, string> = {
  da_affrontare: "DA AFFRONTARE", in_corso: "IN CORSO", completato: "COMPLETATO", da_ripassare: "DA RIPASSARE",
};

export interface ProgramTopic { id: string; name: string; status: TopicStatus }
interface ProgramBase {
  id: ProgramId;
  name: string;
  subject: SubjectSlug;
  gradeClass: string;
  schoolType: string;
  topics: ProgramTopic[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}
export interface ModelProgram extends ProgramBase { kind: "model" }
export interface PersonalProgram extends ProgramBase {
  kind: "personal";
  studentId: string;
  sourceModelId?: ProgramId;
}
export type ProgramRecord = ModelProgram | PersonalProgram;

export function studentProgramSubjects(student: StudentRecord): SubjectSlug[] {
  return (["matematica", "fisica", "chimica"] as SubjectSlug[]).filter((slug) =>
    student.subjects.some((value) => value.trim().localeCompare(subjects[slug].title, "it", { sensitivity: "base" }) === 0));
}

export function createModel(id: string, now: string): ModelProgram {
  return { id, kind: "model", name: "", subject: "matematica", gradeClass: "", schoolType: "",
    topics: [], notes: "", createdAt: now, updatedAt: now };
}

export function createPersonal(id: string, now: string, studentId: string, subject: SubjectSlug): PersonalProgram {
  return { id, kind: "personal", studentId, subject, name: "", gradeClass: "", schoolType: "",
    topics: [], notes: "", createdAt: now, updatedAt: now };
}

export function copyModelToStudent(model: ModelProgram, id: string, now: string, studentId: string,
  makeTopicId: () => string): PersonalProgram {
  return { ...createPersonal(id, now, studentId, model.subject), name: model.name,
    gradeClass: model.gradeClass, schoolType: model.schoolType, notes: model.notes,
    sourceModelId: model.id,
    topics: model.topics.map((topic) => ({ id: makeTopicId(), name: topic.name, status: "da_affrontare" })) };
}

export function duplicateModel(model: ModelProgram, id: string, now: string, makeTopicId: () => string): ModelProgram {
  return { ...model, id, name: `Copia di ${model.name}`, createdAt: now, updatedAt: now,
    topics: model.topics.map((topic) => ({ ...topic, id: makeTopicId() })) };
}

export function addProgramTopic<T extends ProgramRecord>(program: T, id: string, name: string): T {
  return { ...program, topics: [...program.topics, { id, name: name.trim(), status: "da_affrontare" }] };
}

export function moveProgramTopic<T extends ProgramRecord>(program: T, id: string, offset: -1 | 1): T {
  const index = program.topics.findIndex((topic) => topic.id === id);
  const target = index + offset;
  if (index < 0 || target < 0 || target >= program.topics.length) return program;
  const topics = [...program.topics];
  [topics[index], topics[target]] = [topics[target], topics[index]];
  return { ...program, topics };
}

export function removeProgramTopic<T extends ProgramRecord>(program: T, id: string): T {
  return { ...program, topics: program.topics.filter((topic) => topic.id !== id) };
}

export function completedTopics(program: ProgramRecord): number {
  return program.kind === "personal" ? program.topics.filter((topic) => topic.status === "completato").length : 0;
}
