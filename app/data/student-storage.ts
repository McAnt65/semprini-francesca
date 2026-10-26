import type { StudentRecord } from "./students";
import { writeAndVerify, type SaveResult } from "./save-result";

export const PERSONAL_DRAFT_KEY = "semprini:new-student:personal-data";
export const SCHOOL_DRAFT_KEY = "semprini:new-student:school-subjects-books";
export const HOME_FAMILY_DRAFT_KEY = "semprini:new-student:home-family";
export const NOTES_DRAFT_KEY = "semprini:new-student:notes";
export const LEGACY_NOTES_DRAFT_KEY = "semprini:new-student:personal-notes";
export const STUDENTS_STORAGE_KEY = "semprini:students";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readJson(storage: StorageLike, key: string): unknown {
  const value = storage.getItem(key);
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function availableStorages() {
  if (typeof window === "undefined") return [] as StorageLike[];
  const storages: StorageLike[] = [];
  for (const name of ["localStorage", "sessionStorage"] as const) {
    try { storages.push(window[name]); } catch { /* The other storage may be available. */ }
  }
  return storages;
}

const narrativeFieldMap = {
  gender: "gender", studyCourse: "studyCourse", origin: "origin",
  description: "firstImpressions", passion: "passions", interests: "interests",
  freeTime: "preferredActivities", character: "character", strengths: "strengths",
  ambitions: "ambitions", preferences: "preferences", tariffId: "tariffId",
} as const satisfies Record<string, keyof StudentRecord>;

/** Maps the old form's field names to the existing, single student archive. */
export function narrativeToStudentFields(value: unknown): Partial<StudentRecord> {
  const source = asObject(value);
  return Object.fromEntries(Object.entries(narrativeFieldMap).map(([oldKey, newKey]) => [newKey, text(source[oldKey])]));
}

export function studentToNarrativeFields(student: StudentRecord) {
  return Object.fromEntries(Object.entries(narrativeFieldMap).map(([oldKey, newKey]) => [oldKey, text(student[newKey])])) as Record<keyof typeof narrativeFieldMap, string>;
}

const extraTextFields = [
  "householdMembers", "primaryContactId", "studyCourse", "gender", "origin",
  "topicsToDeepen", "learningStartDate", "learningGoals", "firstImpressions",
  "interests", "passions", "preferredActivities", "character", "strengths",
  "ambitions", "preferences", "tariffId",
] as const;

function normalizeContacts(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => {
    const contact = asObject(item);
    return {
      id: text(contact.id), firstName: text(contact.firstName), lastName: text(contact.lastName),
      relationship: text(contact.relationship), phone: text(contact.phone),
      whatsapp: text(contact.whatsapp), email: text(contact.email),
    };
  }).filter((contact) => contact.id);
}

function normalizeTeachers(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => {
    const teacher = asObject(item);
    return {
      id: text(teacher.id), firstName: text(teacher.firstName), lastName: text(teacher.lastName),
      subject: text(teacher.subject), phone: text(teacher.phone), email: text(teacher.email),
    };
  }).filter((teacher) => teacher.id);
}

function readDraft(key: string) {
  for (const storage of availableStorages()) {
    try {
      const value = readJson(storage, key);
      if (value) return asObject(value);
    } catch {
      // Prova l'archivio successivo se il browser blocca questo storage.
    }
  }
  return {};
}

function normalizeStoredStudent(value: unknown): StudentRecord | null {
  const student = asObject(value);
  if (!text(student.id) || !text(student.firstName)) return null;

  const subjects = Array.isArray(student.subjects)
    ? student.subjects.map(text).filter(Boolean)
    : [];
  const books = Array.isArray(student.books)
    ? student.books.map((book) => {
        const parsedBook = asObject(book);
        return { ...parsedBook, title: text(parsedBook.title), publisher: text(parsedBook.publisher) };
      }).filter((book) => book.title || book.publisher)
    : [];
  const textbooks = asObject(student.textbooks);

  return {
    // Preserve unknown existing fields as well, for forward compatibility.
    ...student,
    ...Object.fromEntries(extraTextFields.map((field) => [field, text(student[field]) || undefined])),
    familyContacts: normalizeContacts(student.familyContacts),
    teachers: normalizeTeachers(student.teachers),
    legacyNarrativeImported: student.legacyNarrativeImported === true || undefined,
    id: text(student.id),
    status: text(student.status) === "archived" ? "archived" : "active",
    enrollmentDate: text(student.enrollmentDate),
    avatarUrl: text(student.avatarUrl) || undefined,
    firstName: text(student.firstName),
    lastName: text(student.lastName),
    birthDate: text(student.birthDate),
    school: text(student.school),
    schoolType: text(student.schoolType),
    schoolName: text(student.schoolName),
    gradeClass: text(student.gradeClass),
    section: text(student.section),
    phone: text(student.phone),
    whatsapp: text(student.whatsapp),
    email: text(student.email),
    address: text(student.address),
    postalCode: text(student.postalCode),
    city: text(student.city),
    province: text(student.province),
    usefulReferences: text(student.usefulReferences),
    primaryParent: text(student.primaryParent),
    primaryParentPhone: text(student.primaryParentPhone),
    primaryParentWhatsapp: text(student.primaryParentWhatsapp),
    primaryParentEmail: text(student.primaryParentEmail),
    secondaryParent: text(student.secondaryParent),
    secondaryParentPhone: text(student.secondaryParentPhone),
    secondaryParentWhatsapp: text(student.secondaryParentWhatsapp),
    secondaryParentEmail: text(student.secondaryParentEmail),
    subjects,
    books,
    textbooks: {
      math: text(textbooks.math),
      physics: text(textbooks.physics),
      chemistry: text(textbooks.chemistry),
    },
    familyNotes: text(student.familyNotes),
    personalNotes: text(student.personalNotes),
    lessonMode: ["casa", "domicilio", "online"].includes(text(student.lessonMode)) ? text(student.lessonMode) as StudentRecord["lessonMode"] : undefined,
    lessonDurationMinutes: numberValue(student.lessonDurationMinutes),
    lessonRateCents: numberValue(student.lessonRateCents),
    nextLesson: text(student.nextLesson),
    updatedAt: text(student.updatedAt),
  };
}

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.values(value).some(hasValue);
  return true;
}

/** Empty defaults in older forms must not erase data they cannot edit. */
function mergeStudent(previous: Record<string, unknown>, incoming: Record<string, unknown>) {
  const merged = { ...previous };
  for (const [key, value] of Object.entries(incoming)) {
    if (!hasValue(value)) continue;
    if ((key === "familyContacts" || key === "teachers") && Array.isArray(value)) {
      const entries = new Map<string, Record<string, unknown>>();
      for (const item of Array.isArray(previous[key]) ? previous[key] : []) {
        const record = asObject(item);
        entries.set(text(record.id), record);
      }
      for (const item of value) {
        const record = asObject(item);
        const id = text(record.id);
        entries.set(id, mergeStudent(entries.get(id) || {}, record));
      }
      merged[key] = [...entries.values()];
    } else if (typeof value === "object" && !Array.isArray(value)) {
      merged[key] = mergeStudent(asObject(previous[key]), asObject(value));
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function readStudentArchive() {
  const byId = new Map<string, Record<string, unknown>>();
  const storages = availableStorages();
  let safeToWrite = storages.length > 0;
  for (const storage of storages) {
    try {
      const raw = storage.getItem(STUDENTS_STORAGE_KEY);
      if (raw === null) continue;
      const stored: unknown = JSON.parse(raw);
      if (!Array.isArray(stored)) { safeToWrite = false; continue; }
      for (const value of stored) {
        const student = normalizeStoredStudent(value);
        if (!student) { safeToWrite = false; continue; }
        if (!validContactLists(asObject(value))) safeToWrite = false;
        const rawStudent = asObject(value);
        const previous = byId.get(student.id);
        if (!previous) byId.set(student.id, rawStudent);
        else {
          const newer = text(rawStudent.updatedAt) > text(previous.updatedAt) ? rawStudent : previous;
          const older = newer === rawStudent ? previous : rawStudent;
          // Stored records can contain deliberate empty values. Only absent fields fall back.
          byId.set(student.id, { ...older, ...newer });
        }
      }
    } catch {
      // Never overwrite an unreadable or malformed archive with a partial copy.
      safeToWrite = false;
    }
  }
  return { students: [...byId.values()].map((value) => normalizeStoredStudent(value)!), storages, safeToWrite };
}

function validContactLists(student: Record<string, unknown>) {
  return ["familyContacts", "teachers"].every((key) => {
    const list = student[key];
    if (list === undefined) return true;
    if (!Array.isArray(list)) return false;
    const ids = list.map((item) => text(asObject(item).id));
    return ids.every(Boolean) && new Set(ids).size === ids.length;
  });
}

function writeStudentArchive(students: StudentRecord[], storages: StorageLike[]) {
  const serialized = JSON.stringify(students);
  for (let index = 0; index < storages.length; index += 1) {
    if (writeAndVerify(storages[index], STUDENTS_STORAGE_KEY, serialized)) {
      let persistent = false;
      try { persistent = typeof window !== "undefined" && storages[index] === window.localStorage; } catch { /* Storage denied. */ }
      return { status: persistent ? "saved" : "temporary" } as SaveResult;
    }
  }
  return { status: "failed" } as SaveResult;
}

function nextTimestamp(students: StudentRecord[]) {
  return new Date(Math.max(Date.now(), ...students.map((student) => (Date.parse(student.updatedAt || "") || 0) + 1))).toISOString();
}

export interface NarrativeRecoveryReport {
  importedIds: string[];
  pendingIds: string[];
  invalidIds: string[];
  blocked: boolean;
}

function recoverNarratives(archive: ReturnType<typeof readStudentArchive>) {
  const report: NarrativeRecoveryReport = { importedIds: [], pendingIds: [], invalidIds: [], blocked: !archive.safeToWrite };
  const timestamp = nextTimestamp(archive.students);
  const students = archive.students.map((student) => {
    if (student.legacyNarrativeImported) return student;
    let recovered = asObject(student);
    let found = false;
    for (const storage of archive.storages) {
      try {
        const raw = storage.getItem(`semprini:student-narrative:v1:${student.id}`);
        if (raw === null) continue;
        const legacy = asObject(JSON.parse(raw));
        if (legacy.version !== 1 || legacy.studentId !== student.id ||
            Object.keys(narrativeFieldMap).some((key) => legacy[key] !== undefined && typeof legacy[key] !== "string")) {
          if (!report.invalidIds.includes(student.id)) report.invalidIds.push(student.id);
          continue;
        }
        // Only missing canonical values are filled. Original legacy keys remain untouched.
        recovered = mergeStudent(asObject(narrativeToStudentFields(legacy)), recovered);
        found = true;
      } catch {
        if (!report.invalidIds.includes(student.id)) report.invalidIds.push(student.id);
      }
    }
    if (!found || report.invalidIds.includes(student.id)) return student;
    report.pendingIds.push(student.id);
    return normalizeStoredStudent({ ...recovered, legacyNarrativeImported: true, updatedAt: timestamp })!;
  });
  if (report.pendingIds.length && archive.safeToWrite) {
    if (writeStudentArchive(students, archive.storages).status !== "failed") {
      report.importedIds = report.pendingIds;
      report.pendingIds = [];
      return { students, report };
    }
    report.blocked = true;
  }
  return { students: archive.students, report };
}

/** Idempotent recovery, limited to IDs already in the main archive; never deletes sources. */
export function recoverLegacyStudentNarratives(): NarrativeRecoveryReport {
  return recoverNarratives(readStudentArchive()).report;
}

export function loadStoredStudents(): StudentRecord[] {
  return recoverNarratives(readStudentArchive()).students;
}

export function getStoredStudentById(id: string) {
  return loadStoredStudents().find((student) => student.id === id);
}

export function saveStoredStudent(
  student: Pick<StudentRecord, "id"> & Partial<StudentRecord>,
  options: { replaceFields?: Array<keyof StudentRecord>; requirePersistent?: boolean } = {},
) {
  return saveStoredStudentResult(student, options).status !== "failed";
}

export function saveStoredStudentResult(
  student: Pick<StudentRecord, "id"> & Partial<StudentRecord>,
  options: { replaceFields?: Array<keyof StudentRecord>; requirePersistent?: boolean } = {},
): SaveResult {
  const failed: SaveResult = { status: "failed" };
  const archive = readStudentArchive();
  if (!archive.safeToWrite || !text(student.id)) return failed;
  const recovery = recoverNarratives(archive);
  if (recovery.report.blocked) return failed;
  const current = recovery.students;
  const previous = current.find((item) => item.id === student.id);
  const merged = mergeStudent(asObject(previous), asObject(student));
  // Explicit replacement is available for intentional clearing/removal in future editors.
  for (const field of options.replaceFields || []) {
    if (field !== "id" && field !== "enrollmentDate" && field !== "legacyNarrativeImported") merged[field] = student[field];
  }
  if (previous?.enrollmentDate) merged.enrollmentDate = previous.enrollmentDate;
  if (!validContactLists(asObject(student)) || !validContactLists(merged)) return failed;
  const normalized = normalizeStoredStudent({ ...merged, updatedAt: nextTimestamp(current) });
  if (!normalized) return failed;
  if (normalized.primaryContactId && !normalized.familyContacts?.some((contact) => contact.id === normalized.primaryContactId)) return failed;
  const next = [normalized, ...current.filter((item) => item.id !== student.id)];
  if (options.requirePersistent) {
    try { return writeStudentArchive(next, [window.localStorage]); } catch { return failed; }
  }
  return writeStudentArchive(next, archive.storages);
}

/** Removes only explicitly named students, preserving all other archive entries. */
export function removeStoredStudentsByIds(ids: readonly string[]) {
  const archive = readStudentArchive();
  if (!archive.safeToWrite || !archive.storages.length) return false;
  const selected = new Set(ids);
  for (const storage of archive.storages) {
    try {
      const raw = storage.getItem(STUDENTS_STORAGE_KEY);
      if (raw === null) continue;
      const records: unknown = JSON.parse(raw);
      if (!Array.isArray(records)) return false;
      storage.setItem(
        STUDENTS_STORAGE_KEY,
        JSON.stringify(records.filter((item) => !selected.has(text(asObject(item).id)))),
      );
    } catch {
      return false;
    }
  }
  return true;
}

export function archiveStoredStudent(id: string) {
  return archiveStoredStudentResult(id).status !== "failed";
}

export function archiveStoredStudentResult(id: string): SaveResult {
  const student = getStoredStudentById(id);
  if (!student) return { status: "failed" };
  return saveStoredStudentResult({ ...student, status: "archived" });
}

export function restoreStoredStudent(id: string) {
  return restoreStoredStudentResult(id).status !== "failed";
}

export function restoreStoredStudentResult(id: string): SaveResult {
  const student = getStoredStudentById(id);
  if (!student) return { status: "failed" };
  return saveStoredStudentResult({ ...student, status: "active" });
}

function createStudentId(firstName: string, lastName: string) {
  const slug = `${firstName}-${lastName}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "studente";

  return `${slug}-${Date.now().toString(36)}`;
}

export function buildStudentFromSavedDrafts(): StudentRecord {
  const personal = readDraft(PERSONAL_DRAFT_KEY);
  const school = readDraft(SCHOOL_DRAFT_KEY);
  const family = readDraft(HOME_FAMILY_DRAFT_KEY);
  const currentNotes = readDraft(NOTES_DRAFT_KEY);
  const notes = Object.keys(currentNotes).length > 0
    ? currentNotes
    : readDraft(LEGACY_NOTES_DRAFT_KEY);
  const firstName = text(personal.firstName);
  const lastName = text(personal.lastName);
  const schoolType = text(school.schoolType);
  const schoolName = text(school.schoolName);
  const schoolClass = text(school.schoolClass);
  const section = text(school.section);
  const referenceContact = text(family.referenceContact)
    || text(family.referencePhone)
    || text(family.referenceWhatsapp);
  const otherContact = text(family.otherContact)
    || text(family.otherPhone)
    || text(family.otherWhatsapp);
  const subjects = Array.isArray(school.subjects)
    ? school.subjects.map(text).filter(Boolean)
    : [];
  const books = Array.isArray(school.books)
    ? school.books.map((book) => {
        const parsedBook = asObject(book);
        return { title: text(parsedBook.title), publisher: text(parsedBook.publisher) };
      }).filter((book) => book.title || book.publisher)
    : [];
  const bookLabels = books.map((book) => [book.title, book.publisher].filter(Boolean).join(" — "));

  return {
    id: createStudentId(firstName, lastName),
    status: "active",
    enrollmentDate: text(personal.studentSince),
    avatarUrl: text(personal.watercolorPreview)
      || text(personal.watercolorPhoto)
      || text(personal.photoPreview)
      || text(personal.originalPhotoPreview)
      || text(personal.photo)
      || text(personal.photoOriginal)
      || text(personal.image)
      || undefined,
    firstName,
    lastName,
    birthDate: text(personal.birthDate),
    school: schoolName || schoolType,
    schoolType,
    schoolName,
    gradeClass: [schoolClass, section && `sez. ${section}`].filter(Boolean).join(" · "),
    section,
    phone: text(personal.phone),
    whatsapp: text(personal.whatsapp) || text(personal.phone),
    email: text(personal.email),
    address: text(family.address),
    postalCode: text(family.postalCode),
    city: text(family.city),
    province: text(family.province),
    usefulReferences: text(family.usefulReferences),
    primaryParent: text(family.referenceName),
    primaryParentPhone: referenceContact,
    primaryParentWhatsapp: referenceContact,
    primaryParentEmail: text(family.referenceEmail),
    secondaryParent: text(family.otherName),
    secondaryParentPhone: otherContact,
    secondaryParentWhatsapp: otherContact,
    secondaryParentEmail: text(family.otherEmail),
    subjects,
    books,
    textbooks: {
      math: bookLabels[0] || "",
      physics: bookLabels[1] || "",
      chemistry: bookLabels[2] || "",
    },
    familyNotes: text(family.familyNotes),
    personalNotes: text(notes.personalNotes),
    lessonMode: undefined,
    lessonDurationMinutes: undefined,
    lessonRateCents: undefined,
    nextLesson: "",
    updatedAt: new Date().toISOString(),
  };
}

function numberValue(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.round(value);
}

export function clearNewStudentDrafts() {
  for (const storage of availableStorages()) {
    for (const key of [
      PERSONAL_DRAFT_KEY,
      SCHOOL_DRAFT_KEY,
      HOME_FAMILY_DRAFT_KEY,
      NOTES_DRAFT_KEY,
      LEGACY_NOTES_DRAFT_KEY,
    ]) {
      try {
        storage.removeItem(key);
      } catch {
        // Nessuna azione necessaria: il record completo è già stato salvato.
      }
    }
  }
}
