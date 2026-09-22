import type { Tariff, TariffDraft } from "./tariff-types";
import type { LessonMode } from "../calendario/calendar-types";

export const TARIFF_STORAGE_KEY = "semprini:tariffs:v1";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const MODES: LessonMode[] = ["casa", "domicilio", "online"];

export function loadTariffs(): Tariff[] {
  if (typeof window === "undefined") return [];
  const byId = new Map<string, Tariff>();

  for (const storage of availableStorages()) {
    try {
      const raw = storage.getItem(TARIFF_STORAGE_KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;

      for (const value of parsed) {
        const tariff = normalizeTariff(value);
        if (!tariff) continue;
        const existing = byId.get(tariff.id);
        if (!existing || tariff.updatedAt > existing.updatedAt) {
          byId.set(tariff.id, tariff);
        }
      }
    } catch {
      // Prova lo storage successivo.
    }
  }

  return [...byId.values()].sort(compareTariffs);
}

export function saveTariffs(tariffs: Tariff[]): boolean {
  if (typeof window === "undefined") return false;

  const normalized = tariffs
    .map(normalizeTariff)
    .filter((value): value is Tariff => value !== null)
    .sort(compareTariffs);

  const serialized = JSON.stringify(normalized);
  const storages = availableStorages();

  for (let index = 0; index < storages.length; index += 1) {
    try {
      storages[index].setItem(TARIFF_STORAGE_KEY, serialized);
      if (index === 0 && storages[1]) {
        try {
          storages[1].removeItem(TARIFF_STORAGE_KEY);
        } catch {
          // Non bloccare il salvataggio principale.
        }
      }
      return true;
    } catch {
      // localStorage può essere pieno o bloccato: prova sessionStorage.
    }
  }

  return false;
}

export function createTariff(draft: TariffDraft, current: Tariff[]): Tariff {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    code: nextTariffCode(current),
    ...draft,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateTariff(
  tariff: Tariff,
  draft: TariffDraft
): Tariff {
  return {
    ...tariff,
    ...draft,
    updatedAt: new Date().toISOString(),
  };
}

export function nextTariffCode(tariffs: Tariff[]) {
  const used = new Set(
    tariffs
      .map((tariff) => /^T(\d+)$/i.exec(tariff.code)?.[1])
      .filter(Boolean)
      .map(Number)
  );

  let index = 1;
  while (used.has(index)) index += 1;
  return `T${index}`;
}

function normalizeTariff(value: unknown): Tariff | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;

  const id = text(record.id);
  const code = text(record.code);
  const subject = text(record.subject);
  const schoolBand = text(record.schoolBand);
  const legacyMode = text(record.mode) === "studio" ? "domicilio" : text(record.mode);
  const mode = MODES.includes(legacyMode as LessonMode)
    ? (legacyMode as LessonMode)
    : null;
  const hourlyRateCents =
    typeof record.hourlyRateCents === "number" &&
    Number.isFinite(record.hourlyRateCents) &&
    record.hourlyRateCents >= 0
      ? Math.round(record.hourlyRateCents)
      : 0;

  if (!id || !code || !subject || !schoolBand || !mode) return null;

  return {
    id,
    code,
    subject,
    schoolBand,
    mode,
    hourlyRateCents,
    active: record.active !== false,
    createdAt: timestamp(record.createdAt),
    updatedAt: timestamp(record.updatedAt),
  };
}

function compareTariffs(a: Tariff, b: Tariff) {
  const aNumber = Number(/^T(\d+)$/i.exec(a.code)?.[1] ?? Number.MAX_SAFE_INTEGER);
  const bNumber = Number(/^T(\d+)$/i.exec(b.code)?.[1] ?? Number.MAX_SAFE_INTEGER);
  return aNumber - bNumber || a.code.localeCompare(b.code);
}

function availableStorages(): StorageLike[] {
  if (typeof window === "undefined") return [];
  const storages: StorageLike[] = [];

  try {
    storages.push(window.localStorage);
  } catch {}
  try {
    storages.push(window.sessionStorage);
  } catch {}

  return storages;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function timestamp(value: unknown) {
  const normalized = text(value);
  return normalized && !Number.isNaN(Date.parse(normalized))
    ? normalized
    : new Date(0).toISOString();
}
