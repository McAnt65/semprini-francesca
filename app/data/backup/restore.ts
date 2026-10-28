import { addMissingLegacyPhotos, collectArchives, isKnownKey, type BrowserArchives, type RawKeys } from "./archives";
import { normalizeCalendarAppointment, normalizeCalendarRequest, normalizeCalendarSeries } from "../calendario/calendar-storage";
import { normalizeTariff } from "../tariffario/tariff-storage";
import { readProgramArchive } from "../../materie/programmi/program-storage";
import { readTopicCatalog } from "../../materie/topic-catalog";
import { parsePayload, type BackupPayload } from "./format";

const collections: Record<string, (item: unknown) => boolean> = {
  "semprini:students": (item) => !!item && typeof item === "object" &&
    typeof (item as { id?: unknown }).id === "string" && !!(item as { id: string }).id &&
    typeof (item as { firstName?: unknown }).firstName === "string" && !!(item as { firstName: string }).firstName.trim(),
  "semprini:calendar:appointments:v1": (item) => !!normalizeCalendarAppointment(item),
  "semprini:calendar:series:v1": (item) => !!normalizeCalendarSeries(item),
  "semprini:calendar:requests:v1": (item) => !!normalizeCalendarRequest(item),
  "semprini:tariffs:v1": (item) => !!normalizeTariff(item),
};
const operationalCollections = ["semprini:students", "semprini:calendar:appointments:v1",
  "semprini:calendar:series:v1", "semprini:calendar:requests:v1",
  "semprini:tariffs:v1"];
const PROGRAMS = "semprini:materie:programmi:v1";
const MONTHLY = "semprini:calendar:monthly-notes:v1";
const TARIFFS = "semprini:tariffs:v1";
const SNAPSHOT = "semprini:tariffs:v1:temporary-snapshot";

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function parse(raw: string): unknown {
  try { return JSON.parse(raw); }
  catch { throw new Error("Archivio del backup non leggibile: ripristino interrotto."); }
}
function validateMap(map: RawKeys): void {
  for (const [key, raw] of Object.entries(map)) {
    if (key.startsWith("semprini:materie:v1:")) continue; // plain text
    if (key === SNAPSHOT) {
      if (raw !== "yes") throw new Error("Marcatore delle tariffe temporanee non valido.");
      continue;
    }
    const value = parse(raw);
    if (collections[key]) {
      if (!Array.isArray(value) || !value.every(collections[key]))
        throw new Error("Archivio del backup non valido: ripristino interrotto.");
    } else if (key === PROGRAMS) {
      const read = readProgramArchive([{ storage: { getItem: () => raw, setItem: () => {}, removeItem: () => {} }, persistent: true }]);
      if (read.status !== "ready") throw new Error("Archivio programmi non valido: ripristino interrotto.");
    } else if (key === "semprini:materie:argomenti:v1") {
      if (readTopicCatalog({ getItem: () => raw }).status !== "ready")
        throw new Error("Catalogo argomenti non valido: ripristino interrotto.");
    } else if (key === MONTHLY) {
      if (!object(value) || Object.entries(value).some(([month, note]) =>
        !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || typeof note !== "string"))
        throw new Error("Note mensili non valide: ripristino interrotto.");
    } else if (!object(value)) {
      throw new Error("Archivio del backup non valido: ripristino interrotto.");
    }
  }
}

function mergeById(localRaw: string | undefined, sessionRaw: string | undefined, key: string): string | undefined {
  if (!localRaw && !sessionRaw) return undefined;
  const byId = new Map<string, Record<string, unknown>>();
  for (const raw of [localRaw, sessionRaw]) {
    if (!raw) continue;
    for (const item of parse(raw) as Record<string, unknown>[]) {
      const id = String(item.id);
      const old = byId.get(id);
      if (!old) byId.set(id, item);
      else {
        const newer = String(item.updatedAt ?? "") > String(old.updatedAt ?? "") ? item : old;
        byId.set(id, key === "semprini:students" ? { ...(newer === item ? old : item), ...newer } : newer);
      }
    }
  }
  return JSON.stringify([...byId.values()]);
}
function mergePrograms(localRaw?: string, sessionRaw?: string): string | undefined {
  if (!localRaw && !sessionRaw) return undefined;
  const byId = new Map<string, Record<string, unknown>>();
  for (const raw of [localRaw, sessionRaw]) {
    if (!raw) continue;
    const envelope = parse(raw) as { entries: Record<string, unknown>[] };
    for (const entry of envelope.entries) {
      const id = String(entry.id), prior = byId.get(id);
      if (!prior || String(entry.updatedAt) > String(prior.updatedAt) ||
          (entry.updatedAt === prior.updatedAt && entry.kind === "deleted")) byId.set(id, entry);
    }
  }
  return JSON.stringify({ version: 1, entries: [...byId.values()] });
}

export type RestorePlan = { local: RawKeys; session: RawKeys; promotedKeys: string[] };
/** The file retains both original copies; the operational winner is made persistent on the new device. */
export function prepareRestore(value: BackupPayload): RestorePlan {
  const payload = parsePayload(value);
  const local = { ...payload.archives.local }, session = { ...payload.archives.session };
  validateMap(local); validateMap(session);
  const promotedKeys: string[] = [];
  for (const key of operationalCollections) {
    if (!(key in session)) continue;
    local[key] = key === TARIFFS && session[SNAPSHOT] === "yes"
      ? session[key] : mergeById(local[key], session[key], key)!;
    delete session[key];
    promotedKeys.push(key);
  }
  delete session[SNAPSHOT];
  if (PROGRAMS in session) {
    local[PROGRAMS] = mergePrograms(local[PROGRAMS], session[PROGRAMS])!;
    delete session[PROGRAMS]; promotedKeys.push(PROGRAMS);
  }
  if (MONTHLY in session) {
    local[MONTHLY] = JSON.stringify({ ...(parse(session[MONTHLY]) as RawKeys),
      ...(local[MONTHLY] ? parse(local[MONTHLY]) as RawKeys : {}) });
    delete session[MONTHLY]; promotedKeys.push(MONTHLY);
  }
  for (const key of Object.keys(session)) {
    if (key.startsWith("semprini:new-student:") || key.startsWith("semprini:new-lesson-draft:")) continue;
    if (key.startsWith("semprini:student-narrative:v1:") && key in local) {
      // Legacy recovery reads both copies and fills only fields absent from the student.
      // Keep the local fields first, including any additional fields from the session copy.
      local[key] = JSON.stringify({ ...(parse(session[key]) as RawKeys),
        ...(parse(local[key]) as RawKeys) });
    } else if (!(key in local)) local[key] = session[key];
    delete session[key]; promotedKeys.push(key);
  }
  return { local, session, promotedKeys };
}

function currentKnown(storage: Storage): RawKeys {
  const result: RawKeys = {};
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && isKnownKey(key)) {
      const value = storage.getItem(key);
      if (value === null) throw new Error("Archivio cambiato durante il ripristino.");
      result[key] = value;
    }
  }
  return result;
}
function writeAndCheck(storage: Storage, target: RawKeys): void {
  // Replace values first. Old keys are removed only after all new values can be read back.
  for (const [key, value] of Object.entries(target)) {
    if (storage.getItem(key) !== value) storage.setItem(key, value);
    if (storage.getItem(key) !== value) throw new Error("Verifica della scrittura non riuscita.");
  }
  for (const key of Object.keys(currentKnown(storage))) if (!(key in target)) storage.removeItem(key);
  const actual = currentKnown(storage);
  if (JSON.stringify(Object.entries(actual).sort()) !== JSON.stringify(Object.entries(target).sort()))
    throw new Error("Verifica finale degli archivi non riuscita.");
}

/** Caller must have downloaded a safety copy and explicitly confirmed replacement. */
export async function restoreArchives(value: BackupPayload, expectedCurrent?: BrowserArchives): Promise<RestorePlan> {
  const plan = prepareRestore(value);
  const before = await collectArchives();
  if (expectedCurrent && JSON.stringify(before) !== JSON.stringify(expectedCurrent))
    throw new Error("Gli archivi correnti sono cambiati: crea una nuova copia di sicurezza.");
  // Preserve existing photographs. Added legacy images are never deleted, even on a failed restore.
  try { await addMissingLegacyPhotos(value.archives.legacyPhotos); }
  catch {
    throw new Error("Fotografie legacy non ripristinate completamente. Nessun archivio operativo è stato sostituito; eventuali Blob già aggiunti restano conservati.");
  }
  if (JSON.stringify(currentKnown(window.localStorage)) !== JSON.stringify(before.local) ||
      JSON.stringify(currentKnown(window.sessionStorage)) !== JSON.stringify(before.session))
    throw new Error("Gli archivi correnti sono cambiati durante il ripristino. Nessun archivio operativo è stato sostituito.");
  try {
    writeAndCheck(window.localStorage, plan.local);
    writeAndCheck(window.sessionStorage, plan.session);
    return plan;
  } catch {
    try {
      writeAndCheck(window.localStorage, before.local);
      writeAndCheck(window.sessionStorage, before.session);
    } catch {
      throw new Error("Ripristino interrotto; ritorno automatico non verificato. Conserva il file di sicurezza e non inserire nuovi dati prima di una verifica. Eventuali Blob legacy già aggiunti restano conservati.");
    }
    throw new Error("Ripristino interrotto. Gli archivi precedenti sono stati verificati dopo il recupero. Eventuali Blob legacy già aggiunti restano conservati.");
  }
}
