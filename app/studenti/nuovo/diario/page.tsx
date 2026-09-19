"use client";

import { useEffect, useRef, useState } from "react";
import StudentDetail from "../../../components/StudentDetail";
import {
  buildStudentFromSavedDrafts,
  clearNewStudentDrafts,
  saveStoredStudent,
} from "../../../data/student-storage";
import type { StudentRecord } from "../../../data/students";

export default function NewStudentDiaryPage() {
  const hasConsolidated = useRef(false);
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (hasConsolidated.current) return;
    hasConsolidated.current = true;

    const completeStudent = buildStudentFromSavedDrafts();

    if (!completeStudent.firstName && !completeStudent.lastName) {
      queueMicrotask(() => setError("Non trovo i dati del nuovo studente."));
      return;
    }

    if (!saveStoredStudent(completeStudent)) {
      queueMicrotask(() => setError("Spazio insufficiente: prova con una fotografia più leggera."));
      return;
    }

    clearNewStudentDrafts();
    saveStoredStudent(completeStudent);
    window.history.replaceState(null, "", `/studenti/${completeStudent.id}`);
    queueMicrotask(() => setStudent(completeStudent));
  }, []);

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#efe3ce] px-6 text-center text-[#4b3024]">
        <p className="font-entry-elegant">{error}</p>
      </main>
    );
  }

  if (!student) {
    return <main className="min-h-dvh bg-[#efe3ce]" aria-label="Preparazione diario dello studente" />;
  }

  return <StudentDetail student={student} />;
}
