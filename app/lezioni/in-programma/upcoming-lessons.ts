import { addDays, parseLocalTime } from "../../data/calendario/calendar-dates";
import { selectOccurrencesInRange, selectUpcomingOccurrences } from "../../data/calendario/calendar-selectors";
import type { CalendarAppointment, CalendarOccurrence, CalendarSeries } from "../../data/calendario/calendar-types";
import { lessonEditHref } from "../../calendario/lesson-navigation";

export function initialScheduleEnd(
  appointments: CalendarAppointment[],
  series: CalendarSeries[],
  today: string,
) {
  let end = addDays(today, 365);

  for (const appointment of appointments) {
    if (appointment.status !== "svolta" && appointment.status !== "annullata" && appointment.date > end) {
      end = appointment.date;
    }
  }

  for (const item of series) {
    if (item.status === "svolta" || item.status === "annullata") continue;
    const start = item.startsOn > today ? item.startsOn : today;
    const last = item.recurrence.endsOn ?? addDays(start, 365);
    if (last > end) end = last;
  }

  return end;
}

export function selectProgrammedLessons(
  appointments: CalendarAppointment[],
  series: CalendarSeries[],
  today: string,
  _currentTime: string,
  through: string,
) {
  return selectUpcomingOccurrences(
    selectOccurrencesInRange(appointments, series, today, through),
    today,
  ).filter((lesson) => lesson.date === today || lesson.status !== "svolta");
}

export function lessonEditorHref(lesson: CalendarOccurrence, returnTo = "/lezioni/in-programma") {
  return lessonEditHref(lesson, returnTo);
}

/** Available minutes between consecutive lessons on the same local calendar day. */
export function availableIntervalMinutes(first: CalendarOccurrence, next: CalendarOccurrence) {
  if (first.date !== next.date || first.durationMinutes <= 0) return null;
  const start = parseLocalTime(first.startTime);
  const following = parseLocalTime(next.startTime);
  if (!start || !following) return null;
  const endMinutes = start.hour * 60 + start.minute + first.durationMinutes;
  const nextMinutes = following.hour * 60 + following.minute;
  return nextMinutes >= endMinutes ? nextMinutes - endMinutes : null;
}
