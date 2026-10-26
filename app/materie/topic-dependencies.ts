import { loadCalendarAppointments, loadCalendarSeries } from "../data/calendario/calendar-storage";
import { STUDENTS_STORAGE_KEY } from "../data/student-storage";
import { calendarArchiveReadable } from "./argomenti/topic-selection";
import { readProgramArchive, type ProgramSource } from "./programmi/program-storage";
import { subjects, type SubjectSlug } from "./materie-data";
import { topicNoteKey, type Topic } from "./topic-catalog";

type Reader = Pick<Storage, "getItem">;
const same = (a: string, b: string) => a.trim().localeCompare(b.trim(), "it", { sensitivity: "base" }) === 0;
const hasName = (value: string, names: string[]) => names.some((name) => same(value, name));

/** Refuse deletion if a source cannot be checked or still mentions the topic. */
export function topicDeletionBlocker(slug: SubjectSlug, topic: Topic, local: Reader, session: Reader,
  programs: ProgramSource[]): string | null {
  const names = [...new Set([topic.name, ...topic.aliases])];
  try {
    const noteKey = topicNoteKey(slug, topic);
    if ([local, session].some((storage) => storage.getItem(noteKey)?.trim())) {
      return "L’argomento contiene appunti: conserva o trasferisci gli appunti prima di eliminarlo.";
    }
    if (!calendarArchiveReadable([local, session])) return "Archivio lezioni non leggibile: eliminazione bloccata.";
    const lessons = [...loadCalendarAppointments(), ...loadCalendarSeries()];
    if (lessons.some((lesson) => same(lesson.subject, subjects[slug].title) &&
      (hasName(lesson.topic, names) || hasName(lesson.coveredTopic || "", names)))) {
      return "L’argomento è collegato a una lezione o ricorrenza: eliminazione bloccata.";
    }
    const archive = readProgramArchive(programs);
    if (archive.status === "error") return "Archivio programmi non leggibile: eliminazione bloccata.";
    if (archive.programs.some((program) => program.subject === slug &&
      program.topics.some((item) => hasName(item.name, names)))) {
      return "L’argomento è presente in un programma: eliminazione bloccata.";
    }
    for (const storage of [local, session]) {
      const raw = storage.getItem(STUDENTS_STORAGE_KEY);
      if (raw === null) continue;
      const students: unknown = JSON.parse(raw);
      if (!Array.isArray(students) || students.some((student) => !student || typeof student !== "object" ||
        typeof student.id !== "string" || typeof student.firstName !== "string")) {
        return "Archivio studenti non leggibile: eliminazione bloccata.";
      }
      if (students.some((student) => {
        const record = student as { topicsToDeepen?: unknown };
        const notes = record.topicsToDeepen;
        return typeof notes === "string" && names.some((name) =>
            notes.toLocaleLowerCase("it").includes(name.toLocaleLowerCase("it")));
      })) return "L’argomento è citato nella scheda di uno studente: eliminazione bloccata.";
    }
    return null;
  } catch { return "Non è possibile verificare tutti gli archivi: eliminazione bloccata."; }
}
