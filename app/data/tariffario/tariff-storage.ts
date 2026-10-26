import type { LessonFormat, Tariff, TariffDraft } from "./tariff-types";
import type { LessonMode } from "../calendario/calendar-types";
import { writeAndVerify, type SaveResult } from "../save-result";

export const TARIFF_STORAGE_KEY = "semprini:tariffs:v1";
const TEMPORARY_SNAPSHOT_KEY = "semprini:tariffs:v1:temporary-snapshot";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type AvailableStorage = { storage: StorageLike; persistent: boolean };

const MODES: LessonMode[] = ["casa", "domicilio", "online"];
const FORMATS: LessonFormat[] = ["singola", "gruppo"];

export function loadTariffs(): Tariff[] {
  if (typeof window === "undefined") return [];
  const byId = new Map<string, Tariff>();
  const storages = availableStorages();
  let selected = storages;
  try {
    const temporary = storages.find((item) => !item.persistent);
    const raw = temporary?.storage.getItem(TARIFF_STORAGE_KEY);
    if (temporary?.storage.getItem(TEMPORARY_SNAPSHOT_KEY) === "yes" && raw &&
        Array.isArray(JSON.parse(raw))) selected = [temporary];
  } catch { /* Read the other available archive. */ }

  for (const { storage } of selected) {
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
  return saveTariffsResult(tariffs).status !== "failed";
}

export function saveTariffsResult(tariffs: Tariff[]): SaveResult {
  if (typeof window === "undefined") return { status: "failed" };

  const normalized = tariffs
    .map(normalizeTariff)
    .filter((value): value is Tariff => value !== null)
    .sort(compareTariffs);

  const serialized = JSON.stringify(normalized);
  const storages = availableStorages();

  for (const { storage, persistent } of storages) {
    let previous: string | null = null;
    try { previous = storage.getItem(TARIFF_STORAGE_KEY); } catch { continue; }
    if (writeAndVerify(storage, TARIFF_STORAGE_KEY, serialized)) {
      if (persistent) {
        for (const fallback of storages.filter((item) => !item.persistent)) {
          try {
            fallback.storage.removeItem(TARIFF_STORAGE_KEY);
            fallback.storage.removeItem(TEMPORARY_SNAPSHOT_KEY);
          } catch {
            // Non bloccare il salvataggio principale.
          }
        }
      }
      if (!persistent) {
        let marked = false;
        try { marked = storage.getItem(TEMPORARY_SNAPSHOT_KEY) === "yes"; } catch {}
        if (!marked) marked = writeAndVerify(storage, TEMPORARY_SNAPSHOT_KEY, "yes");
        if (!marked) {
          try {
            if (previous === null) storage.removeItem(TARIFF_STORAGE_KEY);
            else storage.setItem(TARIFF_STORAGE_KEY, previous);
          } catch { /* The persistent archive is still untouched. */ }
          return { status: "failed" };
        }
      }
      return { status: persistent ? "saved" : "temporary" };
    }
  }

  return { status: "failed" };
}

export function createTariff(draft: TariffDraft): Tariff {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    ...draft,
    createdAt: now,
    updatedAt: now,
  };
}

export function isTariffCodeAvailable(code: string, tariffs: Tariff[], exceptId?: string) {
  const normalized = code.trim().toLocaleUpperCase("it-IT");
  return /^[A-Z0-9][A-Z0-9_-]{0,11}$/.test(normalized) &&
    !tariffs.some((item) => item.id !== exceptId && item.code.toLocaleUpperCase("it-IT") === normalized);
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
  const rawFormat = text(record.format) || "singola";
  const format = FORMATS.includes(rawFormat as LessonFormat)
    ? (rawFormat as LessonFormat)
    : "singola";
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
    format,
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

function availableStorages(): AvailableStorage[] {
  if (typeof window === "undefined") return [];
  const storages: AvailableStorage[] = [];

  try {
    storages.push({ storage: window.localStorage, persistent: true });
  } catch {}
  try {
    storages.push({ storage: window.sessionStorage, persistent: false });
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
