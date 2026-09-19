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

export const students: StudentRecord[] = [
  {
    id: "mauro-cantoni",
    enrollmentDate: "",
    firstName: "Mauro",
    lastName: "Cantoni",
    birthDate: "16/10/1965",
    school: "Liceo G. Cesare",
    gradeClass: "3ª I",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    city: "",
    primaryParent: "",
    primaryParentPhone: "",
    primaryParentWhatsapp: "",
    primaryParentEmail: "",
    secondaryParent: "",
    secondaryParentPhone: "",
    secondaryParentWhatsapp: "",
    subjects: [],
    textbooks: {
      math: "",
      physics: "",
      chemistry: "",
    },
    personalNotes: "",
    nextLesson: "",
    updatedAt: "2026-09-12T08:00:00+02:00",
  },
];

export function getStudentById(id: string) {
  return students.find((student) => student.id === id);
}
