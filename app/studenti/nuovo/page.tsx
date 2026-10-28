"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEventHandler, type Ref } from "react";
import type { StudentFamilyContact, StudentRecord, StudentTeacher } from "../../data/students";
import { getStoredStudentById, saveStoredStudentResult } from "../../data/student-storage";
import { TEMPORARY_SAVE_WARNING, type SaveResult } from "../../data/save-result";
import { addStudentBook, booksForEditing, changeBookField, removeStudentBook } from "../student-edit";
import { loadTariffs } from "../../data/tariffario/tariff-storage";
import type { Tariff } from "../../data/tariffario/tariff-types";
import { prepareNarratedStudentSave } from "./narrated-student-save";
import styles from "./nuovo.module.css";

const EMPTY: StudentRecord = {
  id: "", enrollmentDate: "", firstName: "", lastName: "", birthDate: "",
  school: "", gradeClass: "", phone: "", whatsapp: "", email: "", address: "",
  city: "", province: "", primaryParent: "", primaryParentPhone: "",
  primaryParentWhatsapp: "", primaryParentEmail: "", subjects: [], textbooks: {},
};

const CHAPTER_FIELDS = ["firstName", "lastName", "birthDate", "gradeClass", "section", "schoolName", "city", "studyCourse", "phone", "whatsapp", "email", "subjects"] as const;
type ChapterField = typeof CHAPTER_FIELDS[number];
const FAMILY_FIELDS = ["familyCity", "address", "motherName", "motherPhone", "motherWhatsapp", "motherEmail", "fatherName", "fatherPhone", "fatherWhatsapp", "fatherEmail", "primaryContactId"] as const;
type FamilyField = typeof FAMILY_FIELDS[number];
const BOOK_FIELDS = ["books", "topicsToDeepen"] as const;
type BookField = typeof BOOK_FIELDS[number];
const TEACHER_FIELDS = ["subject", "firstName", "lastName", "phone"] as const;
type TeacherField = typeof TEACHER_FIELDS[number];
type TeacherNarrativeField = `teacher:${number}:${TeacherField}`;
const THOUGHT_FIELDS = ["firstImpressions", "interests", "passions", "preferredActivities", "personalNotes"] as const;
type ThoughtField = typeof THOUGHT_FIELDS[number];
const PATH_FIELDS = ["learningStartDate", "learningGoals"] as const;
type PathField = typeof PATH_FIELDS[number];
type NarrativeField = ChapterField | FamilyField | BookField | TeacherNarrativeField | ThoughtField | PathField;
const FAMILY_START = CHAPTER_FIELDS.length + 1;
const FAMILY_END = FAMILY_START + FAMILY_FIELDS.length;
const BOOK_START = FAMILY_END + 1;
const BOOK_END = BOOK_START + BOOK_FIELDS.length;
const TEACHER_START = BOOK_END + 1;

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function italianDate(value?: string) {
  if (!value) return "…";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "…" : new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(date);
}
function parseItalianBirthDate(value: string): string | null {
  const input = value.trim().toLocaleLowerCase("it-IT").replace(/\s+/g, " ");
  const months: Record<string, number> = { gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6, luglio: 7, agosto: 8, settembre: 9, ottobre: 10, novembre: 11, dicembre: 12 };
  const numeric = /^(\d{1,2})([/-])(\d{1,2})\2(\d{4})$/.exec(input);
  const written = /^(\d{1,2}) ([a-zà-ù]+) (\d{4})$/.exec(input);
  const day = Number(numeric?.[1] || written?.[1]);
  const month = numeric ? Number(numeric[3]) : written ? months[written[2]] : 0;
  const year = Number(numeric?.[4] || written?.[3]);
  if (!day || !month || !year) return null;
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function ageFrom(date: string, current: string) {
  if (!date || !current) return null;
  const birth = new Date(`${date}T12:00:00`);
  const today = new Date(`${current}T12:00:00`);
  if (Number.isNaN(birth.getTime()) || birth > today) return null;
  return today.getFullYear() - birth.getFullYear() - (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()) ? 1 : 0);
}
function fullName(person: { firstName: string; lastName: string }) {
  return [person.firstName, person.lastName].filter(Boolean).join(" ");
}
function fieldHint(label: string) {
  const hints: Record<string, string> = {
    "nome studente": "Nome dello studente", "cognome studente": "Cognome dello studente",
    "data di nascita": "Data di nascita", "nome della scuola": "Nome dell'istituto",
    "materie": "Materie di studio", "cellulare studente": "Numero di cellulare",
    "email studente": "Indirizzo email", "WhatsApp studente": "Numero WhatsApp",
    "cellulare madre": "Numero di cellulare della madre", "cellulare padre": "Numero di cellulare del padre",
    "email madre": "Indirizzo email della madre", "email padre": "Indirizzo email del padre",
    "WhatsApp mamma": "Numero WhatsApp della mamma", "WhatsApp papà": "Numero WhatsApp del papà",
    "materia del professore": "Materia insegnata", "altra materia": "Altra materia insegnata",
    "telefono professore": "Numero di telefono del professore",
  };
  return hints[label] || label.charAt(0).toUpperCase() + label.slice(1);
}
function fieldPrompt(label: string) {
  const prompts: Record<string, string> = {
    "nome della scuola": "Scuola", "materia del professore": "Materia",
    "altra materia": "Materia", "via e numero civico": "Via e n.",
    "libri di testo, un libro per riga": "Libri", "argomenti da approfondire": "Argomenti",
    "prime impressioni": "Impressioni", "osservazioni personali": "Osservazioni",
    "attività preferite": "Attività", "obiettivi didattici": "Obiettivi",
  };
  if (prompts[label]) return prompts[label];
  if (label.startsWith("nome ")) return "Nome";
  if (label.startsWith("cognome ")) return "Cognome";
  if (label.startsWith("cellulare ") || label.startsWith("telefono ")) return "Cellulare";
  if (label.startsWith("email ")) return "Email";
  return label.charAt(0).toUpperCase() + label.slice(1).split(" ")[0];
}
function InlineValue({ value, label, editing, onChange, invalid = false, kind = "text", long = false, inputRef, onKeyDown, textareaId, onTextareaKeyDown }: {
  value: string; label: string; editing: boolean; onChange: (value: string) => void; invalid?: boolean;
  kind?: "text" | "date" | "tel" | "email"; long?: boolean;
  inputRef?: Ref<HTMLInputElement>; onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  textareaId?: string; onTextareaKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const hintId = useId();
  const prompt = fieldPrompt(label);
  const contentWidth = Math.max(3, ...value.split("\n").map((line) => line.length + 0.5));
  const width = `${Math.min(long ? 52 : kind === "tel" ? 20 : 36, kind === "tel" ? Math.max(10, contentWidth) : contentWidth)}ch`;
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);
  if (!editing) return <span className={styles.value}>{kind === "date" ? italianDate(value) : value || "…"}</span>;
  return <span className={styles.fieldWrap}>
    {kind === "date"
      ? <span className={styles.dateField}>
        <span className={styles.dateValue}>{value ? italianDate(value) : "Data"}</span>
        <input ref={inputRef} onKeyDown={onKeyDown} className={styles.datePicker} type="date" aria-label={fieldHint(label)} aria-describedby={hintId} aria-invalid={invalid || undefined}
          value={value} onChange={(event) => onChange(event.target.value)} />
      </span>
      : long
      ? <textarea ref={ref} id={textareaId} onKeyDown={onTextareaKeyDown} rows={1} className={styles.longField} aria-label={fieldHint(label)} aria-describedby={hintId} aria-invalid={invalid || undefined} placeholder={value ? prompt : undefined}
        style={{ width }} value={value} onChange={(event) => onChange(event.target.value)} />
      : <input ref={inputRef} onKeyDown={onKeyDown} className={styles.inlineField} type={kind} aria-label={fieldHint(label)} aria-describedby={hintId} aria-invalid={invalid || undefined} placeholder={value ? prompt : undefined}
        style={{ width }} value={value} onChange={(event) => onChange(event.target.value)} />}
    <span id={hintId} role="tooltip" className={styles.fieldHint}>{fieldHint(label)}</span>
  </span>;
}

function BirthDateEntry({ value, onChange, inputRef, onKeyDown }: {
  value: string; onChange: (value: string) => void; inputRef: Ref<HTMLInputElement>; onKeyDown: KeyboardEventHandler<HTMLInputElement>;
}) {
  const hintId = useId();
  const calendarRef = useRef<HTMLInputElement>(null);
  const width = `${Math.min(22, Math.max(11, value.length + 1))}ch`;
  return <span className={styles.birthDateEntry}>
    <input ref={inputRef} onKeyDown={onKeyDown} className={styles.inlineField} type="text" inputMode="text" autoComplete="bday"
      aria-label="Data di nascita" aria-describedby={hintId} placeholder="gg/mm/aaaa" style={{ width }} value={value} onChange={(event) => onChange(event.target.value)} />
    <span id={hintId} role="tooltip" className={styles.fieldHint}>Inserisci giorno, mese e anno</span>
    <button type="button" className={styles.birthDateCalendarButton} aria-label="Apri il calendario" title="Apri il calendario"
      onClick={() => { const picker = calendarRef.current; if (!picker) return; if (typeof picker.showPicker === "function") picker.showPicker(); else picker.click(); }}>
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><rect x="3" y="4.5" width="14" height="13" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M6.5 3v3M13.5 3v3M3.5 8h13" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
    </button>
    <input ref={calendarRef} className={styles.birthDateCalendarPicker} type="date" tabIndex={-1} aria-hidden="true" value={parseItalianBirthDate(value) || ""}
      onChange={(event) => { const [year, month, day] = event.target.value.split("-"); if (year && month && day) onChange(`${day}/${month}/${year}`); }} />
  </span>;
}

function ConfirmedOpeningValue({ value, label, onEdit }: { value: string; label: string; onEdit: () => void }) {
  return <span className={styles.confirmedOpeningValue} role="button" tabIndex={0} aria-label={`Modifica ${label}: ${value}`}
    onClick={onEdit} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onEdit(); } }}>{value}</span>;
}

export default function NewStudentPage() {
  const [student, setStudent] = useState<StudentRecord>(EMPTY);
  const [saved, setSaved] = useState<StudentRecord | null>(null);
  const [editing, setEditing] = useState(true);
  const [openingStep, setOpeningStep] = useState(0);
  const [openingEdit, setOpeningEdit] = useState<NarrativeField | null>(null);
  const [bookEditIndex, setBookEditIndex] = useState<number | null>(null);
  const [bookDraft, setBookDraft] = useState("");
  const [bookPublisherDraft, setBookPublisherDraft] = useState("");
  const [birthDateDraft, setBirthDateDraft] = useState("");
  const [today, setToday] = useState("");
  const [message, setMessage] = useState("");
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const primaryHintId = useId();
  const narrativeScroll = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLElement>(null);
  const firstNameInput = useRef<HTMLInputElement>(null);
  const surnameInput = useRef<HTMLInputElement>(null);
  const birthDateInput = useRef<HTMLInputElement>(null);
  const gradeInput = useRef<HTMLInputElement>(null);
  const sectionInput = useRef<HTMLInputElement>(null);
  const schoolInput = useRef<HTMLInputElement>(null);
  const cityInput = useRef<HTMLInputElement>(null);
  const courseInput = useRef<HTMLInputElement>(null);
  const phoneInput = useRef<HTMLInputElement>(null);
  const whatsappInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const subjectsInput = useRef<HTMLInputElement>(null);
  const familyInput = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const teacherInput = useRef<HTMLInputElement>(null);
  const pathDateInput = useRef<HTMLInputElement>(null);
  const bookEntryInput = useRef<HTMLInputElement>(null);
  const teacherCount = Math.max(1, student.teachers?.length || 0);
  const teacherEnd = TEACHER_START + teacherCount * TEACHER_FIELDS.length;
  const thoughtStart = teacherEnd + 1;
  const thoughtEnd = thoughtStart + THOUGHT_FIELDS.length;
  const pathStart = thoughtEnd + 1;
  const pathEnd = pathStart + PATH_FIELDS.length;
  const nextId = useRef("");
  const saveOperation = useRef(false);
  useEffect(() => {
    queueMicrotask(() => {
      setToday(localDate());
      setTariffs(loadTariffs());
      const id = new URLSearchParams(window.location.search).get("id");
      const existing = id ? getStoredStudentById(id) : null;
      if (existing) { setStudent(existing); setSaved(existing); setEditing(false); nextId.current = existing.id; }
    });
  }, []);
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const revealFocused = () => {
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && page.contains(focused) && focused.matches("input, textarea, select")) {
        requestAnimationFrame(() => focused.scrollIntoView({ block: "center", inline: "nearest" }));
      }
    };
    const resize = () => {
      page.style.setProperty("--student-visible-height", `${window.visualViewport?.height || window.innerHeight}px`);
      revealFocused();
    };
    resize();
    page.addEventListener("focusin", revealFocused);
    window.visualViewport?.addEventListener("resize", resize);
    window.addEventListener("resize", resize);
    return () => {
      page.removeEventListener("focusin", revealFocused);
      window.visualViewport?.removeEventListener("resize", resize);
      window.removeEventListener("resize", resize);
    };
  }, []);
  function activeNarrativeField(): NarrativeField | undefined {
    if (openingEdit) return openingEdit;
    if (openingStep >= pathStart && openingStep < pathEnd) return PATH_FIELDS[openingStep - pathStart];
    if (openingStep >= thoughtStart && openingStep < thoughtEnd) return THOUGHT_FIELDS[openingStep - thoughtStart];
    if (openingStep >= TEACHER_START && openingStep < teacherEnd) {
      const offset = openingStep - TEACHER_START;
      return `teacher:${Math.floor(offset / TEACHER_FIELDS.length)}:${TEACHER_FIELDS[offset % TEACHER_FIELDS.length]}`;
    }
    if (openingStep >= BOOK_START && openingStep < BOOK_END) return BOOK_FIELDS[openingStep - BOOK_START];
    if (openingStep >= FAMILY_START && openingStep < FAMILY_END) return FAMILY_FIELDS[openingStep - FAMILY_START];
    return CHAPTER_FIELDS[openingStep];
  }
  const activeField = activeNarrativeField();
  useEffect(() => {
    if (saved || (openingStep === 0 && !openingEdit) || ([CHAPTER_FIELDS.length, FAMILY_END, BOOK_END, teacherEnd, thoughtEnd, pathEnd].includes(openingStep) && !openingEdit)) return;
    const field = activeField;
    const input = field === "books" ? bookEntryInput.current
      : field && BOOK_FIELDS.includes(field as BookField) || field && THOUGHT_FIELDS.includes(field as ThoughtField) || field === "learningGoals"
      ? document.getElementById(`narrative-${field}`)
      : field?.startsWith("teacher:") ? teacherInput.current : field === "learningStartDate" ? pathDateInput.current
      : field && FAMILY_FIELDS.includes(field as FamilyField) ? familyInput.current : field === "firstName" ? firstNameInput.current : field === "lastName" ? surnameInput.current
      : field === "birthDate" ? birthDateInput.current : field === "gradeClass" ? gradeInput.current
      : field === "section" ? sectionInput.current : field === "schoolName" ? schoolInput.current
      : field === "city" ? cityInput.current : field === "studyCourse" ? courseInput.current
      : field === "phone" ? phoneInput.current : field === "whatsapp" ? whatsappInput.current
      : field === "email" ? emailInput.current : subjectsInput.current;
    const scroll = narrativeScroll.current;
    if (!input || !scroll) return;
    input.focus({ preventScroll: true });
    function revealField() {
      if (!input || !scroll) return;
      const field = input.getBoundingClientRect();
      const area = scroll.getBoundingClientRect();
      const viewport = window.visualViewport;
      const visibleBottom = Math.min(area.bottom, viewport ? viewport.offsetTop + viewport.height : window.innerHeight);
      if (field.bottom > visibleBottom - 12) scroll.scrollTop += field.bottom - visibleBottom + 12;
      else if (field.top < area.top + 12) scroll.scrollTop -= area.top + 12 - field.top;
    }
    revealField();
    window.visualViewport?.addEventListener("resize", revealField);
    return () => window.visualViewport?.removeEventListener("resize", revealField);
  }, [openingStep, openingEdit, bookEditIndex, saved, teacherEnd, thoughtEnd, pathEnd, activeField]);
  useEffect(() => {
    if (bookEditIndex !== null) bookEntryInput.current?.focus({ preventScroll: true });
  }, [bookEditIndex]);
  function advanceOpening() {
    const field = activeNarrativeField();
    if (field === "firstName" && !student.firstName.trim()) { setMessage("Inserisci il nome prima di continuare."); return; }
    if (field === "lastName" && !student.lastName.trim()) { setMessage("Inserisci il cognome prima di continuare."); return; }
    if (field === "birthDate") {
      const parsedDate = birthDateDraft.trim() ? parseItalianBirthDate(birthDateDraft) : "";
      if (parsedDate === null || (parsedDate && ageFrom(parsedDate, today) === null)) { setMessage("Inserisci una data di nascita valida oppure lasciala vuota."); return; }
      update("birthDate", parsedDate);
    }
    if (field === "books" && bookEditIndex !== null) {
      if (!bookDraft.trim() && !bookPublisherDraft.trim()) { setMessage("Scrivi il titolo del libro oppure usa ELIMINA."); return; }
      setStudent((current) => {
        const withBook = bookEditIndex === booksForEditing(current).length ? addStudentBook(current) : current;
        return changeBookField(changeBookField(withBook, bookEditIndex, "title", bookDraft.trim()), bookEditIndex, "publisher", bookPublisherDraft.trim());
      });
      setBookEditIndex(null);
      setBookDraft("");
      setBookPublisherDraft("");
      setOpeningEdit(null);
      return;
    }
    if (field === "books") {
      if (bookDraft.trim() || bookPublisherDraft.trim()) {
        setStudent((current) => {
          const index = booksForEditing(current).length;
          return changeBookField(changeBookField(addStudentBook(current), index, "title", bookDraft.trim()), index, "publisher", bookPublisherDraft.trim());
        });
        setBookDraft("");
        setBookPublisherDraft("");
      }
    }
    setMessage("");
    if (openingEdit) { setOpeningEdit(null); return; }
    setOpeningStep((step) => Math.min(step + 1, pathEnd));
  }
  function openingValue(key: ChapterField, step: number, label: string, inputRef: Ref<HTMLInputElement>) {
    const value = key === "birthDate" ? student.birthDate : key === "subjects" ? student.subjects.join(", ") : key === "schoolName" ? student.schoolName || student.school : student[key] || "";
    if (openingStep > step && openingEdit !== key) {
      if (!value.trim()) return null;
      return <ConfirmedOpeningValue value={key === "birthDate" ? italianDate(value) : value.trim()} label={fieldHint(label)} onEdit={() => {
        if (key === "birthDate") setBirthDateDraft(italianDate(value));
        setOpeningEdit(key);
      }} />;
    }
    if (key === "birthDate") return <><BirthDateEntry value={birthDateDraft} inputRef={inputRef} onChange={setBirthDateDraft}
      onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); advanceOpening(); } }} />
      {(!openingEdit || openingEdit === key) && <button type="button" className={styles.narrativeNext} onClick={advanceOpening}>AVANTI</button>}</>;
    return <><InlineValue value={value} label={label} kind={key === "phone" || key === "whatsapp" ? "tel" : key === "email" ? "email" : "text"} editing={editing} invalid={saveAttempted && (key === "firstName" || key === "lastName") && !value.trim()} inputRef={inputRef}
      onChange={(next) => { if (key === "subjects") update("subjects", next.split(",")); else update(key, next); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); advanceOpening(); } }} />
      {(!openingEdit || openingEdit === key) && <button type="button" className={styles.narrativeNext} onClick={advanceOpening}>AVANTI</button>}</>;
  }
  function showChapterField(key: ChapterField, step: number, value: string) {
    return openingStep >= step && (openingStep === step || openingEdit === key || Boolean(value.trim()));
  }
  function update<K extends keyof StudentRecord>(key: K, value: StudentRecord[K]) {
    setStudent((current) => ({ ...current, [key]: value }));
    setMessage("");
  }
  function field(key: keyof StudentRecord, label: string, kind: "text" | "date" | "tel" | "email" = "text", long = false) {
    return <InlineValue value={String(key === "schoolName" ? (student.schoolName || student.school) : (student[key] ?? ""))} label={label} kind={kind} long={long} editing={editing}
      onChange={(value) => update(key, value)} />;
  }
  function nameFields(person: { firstName: string; lastName: string }, first: (value: string) => void, last: (value: string) => void, label: string) {
    return <><InlineValue value={person.firstName} label={`nome ${label}`} editing={editing} invalid={label === "studente" && saveAttempted && !person.firstName.trim()} onChange={first} />{" "}
      <InlineValue value={person.lastName} label={`cognome ${label}`} editing={editing} invalid={label === "studente" && saveAttempted && !person.lastName.trim()} onChange={last} /></>;
  }
  function updateContact(id: string, relation: string, key: keyof StudentFamilyContact, value: string) {
    setStudent((current) => {
      const contacts = [...(current.familyContacts || [])];
      const index = contacts.findIndex((contact) => contact.id === id);
      const original = index >= 0 ? contacts[index] : { id, firstName: "", lastName: "", relationship: relation };
      const contact = { ...original, [key]: value };
      if (index >= 0) contacts[index] = contact;
      else contacts.push(contact);
      return { ...current, familyContacts: contacts };
    });
    setMessage("");
  }
  function addFamilyContact() {
    setStudent((current) => ({ ...current, familyContacts: [...(current.familyContacts || []), { id: crypto.randomUUID(), firstName: "", lastName: "", relationship: "" }] }));
  }
  function removeFamilyContact(id: string) {
    setStudent((current) => ({ ...current, familyContacts: current.familyContacts?.filter((contact) => contact.id !== id), primaryContactId: current.primaryContactId === id ? "" : current.primaryContactId }));
  }
  const contacts = student.familyContacts || [];
  const mother = contacts.find((person) => ["madre", "mamma"].includes(person.relationship?.toLowerCase() || "")) || { id: "madre", firstName: "", lastName: "", relationship: "madre", phone: "", email: "" };
  const father = contacts.find((person) => ["padre", "papà"].includes(person.relationship?.toLowerCase() || "")) || { id: "padre", firstName: "", lastName: "", relationship: "padre", phone: "", email: "" };
  const primary = contacts.find((person) => person.id === student.primaryContactId);
  const otherContacts = contacts.filter((person) => ![mother.id, father.id].includes(person.id));
  function otherFamilyContacts() {
    if (!saved && openingStep < FAMILY_END) return null;
    return <div className={styles.familyExtras}>
      {otherContacts.map((person) => <div key={person.id} className={styles.familyContact}>
        {(["firstName", "lastName", "relationship", "phone", "whatsapp", "email"] as const).map((key) => <label key={key}>{({ firstName: "Nome", lastName: "Cognome", relationship: "Parentela", phone: "Telefono", whatsapp: "WhatsApp", email: "Email" })[key]}
          {editing ? <input className={styles.inlineField} type={key === "email" ? "email" : key === "phone" || key === "whatsapp" ? "tel" : "text"} value={person[key] || ""} onChange={(event) => updateContact(person.id, person.relationship || "", key, event.target.value)} /> : <span className={styles.value}>{person[key] || "—"}</span>}</label>)}
        {editing && <button type="button" className={styles.narrativeNext} onClick={() => removeFamilyContact(person.id)}>ELIMINA CONTATTO</button>}
      </div>)}
      {editing && <button type="button" className={styles.narrativeNext} onClick={addFamilyContact}>+ UN CONTATTO</button>}
    </div>;
  }
  function familyValue(key: FamilyField, step: number, label: string) {
    const motherField = key.startsWith("mother");
    const fatherField = key.startsWith("father");
    const person = motherField ? mother : father;
    const contactKey = key.endsWith("Name") ? "firstName" : key.endsWith("Phone") ? "phone" : key.endsWith("Whatsapp") ? "whatsapp" : "email";
    const value = key === "familyCity" ? student.city : key === "address" ? student.address
      : key === "primaryContactId" ? primary?.firstName || "" : person[contactKey] || "";
    const confirmed = openingStep > step && openingEdit !== key;
    if (confirmed) return value.trim() ? <ConfirmedOpeningValue value={value.trim()} label={fieldHint(label)} onEdit={() => setOpeningEdit(key)} /> : null;
    if (key === "primaryContactId") return <><span className={styles.fieldWrap}>
      <select ref={(node) => { if (openingEdit === key || openingStep === step) familyInput.current = node; }} className={styles.inlineSelect} aria-label="referente principale" aria-describedby={primaryHintId}
        value={student.primaryContactId || ""} onChange={(event) => update("primaryContactId", event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); advanceOpening(); } }}>
        <option value="">da scegliere</option>{contacts.filter((contact) => contact.firstName.trim()).map((contact) => <option key={contact.id} value={contact.id}>{contact.firstName}</option>)}
      </select><span id={primaryHintId} role="tooltip" className={styles.fieldHint}>Referente per le comunicazioni</span>
    </span><button type="button" className={styles.narrativeNext} onClick={advanceOpening}>AVANTI</button></>;
    return <><InlineValue value={value} label={label} kind={key.endsWith("Phone") || key.endsWith("Whatsapp") ? "tel" : key.endsWith("Email") ? "email" : "text"} editing
      inputRef={(node) => { if (openingEdit === key || openingStep === step) familyInput.current = node; }}
      onChange={(next) => { if (key === "familyCity") update("city", next); else if (key === "address") update("address", next);
        else if (motherField || fatherField) updateContact(person.id, motherField ? "madre" : "padre", contactKey, next); }}
      onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); advanceOpening(); } }} />
      <button type="button" className={styles.narrativeNext} onClick={advanceOpening}>AVANTI</button></>;
  }
  function showFamilyField(key: FamilyField, value: string) {
    const step = FAMILY_START + FAMILY_FIELDS.indexOf(key);
    return openingStep >= step && (openingEdit === key || (openingStep === step && !openingEdit) || (openingStep > step && Boolean(value.trim())));
  }
  const homeCityVisible = showFamilyField("familyCity", student.city);
  const addressVisible = showFamilyField("address", student.address);
  const motherNameVisible = showFamilyField("motherName", mother.firstName);
  const motherPhoneVisible = showFamilyField("motherPhone", mother.phone || "");
  const motherWhatsappVisible = showFamilyField("motherWhatsapp", mother.whatsapp || "");
  const motherEmailVisible = showFamilyField("motherEmail", mother.email || "");
  const fatherNameVisible = showFamilyField("fatherName", father.firstName);
  const fatherPhoneVisible = showFamilyField("fatherPhone", father.phone || "");
  const fatherWhatsappVisible = showFamilyField("fatherWhatsapp", father.whatsapp || "");
  const fatherEmailVisible = showFamilyField("fatherEmail", father.email || "");
  const primaryVisible = showFamilyField("primaryContactId", primary?.firstName || "");
  const teachers = student.teachers || [];
  const visibleTeachers: StudentTeacher[] = editing && teachers.length === 0
    ? [{ id: "professore-iniziale", firstName: "", lastName: "", subject: "", phone: "" }]
    : editing ? teachers : teachers.filter((teacher) => teacher.subject || fullName(teacher) || teacher.phone || teacher.email);
  function updateTeacher(id: string, key: keyof StudentTeacher, value: string) {
    setStudent((current) => {
      const items = [...(current.teachers || [])];
      const index = items.findIndex((teacher) => teacher.id === id);
      const item = index >= 0 ? items[index] : { id, firstName: "", lastName: "", subject: "" };
      if (index >= 0) items[index] = { ...item, [key]: value };
      else items.push({ ...item, [key]: value });
      return { ...current, teachers: items };
    });
    setMessage("");
  }
  const narrativeTeachers = teachers.length ? teachers : [{ id: "professore-iniziale", firstName: "", lastName: "", subject: "", phone: "" }];
  function teacherFieldId(index: number, key: TeacherField): TeacherNarrativeField {
    return `teacher:${index}:${key}`;
  }
  function teacherFieldStep(index: number, key: TeacherField) {
    return TEACHER_START + index * TEACHER_FIELDS.length + TEACHER_FIELDS.indexOf(key);
  }
  function showTeacherField(index: number, key: TeacherField, value: string) {
    const step = teacherFieldStep(index, key);
    const id = teacherFieldId(index, key);
    return openingStep >= step && (openingEdit === id || (openingStep === step && !openingEdit) || (openingStep > step && Boolean(value.trim())));
  }
  function teacherValue(teacher: StudentTeacher, index: number, key: TeacherField, label: string) {
    const step = teacherFieldStep(index, key);
    const id = teacherFieldId(index, key);
    const value = teacher[key] || "";
    if (openingStep > step && openingEdit !== id) {
      return value.trim() ? <ConfirmedOpeningValue value={value.trim()} label={fieldHint(label)} onEdit={() => setOpeningEdit(id)} /> : null;
    }
    return <><InlineValue value={value} label={label} kind={key === "phone" ? "tel" : "text"} editing
      inputRef={(node) => { if (openingEdit === id || openingStep === step) teacherInput.current = node; }}
      onChange={(next) => updateTeacher(teacher.id, key, next)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); advanceOpening(); } }} />
      <button type="button" className={styles.narrativeNext} onClick={advanceOpening}>AVANTI</button></>;
  }
  function showLaterField(key: ThoughtField | PathField, step: number, value: string) {
    return openingStep >= step && (openingEdit === key || (openingStep === step && !openingEdit) || (openingStep > step && Boolean(value.trim())));
  }
  function laterValue(key: ThoughtField | PathField, step: number, label: string) {
    const value = student[key] || "";
    if (openingStep > step && openingEdit !== key) {
      return value.trim() ? <ConfirmedOpeningValue value={key === "learningStartDate" ? italianDate(value) : value.trim()} label={fieldHint(label)} onEdit={() => setOpeningEdit(key)} /> : null;
    }
    if (key === "learningStartDate") return <><InlineValue value={value} label={label} kind="date" editing inputRef={pathDateInput}
      onChange={(next) => update(key, next)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); advanceOpening(); } }} />
      <button type="button" className={styles.narrativeNext} onClick={advanceOpening}>AVANTI</button></>;
    return <><InlineValue value={value} label={label} editing long textareaId={`narrative-${key}`}
      onChange={(next) => update(key, next)} onTextareaKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); advanceOpening(); } }} />
      <button type="button" className={styles.narrativeNext} onClick={advanceOpening}>AVANTI</button></>;
  }
  function teacherParagraph(teacher: StudentTeacher, index: number) {
    const subjectVisible = showTeacherField(index, "subject", teacher.subject);
    const firstVisible = showTeacherField(index, "firstName", teacher.firstName);
    const lastVisible = showTeacherField(index, "lastName", teacher.lastName);
    const phoneVisible = showTeacherField(index, "phone", teacher.phone || "");
    if (!subjectVisible && !firstVisible && !lastVisible && !phoneVisible) return null;
    const hasName = firstVisible || lastVisible;
    const namePhase = openingStep <= teacherFieldStep(index, "lastName") || openingEdit === teacherFieldId(index, "subject");
    const useNameSentence = hasName || (subjectVisible && namePhase);
    const complete = openingStep > teacherFieldStep(index, "phone");
    return <p key={teacher.id}>
      {useNameSentence ? <>
        {index === 0 ? "A scuola, il suo insegnante" : subjectVisible ? "Per " : "Il suo insegnante"}
        {subjectVisible && <>{index === 0 ? " di " : ""}{teacherValue(teacher, index, "subject", index === 0 ? "materia del professore" : "altra materia")}{index > 0 && openingStep > teacherFieldStep(index, "subject") && ", il suo insegnante"}</>}
        {hasName && <> è {firstVisible && teacherValue(teacher, index, "firstName", "nome professore")}{lastVisible && <>{firstVisible && " "}{teacherValue(teacher, index, "lastName", "cognome professore")}</>}</>}
        {phoneVisible && <>{hasName ? index === 0 ? ", che posso eventualmente contattare al numero " : ", raggiungibile al numero " : ", raggiungibile al numero "}{teacherValue(teacher, index, "phone", "telefono professore")}</>}
      </> : subjectVisible ? <>La materia di riferimento a scuola è {teacherValue(teacher, index, "subject", "materia del professore")}{phoneVisible && <>; il docente è raggiungibile al numero {teacherValue(teacher, index, "phone", "telefono professore")}</>}</>
        : <>Il suo insegnante è raggiungibile al numero {teacherValue(teacher, index, "phone", "telefono professore")}</>}
      {complete && "."}
    </p>;
  }
  function savedTeacherParagraph(teacher: StudentTeacher, index: number) {
    const subject = teacher.subject.trim();
    const name = fullName(teacher).trim();
    const phone = teacher.phone?.trim();
    if (!subject && !name && !phone) return null;
    return <p key={teacher.id}>
      {name ? <>{index === 0 ? "A scuola, il suo insegnante" : subject ? "Per " : "Il suo insegnante"}{subject && <>{index === 0 ? " di " : ""}<span className={styles.value}>{subject}</span>{index > 0 && ", il suo insegnante"}</>} è <span className={styles.value}>{name}</span>
        {phone && <>{index === 0 ? ", che posso eventualmente contattare al numero " : ", raggiungibile al numero "}<span className={styles.value}>{phone}</span></>}</>
        : subject ? <>La materia di riferimento a scuola è <span className={styles.value}>{subject}</span>{phone && <>; il docente è raggiungibile al numero <span className={styles.value}>{phone}</span></>}</>
        : <>Il suo insegnante è raggiungibile al numero <span className={styles.value}>{phone}</span></> }.
    </p>;
  }
  async function save() {
    if (saveOperation.current) return;
    setSaveAttempted(true);
    if (!student.firstName.trim() || !student.lastName.trim()) {
      setMessage("Nome e cognome sono obbligatori: completa i campi evidenziati nel primo capitolo.");
      if (!saved) { setOpeningEdit(null); setOpeningStep(student.firstName.trim() ? 1 : 0); }
      return;
    }
    if (student.birthDate && ageFrom(student.birthDate, today) === null) { setMessage("Controlla la data di nascita."); return; }
    if (bookEditIndex !== null && !bookDraft.trim() && !bookPublisherDraft.trim()) { setMessage("Completa il libro in modifica oppure usa ELIMINA."); bookEntryInput.current?.focus(); return; }
    const studentToSave = bookEditIndex === null ? student : (() => {
      const withBook = bookEditIndex === booksForEditing(student).length ? addStudentBook(student) : student;
      return changeBookField(changeBookField(withBook, bookEditIndex, "title", bookDraft.trim()), bookEditIndex, "publisher", bookPublisherDraft.trim());
    })();
    nextId.current ||= `studente-${crypto.randomUUID()}`;
    const { record, replaceFields } = prepareNarratedStudentSave(studentToSave, saved, nextId.current, today);
    // The existing archive keeps IDs and enrollment dates. Explicit replacement permits intentional removals.
    saveOperation.current = true;
    setSaving(true);
    let result: SaveResult = { status: "failed" };
    try { result = saveStoredStudentResult(record, { replaceFields }); }
    finally { saveOperation.current = false; setSaving(false); }
    if (result.status === "failed") { setMessage("Salvataggio non riuscito: verifica lo spazio disponibile e l'archiviazione locale del browser."); return; }
    if (result.status === "temporary") { setMessage(TEMPORARY_SAVE_WARNING); return; }
    const persisted = getStoredStudentById(record.id);
    if (!persisted) { setMessage("Salvataggio non verificabile nel registro. Riprova."); return; }
    setStudent(persisted);
    setSaved(persisted);
    setEditing(false);
    setBookEditIndex(null);
    setOpeningEdit(null);
    setSaveAttempted(false);
    setMessage("Studente custodito nel registro.");
  }
  function cancel() {
    setStudent(saved || EMPTY);
    setEditing(false);
    setMessage("");
    setSaveAttempted(false);
  }
  const age = ageFrom(student.birthDate, today);
  const bookEntries = booksForEditing(student);
  const bookText = bookEntries.map((book) => [book.title, book.publisher].filter(Boolean).join(" — ")).join("\n");
  function startBookEdit(index: number) {
    const book = bookEntries[index];
    setBookDraft(book?.title || "");
    setBookPublisherDraft(book?.publisher || "");
    setBookEditIndex(index);
    setOpeningEdit("books");
  }
  function removeBook(index: number) {
    setStudent((current) => removeStudentBook(current, index));
    setBookEditIndex(null);
    setOpeningEdit(null);
    setMessage("");
  }
  function bookList() {
    return <ul className={styles.bookList} aria-label="Libri di testo">{bookEntries.map((book, index) => {
      const label = [book.title, book.publisher].filter(Boolean).join(" — ");
      return <li key={`${index}-${label}`}>
        {bookEditIndex === index && editing ? <>{bookInputs(index)}<button type="button" className={styles.narrativeNext} onClick={advanceOpening}>AVANTI</button></>
          : editing ? <ConfirmedOpeningValue value={label} label={`libro ${index + 1}`} onEdit={() => startBookEdit(index)} /> : <span className={styles.value}>{label}</span>}
        {editing && <button type="button" className={styles.narrativeNext} aria-label={`Elimina libro ${index + 1}: ${label}`} onClick={() => removeBook(index)}>ELIMINA</button>}
      </li>;
    })}{bookEditIndex === bookEntries.length && editing && <li>{bookInputs(bookEntries.length)}<button type="button" className={styles.narrativeNext} onClick={advanceOpening}>AVANTI</button></li>}</ul>;
  }
  function bookInputs(index: number) {
    return <span className={styles.bookInputs}><input ref={bookEntryInput} className={styles.inlineField} aria-label={`Titolo libro ${index + 1}`} placeholder="Titolo" value={bookDraft} onChange={(event) => setBookDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); advanceOpening(); } }} />
      <input className={styles.inlineField} aria-label={`Editore libro ${index + 1}`} placeholder="Editore" value={bookPublisherDraft} onChange={(event) => setBookPublisherDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); advanceOpening(); } }} /></span>;
  }
  function bookValue(key: BookField, step: number, label: string) {
    const value = key === "books" ? bookText : student.topicsToDeepen || "";
    if (key === "books" && openingStep > step) return null;
    if (openingStep > step && openingEdit !== key) {
      return value.trim() ? key === "books" ? <span className={styles.value}>{value.trim()}</span> : <ConfirmedOpeningValue value={value.trim()} label={fieldHint(label)} onEdit={() => setOpeningEdit(key)} /> : null;
    }
    if (key === "books") return <>{bookInputs(bookEntries.length)}<button type="button" className={styles.narrativeNext} onClick={advanceOpening}>AVANTI</button></>;
    return <><InlineValue value={value} label={label} editing long
      textareaId={`narrative-${key}`}
      onTextareaKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); advanceOpening(); } }}
      onChange={(next) => update("topicsToDeepen", next)} />
      <button type="button" className={styles.narrativeNext} onClick={advanceOpening}>AVANTI</button></>;
  }
  function showBookField(key: BookField, value: string) {
    const step = BOOK_START + BOOK_FIELDS.indexOf(key);
    return openingStep >= step && (openingEdit === key || (openingStep === step && !openingEdit) || (openingStep > step && Boolean(value.trim())));
  }
  const booksVisible = showBookField("books", bookText);
  const topicsVisible = showBookField("topicsToDeepen", student.topicsToDeepen || "");
  const gradeVisible = showChapterField("gradeClass", 3, student.gradeClass);
  const sectionVisible = showChapterField("section", 4, student.section || "");
  const schoolVisible = showChapterField("schoolName", 5, student.schoolName || student.school);
  const cityVisible = showChapterField("city", 6, student.city);
  const courseVisible = showChapterField("studyCourse", 7, student.studyCourse || "");
  const schoolDetailsVisible = gradeVisible || sectionVisible || schoolVisible || cityVisible || courseVisible;
  const phoneVisible = showChapterField("phone", 8, student.phone);
  const whatsappVisible = showChapterField("whatsapp", 9, student.whatsapp);
  const emailVisible = showChapterField("email", 10, student.email);
  const contactDetailsVisible = phoneVisible || whatsappVisible || emailVisible;
  const subjectsVisible = showChapterField("subjects", 11, student.subjects.join(", "));
  return (
    <main ref={pageRef} className={styles.page}>
      <div className={styles.sheet}>
        <Image src="/SfondoNuovoStudente.png" alt="" fill preload unoptimized sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
        <h1 className="sr-only">Nuovo studente</h1>
        <div className={styles.content}>
          <nav className={styles.navigation} aria-label="Navigazione nuovo studente">
            <Link href="/oggi">OGGI</Link>
            {saved?.id ? <Link href={`/studenti/${encodeURIComponent(saved.id)}`}>CARD STUDENTE</Link> : <span aria-disabled="true">CARD STUDENTE</span>}
            <Link href="/menu">MENU</Link>
          </nav>
          <div ref={narrativeScroll} className={styles.scroll} tabIndex={0} aria-label="Diario dello studente">
            <div className={styles.chapters}>
              <section className={styles.firstChapter} aria-labelledby="nuovo-allievo">
                <h2 id="nuovo-allievo">UN NUOVO ALLIEVO</h2>
                <p>Oggi <span className={styles.value}>{italianDate(saved?.enrollmentDate || student.enrollmentDate || today)}</span> iscrivo nel mio registro {saved
                  ? <>{nameFields(student, (value) => update("firstName", value), (value) => update("lastName", value), "studente")}.</>
                  : <>
                    {openingValue("firstName", 0, "nome studente", firstNameInput)}
                    {openingStep >= 1 && <span className={styles.openingReveal}> {openingValue("lastName", 1, "cognome studente", surnameInput)}</span>}
                    {(openingStep === 2 || (openingStep > 2 && student.birthDate)) && <span className={styles.openingReveal}>. È nato/a il {openingValue("birthDate", 2, "data di nascita", birthDateInput)}</span>}
                    {openingStep >= 3 && <span className={styles.openingReveal}>{age !== null && <> e ha <span className={styles.value}>{age}</span> anni</>}.</span>}
                  </>}</p>
                {!saved && openingStep >= 3 && (openingStep < 8 || schoolDetailsVisible) && <p>
                  {gradeVisible && <>Frequenta il {openingValue("gradeClass", 3, "anno scolastico", gradeInput)}</>}
                  {sectionVisible && <>{gradeVisible ? " — sezione " : "Frequenta la sezione "}{openingValue("section", 4, "sezione", sectionInput)}</>}
                  {schoolVisible && <>{gradeVisible || sectionVisible ? ", presso " : "Frequenta il "}{openingValue("schoolName", 5, "nome della scuola", schoolInput)}</>}
                  {cityVisible && <>{gradeVisible || sectionVisible || schoolVisible ? ", a " : "Studia a "}{openingValue("city", 6, "città", cityInput)}</>}
                  {courseVisible && <>{gradeVisible || sectionVisible || schoolVisible || cityVisible ? ", dove segue l'indirizzo di studi " : "Segue l'indirizzo di studi "}{openingValue("studyCourse", 7, "indirizzo scolastico", courseInput)}</>}
                  {openingStep >= 8 && schoolDetailsVisible && "."}
                </p>}
                {!saved && openingStep >= 8 && (openingStep < 11 || contactDetailsVisible) && <p>
                  {phoneVisible && <>Il suo numero di cellulare è {openingValue("phone", 8, "cellulare studente", phoneInput)}</>}
                  {whatsappVisible && <>{phoneVisible ? ", utilizzabile anche per " : "Il suo numero WhatsApp è "}{openingValue("whatsapp", 9, "WhatsApp studente", whatsappInput)}</>}
                  {openingStep >= 10 && (phoneVisible || whatsappVisible) && "."}
                  {emailVisible && <>{phoneVisible || whatsappVisible ? " " : ""}Il suo indirizzo di posta elettronica è {openingValue("email", 10, "email studente", emailInput)}</>}
                  {openingStep >= 11 && emailVisible && "."}
                </p>}
                {!saved && subjectsVisible && <p>Ci dedicheremo insieme allo studio di {openingValue("subjects", 11, "materie", subjectsInput)}{openingStep >= 12 && ", cercando, con pazienza e buona volontà, di rendere più chiaro ciò che oggi gli/le appare difficile."}</p>}
                {!saved && openingStep === CHAPTER_FIELDS.length && <button type="button" className={styles.narrativeNext} onClick={() => setOpeningStep(FAMILY_START)}>CONTINUA</button>}
                <div hidden={!saved}>
                <p>{saved && (editing || student.birthDate) && <>È nato/a il {field("birthDate", "data di nascita", "date")} e ha <span className={styles.value}>{age ?? "…"}</span> anni.</>}
                  {(editing || student.gradeClass || student.schoolName || student.school) && <> Frequenta il {field("gradeClass", "anno scolastico")}{(editing || student.section) && <> — sezione {field("section", "sezione")}</>}, presso {field("schoolName", "nome della scuola")}{(editing || student.city) && <>, a {field("city", "città")}</>}{(editing || student.studyCourse) && <>, dove segue l&apos;indirizzo di studi {field("studyCourse", "indirizzo scolastico")}</>}.</>}
                </p>
                {(editing || student.phone || student.whatsapp || student.email) && <p>{(editing || student.phone) && <>Il suo numero di cellulare è {field("phone", "cellulare studente", "tel")}{(editing || student.whatsapp || student.phone) && <>, utilizzabile anche per {editing ? <><InlineValue value={student.whatsapp} label="WhatsApp studente" kind="tel" editing onChange={(value) => update("whatsapp", value)} /></> : student.whatsapp && student.whatsapp !== student.phone ? <span className={styles.value}>{student.whatsapp}</span> : <span className={styles.value}>WhatsApp</span>}</>}.</>}{(editing || student.email) && <> Il suo indirizzo di posta elettronica è {field("email", "email studente", "email")}.</>}</p>}
                <p>Ci dedicheremo insieme allo studio di <InlineValue value={student.subjects.join(", ")} label="materie" editing={editing} onChange={(value) => update("subjects", value.split(","))} />, cercando, con pazienza e buona volontà, di rendere più chiaro ciò che oggi gli/le appare difficile.</p>
                </div>
              </section>
              {!saved && openingStep >= FAMILY_START && <section className={styles.openingReveal} aria-labelledby="famiglia-progressiva">
                <h2 id="famiglia-progressiva">LA SUA FAMIGLIA E LA SUA CASA</h2>
                {(homeCityVisible || addressVisible) && <p><span className={styles.value}>{student.firstName.trim()}</span> abita con i genitori{homeCityVisible && <> a {familyValue("familyCity", FAMILY_START, "città")}</>}{addressVisible && <>{homeCityVisible ? ", in " : " in "}{familyValue("address", FAMILY_START + 1, "via e numero civico")}</>}{openingStep > FAMILY_START + 1 && "."}</p>}
                {(motherNameVisible || motherPhoneVisible || motherWhatsappVisible || motherEmailVisible) && <p>
                  {motherNameVisible && <>Sua mamma si chiama {familyValue("motherName", FAMILY_START + 2, "nome madre")}</>}
                  {motherPhoneVisible && <>{motherNameVisible ? ", il suo cellulare è " : "Il cellulare della mamma è "}{familyValue("motherPhone", FAMILY_START + 3, "cellulare madre")}</>}
                  {motherWhatsappVisible && <>{motherNameVisible || motherPhoneVisible ? ", il suo WhatsApp è " : "Il WhatsApp della mamma è "}{familyValue("motherWhatsapp", FAMILY_START + 4, "WhatsApp mamma")}</>}
                  {motherEmailVisible && <>{motherNameVisible || motherPhoneVisible || motherWhatsappVisible ? " e la sua email è " : "L'email della mamma è "}{familyValue("motherEmail", FAMILY_START + 5, "email madre")}</>}
                  {openingStep > FAMILY_START + 5 && "."}
                </p>}
                {(fatherNameVisible || fatherPhoneVisible || fatherWhatsappVisible || fatherEmailVisible) && <p>
                  {fatherNameVisible && <>Suo padre si chiama {familyValue("fatherName", FAMILY_START + 6, "nome padre")}</>}
                  {fatherPhoneVisible && <>{fatherNameVisible ? ", il suo cellulare è " : "Il cellulare del padre è "}{familyValue("fatherPhone", FAMILY_START + 7, "cellulare padre")}</>}
                  {fatherWhatsappVisible && <>{fatherNameVisible || fatherPhoneVisible ? ", il suo WhatsApp è " : "Il WhatsApp del padre è "}{familyValue("fatherWhatsapp", FAMILY_START + 8, "WhatsApp papà")}</>}
                  {fatherEmailVisible && <>{fatherNameVisible || fatherPhoneVisible || fatherWhatsappVisible ? " e la sua email è " : "L'email del padre è "}{familyValue("fatherEmail", FAMILY_START + 9, "email padre")}</>}
                  {openingStep > FAMILY_START + 9 && "."}
                </p>}
                {primaryVisible && <p>Per le comunicazioni riguardanti le lezioni potrò fare riferimento principalmente a {familyValue("primaryContactId", FAMILY_START + 10, "referente principale")}{openingStep >= FAMILY_END && "."}</p>}
                {otherFamilyContacts()}
                {openingStep === FAMILY_END && <button type="button" className={styles.narrativeNext} onClick={() => setOpeningStep(BOOK_START)}>CONTINUA</button>}
              </section>}
              {!saved && openingStep >= BOOK_START && <section className={styles.openingReveal} aria-labelledby="libri-progressivi">
                <h2 id="libri-progressivi">I SUOI LIBRI E IL SUO CAMMINO SCOLASTICO</h2>
                {booksVisible && <p>Per accompagnarlo/a nello studio faremo riferimento a{openingStep === BOOK_START && <> {bookValue("books", BOOK_START, "libri di testo, un libro per riga")}</>}</p>}
                {openingStep > BOOK_START && (bookEntries.length > 0 || bookEditIndex !== null) && bookList()}
                {openingStep > BOOK_START && bookEditIndex === null && <button type="button" className={styles.narrativeNext} onClick={() => startBookEdit(bookEntries.length)}>+ UN LIBRO</button>}
                {topicsVisible && <p>Gli argomenti sui quali sarà bene soffermarci sono {bookValue("topicsToDeepen", BOOK_START + 1, "argomenti da approfondire")}{openingStep >= BOOK_END && "."}</p>}
                {openingStep >= BOOK_END && <p>Mi piacerebbe che, col tempo, acquistasse maggiore fiducia nelle proprie capacità e imparasse ad affrontare anche le difficoltà senza scoraggiarsi.</p>}
                {openingStep === BOOK_END && <button type="button" className={styles.narrativeNext} onClick={() => setOpeningStep(TEACHER_START)}>CONTINUA</button>}
              </section>}
              {!saved && openingStep >= TEACHER_START && <section className={styles.openingReveal} aria-labelledby="professori-progressivi">
                <h2 id="professori-progressivi">I PROFESSORI DI RIFERIMENTO</h2>
                {narrativeTeachers.map((teacher, index) => teacherParagraph(teacher, index))}
                {openingStep === teacherEnd && <><button type="button" className={styles.addTeacher} onClick={() => update("teachers", [...narrativeTeachers, { id: crypto.randomUUID(), firstName: "", lastName: "", subject: "", phone: "" }])}>+ un altro professore</button>
                  <button type="button" className={styles.narrativeNext} onClick={() => setOpeningStep(thoughtStart)}>CONTINUA</button></>}
              </section>}
              {!saved && openingStep >= thoughtStart && <section className={styles.openingReveal} aria-labelledby="pensiero-progressivo">
                <h2 id="pensiero-progressivo">QUALCHE PENSIERO SU DI LUI/LEI</h2>
                {showLaterField("firstImpressions", thoughtStart, student.firstImpressions || "") && <p>Da quanto ho potuto conoscere, <span className={styles.value}>{student.firstName}</span> è {laterValue("firstImpressions", thoughtStart, "prime impressioni")}{openingStep > thoughtStart && "."}</p>}
                {(showLaterField("interests", thoughtStart + 1, student.interests || "") || showLaterField("passions", thoughtStart + 2, student.passions || "") || showLaterField("preferredActivities", thoughtStart + 3, student.preferredActivities || "")) && <p>
                  {(showLaterField("interests", thoughtStart + 1, student.interests || "") || showLaterField("passions", thoughtStart + 2, student.passions || "")) && <>Le cose che più lo/la interessano sono {showLaterField("interests", thoughtStart + 1, student.interests || "") && laterValue("interests", thoughtStart + 1, "interessi")}{showLaterField("passions", thoughtStart + 2, student.passions || "") && <>{showLaterField("interests", thoughtStart + 1, student.interests || "") && ", "}{laterValue("passions", thoughtStart + 2, "passioni")}</>}{openingStep > thoughtStart + 2 && "."}</>}
                  {showLaterField("preferredActivities", thoughtStart + 3, student.preferredActivities || "") && <> {"Nel tempo libero ama "}{laterValue("preferredActivities", thoughtStart + 3, "attività preferite")}{openingStep > thoughtStart + 3 && "."}</>}
                </p>}
                {showLaterField("personalNotes", thoughtStart + 4, student.personalNotes || "") && <p>Mi sembra importante ricordare anche {laterValue("personalNotes", thoughtStart + 4, "osservazioni personali")}{openingStep >= thoughtEnd && "."}</p>}
                {openingStep === thoughtEnd && <button type="button" className={styles.narrativeNext} onClick={() => setOpeningStep(pathStart)}>CONTINUA</button>}
              </section>}
              {!saved && openingStep >= pathStart && <section className={styles.openingReveal} aria-labelledby="percorso-progressivo">
                <h2 id="percorso-progressivo">IL NOSTRO PERCORSO</h2>
                {(showLaterField("learningStartDate", pathStart, student.learningStartDate || "") || showLaterField("learningGoals", pathStart + 1, student.learningGoals || "")) && <p>
                  {showLaterField("learningStartDate", pathStart, student.learningStartDate || "") && <>Inizieremo a lavorare insieme dal {laterValue("learningStartDate", pathStart, "data di inizio")}</>}
                  {showLaterField("learningGoals", pathStart + 1, student.learningGoals || "") && <>{showLaterField("learningStartDate", pathStart, student.learningStartDate || "") ? ", dedicando particolare attenzione a " : "Dedicheremo particolare attenzione a "}{laterValue("learningGoals", pathStart + 1, "obiettivi didattici")}</>}
                  {openingStep >= pathEnd && "."}
                </p>}
                {openingStep >= pathEnd && <><p>Spero che le nostre lezioni possano essere, oltre che un aiuto nello studio, un&apos;occasione per scoprire il piacere di comprendere, di fare domande e di imparare qualcosa di nuovo.</p>
                  <p>Ogni piccolo progresso meriterà di essere riconosciuto.</p><p className={styles.signature}>Francesca</p></>}
              </section>}
              <div hidden={!saved}>
              <section aria-labelledby="famiglia"><h2 id="famiglia">LA SUA FAMIGLIA E LA SUA CASA</h2>
                <p>{field("firstName", "nome studente")} abita con i genitori a {field("city", "città")}, in {field("address", "via e numero civico")}.</p>
                <p>Sua mamma si chiama <InlineValue value={mother.firstName} label="nome madre" editing={editing} onChange={(value) => updateContact(mother.id, "madre", "firstName", value)} />, il suo cellulare è <InlineValue value={mother.phone || ""} label="cellulare madre" kind="tel" editing={editing} onChange={(value) => updateContact(mother.id, "madre", "phone", value)} />, il suo WhatsApp è <InlineValue value={mother.whatsapp || ""} label="WhatsApp mamma" kind="tel" editing={editing} onChange={(value) => updateContact(mother.id, "madre", "whatsapp", value)} /> e la sua email è <InlineValue value={mother.email || ""} label="email madre" kind="email" editing={editing} onChange={(value) => updateContact(mother.id, "madre", "email", value)} />.</p>
                <p>Suo padre si chiama <InlineValue value={father.firstName} label="nome padre" editing={editing} onChange={(value) => updateContact(father.id, "padre", "firstName", value)} />, il suo cellulare è <InlineValue value={father.phone || ""} label="cellulare padre" kind="tel" editing={editing} onChange={(value) => updateContact(father.id, "padre", "phone", value)} />, il suo WhatsApp è <InlineValue value={father.whatsapp || ""} label="WhatsApp papà" kind="tel" editing={editing} onChange={(value) => updateContact(father.id, "padre", "whatsapp", value)} /> e la sua email è <InlineValue value={father.email || ""} label="email padre" kind="email" editing={editing} onChange={(value) => updateContact(father.id, "padre", "email", value)} />.</p>
                {(editing || primary || student.primaryParent) && <p>Per le comunicazioni riguardanti le lezioni potrò fare riferimento principalmente a {editing ? <span className={styles.fieldWrap}><select className={styles.inlineSelect} aria-label="referente principale" aria-describedby={primaryHintId} value={student.primaryContactId || ""} onChange={(event) => update("primaryContactId", event.target.value)}><option value="">da scegliere</option>{contacts.filter((person) => fullName(person)).map((person) => <option key={person.id} value={person.id}>{fullName(person)}</option>)}</select><span id={primaryHintId} role="tooltip" className={styles.fieldHint}>Referente per le comunicazioni</span></span> : <span className={styles.value}>{primary ? fullName(primary) : student.primaryParent}</span>}.</p>}
                {otherFamilyContacts()}
              </section>
              <section aria-labelledby="libri"><h2 id="libri">I SUOI LIBRI E IL SUO CAMMINO SCOLASTICO</h2>
                {(bookEntries.length > 0 || bookEditIndex !== null) && <><p>Per accompagnarlo/a nello studio faremo riferimento a</p>{bookList()}</>}
                {editing && bookEditIndex === null && <button type="button" className={styles.narrativeNext} onClick={() => startBookEdit(bookEntries.length)}>+ UN LIBRO</button>}
                {(editing || student.topicsToDeepen) && <p>Gli argomenti sui quali sarà bene soffermarci sono {field("topicsToDeepen", "argomenti da approfondire", "text", true)}.</p>}
                <p>Mi piacerebbe che, col tempo, acquistasse maggiore fiducia nelle proprie capacità e imparasse ad affrontare anche le difficoltà senza scoraggiarsi.</p>
              </section>
              <section aria-labelledby="professori"><h2 id="professori">I PROFESSORI DI RIFERIMENTO</h2>
                {editing ? visibleTeachers.map((teacher, index) => <p key={teacher.id}>
                  {index === 0 ? <>A scuola, il suo insegnante di <InlineValue value={teacher.subject} label="materia del professore" editing={editing} onChange={(value) => updateTeacher(teacher.id, "subject", value)} /> è </> : <>Per <InlineValue value={teacher.subject} label="altra materia" editing={editing} onChange={(value) => updateTeacher(teacher.id, "subject", value)} />, il suo insegnante è </>}
                  {nameFields(teacher, (value) => updateTeacher(teacher.id, "firstName", value), (value) => updateTeacher(teacher.id, "lastName", value), "professore")}{(editing || teacher.phone) && <>, {index === 0 ? "che posso eventualmente contattare" : "raggiungibile"} al numero <InlineValue value={teacher.phone || ""} label="telefono professore" kind="tel" editing={editing} onChange={(value) => updateTeacher(teacher.id, "phone", value)} /></>}.
                </p>) : visibleTeachers.map((teacher, index) => savedTeacherParagraph(teacher, index))}
                {editing && <button type="button" className={styles.addTeacher} onClick={() => update("teachers", [...teachers, { id: crypto.randomUUID(), firstName: "", lastName: "", subject: "", phone: "" }])}>+ un altro professore</button>}
              </section>
              <section aria-labelledby="pensiero"><h2 id="pensiero">QUALCHE PENSIERO SU DI LUI/LEI</h2>
                {(editing || student.firstImpressions) && <p>Da quanto ho potuto conoscere, <span className={styles.value}>{student.firstName || "…"}</span> è {field("firstImpressions", "prime impressioni", "text", true)}.</p>}
                {editing ? <p>Le cose che più lo/la interessano sono <InlineValue value={student.interests || ""} label="interessi" editing long onChange={(value) => update("interests", value)} />, <InlineValue value={student.passions || ""} label="passioni" editing long onChange={(value) => update("passions", value)} />. Nel tempo libero ama {field("preferredActivities", "attività preferite", "text", true)}.</p>
                  : (student.interests || student.passions || student.preferredActivities) && <p>{(student.interests || student.passions) && <>Le cose che più lo/la interessano sono {student.interests && <span className={styles.value}>{student.interests}</span>}{student.passions && <>{student.interests && ", "}<span className={styles.value}>{student.passions}</span></>}.</>}{student.preferredActivities && <>{(student.interests || student.passions) && " "}Nel tempo libero ama <span className={styles.value}>{student.preferredActivities}</span>.</>}</p>}
                {(editing || student.personalNotes) && <p>Mi sembra importante ricordare anche {field("personalNotes", "osservazioni personali", "text", true)}.</p>}
              </section>
              <section aria-labelledby="percorso"><h2 id="percorso">IL NOSTRO PERCORSO</h2>
                {(editing || student.learningStartDate || student.learningGoals) && <p>{editing ? <>Inizieremo a lavorare insieme dal {field("learningStartDate", "data di inizio", "date")}, dedicando particolare attenzione a {field("learningGoals", "obiettivi didattici", "text", true)}.</>
                  : <>{student.learningStartDate && <>Inizieremo a lavorare insieme dal <span className={styles.value}>{italianDate(student.learningStartDate)}</span></>}{student.learningGoals && <>{student.learningStartDate ? ", dedicando particolare attenzione a " : "Dedicheremo particolare attenzione a "}<span className={styles.value}>{student.learningGoals}</span></>}.</>}</p>}
                <p>Spero che le nostre lezioni possano essere, oltre che un aiuto nello studio, un&apos;occasione per scoprire il piacere di comprendere, di fare domande e di imparare qualcosa di nuovo.</p>
                <p>Ogni piccolo progresso meriterà di essere riconosciuto.</p>
                <p className={styles.signature}>Francesca</p>
              </section>
              </div>
              {(saved || openingStep >= pathEnd) && <details className={styles.lessonPreferences}>
                <summary>Le mie lezioni con questo studente</summary>
                <div className={styles.preferenceFields}>
                  <label>Modalità abituale <select className={styles.inlineSelect} disabled={!editing} value={student.lessonMode || ""} onChange={(event) => update("lessonMode", event.target.value as StudentRecord["lessonMode"])}><option value="">Da scegliere</option><option value="casa">A casa</option><option value="domicilio">A domicilio</option><option value="online">Online</option></select></label>
                  <label>Durata abituale <select className={styles.inlineSelect} disabled={!editing} value={student.lessonDurationMinutes || ""} onChange={(event) => update("lessonDurationMinutes", event.target.value ? Number(event.target.value) : undefined)}><option value="">Da scegliere</option><option value="60">60 minuti</option><option value="90">90 minuti</option><option value="120">120 minuti</option></select></label>
                  <label>Tariffa abituale <select className={styles.inlineSelect} disabled={!editing} value={student.lessonRateCents || ""} onChange={(event) => update("lessonRateCents", event.target.value ? Number(event.target.value) : undefined)}><option value="">Da scegliere</option>{student.lessonRateCents && !tariffs.some((tariff) => tariff.hourlyRateCents === student.lessonRateCents) && <option value={student.lessonRateCents}>{(student.lessonRateCents / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}</option>}{tariffs.map((tariff) => <option key={tariff.id} value={tariff.hourlyRateCents}>{tariff.code} · {(tariff.hourlyRateCents / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}</option>)}</select></label>
                </div>
              </details>}
            </div>
          </div>
          <div className={styles.footer}>
            <span className={styles.status} role="status" aria-live="polite">{message}</span>
            <div className={styles.actions}>
              <button type="button" onClick={save} disabled={!editing || saving}>SALVA</button>
              <button type="button" disabled={editing && !saved} aria-pressed={editing} aria-label={editing ? "Ripristina l'ultima versione salvata" : "Modifica i dati dello studente"}
                title={editing ? "Ripristina l'ultima versione salvata" : "Modifica i dati dello studente"}
                onClick={() => {
                  if (!editing) { setEditing(true); setMessage(""); return; }
                  if (saved && window.confirm("Ripristinare l'ultima versione salvata? Le modifiche non salvate andranno perse.")) cancel();
                }}>MODIFICA</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
