"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import type { StudentRecord } from "../data/students";
import { getStoredStudentById, saveStoredStudent } from "../data/student-storage";
import StudentSurface from "./StudentSurface";
import styles from "./students.module.css";
import artwork from "../../design-approved-phase3/09-studenti-nuovo-final.png";

const SUBJECTS = ["Matematica", "Fisica", "Chimica"];
const EMPTY: StudentRecord = {
  id: "",
  status: "active",
  enrollmentDate: "",
  firstName: "",
  lastName: "",
  birthDate: "",
  school: "",
  schoolType: "",
  schoolName: "",
  gradeClass: "",
  section: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  postalCode: "",
  city: "",
  province: "",
  usefulReferences: "",
  primaryParent: "",
  primaryParentPhone: "",
  primaryParentWhatsapp: "",
  primaryParentEmail: "",
  secondaryParent: "",
  secondaryParentPhone: "",
  secondaryParentWhatsapp: "",
  secondaryParentEmail: "",
  subjects: [],
  books: [],
  textbooks: {},
  familyNotes: "",
  personalNotes: "",
  lessonMode: "casa",
  lessonDurationMinutes: 60,
  lessonRateCents: 0,
};

export default function StudentForm({ studentId }: { studentId?: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [student, setStudent] = useState<StudentRecord>(EMPTY);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!studentId) return;
    const stored = getStoredStudentById(studentId);
    if (stored) queueMicrotask(() => setStudent({ ...EMPTY, ...stored }));
  }, [studentId]);

  function update(field: keyof StudentRecord, value: string | number | string[] | StudentRecord["textbooks"] | Array<{ title: string; publisher: string }> | undefined) {
    setStudent((current) => ({ ...current, [field]: value }));
    setMessage("");
  }

  function toggleSubject(subject: string) {
    setStudent((current) => ({
      ...current,
      subjects: current.subjects.includes(subject)
        ? current.subjects.filter((item) => item !== subject)
        : [...current.subjects, subject],
    }));
    setMessage("");
  }

  function updateBook(value: string) {
    update("books", value.split("\n").map((line) => ({ title: line.trim(), publisher: "" })).filter((book) => book.title));
    update("textbooks", { math: value } as StudentRecord["textbooks"]);
  }

  function currentBooks() {
    const books = (student.books ?? []).map((book) => [book.title, book.publisher].filter(Boolean).join(" — ")).filter(Boolean);
    const legacy = [student.textbooks.math, student.textbooks.physics, student.textbooks.chemistry].filter(Boolean);
    return (books.length ? books : legacy).join("\n");
  }

  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") update("avatarUrl", reader.result);
    };
    reader.readAsDataURL(file);
  }

  function save() {
    const now = Date.now().toString(36);
    const firstName = student.firstName.trim();
    const lastName = student.lastName.trim();
    if (!firstName && !lastName) {
      setMessage("Inserisci almeno nome o cognome.");
      return;
    }

    const id = student.id || `${[firstName, lastName].filter(Boolean).join("-").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "studente"}-${now}`;
    const next: StudentRecord = {
      ...student,
      id,
      status: student.status ?? "active",
      firstName,
      lastName,
      whatsapp: student.whatsapp || student.phone,
      school: student.schoolName || student.school || student.schoolType || "",
      primaryParentWhatsapp: student.primaryParentWhatsapp || student.primaryParentPhone,
      secondaryParentWhatsapp: student.secondaryParentWhatsapp || student.secondaryParentPhone,
      updatedAt: new Date().toISOString(),
    };

    if (!saveStoredStudent(next)) {
      setMessage("Impossibile salvare: prova con una fotografia più leggera.");
      return;
    }

    router.push(`/studenti/${encodeURIComponent(id)}`);
  }

  return (
    <StudentSurface artwork={artwork} current="new" className={styles.tallSurface}>
      <h1 className="sr-only">{studentId ? "Modifica studente" : "Nuovo studente"}</h1>
      <form className={styles.formScroll} onSubmit={(event) => { event.preventDefault(); save(); }}>
        <section className={styles.formSection}>
          <button type="button" className={styles.photoPicker} onClick={() => fileInput.current?.click()}>
            {student.avatarUrl ? <Image src={student.avatarUrl} alt="" fill unoptimized className="object-cover" /> : <span>Foto</span>}
          </button>
          <input ref={fileInput} type="file" accept="image/*" onChange={choosePhoto} className="sr-only" />
          <Field label="Nome" value={student.firstName} onChange={(value) => update("firstName", value)} />
          <Field label="Cognome" value={student.lastName} onChange={(value) => update("lastName", value)} />
          <Field label="Data di nascita" type="date" value={student.birthDate} onChange={(value) => update("birthDate", value)} />
          <Field label="Mio studente da" type="date" value={student.enrollmentDate} onChange={(value) => update("enrollmentDate", value)} />
          <Field label="Telefono / WhatsApp" value={student.phone} onChange={(value) => { update("phone", value); update("whatsapp", value); }} />
          <Field label="Mail" type="email" value={student.email} onChange={(value) => update("email", value)} />
        </section>

        <section className={styles.formSection}>
          <h2>Scuola</h2>
          <Field label="Scuola" value={student.schoolName || student.school} onChange={(value) => { update("schoolName", value); update("school", value); }} />
          <label className={styles.field}>Classe<select value={student.gradeClass} onChange={(event) => update("gradeClass", event.target.value)}><option value="">Seleziona</option><option>1° anno</option><option>2° anno</option><option>3° anno</option><option>4° anno</option><option>5° anno</option></select></label>
          <div className={styles.choiceRow}>{SUBJECTS.map((subject) => <button key={subject} type="button" onClick={() => toggleSubject(subject)} aria-pressed={student.subjects.includes(subject)}>{subject}</button>)}</div>
        </section>

        <section className={styles.formSection}>
          <h2>Preferenze lezione</h2>
          <div className={styles.choiceRow}>
            {(["casa", "domicilio", "online"] as const).map((mode) => <button key={mode} type="button" onClick={() => update("lessonMode", mode)} aria-pressed={student.lessonMode === mode}>{mode === "casa" ? "Casa / studio" : mode === "domicilio" ? "A domicilio" : "Online"}</button>)}
          </div>
          <Field label="Durata minuti" type="number" value={String(student.lessonDurationMinutes ?? "")} onChange={(value) => update("lessonDurationMinutes", Number(value) || undefined)} />
          <Field label="Tariffa euro" type="number" value={student.lessonRateCents ? String(student.lessonRateCents / 100) : ""} onChange={(value) => update("lessonRateCents", Math.round((Number(value) || 0) * 100))} />
        </section>

        <section className={styles.formSection}>
          <h2>Abitazione</h2>
          <Field label="Indirizzo" value={student.address} onChange={(value) => update("address", value)} />
          <Field label="Città" value={student.city} onChange={(value) => update("city", value)} />
        </section>

        <section className={styles.formSection}>
          <h2>Famiglia</h2>
          <Field label="Genitore/persona di riferimento" value={student.primaryParent} onChange={(value) => update("primaryParent", value)} />
          <Field label="Telefono / WhatsApp" value={student.primaryParentPhone} onChange={(value) => { update("primaryParentPhone", value); update("primaryParentWhatsapp", value); }} />
          <Field label="Mail" type="email" value={student.primaryParentEmail} onChange={(value) => update("primaryParentEmail", value)} />
        </section>

        <Area label="Libri di testo" value={currentBooks()} onChange={updateBook} />
        <Area label="Note personali" value={student.personalNotes ?? ""} onChange={(value) => update("personalNotes", value)} />

        <div className={styles.formActions}>
          <button type="button" onClick={() => router.push("/studenti")}>Annulla</button>
          <button type="submit">Salva studente</button>
        </div>
        {message && <p role="status" className={styles.formMessage}>{message}</p>}
      </form>
    </StudentSurface>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: "text" | "date" | "email" | "number" }) {
  return <label className={styles.field}>{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className={styles.area}>{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
