"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LEGACY_NOTES_DRAFT_KEY,
  NOTES_DRAFT_KEY,
} from "../../../data/student-storage";

const DRAFT_STORAGE_KEY = NOTES_DRAFT_KEY;

type PersonalNotesDraft = {
  personalNotes: string;
  reminders: string;
};

const EMPTY_DRAFT: PersonalNotesDraft = {
  personalNotes: "",
  reminders: "",
};

export default function NewStudentPersonalNotesPage() {
  const router = useRouter();

  const [draft, setDraft] =
    useState<PersonalNotesDraft>(EMPTY_DRAFT);

  const [saveMessage, setSaveMessage] =
    useState("");

  useEffect(() => {
    const saved = loadDraft();

    if (saved) {
      queueMicrotask(() => setDraft(saved));
    }
  }, []);

  function updateField(
    field: keyof PersonalNotesDraft,
    value: string
  ) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));

    setSaveMessage("");
  }

  function saveCurrentDraft() {
    const saved = saveDraft(draft);

    setSaveMessage(
      saved
        ? "Dati salvati"
        : "Impossibile salvare i dati"
    );

    return saved;
  }

  function goBack() {
    saveCurrentDraft();
    router.back();
  }

  function goToMenu() {
    saveCurrentDraft();
    router.push("/menu");
  }

  function goNext() {
    if (!saveCurrentDraft()) return;

    router.push("/studenti/nuovo/diario");
  }

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#efe3ce] text-[#4b3024]">

      <div className="mx-auto w-full max-w-[430px] py-0 sm:py-3">

        <div className="relative aspect-[941/1672] w-full min-h-dvh sm:min-h-0 overflow-hidden sm:rounded-[28px]">

          {/* SFONDO */}

          <Image
            src="/student-notes-bg.png"
            alt="Note personali dello studente"
            fill
            unoptimized
            priority
            sizes="(max-width: 430px) 100vw, 430px"
            className="select-none object-fill"
          />

          {/* =====================================================
              NAVIGAZIONE SUPERIORE
             ===================================================== */}

          <button
            type="button"
            onClick={goBack}
            aria-label="Indietro"
            className="antique-clickable absolute left-[1.8%] top-[0.7%] z-30 h-[5.8%] w-[19.8%] rounded-[12px] bg-transparent"
          />

          <button
            type="button"
            onClick={goToMenu}
            aria-label="Torna al menù"
            className="antique-clickable absolute right-[1.6%] top-[0.7%] z-30 h-[5.8%] w-[18.8%] rounded-[12px] bg-transparent"
          />

          {/* =====================================================
              NOTE PERSONALI
             ===================================================== */}

          <textarea
            aria-label="Note personali"
            value={draft.personalNotes}
            onChange={(event) =>
              updateField(
                "personalNotes",
                event.target.value
              )
            }
            className="absolute left-[7.8%] top-[22.1%] z-30 h-[36.3%] w-[68.5%] resize-none border-0 bg-transparent px-[2%] py-[1.5%] font-entry-elegant text-[clamp(11px,2.85vw,15px)] leading-[1.45] text-[#5b3a2d] outline-none selection:bg-[#dcc8a8]"
          />

          {/* =====================================================
              PROMEMORIA E SPUNTI
             ===================================================== */}

          <textarea
            aria-label="Promemoria e spunti"
            value={draft.reminders}
            onChange={(event) =>
              updateField(
                "reminders",
                event.target.value
              )
            }
            className="absolute left-[14.2%] top-[66.4%] z-30 h-[13.4%] w-[59.1%] resize-none border-0 bg-transparent px-[2%] py-[1.5%] font-entry-elegant text-[clamp(10px,2.65vw,14px)] leading-[1.4] text-[#5b3a2d] outline-none selection:bg-[#dcc8a8]"
          />

          {/* =====================================================
              SALVA
             ===================================================== */}

          <button
            type="button"
            onClick={saveCurrentDraft}
            aria-label="Salva note personali"
            className="antique-clickable absolute bottom-[1.65%] left-[25.3%] z-30 h-[5.1%] w-[18.8%] rounded-[12px] bg-transparent"
          />

          {/* =====================================================
              AVANTI
             ===================================================== */}

          <button
            type="button"
            onClick={goNext}
            aria-label="Avanti"
            className="antique-clickable absolute bottom-[1.65%] left-[58.4%] z-30 h-[5.1%] w-[19.4%] rounded-[12px] bg-transparent"
          />

          {/* =====================================================
              MESSAGGIO SALVATAGGIO
             ===================================================== */}

          {saveMessage && (
            <p
              role="status"
              className="absolute bottom-[0.35%] left-[27%] right-[27%] z-40 text-center font-field-label text-[10px] leading-none text-[#6f2638]"
            >
              {saveMessage}
            </p>
          )}

        </div>
      </div>
    </main>
  );
}

/* =========================================================
   CARICAMENTO BOZZA
   ========================================================= */

function loadDraft():
  | PersonalNotesDraft
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = [
      DRAFT_STORAGE_KEY,
      LEGACY_NOTES_DRAFT_KEY,
    ]
      .map((key) =>
        window.localStorage.getItem(key) ??
        window.sessionStorage.getItem(key)
      )
      .find(Boolean);

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(
      stored
    ) as Partial<PersonalNotesDraft>;

    return {
      personalNotes:
        typeof parsed.personalNotes === "string"
          ? parsed.personalNotes
          : "",

      reminders:
        typeof parsed.reminders === "string"
          ? parsed.reminders
          : "",
    };
  } catch {
    return null;
  }
}

/* =========================================================
   SALVATAGGIO BOZZA
   ========================================================= */

function saveDraft(
  draft: PersonalNotesDraft
) {
  const serialized =
    JSON.stringify(draft);

  try {
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      serialized
    );

    return true;
  } catch {
    try {
      window.sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        serialized
      );

      return true;
    } catch {
      return false;
    }
  }
}
