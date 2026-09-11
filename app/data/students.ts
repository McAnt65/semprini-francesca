export interface StudentRecord {
  id: string;
  enrollmentDate: string;
  avatarUrl?: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  school: string;
  gradeClass: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  primaryParent: string;
  primaryParentPhone: string;
  primaryParentWhatsapp: string;
  primaryParentEmail: string;
  secondaryParent?: string;
  secondaryParentPhone?: string;
  secondaryParentWhatsapp?: string;
  subjects: string[];
  textbooks: {
    math?: string;
    physics?: string;
    chemistry?: string;
  };
  personalNotes?: string;
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
  },
];

export function getStudentById(id: string) {
  return students.find((student) => student.id === id);
}
