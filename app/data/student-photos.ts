/** Local-only photo archive. Revisions are retained; no automatic deletion. */
export const PHOTO_DATABASE = "semprini:student-photos";
const STORE = "photos";
const PREFIX = "student-photo:v1:";
export type StudentPhotoKind = "original" | "vintage" | "illustrated";
type Photo = { key: string; studentId: string; kind: StudentPhotoKind; blob: Blob; createdAt: string; sourceOriginalKey?: string };

export async function readPhotoFile(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Scegli una fotografia JPEG, PNG o WebP. Converti prima eventuali file HEIC o HEIF.");
  }
  if (file.size > 20 * 1024 * 1024) throw new Error("La fotografia è troppo grande. Scegli un file entro 20 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new globalThis.Image();
    image.src = url;
    await image.decode();
  } catch { throw new Error("Non riesco a leggere questa fotografia. Scegli un altro file."); }
  finally { URL.revokeObjectURL(url); }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Fotografia non leggibile."));
    reader.onerror = reader.onabort = () => reject(new Error("Lettura della fotografia interrotta. Riprova."));
    reader.readAsDataURL(file);
  });
}

export function isStoredPhoto(value?: string): boolean {
  return Boolean(value?.startsWith(PREFIX));
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PHOTO_DATABASE, 1);
    let blocked = false;
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "key" }).createIndex("studentId", "studentId");
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => { blocked = true; reject(new Error("Archivio fotografie occupato. Chiudi le altre schede e riprova.")); };
    request.onsuccess = () => {
      if (blocked) { request.result.close(); return; }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

async function readPhoto(reference: string): Promise<Photo> {
  if (!isStoredPhoto(reference)) throw new Error("Riferimento fotografia non valido.");
  const db = await openDatabase();
  try {
    return await new Promise<Photo>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readonly");
      const request = transaction.objectStore(STORE).get(reference.slice(PREFIX.length));
      transaction.oncomplete = () => request.result?.blob instanceof Blob
        ? resolve(request.result) : reject(new Error("Fotografia non disponibile nell'archivio locale."));
      transaction.onabort = () => reject(transaction.error || new Error("Lettura fotografia interrotta."));
      transaction.onerror = () => reject(transaction.error);
    });
  } finally { db.close(); }
}

export async function getStudentPhoto(reference: string, studentId?: string): Promise<Blob> {
  const photo = await readPhoto(reference);
  if (studentId && photo.studentId !== studentId) throw new Error("La fotografia appartiene a un altro studente.");
  return photo.blob;
}

export async function storeStudentPhoto(studentId: string, blob: Blob, kind: StudentPhotoKind = "original", sourceOriginalKey?: string): Promise<string> {
  if (!studentId || !blob.size || !blob.type.startsWith("image/")) throw new Error("Fotografia non valida.");
  if (kind !== "original") {
    const source = sourceOriginalKey ? await readPhoto(sourceOriginalKey) : null;
    if (!source || source.studentId !== studentId || source.kind !== "original") {
      throw new Error("Fotografia originale non valida per il ritratto.");
    }
  }
  const key = `${encodeURIComponent(studentId)}/${kind}/${crypto.randomUUID()}`;
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite", { durability: "strict" });
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error || new Error("Salvataggio fotografia interrotto."));
      transaction.onerror = () => reject(transaction.error);
      transaction.objectStore(STORE).add({ key, studentId, kind, blob, createdAt: new Date().toISOString(), sourceOriginalKey } satisfies Photo);
    });
  } finally { db.close(); }
  const reference = PREFIX + key;
  const recovered = await getStudentPhoto(reference, studentId);
  const [originalBytes, recoveredBytes] = await Promise.all([blob.arrayBuffer(), recovered.arrayBuffer()]);
  const bytes = new Uint8Array(recoveredBytes);
  if (blob.type !== recovered.type || blob.size !== recovered.size || new Uint8Array(originalBytes).some((value, index) => value !== bytes[index])) {
    throw new Error("La verifica della fotografia salvata non è riuscita.");
  }
  return reference;
}

export async function getPhotoRecord(reference: string, studentId: string): Promise<Pick<Photo, "kind" | "sourceOriginalKey">> {
  const photo = await readPhoto(reference);
  if (photo.studentId !== studentId) throw new Error("La fotografia appartiene a un altro studente.");
  return { kind: photo.kind, sourceOriginalKey: photo.sourceOriginalKey };
}

export async function getLatestPhotoByKind(studentId: string, kind: StudentPhotoKind, sourceOriginalKey?: string): Promise<string | undefined> {
  const db = await openDatabase();
  try {
    return await new Promise<string | undefined>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readonly");
      const request = transaction.objectStore(STORE).index("studentId").getAll(studentId);
      transaction.oncomplete = () => {
        const matches = (request.result as Photo[]).filter((photo) => photo.kind === kind && (!sourceOriginalKey || photo.sourceOriginalKey === sourceOriginalKey));
        matches.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
        resolve(matches.length ? PREFIX + matches.at(-1)!.key : undefined);
      };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { db.close(); }
}

export function getLatestOriginalPhoto(studentId: string): Promise<string | undefined> {
  return getLatestPhotoByKind(studentId, "original");
}

/** Decodes only embedded legacy images: never downloads photographs from a service. */
export function legacyPhotoBlob(source: string): Blob {
  const match = /^data:(image\/[a-z0-9.+-]+)(;base64)?,([\s\S]*)$/i.exec(source);
  if (!match) throw new Error("Formato della fotografia precedente non supportato.");
  const content = match[2] ? atob(match[3]) : decodeURIComponent(match[3]);
  return new Blob([Uint8Array.from(content, (char) => char.charCodeAt(0))], { type: match[1] });
}
