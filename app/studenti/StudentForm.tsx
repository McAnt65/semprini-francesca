"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TEMPORARY_SAVE_WARNING } from "../data/save-result";
import type { StudentRecord } from "../data/students";
import { getStoredStudentById, saveStoredStudentResult } from "../data/student-storage";
import { loadTariffs } from "../data/tariffario/tariff-storage";
import type { Tariff } from "../data/tariffario/tariff-types";
import StudentSurface from "./StudentSurface";
import styles from "./students.module.css";
import { addStudentBook, booksForEditing, changeBookField, lastBookRemovalIsAmbiguous, prepareStudentFormSave, removeStudentBook } from "./student-edit";
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

export default function StudentForm({ studentId, tabbed = false }: { studentId?: string; tabbed?: boolean }) {
  const router = useRouter();
  const saveOperation = useRef(false);
  const nextStudentId = useRef("");
  const editedFields = useRef(new Set<keyof StudentRecord>());
  const [student, setStudent] = useState<StudentRecord>(EMPTY);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "lessons">("profile");

  useEffect(() => {
    queueMicrotask(() => setTariffs(loadTariffs()));
    if (!studentId) return;
    const stored = getStoredStudentById(studentId);
    if (stored) queueMicrotask(() => { editedFields.current.clear(); setStudent({ ...EMPTY, ...stored }); });
  }, [studentId]);

  function update(field: keyof StudentRecord, value: string | number | string[] | StudentRecord["textbooks"] | Array<{ title: string; publisher: string }> | undefined) {
    editedFields.current.add(field);
    setStudent((current) => ({ ...current, [field]: value }));
    setMessage("");
  }

  function toggleSubject(subject: string) {
    editedFields.current.add("subjects");
    setStudent((current) => ({
      ...current,
      subjects: current.subjects.includes(subject)
        ? current.subjects.filter((item) => item !== subject)
        : [...current.subjects, subject],
    }));
    setMessage("");
  }

  function editBook(index: number, field: "title" | "publisher", value: string) {
    editedFields.current.add("books");
    setStudent((current) => changeBookField(current, index, field, value));
  }
  function addBook() {
    editedFields.current.add("books");
    setStudent(addStudentBook);
  }
  function removeBook(index: number) {
    if (lastBookRemovalIsAmbiguous(student)) {
      setMessage("Il libro e i dati storici potrebbero essere indipendenti. Conserva una copia cifrata; rimozione sospesa.");
      return;
    }
    editedFields.current.add("books");
    setStudent((current) => removeStudentBook(current, index));
  }

  function mapsHref() {
    const destination = [student.address, student.city].filter(Boolean).join(", ");
    return destination ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}` : "";
  }

  function save() {
    if (saveOperation.current) return;
    const now = Date.now().toString(36);
    const firstName = student.firstName.trim();
    const lastName = student.lastName.trim();
    if (!firstName && !lastName) {
      setMessage("Inserisci almeno nome o cognome.");
      return;
    }

    const id = student.id || (nextStudentId.current ||= `${[firstName, lastName].filter(Boolean).join("-").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "studente"}-${now}`);
    const { record: next, replaceFields } = prepareStudentFormSave(student, id, editedFields.current);

    saveOperation.current = true;
    const result = saveStoredStudentResult(next, { replaceFields });
    saveOperation.current = false;
    if (result.status === "failed") {
      setMessage("Salvataggio non riuscito. Riprova.");
      return;
    }
    if (result.status === "temporary") { setMessage(TEMPORARY_SAVE_WARNING); return; }

    router.push(`/studenti/${encodeURIComponent(id)}`);
  }

  if (tabbed) {
    const mapUrl = mapsHref();

    return (
      <StudentSurface artwork={artwork} current="new" className={`${styles.tallSurface} ${styles.newEntry}`} showTopHotspots={false}>
        <h1 className="sr-only">Nuovo studente</h1>
        <header className={styles.entryHeader}>
          <Link href="/oggi">Oggi</Link>
          <span>Il diario di Francesca</span>
          <Link href="/menu">Menu</Link>
          <h2>Nuovo studente</h2>
        </header>

        <form className={styles.entryForm} onSubmit={(event) => { event.preventDefault(); save(); }}>
          <section className={styles.identity} aria-label="Identità studente">
            <div className={styles.identityFields}>
              <Field label="Nome" value={student.firstName} onChange={(value) => update("firstName", value)} />
              <Field label="Cognome" value={student.lastName} onChange={(value) => update("lastName", value)} />
            </div>
            <nav className={styles.quickContacts} aria-label="Contatti rapidi">
              <a href={student.phone ? `tel:${student.phone}` : undefined} aria-disabled={!student.phone}>Telefono</a>
              <a href={student.whatsapp ? `https://wa.me/${student.whatsapp.replace(/\D/g, "")}` : undefined} aria-disabled={!student.whatsapp}>WhatsApp</a>
              <a href={student.email ? `mailto:${student.email}` : undefined} aria-disabled={!student.email}>Email</a>
              <a href={mapUrl || undefined} target="_blank" rel="noreferrer" aria-disabled={!mapUrl}>Maps</a>
            </nav>
          </section>

          <div className={styles.entryTabs} role="tablist" aria-label="Schede studente">
            <button type="button" role="tab" aria-selected={activeTab === "profile"} onClick={() => setActiveTab("profile")}>Profilo</button>
            <button type="button" role="tab" aria-selected={activeTab === "lessons"} onClick={() => setActiveTab("lessons")}>Lezioni e note</button>
          </div>

          <div className={styles.entryScroll}>
            {activeTab === "profile" ? (
              <div className={styles.profileContent} role="tabpanel" aria-label="Profilo">
                <section className={styles.profileSection}>
                  <h3>Dati personali</h3>
                  <Field label="Data di nascita" type="date" value={student.birthDate} onChange={(value) => update("birthDate", value)} />
                  <Field label="Mio studente da" type="date" value={student.enrollmentDate} onChange={(value) => update("enrollmentDate", value)} />
                </section>
                <section className={styles.profileSection}>
                  <h3>Scuola</h3>
                  <Field label="Scuola" value={student.schoolName || student.school} onChange={(value) => { update("schoolName", value); update("school", value); }} />
                  <label className={styles.entryField}><span>Classe</span><select value={student.gradeClass} onChange={(event) => update("gradeClass", event.target.value)}><option value="">Seleziona</option>{[1, 2, 3, 4, 5].map((year) => <option key={year}>{year}° anno</option>)}<option>Altro</option></select></label>
                </section>
                <section className={styles.profileSection}>
                  <h3>Famiglia</h3>
                  <Field label="Persona di riferimento" value={student.primaryParent} onChange={(value) => update("primaryParent", value)} />
                  <Field label="Telefono referente" value={student.primaryParentPhone} onChange={(value) => { update("primaryParentPhone", value); update("primaryParentWhatsapp", value); }} />
                  <Field label="Mail referente" type="email" value={student.primaryParentEmail} onChange={(value) => update("primaryParentEmail", value)} />
                </section>
                <section className={styles.profileSection}>
                  <h3>Abitazione</h3>
                  <Field label="Indirizzo" value={student.address} onChange={(value) => update("address", value)} />
                </section>
              </div>
            ) : (
              <div className={styles.profileContent} role="tabpanel" aria-label="Lezioni e note">
                <section className={styles.profileSection}>
                  <h3>Materie</h3>
                  <div className={styles.entryChoices}>{SUBJECTS.map((item) => <label key={item}><input type="checkbox" checked={student.subjects.includes(item)} onChange={() => toggleSubject(item)} />{item}</label>)}</div>
                </section>
                <section className={styles.profileSection}>
                  <h3>Lezioni</h3>
                  <label className={styles.entryField}><span>Modalità abituale</span><select value={student.lessonMode ?? "casa"} onChange={(event) => update("lessonMode", event.target.value as StudentRecord["lessonMode"])}><option value="casa">A casa</option><option value="domicilio">In studio</option><option value="online">Online</option></select></label>
                  <label className={styles.entryField}><span>Durata abituale</span><select value={String(student.lessonDurationMinutes ?? "")} onChange={(event) => update("lessonDurationMinutes", Number(event.target.value) || undefined)}><option value="">Seleziona</option><option value="60">60 minuti</option><option value="90">90 minuti</option><option value="120">120 minuti</option></select></label>
                  <label className={styles.entryField}><span>Tariffa associata</span><select value={student.lessonRateCents ? String(student.lessonRateCents) : ""} onChange={(event) => update("lessonRateCents", Number(event.target.value) || 0)}><option value="">Seleziona</option>{tariffs.map((tariff) => <option key={tariff.id} value={tariff.hourlyRateCents}>{tariff.code} · {tariff.subject}</option>)}</select></label>
                </section>
                <section className={styles.profileSection}><h3>Libri di testo</h3><BookEditor books={booksForEditing(student)} onChange={editBook} onAdd={addBook} onRemove={removeBook} /></section>
                <section className={styles.profileSection}><h3>Note personali</h3><Area label="Note personali" value={student.personalNotes ?? ""} onChange={(value) => update("personalNotes", value)} /></section>
              </div>
            )}
          </div>

          <div className={styles.entryActions}>
            <button type="button" onClick={() => router.push("/studenti")}>Annulla</button>
            <button type="submit">Salva studente</button>
          </div>
          {message && <p role="status" className={styles.entryMessage}>{message}</p>}
        </form>
      </StudentSurface>
    );
  }

  return (
    <StudentSurface artwork={artwork} current="new" className={styles.tallSurface}>
      <h1 className="sr-only">{studentId ? "Modifica studente" : "Nuovo studente"}</h1>
      <form className={styles.formScroll} onSubmit={(event) => { event.preventDefault(); save(); }}>
        <section className={styles.formSection} aria-labelledby="personal-title">
          <h2 id="personal-title" className={styles.visualOnly} style={{ top: "6.2%" }}>DATI PERSONALI</h2>
          <Field className={styles.fieldName} label="NOME" value={student.firstName} onChange={(value) => update("firstName", value)} />
          <Field className={styles.fieldSurname} label="COGNOME" value={student.lastName} onChange={(value) => update("lastName", value)} />
          <Field className={styles.fieldBirth} label="DATA DI NASCITA" type="date" value={student.birthDate} onChange={(value) => update("birthDate", value)} />
          <Field className={styles.fieldSince} label="MIO STUDENTE DA" type="date" value={student.enrollmentDate} onChange={(value) => update("enrollmentDate", value)} />
          <Field className={styles.fieldPhone} label="TELEFONO / WHATSAPP" value={student.phone} onChange={(value) => { update("phone", value); update("whatsapp", value); }} />
          <Field className={styles.fieldMail} label="MAIL" type="email" value={student.email} onChange={(value) => update("email", value)} />
        </section>

        <section className={styles.formSection} aria-labelledby="school-title">
          <h2 id="school-title" className={styles.visualOnly} style={{ top: "30%" }}>SCUOLA</h2>
          <Field className={styles.fieldSchool} label="SCUOLA" value={student.schoolName || student.school} onChange={(value) => { update("schoolName", value); update("school", value); }} />
          <label className={`${styles.field} ${styles.fieldClass}`}><span>CLASSE</span><select value={student.gradeClass} onChange={(event) => update("gradeClass", event.target.value)}><option value="">Seleziona</option><option>1° anno</option><option>2° anno</option><option>3° anno</option><option>4° anno</option><option>5° anno</option><option>Altro</option></select></label>
        </section>

        <section className={styles.formSection} aria-labelledby="subjects-title">
          <h2 id="subjects-title" className={styles.visualOnly}>MATERIE</h2>
          <div className={styles.choiceRow}>{SUBJECTS.map((subject) => <button key={subject} type="button" onClick={() => toggleSubject(subject)} aria-pressed={student.subjects.includes(subject)}>{subject.toLocaleUpperCase("it-IT")}</button>)}</div>
        </section>

        <section className={styles.formSection} aria-labelledby="lessons-title">
          <h2 id="lessons-title" className={styles.visualOnly}>LEZIONI</h2>
          <p className={`${styles.inlineLabel} ${styles.modeLabel}`}>MODALITÀ ABITUALE</p>
          <div className={styles.choiceRow}>
            {(["casa", "domicilio", "online"] as const).map((mode) => <button key={mode} type="button" onClick={() => update("lessonMode", mode)} aria-pressed={student.lessonMode === mode}>{mode === "casa" ? "Casa / studio" : mode === "domicilio" ? "A domicilio" : "Online"}</button>)}
          </div>
          <label className={`${styles.field} ${styles.fieldDuration}`}><span>DURATA ABITUALE</span><select value={String(student.lessonDurationMinutes ?? "")} onChange={(event) => update("lessonDurationMinutes", Number(event.target.value) || undefined)}><option value="">Seleziona</option><option value="60">60 minuti</option><option value="90">90 minuti</option><option value="120">120 minuti</option></select></label>
          <label className={`${styles.field} ${styles.fieldTariff}`}><span>TARIFFA ASSOCIATA</span><select value={student.lessonRateCents ? String(student.lessonRateCents) : ""} onChange={(event) => update("lessonRateCents", Number(event.target.value) || 0)}><option value="">Seleziona</option>{tariffs.map((tariff) => <option key={tariff.id} value={tariff.hourlyRateCents}>{tariff.code} · {tariff.subject} · {(tariff.hourlyRateCents / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}</option>)}</select></label>
        </section>

        <section className={styles.formSection} aria-labelledby="home-title">
          <h2 id="home-title" className={styles.visualOnly}>ABITAZIONE</h2>
          <Field className={styles.fieldAddress} label="INDIRIZZO" value={student.address} onChange={(value) => update("address", value)} />
          <a className={styles.mapsLink} href={mapsHref() || undefined} target="_blank" rel="noreferrer" aria-disabled={!mapsHref()}>
            APRI MAPS
          </a>
        </section>

        <section className={styles.formSection} aria-labelledby="family-title">
          <h2 id="family-title" className={styles.visualOnly} style={{ top: "63.8%" }}>FAMIGLIA</h2>
          <Field className={styles.fieldParent} label="PERSONA DI RIFERIMENTO" value={student.primaryParent} onChange={(value) => update("primaryParent", value)} />
          <Field className={styles.fieldParentPhone} label="TELEFONO / WHATSAPP" value={student.primaryParentPhone} onChange={(value) => { update("primaryParentPhone", value); update("primaryParentWhatsapp", value); }} />
          <Field className={styles.fieldParentMail} label="MAIL" type="email" value={student.primaryParentEmail} onChange={(value) => update("primaryParentEmail", value)} />
        </section>

        <section className={styles.formSection} aria-labelledby="books-title">
          <h2 id="books-title" className={styles.visualOnly}>LIBRI DI TESTO</h2>
          <BookEditor className={styles.fieldBooks} books={booksForEditing(student)} onChange={editBook} onAdd={addBook} onRemove={removeBook} />
        </section>

        <section className={styles.formSection} aria-labelledby="notes-title">
          <h2 id="notes-title" className={styles.visualOnly}>NOTE</h2>
          <Area className={styles.fieldNotes} label="NOTE PERSONALI" value={student.personalNotes ?? ""} onChange={(value) => update("personalNotes", value)} />
        </section>

        <div className={styles.formActions}>
          <button type="button" onClick={() => router.push("/studenti")}>ANNULLA</button>
          <button type="submit">SALVA STUDENTE</button>
        </div>
        {message && <p role="status" className={styles.formMessage}>{message}</p>}
      </form>
    </StudentSurface>
  );
}

function Field({ label, value, onChange, type = "text", className = "" }: { label: string; value: string; onChange: (value: string) => void; type?: "text" | "date" | "email" | "number"; className?: string }) {
  return <label className={`${styles.field} ${className}`}><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Area({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return <label className={`${styles.area} ${className}`}><span>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function BookEditor({ books, onChange, onAdd, onRemove, className = "" }: {
  books: NonNullable<StudentRecord["books"]>;
  onChange: (index: number, field: "title" | "publisher", value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  className?: string;
}) {
  return <div className={`${styles.bookEditor} ${className}`} role="group" aria-label="Libri di testo">
    {books.map((book, index) => <div className={styles.bookRow} key={index}>
      <label><span className="sr-only">Titolo libro {index + 1}</span><input aria-label={`Titolo libro ${index + 1}`} value={book.title} onChange={(event) => onChange(index, "title", event.target.value)} placeholder="Titolo" /></label>
      <label><span className="sr-only">Editore libro {index + 1}</span><input aria-label={`Editore libro ${index + 1}`} value={book.publisher} onChange={(event) => onChange(index, "publisher", event.target.value)} placeholder="Editore" /></label>
      <button type="button" onClick={() => onRemove(index)} aria-label={`Elimina libro ${index + 1}`}>ELIMINA</button>
    </div>)}
    <button type="button" onClick={onAdd}>+ UN LIBRO</button>
  </div>;
}
