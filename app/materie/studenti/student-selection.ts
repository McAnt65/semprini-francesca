import type { StudentRecord } from "../../data/students";

const collator = new Intl.Collator("it", { sensitivity: "base" });

export function selectStudentsForSubject(students: StudentRecord[], title: string, includeArchived: boolean) {
  return students.filter((student) =>
    (includeArchived || student.status !== "archived") &&
    student.subjects.some((subject) => subject.trim().localeCompare(title, "it", { sensitivity: "base" }) === 0)
  ).sort((a, b) => collator.compare(a.lastName, b.lastName) ||
    collator.compare(a.firstName, b.firstName) || collator.compare(a.id, b.id));
}
