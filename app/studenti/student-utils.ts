import { loadCalendarAppointments, loadCalendarSeries } from "../data/calendario/calendar-storage";
import { selectOccurrencesInRange } from "../data/calendario/calendar-selectors";
import { addDays, toLocalDate, toLocalTime } from "../data/calendario/calendar-dates";
import type { CalendarOccurrence, LessonMode } from "../data/calendario/calendar-types";
import type { StudentRecord } from "../data/students";

export function fullName(student: StudentRecord) {
  return [student.firstName, student.lastName].filter(Boolean).join(" ").trim() || "Studente senza nome";
}

export function normalizeSubject(value: string) {
  return value.trim();
}

export function formatLesson(value?: string) {
  if (!value) return "—";
  const [date, time] = value.split("T");
  if (!date) return value;
  const parsed = new Date(`${date}T${time || "00:00"}`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: time ? "2-digit" : undefined,
    minute: time ? "2-digit" : undefined,
  }).format(parsed);
}

export function formatMode(mode?: LessonMode | StudentRecord["lessonMode"]) {
  if (mode === "domicilio") return "A domicilio";
  if (mode === "online") return "Online";
  if (mode === "casa") return "Casa / studio";
  return "—";
}

export function loadStudentLessonSummary() {
  const now = new Date();
  const today = toLocalDate(now);
  const currentTime = toLocalTime(now);
  const from = addDays(today, -365);
  const to = addDays(today, 365);
  const occurrences = selectOccurrencesInRange(loadCalendarAppointments(), loadCalendarSeries(), from, to);
  const byStudent = new Map<string, CalendarOccurrence[]>();

  for (const lesson of occurrences) {
    const current = byStudent.get(lesson.studentId) ?? [];
    current.push(lesson);
    byStudent.set(lesson.studentId, current);
  }

  const nextByStudent = new Map<string, CalendarOccurrence>();
  const lastByStudent = new Map<string, CalendarOccurrence>();

  for (const lesson of occurrences) {
    if (lesson.status !== "annullata") {
      const stamp = `${lesson.date}T${lesson.startTime}`;
      const isPast = lesson.date < today || (lesson.date === today && lesson.startTime < currentTime);
      if (isPast) {
        const previous = lastByStudent.get(lesson.studentId);
        if (!previous || stamp > `${previous.date}T${previous.startTime}`) lastByStudent.set(lesson.studentId, lesson);
      } else {
        const next = nextByStudent.get(lesson.studentId);
        if (!next || stamp < `${next.date}T${next.startTime}`) nextByStudent.set(lesson.studentId, lesson);
      }
    }
  }

  return { byStudent, nextByStudent, lastByStudent };
}

export function euroFromCents(value?: number) {
  if (!value) return "";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value / 100);
}
