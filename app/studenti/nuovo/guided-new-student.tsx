"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { StudentFamilyContact, StudentRecord, StudentTeacher } from "../../data/students";
import { getStoredStudentById, saveStoredStudentResult } from "../../data/student-storage";
import { TEMPORARY_SAVE_WARNING } from "../../data/save-result";
import { loadTariffs } from "../../data/tariffario/tariff-storage";
import type { Tariff } from "../../data/tariffario/tariff-types";
import { prepareNarratedStudentSave } from "./narrated-student-save";
import { whatsappNumber } from "./contact-links";
import styles from "./guided.module.css";

const KEY = "semprini:student-guided-draft:v1";
const EMPTY: StudentRecord = { id: "", enrollmentDate: "", firstName: "", lastName: "", birthDate: "", school: "", gradeClass: "", phone: "", whatsapp: "", email: "", address: "", city: "", province: "", primaryParent: "", primaryParentPhone: "", primaryParentWhatsapp: "", primaryParentEmail: "", subjects: [], textbooks: {} };
type Kind = "text" | "tel" | "email" | "date" | "long" | "yesno" | "choice" | "add";
type Step = { id: string; chapter: string; label: string; kind: Kind; required?: boolean; options?: { value: string; label: string }[] };
type Draft = { version: 1; student: StudentRecord; confirmed: string[]; stepId: string; pending: Record<string, string> };
const step = (id: string, chapter: string, label: string, kind: Kind = "text", required = false): Step => ({ id, chapter, label, kind, required });

const firstSteps: Step[] = [
  step("firstName", "Un nuovo allievo", "Nome dello studente", "text", true), step("lastName", "Un nuovo allievo", "Cognome dello studente", "text", true),
  step("birthDate", "Un nuovo allievo", "Data di nascita", "date"), step("gradeClass", "Scuola", "Anno scolastico"),
  step("section", "Scuola", "Sezione"), step("schoolName", "Scuola", "Nome della scuola"), step("city", "Scuola", "Città"),
  step("studyCourse", "Scuola", "Indirizzo di studi"), step("phone", "Contatti", "Cellulare studente", "tel"),
  step("whatsapp", "Contatti", "Usa WhatsApp sul cellulare?", "yesno"), step("email", "Contatti", "Email studente", "email"),
  step("subjects", "Scuola", "Materie, separate da virgole"), step("address", "Famiglia e casa", "Via e numero civico"),
];
const lastSteps: Step[] = [
  step("topicsToDeepen", "Libri e studio", "Argomenti da approfondire", "long"),
  step("firstImpressions", "Pensieri", "Prime impressioni", "long"), step("interests", "Pensieri", "Interessi", "long"),
  step("passions", "Pensieri", "Passioni", "long"), step("preferredActivities", "Pensieri", "Attività preferite", "long"),
  step("personalNotes", "Pensieri", "Osservazioni personali", "long"), step("learningStartDate", "Il nostro percorso", "Data di inizio", "date"),
  step("learningGoals", "Il nostro percorso", "Obiettivi didattici", "long"),
  { ...step("lessonMode", "Lezioni", "Modalità abituale", "choice"), options: [{ value: "casa", label: "A casa" }, { value: "domicilio", label: "A domicilio" }, { value: "online", label: "Online" }] },
  { ...step("lessonDurationMinutes", "Lezioni", "Durata abituale", "choice"), options: [{ value: "60", label: "60 minuti" }, { value: "90", label: "90 minuti" }, { value: "120", label: "120 minuti" }] },
  step("lessonRateCents", "Lezioni", "Tariffa abituale", "choice"),
];
function contactSteps(person: StudentFamilyContact, title: string): Step[] {
  const prefix = `contact:${person.id}:`;
  return [step(prefix + "firstName", title, "Nome"), ...(title === "Altro contatto" ? [step(prefix + "lastName", title, "Cognome"), step(prefix + "relationship", title, "Parentela")] : []), step(prefix + "phone", title, "Cellulare", "tel"), step(prefix + "whatsapp", title, "Usa WhatsApp?", "yesno"), step(prefix + "email", title, "Email", "email")];
}
function teacherSteps(person: StudentTeacher, index: number): Step[] {
  const prefix = `teacher:${person.id}:`;
  return [step(prefix + "subject", `Professore ${index + 1}`, "Materia"), step(prefix + "firstName", `Professore ${index + 1}`, "Nome"), step(prefix + "lastName", `Professore ${index + 1}`, "Cognome"), step(prefix + "phone", `Professore ${index + 1}`, "Telefono", "tel")];
}
function stepsFor(student: StudentRecord, tariffs: Tariff[]): Step[] {
  const contacts = student.familyContacts || [];
  const mother = contacts.find((item) => item.id === "madre") || { id: "madre", firstName: "", lastName: "", relationship: "madre" };
  const father = contacts.find((item) => item.id === "padre") || { id: "padre", firstName: "", lastName: "", relationship: "padre" };
  const options = contacts.filter((item) => item.firstName.trim()).map((item) => ({ value: item.id, label: [item.firstName, item.lastName].filter(Boolean).join(" ") }));
  const rates = [...new Map(tariffs.map((item) => [item.hourlyRateCents, { value: String(item.hourlyRateCents), label: `${item.code} · ${(item.hourlyRateCents / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}` }])).values()];
  if (student.lessonRateCents && !rates.some((item) => item.value === String(student.lessonRateCents))) rates.unshift({ value: String(student.lessonRateCents), label: (student.lessonRateCents / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" }) });
  return [...firstSteps, ...contactSteps(mother, "Madre"), ...contactSteps(father, "Padre"), ...contacts.filter((item) => item.id !== "madre" && item.id !== "padre").flatMap((item) => contactSteps(item, "Altro contatto")),
    step("contact:add", "Famiglia e casa", "Aggiungere un altro contatto?", "add"), { ...step("primaryContactId", "Famiglia e casa", "Referente principale", "choice"), options },
    ...(student.books || []).flatMap((_, index) => [step(`book:${index}:title`, `Libro ${index + 1}`, "Titolo"), step(`book:${index}:publisher`, `Libro ${index + 1}`, "Editore")]),
    step("book:add", "Libri e studio", "Aggiungere un libro?", "add"), ...(student.teachers || []).flatMap(teacherSteps), step("teacher:add", "Professori", "Aggiungere un professore?", "add"),
    ...lastSteps.map((item) => item.id === "lessonRateCents" ? { ...item, options: rates } : item)];
}
function getValue(student: StudentRecord, id: string): string {
  if (id.startsWith("contact:")) { const [, personId, key] = id.split(":"); const person = student.familyContacts?.find((item) => item.id === personId); return key === "whatsapp" ? person?.whatsapp ? "yes" : "no" : String(person?.[key as keyof StudentFamilyContact] || ""); }
  if (id.startsWith("book:")) { const [, number, key] = id.split(":"); return student.books?.[Number(number)]?.[key as "title" | "publisher"] || ""; }
  if (id.startsWith("teacher:")) { const [, personId, key] = id.split(":"); return String(student.teachers?.find((item) => item.id === personId)?.[key as keyof StudentTeacher] || ""); }
  if (id === "subjects") return student.subjects.join(", ");
  if (id === "whatsapp") return student.whatsapp ? "yes" : "no";
  return String(student[id as keyof StudentRecord] || "");
}
function setValue(student: StudentRecord, id: string, raw: string): StudentRecord {
  const value = raw.trim();
  if (id.startsWith("contact:")) {
    const [, personId, key] = id.split(":"); const contacts = [...(student.familyContacts || [])]; const index = contacts.findIndex((item) => item.id === personId);
    const person = index >= 0 ? contacts[index] : { id: personId, firstName: "", lastName: "", relationship: personId };
    const next = { ...person, [key]: key === "whatsapp" ? value === "yes" ? person.phone || "" : "" : value };
    if (key === "phone" && person.whatsapp) next.whatsapp = value;
    if (index >= 0) contacts[index] = next; else contacts.push(next);
    return { ...student, familyContacts: contacts };
  }
  if (id.startsWith("book:")) { const [, number, key] = id.split(":"); return { ...student, books: (student.books || []).map((book, index) => index === Number(number) ? { ...book, [key]: value } : book) }; }
  if (id.startsWith("teacher:")) { const [, personId, key] = id.split(":"); return { ...student, teachers: (student.teachers || []).map((person) => person.id === personId ? { ...person, [key]: value } : person) }; }
  if (id === "subjects") return { ...student, subjects: value.split(",").map((item) => item.trim()).filter(Boolean) };
  if (id === "phone") return { ...student, phone: value, ...(student.whatsapp ? { whatsapp: value } : {}) };
  if (id === "whatsapp") return { ...student, whatsapp: value === "yes" ? student.phone : "" };
  if (id === "lessonDurationMinutes" || id === "lessonRateCents") return { ...student, [id]: value ? Number(value) : undefined };
  return { ...student, [id]: value };
}
function validDate(value: string, birth: boolean) {
  if (!value) return true;
  const [year, month, day] = value.split("-").map(Number); const date = new Date(0); date.setFullYear(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return false;
  return !birth || value <= new Date().toLocaleDateString("sv-SE");
}
function readDraft(): Draft | null {
  for (const name of ["localStorage", "sessionStorage"] as const) try {
    const raw = window[name].getItem(KEY); if (!raw) continue;
    const item: unknown = JSON.parse(raw); if (!item || typeof item !== "object") continue;
    const draft = item as Partial<Draft>;
    if (draft.version === 1 && draft.student && draft.student.id === "" && typeof draft.student.firstName === "string" && typeof draft.student.lastName === "string" && Array.isArray(draft.student.subjects) && draft.student.subjects.every((subject) => typeof subject === "string") &&
      (!draft.student.familyContacts || (Array.isArray(draft.student.familyContacts) && draft.student.familyContacts.every((item) => item && typeof item.id === "string" && typeof item.firstName === "string" && typeof item.lastName === "string"))) &&
      (!draft.student.books || (Array.isArray(draft.student.books) && draft.student.books.every((item) => item && typeof item.title === "string" && typeof item.publisher === "string"))) &&
      (!draft.student.teachers || (Array.isArray(draft.student.teachers) && draft.student.teachers.every((item) => item && typeof item.id === "string" && typeof item.firstName === "string" && typeof item.lastName === "string" && typeof item.subject === "string"))) &&
      Array.isArray(draft.confirmed) && draft.confirmed.every((id) => typeof id === "string") && typeof draft.stepId === "string" && draft.pending && typeof draft.pending === "object" &&
      Object.values(draft.pending).every((value) => typeof value === "string") && stepsFor(draft.student, []).some((step) => step.id === draft.stepId)) return draft as Draft;
  } catch { /* An unreadable draft is left untouched. */ }
  return null;
}
function clearDraft() { for (const name of ["localStorage", "sessionStorage"] as const) try { window[name].removeItem(KEY); } catch { /* The other store may work. */ } }
function display(value: string, kind: Kind) {
  if (kind === "yesno") return value === "yes" ? "Sì" : "No";
  if (kind === "date") { const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(date); }
  return value;
}
function displayStep(item: Step, student: StudentRecord) {
  const value = getValue(student, item.id);
  if (item.id === "primaryContactId") { const person = student.familyContacts?.find((contact) => contact.id === value); return person ? [person.firstName, person.lastName].filter(Boolean).join(" ") : value; }
  if (item.id === "lessonMode" || item.id === "lessonDurationMinutes" || item.id === "lessonRateCents") {
    if (item.id === "lessonRateCents") return (Number(value) / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
    return item.options?.find((option) => option.value === value)?.label || value;
  }
  return display(value, item.kind);
}
function phrase(item: Step): string {
  const fixed: Record<string, string> = {
    firstName: "Il nuovo allievo si chiama", lastName: "Il suo cognome è", birthDate: "È nato/a il", gradeClass: "Frequenta l'anno", section: "La sua sezione è",
    schoolName: "Studia presso", city: "La sua città è", studyCourse: "Segue l'indirizzo di studi", phone: "Il suo cellulare è", whatsapp: "Usa WhatsApp su questo numero:",
    email: "La sua email è", subjects: "Studieremo insieme", address: "Abita in", primaryContactId: "Il referente principale è",
    topicsToDeepen: "Approfondiremo", firstImpressions: "La mia prima impressione è", interests: "Si interessa a", passions: "Le sue passioni sono",
    preferredActivities: "Nel tempo libero ama", personalNotes: "Voglio ricordare", learningStartDate: "Inizieremo le lezioni il", learningGoals: "Gli obiettivi sono",
    lessonMode: "La modalità abituale è", lessonDurationMinutes: "La durata abituale è di", lessonRateCents: "La tariffa abituale è",
  };
  if (fixed[item.id]) return fixed[item.id];
  if (item.id.startsWith("contact:")) return `${item.chapter === "Madre" ? "La madre" : item.chapter === "Padre" ? "Il padre" : "Il contatto"} · ${item.label.toLowerCase()}:`;
  if (item.id.startsWith("book:")) return `${item.chapter} · ${item.label.toLowerCase()}:`;
  return `${item.chapter} · ${item.label.toLowerCase()}:`;
}

export default function GuidedNewStudent({ onSaved }: { onSaved: (student: StudentRecord) => void }) {
  const router = useRouter();
  const [student, setStudent] = useState<StudentRecord>(EMPTY);
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [pending, setPending] = useState<Record<string, string>>({});
  const [stepId, setStepId] = useState("firstName");
  const [resume, setResume] = useState<"loading" | "choose" | "ready">("loading");
  const [candidate, setCandidate] = useState<Draft | null>(null);
  const [editingReturn, setEditingReturn] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [draftWarning, setDraftWarning] = useState("");
  const [saving, setSaving] = useState(false);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [visibleHeight, setVisibleHeight] = useState(0);
  const input = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);
  const saveLock = useRef(false);
  const idRef = useRef("");
  const steps = useMemo(() => stepsFor(student, tariffs), [student, tariffs]);
  const index = Math.max(0, steps.findIndex((item) => item.id === stepId));
  const current = steps[index];
  const value = pending[current.id] ?? getValue(student, current.id);
  const currentPhone = current.id === "whatsapp" ? student.phone : current.id.endsWith(":whatsapp") ? student.familyContacts?.find((item) => item.id === current.id.split(":")[1])?.phone : "";
  const canSave = Boolean((pending.firstName ?? student.firstName).trim() && (pending.lastName ?? student.lastName).trim());

  useEffect(() => {
    const draft = readDraft();
    const frame = window.requestAnimationFrame(() => { setTariffs(loadTariffs()); setCandidate(draft); setResume(draft ? "choose" : "ready"); });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    const resize = () => setVisibleHeight(window.visualViewport?.height || window.innerHeight);
    resize(); window.visualViewport?.addEventListener("resize", resize); window.addEventListener("resize", resize);
    return () => { window.visualViewport?.removeEventListener("resize", resize); window.removeEventListener("resize", resize); };
  }, []);
  useEffect(() => {
    if (resume !== "ready") return;
    const frame = window.requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [stepId, resume]);
  useEffect(() => {
    if (resume !== "ready") return;
    const payload = JSON.stringify({ version: 1, student, confirmed, stepId, pending } satisfies Draft);
    let stored = false;
    try { window.localStorage.setItem(KEY, payload); stored = true; } catch { /* Try temporary storage. */ }
    if (!stored) try { window.sessionStorage.setItem(KEY, payload); stored = true; } catch { /* Report below. */ }
    const frame = window.requestAnimationFrame(() => setDraftWarning(stored ? "" : "La bozza non può essere conservata in questo browser."));
    return () => window.cancelAnimationFrame(frame);
  }, [student, confirmed, stepId, pending, resume]);

  function move(nextIndex: number) {
    setMessage(""); setStepId(steps[Math.min(steps.length - 1, Math.max(0, nextIndex))].id);
  }
  function confirm() {
    if (current.kind === "add") { move(index + 1); return; }
    if (current.required && !value.trim()) { setMessage("Questo dato è obbligatorio."); return; }
    if (current.kind === "date" && !validDate(value, current.id === "birthDate")) { setMessage(current.id === "birthDate" ? "Inserisci una data di nascita valida e non futura." : "Inserisci una data valida."); return; }
    if (current.kind === "yesno" && value === "yes") {
      if (!whatsappNumber(currentPhone)) { setMessage("Inserisci prima un cellulare italiano valido, oppure scegli No."); return; }
    }
    setStudent((previous) => setValue(previous, current.id, value));
    setConfirmed((previous) => previous.includes(current.id) ? previous : [...previous, current.id]);
    setPending((previous) => { const next = { ...previous }; delete next[current.id]; return next; });
    if (editingReturn) { setStepId(editingReturn); setEditingReturn(null); setMessage(""); } else move(index + 1);
  }
  function skip() {
    setMessage("");
    if (editingReturn) {
      setPending((previous) => { const next = { ...previous }; delete next[current.id]; return next; });
      setStepId(editingReturn); setEditingReturn(null);
    } else move(index + 1);
  }
  function addItem() {
    if (current.id === "contact:add") {
      const id = crypto.randomUUID();
      setStudent((previous) => ({ ...previous, familyContacts: [...(previous.familyContacts || []), { id, firstName: "", lastName: "", relationship: "" }] }));
      setStepId(`contact:${id}:firstName`);
    } else if (current.id === "book:add") {
      const number = student.books?.length || 0;
      setStudent((previous) => ({ ...previous, books: [...(previous.books || []), { title: "", publisher: "" }] }));
      setStepId(`book:${number}:title`);
    } else {
      const id = crypto.randomUUID();
      setStudent((previous) => ({ ...previous, teachers: [...(previous.teachers || []), { id, firstName: "", lastName: "", subject: "", phone: "" }] }));
      setStepId(`teacher:${id}:subject`);
    }
    setMessage("");
  }
  function removeCurrent() {
    setStudent((previous) => setValue(previous, current.id, ""));
    setConfirmed((previous) => previous.filter((id) => id !== current.id));
    setPending((previous) => { const next = { ...previous }; delete next[current.id]; return next; });
    setMessage("Dato rimosso.");
  }
  function removeGroup(type: "contact" | "book" | "teacher", token: string) {
    if (type === "contact") setStudent((previous) => ({ ...previous, familyContacts: previous.familyContacts?.filter((item) => item.id !== token), primaryContactId: previous.primaryContactId === token ? "" : previous.primaryContactId }));
    if (type === "book") setStudent((previous) => ({ ...previous, books: previous.books?.filter((_, number) => number !== Number(token)) }));
    if (type === "teacher") setStudent((previous) => ({ ...previous, teachers: previous.teachers?.filter((item) => item.id !== token) }));
    setConfirmed((previous) => previous.filter((id) => !id.startsWith(`${type}:${token}:`)).map((id) => {
      if (type !== "book" || !id.startsWith("book:")) return id;
      const [, number, field] = id.split(":"); return Number(number) > Number(token) ? `book:${Number(number) - 1}:${field}` : id;
    }));
    if (type === "book") setPending((previous) => Object.fromEntries(Object.entries(previous).filter(([id]) => !id.startsWith(`book:${token}:`)).map(([id, value]) => {
      if (!id.startsWith("book:")) return [id, value];
      const [, number, field] = id.split(":"); return [Number(number) > Number(token) ? `book:${Number(number) - 1}:${field}` : id, value];
    })));
    setStepId(`${type}:add`);
  }
  function save() {
    if (saveLock.current || !canSave) { setMessage("Conferma nome e cognome prima di salvare."); return; }
    if (current.kind === "date" && !validDate(value, current.id === "birthDate")) { setMessage("Controlla la data prima di salvare."); return; }
    if (current.kind === "yesno" && value === "yes") {
      if (!whatsappNumber(currentPhone)) { setMessage("Inserisci prima un cellulare italiano valido, oppure scegli No."); return; }
    }
    const source = current.kind !== "add" && Object.hasOwn(pending, current.id) ? setValue(student, current.id, value) : student;
    if (source.birthDate && !validDate(source.birthDate, true)) { setMessage("Controlla la data di nascita."); setStepId("birthDate"); return; }
    idRef.current ||= `studente-${crypto.randomUUID()}`;
    const cleaned = { ...source, books: source.books?.filter((book) => book.title.trim() || book.publisher.trim()), familyContacts: source.familyContacts?.filter((item) => item.firstName || item.lastName || item.phone || item.email), teachers: source.teachers?.filter((item) => item.firstName || item.lastName || item.subject || item.phone) };
    if (cleaned.primaryContactId && !cleaned.familyContacts?.some((item) => item.id === cleaned.primaryContactId)) cleaned.primaryContactId = "";
    const { record, replaceFields } = prepareNarratedStudentSave(cleaned, null, idRef.current, new Date().toLocaleDateString("sv-SE"));
    saveLock.current = true; setSaving(true);
    try {
      const result = saveStoredStudentResult(record, { replaceFields });
      if (result.status === "failed") { setMessage("Salvataggio non riuscito. Controlla lo spazio disponibile nel browser."); return; }
      if (result.status === "temporary") { setMessage(TEMPORARY_SAVE_WARNING); return; }
      const persisted = getStoredStudentById(record.id);
      if (!persisted) { setMessage("Salvataggio non verificabile nel registro. Riprova."); return; }
      clearDraft(); onSaved(persisted); router.replace(`/studenti/nuovo?id=${encodeURIComponent(record.id)}`);
    } finally { saveLock.current = false; setSaving(false); }
  }

  const confirmedSet = new Set(confirmed);
  const narrative = steps.filter((item) => item.kind !== "add" && confirmedSet.has(item.id) && getValue(student, item.id).trim());
  const chapters = [...new Set(narrative.map((item) => item.chapter))];
  return <main className={styles.page} style={visibleHeight ? { height: visibleHeight } : undefined}>
    <div className={styles.sheet}>
      <Image src="/SfondoNuovoStudente.png" alt="" fill preload unoptimized sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <h1 className="sr-only">Nuovo studente</h1>
      <div className={styles.content}>
        <nav className={styles.navigation} aria-label="Navigazione nuovo studente"><Link href="/oggi">OGGI</Link><span aria-disabled="true">CARD STUDENTE</span><Link href="/menu">MENU</Link></nav>
        {resume === "loading" ? null : resume === "choose" ? <section className={styles.choice} aria-labelledby="resume-title">
          <h2 id="resume-title">Una bozza ti aspetta</h2><p>{[candidate?.student.firstName, candidate?.student.lastName].filter(Boolean).join(" ") || "La compilazione precedente"}</p>
          <button type="button" onClick={() => { if (!candidate) return; setStudent(candidate.student); setConfirmed(candidate.confirmed); setPending(candidate.pending); setStepId(candidate.stepId); setResume("ready"); }}>RIPRENDI</button>
          <button type="button" onClick={() => { if (!window.confirm("Eliminare la bozza precedente e iniziare un nuovo studente?")) return; clearDraft(); setStudent(EMPTY); setConfirmed([]); setPending({}); setStepId("firstName"); setResume("ready"); }}>INIZIA NUOVO</button>
        </section> : <>
          <div className={styles.workArea}>
            <section className={styles.question} aria-labelledby="question-title">
              <div className={styles.progress}>Domanda {index + 1} di {steps.length} · {current.chapter}</div>
              <label id="question-title" htmlFor="guided-answer">{current.label} {current.required && <span aria-label="obbligatorio">*</span>}</label>
              {current.kind === "add" ? <button className={styles.add} type="button" onClick={addItem}>+ AGGIUNGI {current.id.startsWith("contact") ? "CONTATTO" : current.id.startsWith("book") ? "LIBRO" : "PROFESSORE"}</button>
                : current.kind === "long" ? <textarea ref={input as React.RefObject<HTMLTextAreaElement>} id="guided-answer" rows={3} className={styles.input} value={value} onChange={(event) => setPending((previous) => ({ ...previous, [current.id]: event.target.value }))} />
                : current.kind === "choice" || current.kind === "yesno" ? <select ref={input as React.RefObject<HTMLSelectElement>} id="guided-answer" className={styles.input} value={value} onChange={(event) => setPending((previous) => ({ ...previous, [current.id]: event.target.value }))}>
                  <option value="">Scegli</option>{current.kind === "yesno" ? <><option value="yes" disabled={!whatsappNumber(currentPhone)}>Sì</option><option value="no">No</option></> : current.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                : <input ref={input as React.RefObject<HTMLInputElement>} id="guided-answer" className={styles.input} type={current.kind} max={current.id === "birthDate" ? new Date().toLocaleDateString("sv-SE") : undefined} value={value} onChange={(event) => setPending((previous) => ({ ...previous, [current.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); confirm(); } }} />}
              {current.kind === "date" && <small>Puoi scegliere la data dal calendario.</small>}
              {(current.id.endsWith(":whatsapp") || current.id === "whatsapp") && <small>WhatsApp usa il cellulare appena indicato.</small>}
              <div className={styles.questionActions}>
                <button type="button" onClick={() => { if (editingReturn) { setStepId(editingReturn); setEditingReturn(null); } else move(index - 1); }} disabled={index === 0 && !editingReturn}>INDIETRO</button>
                {!current.required && <button type="button" onClick={skip}>SALTA DATO</button>}
                {current.kind !== "add" && <button type="button" className={styles.next} onClick={confirm}>AVANTI</button>}
              </div>
              {confirmedSet.has(current.id) && !current.required && current.kind !== "add" && <button className={styles.remove} type="button" onClick={removeCurrent}>Rimuovi dato</button>}
              <p className={styles.message} role="status" aria-live="polite">{message}</p>
            </section>
            <div className={styles.narrative} aria-label="Racconto dello studente">
              <h2>Il suo racconto</h2>
              {chapters.length ? chapters.map((chapter) => <section key={chapter}><h3>{chapter}</h3>
                {narrative.filter((item) => item.chapter === chapter).map((item) => <p key={item.id}>{phrase(item)} <button type="button" aria-label={`Modifica ${item.label}`} onClick={() => { setEditingReturn(current.id); setStepId(item.id); setMessage(""); }}>{displayStep(item, student)}</button>.</p>)}
              </section>) : <p>Il racconto prenderà forma con i dati che confermi.</p>}
              {(student.familyContacts || []).filter((item) => item.id !== "madre" && item.id !== "padre").map((item) => <button key={item.id} type="button" className={styles.removeGroup} onClick={() => removeGroup("contact", item.id)}>Elimina contatto {item.firstName || "aggiunto"}</button>)}
              {(student.books || []).map((book, number) => <button key={number} type="button" className={styles.removeGroup} onClick={() => removeGroup("book", String(number))}>Elimina libro {book.title || number + 1}</button>)}
              {(student.teachers || []).map((item, number) => <button key={item.id} type="button" className={styles.removeGroup} onClick={() => removeGroup("teacher", item.id)}>Elimina professore {item.firstName || number + 1}</button>)}
            </div>
          </div>
          <footer className={styles.footer}><span role="status">{draftWarning}</span><button type="button" disabled={!canSave || saving} onClick={save}>SALVA</button></footer>
        </>}
      </div>
    </div>
  </main>;
}
