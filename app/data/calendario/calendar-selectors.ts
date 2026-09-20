import {
  endOfLocalMonth,
  endOfLocalWeek,
  startOfLocalMonth,
  startOfLocalWeek,
} from "./calendar-dates";
import { expandCalendarOccurrences } from "./calendar-recurrence";
import type {
  CalendarAppointment,
  CalendarOccurrence,
  CalendarRequest,
  CalendarSeries,
  LocalDate,
  PaymentStatus,
  RequestDirection,
} from "./calendar-types";

export function selectOccurrencesInRange(
  appointments: CalendarAppointment[],
  series: CalendarSeries[],
  from: LocalDate,
  to: LocalDate
) {
  return expandCalendarOccurrences(appointments, series, from, to);
}

export function selectDayOccurrences(
  appointments: CalendarAppointment[],
  series: CalendarSeries[],
  day: LocalDate
) {
  return selectOccurrencesInRange(appointments, series, day, day);
}

export function selectWeekOccurrences(
  appointments: CalendarAppointment[],
  series: CalendarSeries[],
  dayInWeek: LocalDate
) {
  return selectOccurrencesInRange(
    appointments,
    series,
    startOfLocalWeek(dayInWeek),
    endOfLocalWeek(dayInWeek)
  );
}

export function selectMonthOccurrences(
  appointments: CalendarAppointment[],
  series: CalendarSeries[],
  dayInMonth: LocalDate
) {
  return selectOccurrencesInRange(
    appointments,
    series,
    startOfLocalMonth(dayInMonth),
    endOfLocalMonth(dayInMonth)
  );
}

export function selectUpcomingOccurrences(
  occurrences: CalendarOccurrence[],
  from: LocalDate
) {
  return occurrences.filter(
    (occurrence) => occurrence.date >= from && occurrence.status !== "annullata"
  );
}

export function selectHistoryOccurrences(
  occurrences: CalendarOccurrence[],
  before: LocalDate
) {
  return occurrences.filter((occurrence) => occurrence.date < before);
}

export function selectRequestsByDirection(
  requests: CalendarRequest[],
  direction: RequestDirection
) {
  return requests
    .filter((request) => request.direction === direction)
    .sort((a, b) =>
      a.proposedDate === b.proposedDate
        ? a.proposedStartTime.localeCompare(b.proposedStartTime)
        : a.proposedDate.localeCompare(b.proposedDate)
    );
}

export function selectOccurrencesByPaymentStatus(
  occurrences: CalendarOccurrence[],
  paymentStatus: PaymentStatus
) {
  return occurrences.filter(
    (occurrence) => occurrence.paymentStatus === paymentStatus
  );
}

export function selectStudentOccurrences(
  occurrences: CalendarOccurrence[],
  studentId: string
) {
  return occurrences.filter((occurrence) => occurrence.studentId === studentId);
}

export function groupOccurrencesByDate(occurrences: CalendarOccurrence[]) {
  const grouped = new Map<LocalDate, CalendarOccurrence[]>();

  for (const occurrence of occurrences) {
    const current = grouped.get(occurrence.date) ?? [];
    current.push(occurrence);
    grouped.set(occurrence.date, current);
  }

  return grouped;
}
