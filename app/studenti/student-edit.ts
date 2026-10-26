import type { StudentRecord } from "../data/students";

type Book = NonNullable<StudentRecord["books"]>[number];

/** The old textbook strings remain readable until Francesca edits the books. */
export function booksForEditing(student: StudentRecord): Book[] {
  if (student.books?.length) return student.books;
  return Object.values(student.textbooks).filter((title): title is string => Boolean(title))
    .map((title) => ({ title, publisher: "" }));
}

export function changeBookField(student: StudentRecord, index: number, field: "title" | "publisher", value: string): StudentRecord {
  const books = booksForEditing(student);
  if (!books[index]) return student;
  return { ...student, books: books.map((book, position) => position === index ? { ...book, [field]: value } : book) };
}

export function addStudentBook(student: StudentRecord): StudentRecord {
  return { ...student, books: [...booksForEditing(student), { title: "", publisher: "" }] };
}

export function removeStudentBook(student: StudentRecord, index: number): StudentRecord {
  const books = booksForEditing(student);
  if (!books[index]) return student;
  const remaining = books.filter((_, position) => position !== index);
  return { ...student, books: remaining, ...(remaining.length ? {} : { textbooks: {} }) };
}

export function prepareStudentFormSave(student: StudentRecord, id: string, editedFields: ReadonlySet<keyof StudentRecord>) {
  const existing = Boolean(student.id);
  const books = student.books?.filter((book) => book.title.trim() || book.publisher.trim());
  const clearedBooks = editedFields.has("books") && books?.length === 0;
  const record: StudentRecord = {
    ...student,
    id,
    status: student.status ?? "active",
    firstName: student.firstName.trim(),
    lastName: student.lastName.trim(),
    ...(existing ? {} : {
      whatsapp: student.whatsapp || student.phone,
      school: student.schoolName || student.school || student.schoolType || "",
      primaryParentWhatsapp: student.primaryParentWhatsapp || student.primaryParentPhone,
      secondaryParentWhatsapp: student.secondaryParentWhatsapp || student.secondaryParentPhone,
    }),
    books,
    textbooks: clearedBooks ? {} : student.textbooks,
    updatedAt: new Date().toISOString(),
  };
  return { record, replaceFields: existing ? [...new Set<keyof StudentRecord>([
    ...editedFields, ...(clearedBooks ? ["textbooks" as const] : []),
  ])] : [] };
}
