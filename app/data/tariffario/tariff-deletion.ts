import { toLocalDate, toLocalTime } from "../calendario/calendar-dates";
import {
  CALENDAR_APPOINTMENTS_STORAGE_KEY,
  CALENDAR_REQUESTS_STORAGE_KEY,
  CALENDAR_SERIES_STORAGE_KEY,
} from "../calendario/calendar-storage";
import { STUDENTS_STORAGE_KEY } from "../student-storage";
import { loadTariffs, saveTariffsResult } from "./tariff-storage";

export interface TariffUsage {
  students: number;
  historicalLessons: number;
  futureLessons: number;
  futureSeries: number;
  futureRequests: number;
  unreadableArchive: boolean;
}

type RecordValue = Record<string, unknown>;

function readArchive(key: string): RecordValue[] | null {
  if (typeof window === "undefined") return null;
  const records: RecordValue[] = [];
  let accessible = false;
  for (const name of ["localStorage", "sessionStorage"] as const) {
    let storage: Storage;
    try { storage = window[name]; } catch { continue; }
    accessible = true;
    try {
      const raw = storage.getItem(key);
      if (raw === null) continue;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.some((item) => !item || typeof item !== "object" || Array.isArray(item))) return null;
      records.push(...parsed as RecordValue[]);
    } catch { return null; }
  }
  return accessible ? records : null;
}

function uniqueReferences(records: RecordValue[], tariffId: string) {
  const byId = new Map<string, RecordValue>();
  records.forEach((record, index) => {
    if (record.tariffId !== tariffId) return;
    byId.set(typeof record.id === "string" ? record.id : `unknown-${index}`, record);
  });
  return [...byId.values()];
}

export function inspectTariffUsage(tariffId: string, now = new Date()): TariffUsage {
  const students = readArchive(STUDENTS_STORAGE_KEY);
  const appointments = readArchive(CALENDAR_APPOINTMENTS_STORAGE_KEY);
  const series = readArchive(CALENDAR_SERIES_STORAGE_KEY);
  const requests = readArchive(CALENDAR_REQUESTS_STORAGE_KEY);
  if (!students || !appointments || !series || !requests) {
    return { students: 0, historicalLessons: 0, futureLessons: 0, futureSeries: 0, futureRequests: 0, unreadableArchive: true };
  }
  const today = toLocalDate(now);
  const time = toLocalTime(now);
  const relatedLessons = uniqueReferences(appointments, tariffId);
  const futureLessons = relatedLessons.filter((item) =>
    item.status !== "annullata" && item.status !== "svolta" &&
    (typeof item.date !== "string" || item.date > today || (item.date === today && (typeof item.startTime !== "string" || item.startTime >= time))));
  const futureSeries = uniqueReferences(series, tariffId).filter((item) =>
    item.status !== "annullata" && item.status !== "svolta" &&
    (typeof (item.recurrence as RecordValue | undefined)?.endsOn !== "string" ||
      (item.recurrence as RecordValue).endsOn! >= today));
  const futureRequests = uniqueReferences(requests, tariffId).filter((item) =>
    item.status !== "annullata" &&
    (typeof item.proposedDate !== "string" || item.proposedDate >= today));
  return {
    students: uniqueReferences(students, tariffId).length,
    historicalLessons: relatedLessons.length - futureLessons.length,
    futureLessons: futureLessons.length,
    futureSeries: futureSeries.length,
    futureRequests: futureRequests.length,
    unreadableArchive: false,
  };
}

export function deleteTariffResult(tariffId: string):
  { status: "saved" | "temporary" | "failed" | "blocked" | "missing"; usage: TariffUsage } {
  const usage = inspectTariffUsage(tariffId);
  if (usage.unreadableArchive || usage.students || usage.futureLessons || usage.futureSeries || usage.futureRequests) {
    return { status: "blocked", usage };
  }
  const tariffs = loadTariffs();
  if (!tariffs.some((item) => item.id === tariffId)) return { status: "missing", usage };
  const result = saveTariffsResult(tariffs.filter((item) => item.id !== tariffId));
  return { ...result, usage };
}
