import { inspectStoredStudentsReadOnly } from "../../data/student-storage";
import {
  CALENDAR_APPOINTMENTS_STORAGE_KEY, CALENDAR_SERIES_STORAGE_KEY,
  loadCalendarAppointments, loadCalendarSeries,
  normalizeCalendarAppointment, normalizeCalendarSeries,
} from "../../data/calendario/calendar-storage";
import type { CalendarAppointment, CalendarOccurrence, CalendarSeries } from "../../data/calendario/calendar-types";
import type { StudentRecord } from "../../data/students";
import { loadStudentArchiveOverview, summarizeStudentPayments } from "../student-utils";

/** Data for the future Card Estesa. This module never saves or repairs archives. */
export type ExtendedStudentCardRead =
  | { status: "missing" | "conflict" | "unreadable" }
  | {
      status: "ready";
      student: Readonly<StudentRecord>;
      lessons: ReadonlyArray<CalendarOccurrence>;
      payment: ReturnType<typeof summarizeStudentPayments>;
      suggestArchiving: boolean;
    };

export function selectExtendedStudentCard(
  student: StudentRecord,
  appointments: CalendarAppointment[],
  series: CalendarSeries[],
  now: Date = new Date(),
): Extract<ExtendedStudentCardRead, { status: "ready" }> {
  const overview = loadStudentArchiveOverview(student.id, now, { appointments, series });
  return {
    status: "ready",
    student,
    lessons: overview.lessons,
    payment: summarizeStudentPayments(overview.lessons),
    suggestArchiving: overview.suggestArchiving,
  };
}

export function readExtendedStudentCard(id: string, now: Date = new Date()): ExtendedStudentCardRead {
  const archive = inspectStoredStudentsReadOnly();
  if (archive.conflictIds.includes(id)) return { status: "conflict" };
  if (!archive.readable && archive.conflictIds.length === 0) return { status: "unreadable" };
  const student = archive.students.find((item) => item.id === id);
  if (!student) return { status: "missing" };
  if (!calendarArchivesReadable()) return { status: "unreadable" };
  return selectExtendedStudentCard(student, loadCalendarAppointments(), loadCalendarSeries(), now);
}

/** Reject partial or discordant calendar copies before using the existing readers. */
function calendarArchivesReadable() {
  if (typeof window === "undefined") return false;
  const seen = new Map<string, string>();
  for (const [key, normalize] of [
    [CALENDAR_APPOINTMENTS_STORAGE_KEY, normalizeCalendarAppointment],
    [CALENDAR_SERIES_STORAGE_KEY, normalizeCalendarSeries],
  ] as const) {
    for (const storageName of ["localStorage", "sessionStorage"] as const) {
      let storage: Storage;
      try { storage = window[storageName]; } catch { continue; }
      try {
        const raw = storage.getItem(key);
        if (raw === null) continue;
        const records: unknown = JSON.parse(raw);
        if (!Array.isArray(records)) return false;
        for (const record of records) {
          const item = normalize(record);
          if (!item) return false;
          const identity = `${key}:${item.id}`;
          const value = JSON.stringify(item);
          if (seen.has(identity) && seen.get(identity) !== value) return false;
          seen.set(identity, value);
        }
      } catch { return false; }
    }
  }
  return true;
}
