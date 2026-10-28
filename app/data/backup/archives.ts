/** Browser archives only. No application selector is called while collecting a backup. */
export type RawKeys = Record<string, string>;
export type LegacyPhoto = {
  key: string;
  studentId: string;
  kind: "original" | "vintage" | "illustrated";
  createdAt: string;
  sourceOriginalKey?: string;
  mimeType: string;
  bytes: string;
};
export type BrowserArchives = {
  local: RawKeys;
  session: RawKeys;
  unknownLocal: RawKeys;
  unknownSession: RawKeys;
  legacyPhotos: LegacyPhoto[];
};

export const PHOTO_DATABASE = "semprini:student-photos";
const PHOTO_STORE = "photos";
const exactKeys = new Set([
  "semprini:students", "semprini:calendar:appointments:v1", "semprini:calendar:series:v1",
  "semprini:calendar:requests:v1", "semprini:calendar:monthly-notes:v1",
  "semprini:tariffs:v1", "semprini:tariffs:v1:temporary-snapshot",
  "semprini:materie:programmi:v1", "semprini:materie:argomenti:v1",
  "semprini:preferences:v1", "semprini:assistenza:v1",
  "semprini:test-dati:manifest:v1", "semprini:test-dati:trasferimento:v1",
]);
const prefixes = ["semprini:student-narrative:v1:", "semprini:new-student:",
  "semprini:new-lesson-draft:", "semprini:materie:v1:"];
export function isKnownKey(key: string): boolean {
  return exactKeys.has(key) || prefixes.some((prefix) => key.startsWith(prefix));
}

function collectStorage(storage: Storage): { known: RawKeys; unknown: RawKeys } {
  const known: RawKeys = {}, unknown: RawKeys = {};
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key === null) throw new Error("Elenco degli archivi cambiato durante la lettura.");
    if (!key.startsWith("semprini:")) continue;
    const value = storage.getItem(key);
    if (value === null) throw new Error("Un archivio è cambiato durante la lettura.");
    (isKnownKey(key) ? known : unknown)[key] = value;
  }
  // An export must not silently combine values from different instants.
  const seen = Object.keys({ ...known, ...unknown }).sort();
  const current: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith("semprini:")) current.push(key);
  }
  if (JSON.stringify(seen) !== JSON.stringify(current.sort()) ||
      seen.some((key) => storage.getItem(key) !== (known[key] ?? unknown[key]))) {
    throw new Error("Gli archivi sono cambiati durante la lettura. Riprova.");
  }
  return { known, unknown };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}
export function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function openPhotoDatabase(version?: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = version === undefined ? indexedDB.open(PHOTO_DATABASE) : indexedDB.open(PHOTO_DATABASE, version);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(PHOTO_STORE))
        request.result.createObjectStore(PHOTO_STORE, { keyPath: "key" }).createIndex("studentId", "studentId");
    };
    request.onerror = () => reject(new Error("Archivio fotografico legacy non leggibile."));
    request.onblocked = () => reject(new Error("Archivio fotografico occupato: chiudi altre schede e riprova."));
    request.onsuccess = () => resolve(request.result);
  });
}

async function collectPhotos(): Promise<LegacyPhoto[]> {
  if (typeof indexedDB === "undefined" || typeof indexedDB.databases !== "function")
    throw new Error("Questo browser non permette di verificare l'archivio fotografico legacy.");
  const databases = await indexedDB.databases();
  if (!databases.some((entry) => entry.name === PHOTO_DATABASE)) return [];
  const db = await openPhotoDatabase();
  try {
    if (db.version !== 1 || !db.objectStoreNames.contains(PHOTO_STORE))
      throw new Error("Versione dell'archivio fotografico legacy non riconosciuta.");
    const records = await new Promise<unknown[]>((resolve, reject) => {
      const transaction = db.transaction(PHOTO_STORE, "readonly");
      const request = transaction.objectStore(PHOTO_STORE).getAll();
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = transaction.onabort = () => reject(new Error("Lettura delle fotografie legacy interrotta."));
    });
    const photos: LegacyPhoto[] = [];
    for (const value of records) {
      if (!value || typeof value !== "object") throw new Error("Fotografia legacy non leggibile.");
      const item = value as Record<string, unknown>;
      if (typeof item.key !== "string" || !item.key || typeof item.studentId !== "string" ||
          !["original", "vintage", "illustrated"].includes(String(item.kind)) ||
          typeof item.createdAt !== "string" || !(item.blob instanceof Blob))
        throw new Error("Fotografia legacy non leggibile.");
      photos.push({ key: item.key, studentId: item.studentId,
        kind: item.kind as LegacyPhoto["kind"], createdAt: item.createdAt,
        ...(typeof item.sourceOriginalKey === "string" ? { sourceOriginalKey: item.sourceOriginalKey } : {}),
        mimeType: item.blob.type, bytes: bytesToBase64(new Uint8Array(await item.blob.arrayBuffer())) });
    }
    return photos;
  } finally { db.close(); }
}

export async function collectArchives(): Promise<BrowserArchives> {
  const local = collectStorage(window.localStorage);
  const session = collectStorage(window.sessionStorage);
  const legacyPhotos = await collectPhotos();
  // Check again after the asynchronous IndexedDB read.
  if (JSON.stringify(local) !== JSON.stringify(collectStorage(window.localStorage)) ||
      JSON.stringify(session) !== JSON.stringify(collectStorage(window.sessionStorage)))
    throw new Error("Gli archivi sono cambiati durante la lettura. Riprova.");
  return { local: local.known, session: session.known, unknownLocal: local.unknown,
    unknownSession: session.unknown, legacyPhotos };
}

export async function addMissingLegacyPhotos(photos: LegacyPhoto[]): Promise<void> {
  if (!photos.length) return;
  const db = await openPhotoDatabase(1);
  try {
    if (db.version !== 1 || !db.objectStoreNames.contains(PHOTO_STORE))
      throw new Error("Archivio fotografico legacy non compatibile.");
    for (const photo of photos) {
      const expected = base64ToBytes(photo.bytes);
      const existing = await new Promise<unknown>((resolve, reject) => {
        const transaction = db.transaction(PHOTO_STORE, "readonly");
        const request = transaction.objectStore(PHOTO_STORE).get(photo.key);
        transaction.oncomplete = () => resolve(request.result);
        transaction.onerror = transaction.onabort = () => reject(new Error("Verifica delle fotografie legacy non riuscita."));
      });
      if (existing) {
        const saved = existing as { studentId?: string; kind?: string; createdAt?: string;
          sourceOriginalKey?: string; blob?: Blob };
        if (saved.studentId !== photo.studentId || saved.kind !== photo.kind ||
            saved.createdAt !== photo.createdAt || saved.sourceOriginalKey !== photo.sourceOriginalKey ||
            !(saved.blob instanceof Blob) || saved.blob.type !== photo.mimeType) {
          throw new Error("Una fotografia legacy ha lo stesso ID ma un contenuto diverso.");
        }
        const actual = new Uint8Array(await saved.blob.arrayBuffer());
        if (actual.length !== expected.length || actual.some((byte, index) => byte !== expected[index]))
          throw new Error("Una fotografia legacy ha lo stesso ID ma un contenuto diverso.");
        continue;
      }
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(PHOTO_STORE, "readwrite");
        transaction.objectStore(PHOTO_STORE).add({ key: photo.key, studentId: photo.studentId,
          kind: photo.kind, createdAt: photo.createdAt, sourceOriginalKey: photo.sourceOriginalKey,
          blob: new Blob([expected], { type: photo.mimeType }) });
        transaction.oncomplete = () => resolve();
        transaction.onerror = transaction.onabort = () => reject(new Error("Ripristino delle fotografie legacy non riuscito."));
      });
    }
  } finally { db.close(); }
}
