import { addDays, daysBetween, isLocalDate, isLocalTime } from "./calendar-dates";
import { expandCalendarOccurrences, listSeriesOccurrenceDates } from "./calendar-recurrence";
import type { CalendarAppointment, CalendarOccurrence, CalendarSeries } from "./calendar-types";

export interface LessonSlot {
  date: string;
  startTime: string;
  durationMinutes: number;
  recurrence?: { intervalWeeks: number; endsOn?: string };
}

export type Availability =
  | { state: "incomplete"; reason: string }
  | { state: "available"; checkedThrough: string; limited: boolean }
  | { state: "conflict"; occurrence: CalendarOccurrence };

export function checkLessonAvailability(
  slot: LessonSlot,
  appointments: CalendarAppointment[],
  series: CalendarSeries[],
  exclude?: { appointmentId?: string; seriesId?: string; originalOccurrenceDate?: string },
): Availability {
  if (!isLocalDate(slot.date) || !isLocalTime(slot.startTime) ||
      !Number.isInteger(slot.durationMinutes) || slot.durationMinutes < 15 || slot.durationMinutes > 480) {
    return { state: "incomplete", reason: "Indica data, ora e durata valide." };
  }
  const recurrence = slot.recurrence;
  if (recurrence && (!Number.isInteger(recurrence.intervalWeeks) || recurrence.intervalWeeks < 1 || recurrence.intervalWeeks > 52 ||
      (recurrence.endsOn !== undefined && (!isLocalDate(recurrence.endsOn) || recurrence.endsOn < slot.date)))) {
    return { state: "incomplete", reason: "Controlla la scadenza della ricorrenza." };
  }
  const checkedThrough = recurrence?.endsOn ?? (recurrence ? addDays(slot.date, 365) : slot.date);
  const candidateDates = recurrence
    ? listSeriesOccurrenceDates({ startsOn: slot.date, recurrence: { frequency: "weekly", ...recurrence } } as CalendarSeries, slot.date, checkedThrough)
    : [slot.date];
  if (!candidateDates.length) return { state: "incomplete", reason: "La ricorrenza non produce lezioni." };
  if (recurrence && recurrence.endsOn && addDays(candidateDates.at(-1)!, recurrence.intervalWeeks * 7) <= recurrence.endsOn) {
    return { state: "incomplete", reason: "La ricorrenza è troppo lunga per verificare tutte le occorrenze." };
  }
  const rangeStart = addDays(slot.date, -1);
  const rangeEnd = addDays(checkedThrough, 1);
  const existing = expandCalendarOccurrences(appointments, series, rangeStart, rangeEnd)
    .filter((item) => item.status !== "annullata" &&
      !(exclude?.appointmentId && item.appointmentId === exclude.appointmentId) &&
      !(exclude?.seriesId && item.seriesId === exclude.seriesId && item.originalOccurrenceDate === exclude.originalOccurrenceDate));
  const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
  for (const date of candidateDates) {
    const start = (daysBetween(rangeStart, date) ?? 0) * 1440 + minutes(slot.startTime);
    const end = start + slot.durationMinutes;
    for (const occurrence of existing) {
      const otherStart = (daysBetween(rangeStart, occurrence.date) ?? 0) * 1440 + minutes(occurrence.startTime);
      if (start < otherStart + occurrence.durationMinutes && otherStart < end) {
        return { state: "conflict", occurrence };
      }
    }
  }
  return { state: "available", checkedThrough, limited: Boolean(recurrence && !recurrence.endsOn) };
}
