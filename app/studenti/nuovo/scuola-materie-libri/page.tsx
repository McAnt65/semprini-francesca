"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const DRAFT_STORAGE_KEY = "semprini:new-student:school-subjects-books";
const SUBJECTS = ["Matematica", "Fisica", "Chimica"] as const;

type Subject = (typeof SUBJECTS)[number];
type SchoolDraft = {
  schoolType: string;
  schoolName: string;
  schoolClass: string;
  section: string;
  subjects: Subject[];
  books: Array<{ title: string; publisher: string }>;
};

const EMPTY_BOOKS = [
  { title: "", publisher: "" },
  { title: "", publisher: "" },
  { title: "", publisher: "" },
];

export default function NewStudentSchoolSubjectsBooksPage() {
  const router = useRouter();
  const [schoolType, setSchoolType] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolClass, setSchoolClass] = useState("");
  const [section, setSection] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [books, setBooks] = useState(EMPTY_BOOKS);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const draft = loadDraft();
    if (!draft) return;
    queueMicrotask(() => {
      setSchoolType(draft.schoolType);
      setSchoolName(draft.schoolName);
      setSchoolClass(draft.schoolClass);
      setSection(draft.section);
      setSubjects(draft.subjects);
      setBooks(draft.books);
    });
  }, []);

  function collectDraft(): SchoolDraft {
    return { schoolType, schoolName, schoolClass, section, subjects, books };
  }

  function saveCurrentDraft() {
    const saved = saveDraft(collectDraft());
    setSaveMessage(saved ? "Dati salvati" : "Impossibile salvare i dati");
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
    router.push("/studenti/nuovo/dove-abita-famiglia");
  }

  function toggleSubject(subject: Subject) {
    setSubjects((current) => current.includes(subject) ? current.filter((item) => item !== subject) : [...current, subject]);
    setSaveMessage("");
  }

  function updateBook(index: number, field: "title" | "publisher", value: string) {
    setBooks((current) => current.map((book, bookIndex) => bookIndex === index ? { ...book, [field]: value } : book));
    setSaveMessage("");
  }

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#efe3ce] text-[#4b3024]">
      <div className="mx-auto w-full max-w-[430px] py-0 sm:py-3">
        <div className="relative aspect-[941/1672] w-full overflow-hidden sm:rounded-[28px]">
          <Image src="/student-school-bg-clean.png" alt="Scuola, materie e libri di riferimento" fill unoptimized priority sizes="(max-width: 430px) 100vw, 430px" className="select-none object-fill" />

          <button type="button" onClick={goBack} aria-label="Indietro" className="antique-clickable absolute left-[2.5%] top-[0.8%] z-30 h-[4.3%] w-[18%] rounded-[10px] bg-transparent" />
          <button type="button" onClick={goToMenu} aria-label="Torna al menù" className="antique-clickable absolute right-[2.4%] top-[0.8%] z-30 h-[4.3%] w-[18%] rounded-[10px] bg-transparent" />

          <select value={schoolType} onChange={(event) => { setSchoolType(event.target.value); setSaveMessage(""); }} aria-label="Tipo di scuola" className="absolute left-[39.7%] top-[30.55%] z-30 h-[2.55%] w-[54.7%] appearance-none border-0 bg-transparent px-[2%] text-center font-entry-elegant text-[clamp(11px,3.1vw,16px)] text-[#5b3a2d] outline-none">
            <option value="">Seleziona…</option>
            <option>Scuola secondaria di primo grado</option>
            <option>Liceo scientifico</option>
            <option>Liceo classico</option>
            <option>Liceo linguistico</option>
            <option>Liceo delle scienze umane</option>
            <option>Liceo artistico</option>
            <option>Istituto tecnico</option>
            <option>Istituto professionale</option>
            <option>Università</option>
            <option>Altro</option>
          </select>

          <TextField label="Nome della scuola" value={schoolName} onChange={setSchoolName} left="39.7%" top="35.45%" width="54.7%" />

          <select value={schoolClass} onChange={(event) => { setSchoolClass(event.target.value); setSaveMessage(""); }} aria-label="Classe" className="absolute left-[6.3%] top-[48.55%] z-30 h-[2.55%] w-[37.3%] appearance-none border-0 bg-transparent px-[2%] text-center font-entry-elegant text-[clamp(10px,2.9vw,15px)] text-[#5b3a2d] outline-none">
            <option value="">Seleziona…</option>
            <option>1° anno</option><option>2° anno</option><option>3° anno</option><option>4° anno</option><option>5° anno</option>
          </select>

          <TextField label="Sezione" value={section} onChange={setSection} left="46.8%" top="48.55%" width="26.8%" />

          {SUBJECTS.map((subject, index) => {
            const selected = subjects.includes(subject);
            const left = ["6.5%", "36.4%", "66.3%"][index];
            return (
              <button key={subject} type="button" onClick={() => toggleSubject(subject)} aria-label={subject} aria-pressed={selected} className={`antique-clickable absolute top-[58.25%] z-30 h-[9.9%] w-[27.5%] rounded-[8px] border-0 bg-transparent ${selected ? "ring-2 ring-inset ring-[#75835d]/70" : ""}`} style={{ left }}>
                <span className={`absolute left-[8%] top-[8%] flex aspect-square w-[12%] items-center justify-center rounded-[3px] border border-[#6f5540] bg-[#f6ecd9]/90 font-bold text-[#61724e] ${selected ? "opacity-100" : "opacity-0"}`}>✓</span>
              </button>
            );
          })}

          {books.map((book, index) => {
            const top = `${75.55 + index * 3.7}%`;
            return (
              <div key={index}>
                <BookField label={`Titolo libro ${index + 1}`} placeholder="Titolo del libro…" value={book.title} onChange={(value) => updateBook(index, "title", value)} left="11.9%" top={top} width="31.9%" />
                <BookField label={`Autore o casa editrice ${index + 1}`} placeholder="Autore / Casa editrice…" value={book.publisher} onChange={(value) => updateBook(index, "publisher", value)} left="45.1%" top={top} width="25.9%" />
              </div>
            );
          })}

          <button type="button" onClick={goBack} aria-label="Indietro" className="antique-clickable absolute bottom-[5.35%] left-[8.5%] z-30 h-[4.25%] w-[24.5%] rounded-[12px] bg-transparent" />
          <button type="button" onClick={saveCurrentDraft} aria-label="Salva" className="antique-clickable absolute bottom-[5.35%] left-[37.1%] z-30 h-[4.25%] w-[25.5%] rounded-[12px] bg-transparent" />
          <button type="button" onClick={goNext} aria-label="Avanti" className="antique-clickable absolute bottom-[5.35%] right-[8.5%] z-30 h-[4.25%] w-[24.5%] rounded-[12px] bg-transparent" />

          {saveMessage && <p role="status" className="absolute bottom-[3.85%] left-[10%] right-[10%] z-40 text-center font-field-label text-[10px] leading-none text-[#6f1723]">{saveMessage}</p>}
        </div>
      </div>
    </main>
  );
}

function TextField({ label, value, onChange, left, top, width }: { label: string; value: string; onChange: (value: string) => void; left: string; top: string; width: string }) {
  return <input type="text" value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} className="absolute z-30 h-[2.55%] border-0 bg-transparent px-[1.5%] text-center font-entry-elegant text-[clamp(11px,3.1vw,16px)] text-[#5b3a2d] outline-none" style={{ left, top, width }} />;
}

function BookField({ label, placeholder, value, onChange, left, top, width }: { label: string; placeholder: string; value: string; onChange: (value: string) => void; left: string; top: string; width: string }) {
  return <input type="text" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} aria-label={label} className="absolute z-30 h-[2.5%] border-0 bg-transparent px-[1.2%] text-center font-entry-elegant text-[clamp(9px,2.65vw,13px)] text-[#5b3a2d] outline-none placeholder:text-[#8f735d]/45" style={{ left, top, width }} />;
}

function loadDraft(): SchoolDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!stored) return null;
    const draft = JSON.parse(stored) as Partial<SchoolDraft>;
    const storedSubjects = Array.isArray(draft.subjects) ? draft.subjects.filter((subject): subject is Subject => SUBJECTS.includes(subject as Subject)) : [];
    const storedBooks = Array.isArray(draft.books) ? EMPTY_BOOKS.map((emptyBook, index) => ({
      title: typeof draft.books?.[index]?.title === "string" ? draft.books[index].title : emptyBook.title,
      publisher: typeof draft.books?.[index]?.publisher === "string" ? draft.books[index].publisher : emptyBook.publisher,
    })) : EMPTY_BOOKS;
    return {
      schoolType: typeof draft.schoolType === "string" ? draft.schoolType : "",
      schoolName: typeof draft.schoolName === "string" ? draft.schoolName : "",
      schoolClass: typeof draft.schoolClass === "string" ? draft.schoolClass : "",
      section: typeof draft.section === "string" ? draft.section : "",
      subjects: storedSubjects,
      books: storedBooks,
    };
  } catch {
    return null;
  }
}

function saveDraft(draft: SchoolDraft) {
  const serialized = JSON.stringify(draft);
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, serialized);
    return true;
  } catch {
    try {
      window.sessionStorage.setItem(DRAFT_STORAGE_KEY, serialized);
      return true;
    } catch {
      return false;
    }
  }
}
