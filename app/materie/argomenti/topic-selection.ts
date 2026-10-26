import { normalizeCalendarAppointment, normalizeCalendarSeries,
  CALENDAR_APPOINTMENTS_STORAGE_KEY, CALENDAR_SERIES_STORAGE_KEY } from "../../data/calendario/calendar-storage";
import type { CalendarAppointment, CalendarOccurrence, CalendarSeries } from "../../data/calendario/calendar-types";
import { coveredTopicOf, unclassifiedHistoricalTopicOf } from "../../data/calendario/calendar-topics";
import { selectCompletedLessons } from "../../lezioni/storico/history-lessons";
import { subjects, type SubjectSlug } from "../materie-data";

type ReadableStorage = Pick<Storage, "getItem">;

/** The calendar loaders turn a failed read into []; check first to avoid a false empty state. */
export function calendarArchiveReadable(storages: ReadableStorage[]): boolean {
  if (storages.length !== 2) return false;
  try {
    for (const storage of storages) {
      for (const [key, normalize] of [
        [CALENDAR_APPOINTMENTS_STORAGE_KEY, normalizeCalendarAppointment],
        [CALENDAR_SERIES_STORAGE_KEY, normalizeCalendarSeries],
      ] as const) {
        const raw = storage.getItem(key);
        if (raw === null) continue;
        const records: unknown = JSON.parse(raw);
        if (!Array.isArray(records) || records.some((record) => !normalize(record))) return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

function matches(value: string, query: string) {
  return value.toLocaleLowerCase("it").includes(query.trim().toLocaleLowerCase("it"));
}

export function predefinedTopics(subject: SubjectSlug, query: string): string[] {
  return subjects[subject].topics.filter((topic) => matches(topic, query));
}

export function lessonTopics(
  appointments: CalendarAppointment[], series: CalendarSeries[], now: Date,
  subject: SubjectSlug, query: string,
): { lessons: CalendarOccurrence[]; withoutTopic: number } {
  const title = subjects[subject].title;
  const seen = new Set<string>();
  let withoutTopic = 0;
  const lessons = selectCompletedLessons(appointments, series, now).filter((lesson) => {
    if (lesson.subject.trim().localeCompare(title, "it", { sensitivity: "base" }) !== 0 ||
        seen.has(lesson.occurrenceId)) return false;
    seen.add(lesson.occurrenceId);
    const topic = coveredTopicOf(lesson) || unclassifiedHistoricalTopicOf(lesson);
    if (!topic) { withoutTopic += 1; return false; }
    return matches(topic, query);
  });
  lessons.sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime) ||
    b.occurrenceId.localeCompare(a.occurrenceId));
  return { lessons, withoutTopic };
}
