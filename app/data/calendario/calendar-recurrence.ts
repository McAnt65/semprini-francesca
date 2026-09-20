import {
  addDays,
  compareLocalDates,
  daysBetween,
  isLocalDate,
} from "./calendar-dates";
import type {
  CalendarAppointment,
  CalendarOccurrence,
  CalendarSeries,
  LocalDate,
  SeriesLessonPatch,
} from "./calendar-types";

const MAX_OCCURRENCES_PER_SERIES = 2_000;

export function isSeriesOccurrenceDate(
  series: CalendarSeries,
  localDate: LocalDate
) {
  if (!isLocalDate(localDate)) return false;
  if (compareLocalDates(localDate, series.startsOn) < 0) return false;
  if (
    series.recurrence.endsOn &&
    compareLocalDates(localDate, series.recurrence.endsOn) > 0
  ) {
    return false;
  }

  const difference = daysBetween(series.startsOn, localDate);
  const intervalDays = series.recurrence.intervalWeeks * 7;
  return difference !== null && difference >= 0 && difference % intervalDays === 0;
}

export function listSeriesOccurrenceDates(
  series: CalendarSeries,
  rangeStart: LocalDate,
  rangeEnd: LocalDate
): LocalDate[] {
  if (
    !isLocalDate(rangeStart) ||
    !isLocalDate(rangeEnd) ||
    compareLocalDates(rangeStart, rangeEnd) > 0
  ) {
    return [];
  }

  const intervalDays = series.recurrence.intervalWeeks * 7;
  const initialDifference = daysBetween(series.startsOn, rangeStart) ?? 0;
  const jumps = Math.max(0, Math.ceil(initialDifference / intervalDays));
  let current = addDays(series.startsOn, jumps * intervalDays);
  const dates: LocalDate[] = [];

  while (
    compareLocalDates(current, rangeEnd) <= 0 &&
    dates.length < MAX_OCCURRENCES_PER_SERIES
  ) {
    if (
      (!series.recurrence.endsOn ||
        compareLocalDates(current, series.recurrence.endsOn) <= 0) &&
      compareLocalDates(current, rangeStart) >= 0
    ) {
      dates.push(current);
    }
    current = addDays(current, intervalDays);
  }

  return dates;
}

export function createSingleOccurrenceException(
  series: CalendarSeries,
  occurrenceDate: LocalDate,
  appointmentId: string,
  changes: Partial<
    Pick<
      CalendarAppointment,
      | "date"
      | "startTime"
      | "durationMinutes"
      | "mode"
      | "status"
      | "topic"
      | "notes"
      | "hourlyRateCents"
      | "lessonAmountCents"
      | "paymentStatus"
      | "source"
    >
  >,
  timestamp = new Date().toISOString()
): CalendarAppointment | null {
  if (!isSeriesOccurrenceDate(series, occurrenceDate) || !appointmentId.trim()) {
    return null;
  }

  return {
    id: appointmentId.trim(),
    studentId: series.studentId,
    studentNameSnapshot: series.studentNameSnapshot,
    subject: series.subject,
    date: occurrenceDate,
    startTime: series.startTime,
    durationMinutes: series.durationMinutes,
    mode: series.mode,
    status: series.status,
    topic: series.topic,
    notes: series.notes,
    hourlyRateCents: series.hourlyRateCents,
    lessonAmountCents: series.lessonAmountCents,
    paymentStatus: series.paymentStatus,
    source: series.source,
    ...changes,
    seriesId: series.id,
    originalOccurrenceDate: occurrenceDate,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export interface SplitSeriesResult {
  previousSeries: CalendarSeries | null;
  followingSeries: CalendarSeries;
}

export function splitSeriesFromOccurrence(
  series: CalendarSeries,
  occurrenceDate: LocalDate,
  followingSeriesId: string,
  changes: SeriesLessonPatch = {},
  timestamp = new Date().toISOString()
): SplitSeriesResult | null {
  if (
    !isSeriesOccurrenceDate(series, occurrenceDate) ||
    !followingSeriesId.trim() ||
    followingSeriesId.trim() === series.id
  ) {
    return null;
  }

  const intervalDays = series.recurrence.intervalWeeks * 7;
  const previousEnd = addDays(occurrenceDate, -intervalDays);
  const recurrence = changes.recurrence ?? series.recurrence;
  const followingSeries: CalendarSeries = {
    ...series,
    ...changes,
    id: followingSeriesId.trim(),
    startsOn: occurrenceDate,
    recurrence: {
      ...recurrence,
      endsOn: recurrence.endsOn,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const previousSeries = occurrenceDate === series.startsOn
    ? null
    : {
        ...series,
        recurrence: {
          ...series.recurrence,
          endsOn: previousEnd,
        },
        updatedAt: timestamp,
      };

  return { previousSeries, followingSeries };
}

export function partitionExceptionsAtDate(
  exceptions: CalendarAppointment[],
  seriesId: string,
  splitDate: LocalDate
) {
  const previous: CalendarAppointment[] = [];
  const following: CalendarAppointment[] = [];

  for (const exception of exceptions) {
    if (exception.seriesId !== seriesId || !exception.originalOccurrenceDate) {
      previous.push(exception);
    } else if (compareLocalDates(exception.originalOccurrenceDate, splitDate) < 0) {
      previous.push(exception);
    } else {
      following.push(exception);
    }
  }

  return { previous, following };
}

export function expandCalendarOccurrences(
  appointments: CalendarAppointment[],
  seriesList: CalendarSeries[],
  rangeStart: LocalDate,
  rangeEnd: LocalDate
): CalendarOccurrence[] {
  const exceptions = new Map<string, CalendarAppointment>();

  for (const appointment of appointments) {
    if (appointment.seriesId && appointment.originalOccurrenceDate) {
      exceptions.set(
        exceptionKey(appointment.seriesId, appointment.originalOccurrenceDate),
        appointment
      );
    }
  }

  const occurrences: CalendarOccurrence[] = [];

  for (const series of seriesList) {
    for (const date of listSeriesOccurrenceDates(series, rangeStart, rangeEnd)) {
      const exception = exceptions.get(exceptionKey(series.id, date));
      if (exception) continue;
      occurrences.push(seriesToOccurrence(series, date));
    }
  }

  for (const appointment of appointments) {
    if (
      compareLocalDates(appointment.date, rangeStart) >= 0 &&
      compareLocalDates(appointment.date, rangeEnd) <= 0
    ) {
      occurrences.push(appointmentToOccurrence(appointment));
    }
  }

  return occurrences.sort((a, b) =>
    a.date === b.date
      ? a.startTime.localeCompare(b.startTime)
      : a.date.localeCompare(b.date)
  );
}

function seriesToOccurrence(
  series: CalendarSeries,
  date: LocalDate
): CalendarOccurrence {
  return {
    occurrenceId: `series:${series.id}:${date}`,
    seriesId: series.id,
    originalOccurrenceDate: date,
    studentId: series.studentId,
    studentNameSnapshot: series.studentNameSnapshot,
    subject: series.subject,
    date,
    startTime: series.startTime,
    durationMinutes: series.durationMinutes,
    mode: series.mode,
    status: series.status,
    topic: series.topic,
    notes: series.notes,
    hourlyRateCents: series.hourlyRateCents,
    lessonAmountCents: series.lessonAmountCents,
    paymentStatus: series.paymentStatus,
    source: series.source,
    isRecurring: true,
    isException: false,
  };
}

function appointmentToOccurrence(
  appointment: CalendarAppointment
): CalendarOccurrence {
  return {
    occurrenceId: `appointment:${appointment.id}`,
    appointmentId: appointment.id,
    seriesId: appointment.seriesId,
    originalOccurrenceDate: appointment.originalOccurrenceDate,
    studentId: appointment.studentId,
    studentNameSnapshot: appointment.studentNameSnapshot,
    subject: appointment.subject,
    date: appointment.date,
    startTime: appointment.startTime,
    durationMinutes: appointment.durationMinutes,
    mode: appointment.mode,
    status: appointment.status,
    topic: appointment.topic,
    notes: appointment.notes,
    hourlyRateCents: appointment.hourlyRateCents,
    lessonAmountCents: appointment.lessonAmountCents,
    paymentStatus: appointment.paymentStatus,
    source: appointment.source,
    isRecurring: Boolean(appointment.seriesId),
    isException: Boolean(appointment.seriesId && appointment.originalOccurrenceDate),
  };
}

function exceptionKey(seriesId: string, occurrenceDate: LocalDate) {
  return `${seriesId}:${occurrenceDate}`;
}
