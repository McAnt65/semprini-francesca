import { CALENDAR_APPOINTMENTS_STORAGE_KEY, CALENDAR_SERIES_STORAGE_KEY } from "../../data/calendario/calendar-storage";

type ReadableStorage = Pick<Storage, "getItem">;

/** The calendar loader returns [] for missing data and read failures; keep those cases distinct in the UI. */
export function calendarReadStatus(sources: ReadableStorage[]): "ready" | "unavailable" | "invalid" {
  const keys = [CALENDAR_APPOINTMENTS_STORAGE_KEY, CALENDAR_SERIES_STORAGE_KEY];
  const values = new Map(keys.map((key) => [key, [] as string[]]));
  let accessible = 0;
  for (const source of sources) {
    try {
      const read = keys.map((key) => source.getItem(key));
      accessible += 1;
      read.forEach((raw, index) => { if (raw !== null) values.get(keys[index])?.push(raw); });
    } catch {
      // Another storage source may still contain a readable copy.
    }
  }
  if (accessible === 0) return "unavailable";
  for (const key of keys) {
    const copies = values.get(key) ?? [];
    if (copies.length && !copies.some((raw) => {
      try { return Array.isArray(JSON.parse(raw)); } catch { return false; }
    })) return "invalid";
  }
  return "ready";
}
