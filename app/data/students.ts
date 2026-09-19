export interface StudentRecord {
  id: string;
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
  nextLesson?: string;
  updatedAt?: string;
}

// Gli studenti mostrati nel registro provengono dall'archivio reale del dispositivo.
// Il vecchio record dimostrativo "Mauro Cantoni" creava un doppione incompleto.
export const students: StudentRecord[] = [];

export function getStudentById(id: string) {
  return students.find((student) => student.id === id);
}
