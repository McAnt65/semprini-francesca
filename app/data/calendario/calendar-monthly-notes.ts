export const CALENDAR_MONTHLY_NOTES_STORAGE_KEY =
  "semprini:calendar:monthly-notes:v1";

export type CalendarMonthlyNotes = Record<string, string>;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_NOTE_LENGTH = 4_000;

export function loadCalendarMonthlyNotes(): CalendarMonthlyNotes {
  if (typeof window === "undefined") return {};
  const notes: CalendarMonthlyNotes = {};

  for (const storage of availableStorages()) {
    try {
      const parsed = readJson(storage, CALENDAR_MONTHLY_NOTES_STORAGE_KEY);
      if (!isRecord(parsed)) continue;

      for (const [month, value] of Object.entries(parsed)) {
        if (!(month in notes) && MONTH_KEY_PATTERN.test(month)) {
          const note = normalizeNote(value);
          if (note) notes[month] = note;
        }
      }
    } catch {
      // Se uno storage non è disponibile, prova quello successivo.
    }
  }

  return notes;
}

export function loadCalendarMonthlyNote(month: string): string {
  if (!MONTH_KEY_PATTERN.test(month)) return "";
  return loadCalendarMonthlyNotes()[month] ?? "";
}

export function saveCalendarMonthlyNote(
  month: string,
  value: string
): boolean {
  if (typeof window === "undefined" || !MONTH_KEY_PATTERN.test(month)) {
    return false;
  }

  const notes = loadCalendarMonthlyNotes();
  const note = normalizeNote(value);

  if (note) notes[month] = note;
  else delete notes[month];

  const serialized = JSON.stringify(notes);
  const storages = availableStorages();

  for (let index = 0; index < storages.length; index += 1) {
    try {
      storages[index].setItem(
        CALENDAR_MONTHLY_NOTES_STORAGE_KEY,
        serialized
      );
      if (index === 0 && storages[1]) {
        try {
          storages[1].removeItem(CALENDAR_MONTHLY_NOTES_STORAGE_KEY);
        } catch {
          // Una copia di fallback non impedisce il salvataggio principale.
        }
      }
      return true;
    } catch {
      // localStorage può essere bloccato o pieno: prova sessionStorage.
    }
  }

  return false;
}

function normalizeNote(value: unknown) {
  return typeof value === "string" ? value.slice(0, MAX_NOTE_LENGTH) : "";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
