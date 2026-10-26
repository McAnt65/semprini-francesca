// Compatibility API: all new reads/writes use the main student archive.
// Legacy localStorage keys are retained as recoverable originals by student-storage.
import { getStoredStudentById, narrativeToStudentFields, saveStoredStudent, studentToNarrativeFields } from "../../data/student-storage";
export interface StudentNarrative {
  gender: string;
  studyCourse: string;
  origin: string;
  description: string;
  passion: string;
  interests: string;
  freeTime: string;
  character: string;
  strengths: string;
  ambitions: string;
  preferences: string;
  tariffId: string;
}
export function saveNarrative(id: string, narrative: StudentNarrative): boolean {
  if (!getStoredStudentById(id)) return false;
  return saveStoredStudent({ id, ...narrativeToStudentFields(narrative) });
}
export function loadNarrative(id: string): StudentNarrative | null {
  const student = getStoredStudentById(id);
  return student ? studentToNarrativeFields(student) : null;
}
