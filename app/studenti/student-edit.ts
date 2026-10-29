import type { StudentRecord } from "../data/students";

type Book = NonNullable<StudentRecord["books"]>[number];

/** The old textbook strings remain readable until Francesca edits the books. */
export function booksForEditing(student: StudentRecord): Book[] {
  if (student.books?.length) return student.books;
  return Object.values(student.textbooks).filter((title): title is string => Boolean(title))
    .map((title) => ({ title, publisher: "" }));
}

export function lastBookRemovalIsAmbiguous(student: StudentRecord): boolean {
  return booksForEditing(student).length === 1 &&
    Object.values(student.textbooks).some((value) => typeof value === "string" && value.trim());
}

export function changeBookField(student: StudentRecord, index: number, field: "title" | "publisher", value: string): StudentRecord {
  const books = booksForEditing(student);
  if (!books[index]) return student;
  return { ...student, books: books.map((book, position) => {
    if (position !== index) return book;
    const changed = { ...book, [field]: value };
    // Clearing both visible fields is an explicit removal, including older metadata.
    return changed.title.trim() || changed.publisher.trim() ? changed : { title: "", publisher: "" };
  }) };
}

export function addStudentBook(student: StudentRecord): StudentRecord {
  return { ...student, books: [...booksForEditing(student), { title: "", publisher: "" }] };
}

export function removeStudentBook(student: StudentRecord, index: number): StudentRecord {
  const books = booksForEditing(student);
  if (!books[index]) return student;
  if (lastBookRemovalIsAmbiguous(student)) return student;
  const remaining = books.filter((_, position) => position !== index);
  return { ...student, books: remaining };
}

export function prepareStudentFormSave(student: StudentRecord, id: string, editedFields: ReadonlySet<keyof StudentRecord>) {
  const existing = Boolean(student.id);
  const books = student.books?.filter((book) => book.title.trim() || book.publisher.trim() ||
    Object.keys(book).some((key) => key !== "title" && key !== "publisher"));
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
    textbooks: student.textbooks,
    updatedAt: new Date().toISOString(),
  };
  return { record, replaceFields: existing ? [...new Set<keyof StudentRecord>([
    ...editedFields,
  ])] : [] };
}
