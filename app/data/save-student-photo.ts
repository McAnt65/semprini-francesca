import type { StudentRecord } from "./students";
import { getStoredStudentById, saveStoredStudentResult } from "./student-storage";
import type { SaveResult } from "./save-result";
import { getStudentPhoto, isStoredPhoto, legacyPhotoBlob, storeStudentPhoto } from "./student-photos";

export const PHOTO_SAVE_ERROR = "Salvataggio non riuscito: verifica lo spazio disponibile e che il browser consenta l'archiviazione locale. La fotografia selezionata resta disponibile: puoi riprovare.";

/** Commit image first, verify it, then persist the small reference with the same student ID. */
export async function saveStudentWithPhoto(student: StudentRecord, options: { replaceFields?: Array<keyof StudentRecord> } = {}): Promise<boolean> {
  return (await saveStudentWithPhotoResult(student, options)).status !== "failed";
}

export async function saveStudentWithPhotoResult(student: StudentRecord, options: { replaceFields?: Array<keyof StudentRecord> } = {}): Promise<SaveResult> {
  try {
    const previous = getStoredStudentById(student.id);
    // Preserve the previous original before replacing its legacy data URL.
    if (previous?.avatarUrl?.startsWith("data:image/") && previous.avatarUrl !== student.avatarUrl) {
      await storeStudentPhoto(student.id, legacyPhotoBlob(previous.avatarUrl));
    }
    let avatarUrl = student.avatarUrl;
    if (avatarUrl?.startsWith("data:image/")) {
      avatarUrl = await storeStudentPhoto(student.id, legacyPhotoBlob(avatarUrl));
    } else if (avatarUrl && isStoredPhoto(avatarUrl)) {
      await getStudentPhoto(avatarUrl, student.id);
    } else if (avatarUrl?.startsWith("blob:")) {
      // Temporary preview URLs must never enter the student archive.
      return { status: "failed" };
    }
    return saveStoredStudentResult({ ...student, avatarUrl }, { ...options, requirePersistent: Boolean(avatarUrl) });
  } catch {
    // Keep the caller's selected photo and the previous record available for retry.
    return { status: "failed" };
  }
}
