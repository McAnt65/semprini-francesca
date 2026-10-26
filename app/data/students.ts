export interface StudentFamilyContact {
  id: string;
  firstName: string;
  lastName: string;
  relationship?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
}

export interface StudentTeacher {
  id: string;
  firstName: string;
  lastName: string;
  subject: string;
  phone?: string;
  email?: string;
}

export interface StudentRecord {
  id: string;
  status?: "active" | "archived";
  enrollmentDate: string;
  avatarUrl?: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  school: string;
  schoolType?: string;
  schoolName?: string;
  gradeClass: string;
  section?: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  postalCode?: string;
  city: string;
  province?: string;
  usefulReferences?: string;
  primaryParent: string;
  primaryParentPhone: string;
  primaryParentWhatsapp: string;
  primaryParentEmail: string;
  secondaryParent?: string;
  secondaryParentPhone?: string;
  secondaryParentWhatsapp?: string;
  secondaryParentEmail?: string;
  subjects: string[];
  books?: Array<{ title: string; publisher: string }>;
  textbooks: {
    math?: string;
    physics?: string;
    chemistry?: string;
  };
  personalNotes?: string;
  familyNotes?: string;
  householdMembers?: string;
  familyContacts?: StudentFamilyContact[];
  primaryContactId?: string;
  teachers?: StudentTeacher[];
  studyCourse?: string;
  gender?: string;
  origin?: string;
  topicsToDeepen?: string;
  learningStartDate?: string;
  learningGoals?: string;
  firstImpressions?: string;
  interests?: string;
  passions?: string;
  preferredActivities?: string;
  character?: string;
  strengths?: string;
  ambitions?: string;
  preferences?: string;
  tariffId?: string;
  /** Set only when the legacy narrative has been recovered into this record. */
  legacyNarrativeImported?: boolean;
  lessonMode?: "casa" | "domicilio" | "online";
  lessonDurationMinutes?: number;
  lessonRateCents?: number;
  nextLesson?: string;
  updatedAt?: string;
}

// Gli studenti mostrati nel registro provengono dall'archivio reale del dispositivo.
// Il vecchio record dimostrativo "Mauro Cantoni" creava un doppione incompleto.
export const students: StudentRecord[] = [];

export function getStudentById(id: string) {
  return students.find((student) => student.id === id);
}
