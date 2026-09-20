import type { LocalDate, LocalTime } from "./calendar-types";

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface LocalDateParts {
  year: number;
  month: number;
  day: number;
}

export interface LocalTimeParts {
  hour: number;
  minute: number;
}

export function parseLocalDate(value: unknown): LocalDateParts | null {
  if (typeof value !== "string") return null;
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));

  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function parseLocalTime(value: unknown): LocalTimeParts | null {
  if (typeof value !== "string") return null;
  const match = LOCAL_TIME_PATTERN.exec(value);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export function isLocalDate(value: unknown): value is LocalDate {
  return parseLocalDate(value) !== null;
}

export function isLocalTime(value: unknown): value is LocalTime {
  return parseLocalTime(value) !== null;
}

export function formatLocalDate(parts: LocalDateParts): LocalDate {
  return `${parts.year.toString().padStart(4, "0")}-${parts.month
    .toString()
    .padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
}

export function toLocalDate(date: Date): LocalDate {
  return formatLocalDate({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  });
}

export function toLocalTime(date: Date): LocalTime {
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export function combineLocalDateAndTime(
  localDate: LocalDate,
  localTime: LocalTime
): Date | null {
  const date = parseLocalDate(localDate);
  const time = parseLocalTime(localTime);
  if (!date || !time) return null;

  return new Date(
    date.year,
    date.month - 1,
    date.day,
    time.hour,
    time.minute,
    0,
    0
  );
}

export function compareLocalDates(a: LocalDate, b: LocalDate) {
  return a.localeCompare(b);
}

export function compareLocalDateTimes(
  dateA: LocalDate,
  timeA: LocalTime,
  dateB: LocalDate,
  timeB: LocalTime
) {
  const dateComparison = compareLocalDates(dateA, dateB);
  return dateComparison !== 0 ? dateComparison : timeA.localeCompare(timeB);
}

export function addDays(localDate: LocalDate, amount: number): LocalDate {
  const parts = parseLocalDate(localDate);
  if (!parts || !Number.isInteger(amount)) return localDate;

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + amount));
  return formatLocalDate({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

export function daysBetween(from: LocalDate, to: LocalDate): number | null {
  const fromParts = parseLocalDate(from);
  const toParts = parseLocalDate(to);
  if (!fromParts || !toParts) return null;

  const fromUtc = Date.UTC(fromParts.year, fromParts.month - 1, fromParts.day);
  const toUtc = Date.UTC(toParts.year, toParts.month - 1, toParts.day);
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

export function startOfLocalWeek(localDate: LocalDate): LocalDate {
  const parts = parseLocalDate(localDate);
  if (!parts) return localDate;
  const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  return addDays(localDate, -daysSinceMonday);
}

export function endOfLocalWeek(localDate: LocalDate): LocalDate {
  return addDays(startOfLocalWeek(localDate), 6);
}

export function startOfLocalMonth(localDate: LocalDate): LocalDate {
  const parts = parseLocalDate(localDate);
  return parts ? formatLocalDate({ ...parts, day: 1 }) : localDate;
}

export function endOfLocalMonth(localDate: LocalDate): LocalDate {
  const parts = parseLocalDate(localDate);
  if (!parts) return localDate;
  const date = new Date(Date.UTC(parts.year, parts.month, 0));
  return formatLocalDate({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}
