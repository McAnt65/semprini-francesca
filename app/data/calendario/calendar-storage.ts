import { isLocalDate, isLocalTime } from "./calendar-dates";
import type {
  AppointmentSource,
  CalendarAppointment,
  CalendarRequest,
  CalendarSeries,
  LessonMode,
  LessonSnapshot,
  LessonStatus,
  PaymentStatus,
  RequestDirection,
} from "./calendar-types";

export const CALENDAR_APPOINTMENTS_STORAGE_KEY =
  "semprini:calendar:appointments:v1";
export const CALENDAR_SERIES_STORAGE_KEY = "semprini:calendar:series:v1";
export const CALENDAR_REQUESTS_STORAGE_KEY = "semprini:calendar:requests:v1";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type StoredRecord = { id: string; updatedAt: string };

const LESSON_MODES: LessonMode[] = ["casa", "studio", "online"];
const LESSON_STATUSES: LessonStatus[] = [
  "confermata",
  "attesa",
  "richiesta",
  "annullata",
];
const PAYMENT_STATUSES: PaymentStatus[] = [
  "non_pagata",
  "pagata",
  "parziale",
  "non_dovuta",
];
const APPOINTMENT_SOURCES: AppointmentSource[] = [
  "manuale",
  "richiesta_ricevuta",
  "proposta_inviata",
];
const REQUEST_DIRECTIONS: RequestDirection[] = ["ricevuta", "inviata"];

export function loadCalendarAppointments(): CalendarAppointment[] {
  return loadCollection(
    CALENDAR_APPOINTMENTS_STORAGE_KEY,
    normalizeCalendarAppointment
  );
}

export function saveCalendarAppointments(
  appointments: CalendarAppointment[]
): boolean {
  return saveCollection(
    CALENDAR_APPOINTMENTS_STORAGE_KEY,
    appointments,
    normalizeCalendarAppointment
  );
}

export function upsertCalendarAppointment(
  appointment: CalendarAppointment
): boolean {
  const normalized = normalizeCalendarAppointment(appointment);
  if (!normalized) return false;
  const current = loadCalendarAppointments();
  return saveCalendarAppointments([
    normalized,
    ...current.filter((item) => item.id !== normalized.id),
  ]);
}

export function removeCalendarAppointment(id: string): boolean {
  const normalizedId = id.trim();
  if (!normalizedId) return false;
  return saveCalendarAppointments(
    loadCalendarAppointments().filter((item) => item.id !== normalizedId)
  );
}

export function loadCalendarSeries(): CalendarSeries[] {
  return loadCollection(CALENDAR_SERIES_STORAGE_KEY, normalizeCalendarSeries);
}

export function saveCalendarSeries(series: CalendarSeries[]): boolean {
  return saveCollection(
    CALENDAR_SERIES_STORAGE_KEY,
    series,
    normalizeCalendarSeries
  );
}

export function upsertCalendarSeries(series: CalendarSeries): boolean {
  const normalized = normalizeCalendarSeries(series);
  if (!normalized) return false;
  const current = loadCalendarSeries();
  return saveCalendarSeries([
    normalized,
    ...current.filter((item) => item.id !== normalized.id),
  ]);
}

export function removeCalendarSeries(id: string): boolean {
  const normalizedId = id.trim();
  if (!normalizedId) return false;
  return saveCalendarSeries(
    loadCalendarSeries().filter((item) => item.id !== normalizedId)
  );
}

export function loadCalendarRequests(): CalendarRequest[] {
  return loadCollection(CALENDAR_REQUESTS_STORAGE_KEY, normalizeCalendarRequest);
}

export function saveCalendarRequests(requests: CalendarRequest[]): boolean {
  return saveCollection(
    CALENDAR_REQUESTS_STORAGE_KEY,
    requests,
    normalizeCalendarRequest
  );
}

export function upsertCalendarRequest(request: CalendarRequest): boolean {
  const normalized = normalizeCalendarRequest(request);
  if (!normalized) return false;
  const current = loadCalendarRequests();
  return saveCalendarRequests([
    normalized,
    ...current.filter((item) => item.id !== normalized.id),
  ]);
}

export function removeCalendarRequest(id: string): boolean {
  const normalizedId = id.trim();
  if (!normalizedId) return false;
  return saveCalendarRequests(
    loadCalendarRequests().filter((item) => item.id !== normalizedId)
  );
}

export function normalizeCalendarAppointment(
  value: unknown
): CalendarAppointment | null {
  const record = asObject(value);
  const common = normalizeLessonSnapshot(record);
  const id = text(record.id);
  const date = text(record.date);
  const startTime = text(record.startTime);
  const source = enumValue(record.source, APPOINTMENT_SOURCES);
  if (!id || !common || !isLocalDate(date) || !isLocalTime(startTime) || !source) {
    return null;
  }

  const seriesId = text(record.seriesId);
  const originalOccurrenceDate = text(record.originalOccurrenceDate);
  const hasValidExceptionLink =
    Boolean(seriesId) && isLocalDate(originalOccurrenceDate);

  return {
    id,
    ...common,
    date,
    startTime,
    source,
    seriesId: hasValidExceptionLink ? seriesId : undefined,
    originalOccurrenceDate: hasValidExceptionLink
      ? originalOccurrenceDate
      : undefined,
    createdAt: timestamp(record.createdAt),
    updatedAt: timestamp(record.updatedAt),
  };
}

export function normalizeCalendarSeries(value: unknown): CalendarSeries | null {
  const record = asObject(value);
  const common = normalizeLessonSnapshot(record);
  const recurrence = asObject(record.recurrence);
  const id = text(record.id);
  const startsOn = text(record.startsOn);
  const startTime = text(record.startTime);
  const source = enumValue(record.source, APPOINTMENT_SOURCES);
  const intervalWeeks = positiveInteger(recurrence.intervalWeeks, 1, 52);
  const endsOnValue = text(recurrence.endsOn);
  const endsOn = isLocalDate(endsOnValue) && endsOnValue >= startsOn
    ? endsOnValue
    : undefined;

  if (
    !id ||
    !common ||
    !isLocalDate(startsOn) ||
    !isLocalTime(startTime) ||
    !source ||
    recurrence.frequency !== "weekly"
  ) {
    return null;
  }

  return {
    id,
    ...common,
    startsOn,
    startTime,
    recurrence: {
      frequency: "weekly",
      intervalWeeks,
      endsOn,
    },
    source,
    createdAt: timestamp(record.createdAt),
    updatedAt: timestamp(record.updatedAt),
  };
}

export function normalizeCalendarRequest(value: unknown): CalendarRequest | null {
  const record = asObject(value);
  const common = normalizeLessonSnapshot(record);
  const id = text(record.id);
  const direction = enumValue(record.direction, REQUEST_DIRECTIONS);
  const proposedDate = text(record.proposedDate);
  const proposedStartTime = text(record.proposedStartTime);

  if (
    !id ||
    !common ||
    !direction ||
    !isLocalDate(proposedDate) ||
    !isLocalTime(proposedStartTime)
  ) {
    return null;
  }

  return {
    id,
    ...common,
    direction,
    proposedDate,
    proposedStartTime,
    linkedAppointmentId: text(record.linkedAppointmentId) || undefined,
    createdAt: timestamp(record.createdAt),
    updatedAt: timestamp(record.updatedAt),
  };
}

function normalizeLessonSnapshot(
  record: Record<string, unknown>
): LessonSnapshot | null {
  const studentId = text(record.studentId);
  const studentNameSnapshot = text(record.studentNameSnapshot);
  const subject = text(record.subject);
  const mode = enumValue(record.mode, LESSON_MODES);
  const status = enumValue(record.status, LESSON_STATUSES);
  const paymentStatus = enumValue(record.paymentStatus, PAYMENT_STATUSES);

  if (!studentId || !studentNameSnapshot || !subject || !mode || !status || !paymentStatus) {
    return null;
  }

  return {
    studentId,
    studentNameSnapshot,
    subject,
    durationMinutes: positiveInteger(record.durationMinutes, 1, 24 * 60),
    mode,
    status,
    topic: text(record.topic),
    notes: text(record.notes),
    hourlyRateCents: cents(record.hourlyRateCents),
    lessonAmountCents: cents(record.lessonAmountCents),
    paymentStatus,
  };
}

function loadCollection<T extends StoredRecord>(
  key: string,
  normalize: (value: unknown) => T | null
): T[] {
  if (typeof window === "undefined") return [];
  const byId = new Map<string, T>();

  for (const storage of availableStorages()) {
    try {
      const parsed = readJson(storage, key);
      if (!Array.isArray(parsed)) continue;

      for (const value of parsed) {
        const item = normalize(value);
        if (!item) continue;
        const existing = byId.get(item.id);
        if (!existing || item.updatedAt > existing.updatedAt) {
          byId.set(item.id, item);
        }
      }
    } catch {
      // Se uno storage non è disponibile, prova quello successivo.
    }
  }

  return [...byId.values()];
}

function saveCollection<T>(
  key: string,
  values: T[],
  normalize: (value: unknown) => T | null
): boolean {
  if (typeof window === "undefined") return false;
  const normalized = values
    .map((value) => normalize(value))
    .filter((value): value is T => value !== null);
  const serialized = JSON.stringify(normalized);
  const storages = availableStorages();

  for (let index = 0; index < storages.length; index += 1) {
    try {
      storages[index].setItem(key, serialized);
      if (index === 0 && storages[1]) {
        try {
          storages[1].removeItem(key);
        } catch {
          // Una vecchia copia di fallback non impedisce il salvataggio principale.
        }
      }
      return true;
    } catch {
      // localStorage può essere bloccato o pieno: prova sessionStorage.
    }
  }

  return false;
}

function availableStorages(): StorageLike[] {
  if (typeof window === "undefined") return [];
  const storages: StorageLike[] = [];

  try {
    storages.push(window.localStorage);
  } catch {
    // Storage non accessibile nel browser corrente.
  }
  try {
    storages.push(window.sessionStorage);
  } catch {
    // Storage non accessibile nel browser corrente.
  }

  return storages;
}

function readJson(storage: StorageLike, key: string): unknown {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function enumValue<T extends string>(value: unknown, values: readonly T[]) {
  return typeof value === "string" && values.includes(value as T)
    ? value as T
    : null;
}

function positiveInteger(value: unknown, fallback: number, maximum: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.min(maximum, Math.round(value))
    : fallback;
}

function cents(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : 0;
}

function timestamp(value: unknown) {
  const normalized = text(value);
  return normalized && !Number.isNaN(Date.parse(normalized))
    ? normalized
    : new Date(0).toISOString();
}
