import { isKnownKey, type BrowserArchives, type RawKeys } from "./archives";

export const BACKUP_FORMAT = "registro-francesca-browser-archives";
export const BACKUP_VERSION = 1;
export type BackupPayload = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  appVersion: string;
  archives: BrowserArchives;
};
export type BackupSummary = {
  students: number; appointments: number; series: number; requests: number;
  paymentMovements: number; tariffs: number; programs: number; deletedPrograms: number;
  topics: number; subjectNotes: number; monthlyNotes: number; legacyPhotos: number;
  temporaryKeys: number; unknownKeys: number; warnings: string[];
};

export function makePayload(archives: BrowserArchives, appVersion: string): BackupPayload {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION,
    createdAt: new Date().toISOString(), appVersion, archives };
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function rawKeys(value: unknown, known: boolean): value is RawKeys {
  return record(value) && Object.entries(value).every(([key, raw]) =>
    key.startsWith("semprini:") && isKnownKey(key) === known && typeof raw === "string");
}
export function parsePayload(value: unknown): BackupPayload {
  if (!record(value) || value.format !== BACKUP_FORMAT || value.version !== BACKUP_VERSION)
    throw new Error("Formato o versione del backup non compatibile.");
  const archives = value.archives;
  if (!record(archives) || !rawKeys(archives.local, true) || !rawKeys(archives.session, true) ||
      !rawKeys(archives.unknownLocal, false) || !rawKeys(archives.unknownSession, false) ||
      !Array.isArray(archives.legacyPhotos) ||
      !archives.legacyPhotos.every((photo) => record(photo) && typeof photo.key === "string" && !!photo.key &&
        typeof photo.studentId === "string" && !!photo.studentId &&
        ["original", "vintage", "illustrated"].includes(String(photo.kind)) &&
        typeof photo.createdAt === "string" && typeof photo.mimeType === "string" &&
        typeof photo.bytes === "string" && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(photo.bytes) &&
        (photo.sourceOriginalKey === undefined || typeof photo.sourceOriginalKey === "string")) ||
      typeof value.createdAt !== "string" || Number.isNaN(Date.parse(value.createdAt)) ||
      typeof value.appVersion !== "string")
    throw new Error("Contenuto del backup non valido.");
  const photos = archives.legacyPhotos as BackupPayload["archives"]["legacyPhotos"];
  if (new Set(photos.map((photo) => photo.key)).size !== photos.length)
    throw new Error("Fotografie legacy duplicate nel backup.");
  return value as BackupPayload;
}

function parsed(local: RawKeys, session: RawKeys, key: string, warnings: string[]): unknown[] {
  const values: unknown[] = [];
  for (const [source, map] of [["locale", local], ["temporaneo", session]] as const) {
    if (!(key in map)) continue;
    try { values.push(JSON.parse(map[key])); }
    catch { warnings.push(`Archivio ${key} ${source} non leggibile.`); }
  }
  return values;
}
function countIds(values: unknown[], key: string, warnings: string[]): number {
  const ids = new Set<string>();
  for (const value of values) {
    if (!Array.isArray(value) || value.some((item) => !record(item) || typeof item.id !== "string" || !item.id)) {
      warnings.push(`Archivio ${key} non valido.`); continue;
    }
    for (const item of value) ids.add(item.id);
  }
  return ids.size;
}
function effectiveRecords(values: unknown[]): Record<string, unknown>[] {
  const byId = new Map<string, Record<string, unknown>>();
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (!record(item) || typeof item.id !== "string") continue;
      const previous = byId.get(item.id);
      if (!previous || String(item.updatedAt ?? "") > String(previous.updatedAt ?? "")) byId.set(item.id, item);
    }
  }
  return [...byId.values()];
}

/** Describes raw archives. This function never invokes an application loader that could write. */
export function summarize(payload: BackupPayload): BackupSummary {
  const { local, session, unknownLocal, unknownSession, legacyPhotos } = payload.archives;
  const warnings: string[] = [];
  const students = countIds(parsed(local, session, "semprini:students", warnings), "studenti", warnings);
  const appointmentsRaw = parsed(local, session, "semprini:calendar:appointments:v1", warnings);
  const appointments = countIds(appointmentsRaw, "lezioni", warnings);
  const series = countIds(parsed(local, session, "semprini:calendar:series:v1", warnings), "ricorrenze", warnings);
  const requests = countIds(parsed(local, session, "semprini:calendar:requests:v1", warnings), "richieste", warnings);
  const tariffValues = session["semprini:tariffs:v1:temporary-snapshot"] === "yes" &&
    session["semprini:tariffs:v1"] !== undefined
    ? [parseSingle(session["semprini:tariffs:v1"], warnings, "tariffe temporanee")]
    : parsed(local, session, "semprini:tariffs:v1", warnings);
  const tariffs = countIds(tariffValues, "tariffe", warnings);
  const entries = parsed(local, session, "semprini:materie:programmi:v1", warnings);
  const programEntries = new Map<string, Record<string, unknown>>();
  for (const envelope of entries) {
    if (!record(envelope) || envelope.version !== 1 || !Array.isArray(envelope.entries) ||
        envelope.entries.some((entry: unknown) => !record(entry) || typeof entry.id !== "string")) {
      warnings.push("Archivio programmi non valido."); continue;
    }
    for (const entry of envelope.entries) {
      const previous = programEntries.get(entry.id);
      if (!previous || String(entry.updatedAt) > String(previous.updatedAt) ||
          (entry.updatedAt === previous.updatedAt && entry.kind === "deleted"))
        programEntries.set(entry.id, entry);
    }
  }
  const catalogs = parsed(local, session, "semprini:materie:argomenti:v1", warnings);
  let topics = 0;
  for (const catalog of catalogs) {
    if (!record(catalog) || catalog.version !== 1 || !record(catalog.topics)) {
      warnings.push("Catalogo argomenti non valido."); continue;
    }
    topics = Math.max(topics, Object.values(catalog.topics).reduce<number>((sum, items) =>
      sum + (Array.isArray(items) ? items.length : 0), 0));
  }
  const monthly = parsed(local, session, "semprini:calendar:monthly-notes:v1", warnings);
  const monthlyNotes = Math.max(0, ...monthly.map((item) => record(item) ? Object.keys(item).length : 0));
  const paymentMovements = effectiveRecords(appointmentsRaw).reduce((sum, item) =>
    sum + (Array.isArray(item.paymentMovements) ? item.paymentMovements.length : 0), 0);
  return { students, appointments, series, requests, paymentMovements, tariffs,
    programs: [...programEntries.values()].filter((item) => item.kind !== "deleted").length,
    deletedPrograms: [...programEntries.values()].filter((item) => item.kind === "deleted").length, topics,
    subjectNotes: new Set([...Object.keys(local), ...Object.keys(session)].filter((key) =>
      key.startsWith("semprini:materie:v1:"))).size,
    monthlyNotes, legacyPhotos: legacyPhotos.length, temporaryKeys: Object.keys(session).length,
    unknownKeys: Object.keys(unknownLocal).length + Object.keys(unknownSession).length,
    warnings: [...new Set(warnings)] };
}
function parseSingle(raw: string, warnings: string[], label: string): unknown {
  try { return JSON.parse(raw); }
  catch { warnings.push(`Archivio ${label} non leggibile.`); return null; }
}
