import type { StudentRecord } from "../../data/students";

const editableFields: Array<keyof StudentRecord> = [
  "firstName", "lastName", "gender", "birthDate", "gradeClass", "section", "schoolName",
  "school", "city", "studyCourse", "phone", "whatsapp", "email", "subjects",
  "householdMembers", "address", "postalCode", "familyContacts", "primaryContactId",
  "books", "textbooks", "topicsToDeepen", "teachers", "firstImpressions", "interests",
  "passions", "preferredActivities", "personalNotes", "learningStartDate", "learningGoals",
  "lessonMode", "lessonDurationMinutes", "lessonRateCents",
];

export function prepareNarratedStudentSave(student: StudentRecord, saved: StudentRecord | null, id: string, today: string) {
  const record: StudentRecord = {
    ...student, id, status: student.status || "active",
    enrollmentDate: saved?.enrollmentDate || student.enrollmentDate || today,
    firstName: student.firstName.trim(), lastName: student.lastName.trim(),
    school: student.schoolName || student.school,
    subjects: student.subjects.map((subject) => subject.trim()).filter(Boolean),
    teachers: student.teachers?.filter((teacher) => teacher.firstName || teacher.lastName || teacher.subject || teacher.phone || teacher.email),
    familyContacts: student.familyContacts,
    primaryContactId: student.primaryContactId || "",
  };
  const replaceFields = saved ? editableFields.filter((field) => JSON.stringify(record[field]) !== JSON.stringify(saved[field])) : editableFields;
  return { record, replaceFields };
}
