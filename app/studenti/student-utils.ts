import { loadCalendarAppointments, loadCalendarSeries } from "../data/calendario/calendar-storage";
import { selectOccurrencesInRange } from "../data/calendario/calendar-selectors";
import { addDays, daysBetween, toLocalDate, toLocalTime } from "../data/calendario/calendar-dates";
import type { CalendarAppointment, CalendarOccurrence, CalendarSeries, LessonMode } from "../data/calendario/calendar-types";
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

export function loadStudentArchiveOverview(
  studentId: string,
  now = new Date(),
  source: { appointments: CalendarAppointment[]; series: CalendarSeries[] } = {
    appointments: loadCalendarAppointments(),
    series: loadCalendarSeries(),
  },
) {
  const appointments = source.appointments.filter((lesson) => lesson.studentId === studentId);
  const series = source.series.filter((lesson) => lesson.studentId === studentId);
  const today = toLocalDate(now);
  const currentTime = toLocalTime(now);
  const dates = [...appointments.map((lesson) => lesson.date), ...series.map((lesson) => lesson.startsOn)];
  const from = dates.sort()[0] ?? today;
  const to = [addDays(today, 366), ...dates].sort().at(-1) ?? today;
  const lessons = selectOccurrencesInRange(appointments, series, from, to);
  const completed = lessons
    .filter((lesson) => lesson.status === "svolta" && (lesson.date < today || (lesson.date === today && lesson.startTime <= currentTime)))
    .at(-1);
  const hasFuture = lessons.some((lesson) =>
    lesson.status !== "annullata" &&
    lesson.status !== "svolta" &&
    (lesson.date > today || (lesson.date === today && lesson.startTime > currentTime))
  );
  const inactiveDays = completed ? daysBetween(completed.date, today) : null;
  return { lessons, suggestArchiving: inactiveDays !== null && inactiveDays >= 90 && !hasFuture };
}

export type StudentPaymentStatus = "Saldato" | "Da saldare" | "Parzialmente saldato" | "Nessun pagamento registrato";

export function summarizeStudentPayments(lessons: CalendarOccurrence[]) {
  const billable = lessons.filter((lesson) =>
    lesson.status !== "annullata" &&
    lesson.lessonAmountCents > 0 &&
    (lesson.paymentStatus === "non_pagata" ||
      lesson.paymentStatus === "pagata" ||
      lesson.paymentStatus === "parziale" ||
      lesson.paymentStatus === "non_dovuta")
  );
  const due = billable.reduce((total, lesson) =>
    total + (lesson.paymentStatus === "non_dovuta" ? 0 : lesson.lessonAmountCents), 0);
  const paid = billable.reduce((total, lesson) =>
    total + (lesson.paymentStatus === "non_dovuta"
      ? 0
      : Math.min(lesson.lessonAmountCents, lesson.paidAmountCents ?? (lesson.paymentStatus === "pagata" ? lesson.lessonAmountCents : 0))), 0);
  const status: StudentPaymentStatus = due <= 0
    ? "Nessun pagamento registrato"
    : paid >= due
      ? "Saldato"
      : paid > 0
        ? "Parzialmente saldato"
        : "Da saldare";
  return { status, hasOutstanding: due > paid };
}

export function euroFromCents(value?: number) {
  if (!value) return "";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value / 100);
}
