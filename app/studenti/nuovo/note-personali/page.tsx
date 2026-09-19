"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildStudentFromSavedDrafts,
  clearNewStudentDrafts,
  NOTES_DRAFT_KEY,
  saveStoredStudent,
} from "../../../data/student-storage";

export default function NewStudentNotesPage() {
  const router = useRouter();
  const [personalNotes, setPersonalNotes] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(NOTES_DRAFT_KEY)
        ?? window.sessionStorage.getItem(NOTES_DRAFT_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { personalNotes?: unknown };
      if (typeof parsed.personalNotes === "string") {
        queueMicrotask(() => setPersonalNotes(parsed.personalNotes as string));
      }
    } catch {
      // La pagina resta utilizzabile anche se una vecchia bozza non è valida.
    }
  }, []);

  function saveNotes() {
    const serialized = JSON.stringify({ personalNotes });

    try {
      window.localStorage.setItem(NOTES_DRAFT_KEY, serialized);
      return true;
    } catch {
      try {
        window.sessionStorage.setItem(NOTES_DRAFT_KEY, serialized);
        return true;
      } catch {
        return false;
      }
    }
  }

  function goBack() {
    saveNotes();
    router.back();
  }

  function finishStudent() {
    if (!saveNotes()) {
      setMessage("Impossibile salvare le note");
      return;
    }

    const student = buildStudentFromSavedDrafts();

    if (!student.firstName && !student.lastName) {
      setMessage("Inserisci almeno il nome dello studente nei dati personali");
      return;
    }

    if (!saveStoredStudent(student)) {
      setMessage("Spazio insufficiente: prova con una fotografia più leggera");
      return;
    }

    clearNewStudentDrafts();
    // Dopo aver liberato lo spazio delle bozze, assicura una copia persistente
    // anche quando il primo salvataggio era dovuto ripiegare su sessionStorage.
    saveStoredStudent(student);
    router.push(`/studenti/${student.id}`);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#efe3ce] px-6 text-[#4b3024]">
      <section className="w-full max-w-[430px] rounded-[28px] border border-[#9b7658]/35 bg-[#f8ecd6] px-8 py-12 text-center shadow-[0_8px_24px_rgba(72,48,30,0.12)]">
        <h1 className="font-field-label text-2xl text-[#6f1723]">Note personali</h1>
        <p className="mt-3 font-entry-elegant text-sm text-[#6f5745]">Ultima pagina del profilo dello studente</p>

        <textarea
          value={personalNotes}
          onChange={(event) => {
            setPersonalNotes(event.target.value);
            setMessage("");
          }}
          aria-label="Note personali dello studente"
          placeholder="Annotazioni, preferenze, difficoltà, obiettivi…"
          className="mt-7 min-h-44 w-full resize-y rounded-2xl border border-[#9b7658]/30 bg-[#fffaf0]/55 px-5 py-4 text-left font-entry-elegant text-[#5b3a2d] outline-none placeholder:text-[#8f735d]/55 focus:border-[#7d5942]/55"
        />

        <div className="mt-8 flex items-center justify-center gap-4">
          <button type="button" onClick={goBack} className="antique-clickable rounded-full border border-[#8b6a50]/40 px-6 py-3 font-entry-elegant">Indietro</button>
          <button type="button" onClick={finishStudent} className="antique-clickable rounded-full border border-[#6f2638]/45 bg-[#6f2638]/8 px-6 py-3 font-field-label text-[#6f1723]">Apri il diario</button>
        </div>

        {message && <p role="status" className="mt-5 font-field-label text-sm text-[#6f1723]">{message}</p>}
      </section>
    </main>
  );
}
