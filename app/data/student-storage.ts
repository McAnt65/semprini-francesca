import type { StudentRecord } from "./students";

export const PERSONAL_DRAFT_KEY = "semprini:new-student:personal-data";
export const SCHOOL_DRAFT_KEY = "semprini:new-student:school-subjects-books";
export const HOME_FAMILY_DRAFT_KEY = "semprini:new-student:home-family";
export const NOTES_DRAFT_KEY = "semprini:new-student:notes";
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
  return [window.localStorage, window.sessionStorage] as StorageLike[];
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
        return { title: text(parsedBook.title), publisher: text(parsedBook.publisher) };
      }).filter((book) => book.title || book.publisher)
    : [];
  const textbooks = asObject(student.textbooks);

  return {
    id: text(student.id),
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
    nextLesson: text(student.nextLesson),
    updatedAt: text(student.updatedAt),
  };
}

export function loadStoredStudents(): StudentRecord[] {
  const byId = new Map<string, StudentRecord>();

  for (const storage of availableStorages()) {
    try {
      const stored = readJson(storage, STUDENTS_STORAGE_KEY);
      if (!Array.isArray(stored)) continue;
      for (const value of stored) {
        const student = normalizeStoredStudent(value);
        if (student && !byId.has(student.id)) byId.set(student.id, student);
      }
    } catch {
      // L'altro storage può ancora contenere una copia valida.
    }
  }

  return [...byId.values()];
}

export function getStoredStudentById(id: string) {
  return loadStoredStudents().find((student) => student.id === id);
}

export function saveStoredStudent(student: StudentRecord) {
  const current = loadStoredStudents();
  const next = [student, ...current.filter((item) => item.id !== student.id)];
  const serialized = JSON.stringify(next);

  for (const storage of availableStorages()) {
    try {
      storage.setItem(STUDENTS_STORAGE_KEY, serialized);
      return true;
    } catch {
      // Le fotografie possono superare la quota locale: usa sessionStorage.
    }
  }

  return false;
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
  const notes = readDraft(NOTES_DRAFT_KEY);
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
    enrollmentDate: text(personal.studentSince),
    avatarUrl: text(personal.photoPreview) || text(personal.originalPhotoPreview) || undefined,
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
    nextLesson: "",
    updatedAt: new Date().toISOString(),
  };
}

export function clearNewStudentDrafts() {
  for (const storage of availableStorages()) {
    for (const key of [PERSONAL_DRAFT_KEY, SCHOOL_DRAFT_KEY, HOME_FAMILY_DRAFT_KEY, NOTES_DRAFT_KEY]) {
      try {
        storage.removeItem(key);
      } catch {
        // Nessuna azione necessaria: il record completo è già stato salvato.
      }
    }
  }
}

