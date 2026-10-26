"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { loadStoredStudents, STUDENTS_STORAGE_KEY } from "../../data/student-storage";
import type { StudentRecord } from "../../data/students";
import { TEMPORARY_SAVE_WARNING } from "../../data/save-result";
import { subjects, type SubjectSlug } from "../materie-data";
import ProgramEditor from "./ProgramEditor";
import { completedTopics, copyModelToStudent, createModel, createPersonal, duplicateModel,
  STATUS_LABELS, TOPIC_STATUSES, studentProgramSubjects,
  type ModelProgram, type PersonalProgram, type ProgramRecord, type TopicStatus } from "./program-model";
import { browserProgramSources, deleteProgram, readProgramArchive, saveProgram,
  type ProgramArchive } from "./program-storage";
import styles from "./programmi.module.css";

type StudentArchive = { status: "loading" | "error" } | { status: "ready"; students: StudentRecord[] };
type Notice = { tone: "success" | "warning" | "error"; text: string } | null;

function readStudents(): StudentArchive {
  try {
    let readable = 0;
    for (const storage of [window.localStorage, window.sessionStorage]) {
      const raw = storage.getItem(STUDENTS_STORAGE_KEY);
      readable += 1;
      if (raw === null) continue;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.some((value) => !value || typeof value !== "object" ||
        typeof value.id !== "string" || typeof value.firstName !== "string")) return { status: "error" };
    }
    return readable ? { status: "ready", students: loadStoredStudents() } : { status: "error" };
  } catch { return { status: "error" }; }
}

function studentName(student: StudentRecord) { return `${student.firstName} ${student.lastName}`.trim(); }
function savedNotice(status: "saved" | "temporary"):
  Notice { return status === "saved" ? { tone: "success", text: "Programma salvato su questo dispositivo." } :
    { tone: "warning", text: `Salvataggio temporaneo. ${TEMPORARY_SAVE_WARNING}` }; }

export default function ProgrammiMateriePage() {
  const [view, setView] = useState<"personal" | "model">("personal");
  const [archive, setArchive] = useState<ProgramArchive | { status: "loading" }>({ status: "loading" });
  const [students, setStudents] = useState<StudentArchive>({ status: "loading" });
  const [editor, setEditor] = useState<ProgramRecord | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [creatingPersonal, setCreatingPersonal] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [subject, setSubject] = useState<SubjectSlug>("matematica");
  const [modelId, setModelId] = useState("");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const workspace = useRef<HTMLElement>(null);

  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      if (!mounted) return;
      setArchive(readProgramArchive(browserProgramSources()));
      setStudents(readStudents());
    };
    queueMicrotask(refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      mounted = false;
      window.removeEventListener("storage", refresh);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const programs = archive.status === "ready" ? archive.programs : [];
  const people = students.status === "ready" ? students.students : [];
  const selectedStudent = people.find((student) => student.id === studentId);
  const allowedSubjects = selectedStudent ? studentProgramSubjects(selectedStudent) : [];
  const selectedModel = programs.find((program): program is ModelProgram => program.kind === "model" && program.id === modelId);
  const availableModels = programs.filter((program): program is ModelProgram => program.kind === "model" && program.subject === subject);
  const canCreate = selectedStudent && allowedSubjects.includes(subject) && (!modelId || selectedModel?.subject === subject);
  const term = query.trim().toLocaleLowerCase("it");
  const visible = programs.filter((program) => {
    if (program.kind !== view) return false;
    const student = program.kind === "personal" ? people.find((item) => item.id === program.studentId) : undefined;
    return !term || [program.name, subjects[program.subject].title, student ? studentName(student) : ""]
      .some((value) => value.toLocaleLowerCase("it").includes(term));
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  function scrollTop() { workspace.current?.scrollTo({ top: 0 }); }
  function openEditor(program: ProgramRecord, fresh = false) {
    if (dirty && !window.confirm("Le modifiche non salvate andranno perse. Continuare?")) return;
    setEditor(program); setIsNew(fresh); setDirty(fresh); setCreatingPersonal(false); setNotice(null); scrollTop();
  }
  function closeEditor() {
    if (dirty && !window.confirm("Le modifiche non salvate andranno perse. Continuare?")) return;
    setEditor(null); setIsNew(false); setDirty(false); setNotice(null); scrollTop();
  }
  function changeView(next: "personal" | "model") {
    if (editor && dirty && !window.confirm("Le modifiche non salvate andranno perse. Continuare?")) return;
    setView(next); setEditor(null); setDirty(false); setCreatingPersonal(false); setNotice(null); setQuery(""); scrollTop();
  }
  function createPersonalFlow(model?: ModelProgram) {
    if (dirty && !window.confirm("Le modifiche non salvate andranno perse. Continuare?")) return;
    setView("personal"); setEditor(null); setDirty(false); setCreatingPersonal(true);
    setStudentId(""); setSubject(model?.subject ?? "matematica"); setModelId(model?.id ?? "");
    setNotice(null); scrollTop();
  }
  function beginPersonal() {
    if (!canCreate || !selectedStudent) return;
    const now = new Date().toISOString();
    const draft = selectedModel
      ? copyModelToStudent(selectedModel, crypto.randomUUID(), now, selectedStudent.id, () => crypto.randomUUID())
      : createPersonal(crypto.randomUUID(), now, selectedStudent.id, subject);
    if (!selectedModel) draft.name = `Programma di ${subjects[subject].title}`;
    setEditor(draft); setIsNew(true); setDirty(true); setCreatingPersonal(false); setNotice(null); scrollTop();
  }
  function saveCurrent() {
    if (!editor) return;
    if (editor.kind === "personal" && isNew) {
      const student = people.find((item) => item.id === editor.studentId);
      if (!student || !studentProgramSubjects(student).includes(editor.subject)) {
        setNotice({ tone: "error", text: "Lo studente o la materia associata non è più disponibile. Il programma non è stato salvato." }); return;
      }
    }
    const outcome = saveProgram(browserProgramSources(), editor);
    if (outcome.result.status === "failed" || !outcome.program || outcome.archive?.status !== "ready") {
      setNotice({ tone: "error", text: "Salvataggio non riuscito. Le modifiche restano aperte in questa pagina." }); return;
    }
    setArchive(outcome.archive); setEditor(outcome.program); setIsNew(false); setDirty(false);
    setNotice(savedNotice(outcome.result.status));
  }
  function remove(id: string, kind: "model" | "personal") {
    const label = kind === "model" ? "il modello" : "il programma personale";
    if (!window.confirm(`Eliminare ${label}? I programmi personali già copiati da un modello resteranno disponibili.`)) return;
    const outcome = deleteProgram(browserProgramSources(), id);
    if (outcome.result.status === "failed" || outcome.archive?.status !== "ready") {
      setNotice({ tone: "error", text: "Eliminazione non riuscita. I dati sono rimasti disponibili." }); return;
    }
    setArchive(outcome.archive); setEditor(null); setIsNew(false); setDirty(false);
    setNotice(outcome.result.status === "temporary"
      ? { tone: "warning", text: `Eliminazione temporanea. ${TEMPORARY_SAVE_WARNING}` }
      : { tone: "success", text: "Programma eliminato." });
  }
  function duplicate(model: ModelProgram) {
    const copy = duplicateModel(model, crypto.randomUUID(), new Date().toISOString(), () => crypto.randomUUID());
    const outcome = saveProgram(browserProgramSources(), copy);
    if (outcome.result.status === "failed" || !outcome.program || outcome.archive?.status !== "ready") {
      setEditor(copy); setIsNew(true); setDirty(true); setNotice({ tone: "error", text: "La copia non è stata salvata. Resta aperta per riprovare." });
    } else {
      setArchive(outcome.archive); setEditor(outcome.program); setIsNew(false); setDirty(false);
      setNotice(savedNotice(outcome.result.status));
    }
    scrollTop();
  }
  function changeQuickStatus(program: PersonalProgram, topicId: string, status: TopicStatus) {
    const next: PersonalProgram = { ...program, topics: program.topics.map((topic) =>
      topic.id === topicId ? { ...topic, status } : topic) };
    const outcome = saveProgram(browserProgramSources(), next);
    if (outcome.result.status === "failed" || !outcome.program || outcome.archive?.status !== "ready") {
      setEditor(next); setIsNew(false); setDirty(true);
      setNotice({ tone: "error", text: "Stato non salvato. La modifica resta aperta per riprovare." });
      scrollTop(); return;
    }
    setArchive(outcome.archive);
    setNotice(savedNotice(outcome.result.status));
  }

  return <main className={styles.page}><div className={styles.sheet}>
    <Image src="/SfondoProgrammiMaterie.png" alt="" fill preload unoptimized
      sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
    <h1 className="sr-only">Programmi</h1>
    <nav className={styles.navigation} aria-label="Navigazione Programmi">
      <Link href="/oggi">OGGI</Link><Link href="/materie">← MATERIE</Link><Link href="/menu">MENU</Link>
    </nav>
    <section ref={workspace} className={styles.workspace} aria-label="Gestione programmi">
      <div className={styles.tabs} role="group" aria-label="Tipologia dei programmi">
        <button type="button" aria-pressed={view === "personal"} onClick={() => changeView("personal")}>I MIEI PROGRAMMI</button>
        <button type="button" aria-pressed={view === "model"} onClick={() => changeView("model")}>PROGRAMMI MODELLO</button>
      </div>
      {notice && <p className={styles[notice.tone]} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p>}
      {archive.status === "loading" && <p className={styles.message} role="status">Caricamento programmi…</p>}
      {archive.status === "error" && <div className={styles.error} role="alert">
        <p>L’archivio programmi non è leggibile. Nessun dato è stato modificato.</p>
        <button type="button" onClick={() => setArchive(readProgramArchive(browserProgramSources()))}>RIPROVA</button>
      </div>}
      {archive.status === "ready" && archive.limited && <p className={styles.warning} role="status">
        Uno degli archivi del browser non è accessibile. Verifica i programmi prima di modificarli.
      </p>}

      {editor && <ProgramEditor program={editor}
        studentName={editor.kind === "personal" ? (() => {
          const person = people.find((item) => item.id === editor.studentId);
          return person ? studentName(person) : "Studente non disponibile";
        })() : undefined}
        isNew={isNew} onChange={(next) => { setEditor(next); setDirty(true); }}
        onPendingTopicChange={() => setDirty(true)}
        onSave={saveCurrent} onCancel={closeEditor} onDelete={() => remove(editor.id, editor.kind)} />}

      {archive.status === "ready" && !editor && creatingPersonal && <section className={styles.creation}>
        <div className={styles.sectionHead}><h2>Nuovo programma personale</h2>
          <button type="button" onClick={() => setCreatingPersonal(false)}>← ELENCO</button></div>
        {students.status === "loading" && <p className={styles.message}>Caricamento studenti…</p>}
        {students.status === "error" && <div className={styles.error} role="alert">
          <p>L’archivio studenti non è leggibile.</p><button type="button" onClick={() => setStudents(readStudents())}>RIPROVA</button>
        </div>}
        {students.status === "ready" && <>
          <label className={styles.field}>Studente
            <select value={studentId} onChange={(event) => {
              const nextId = event.target.value;
              const nextStudent = people.find((person) => person.id === nextId);
              const options = nextStudent ? studentProgramSubjects(nextStudent) : [];
              setStudentId(nextId);
              if (!modelId && options.length && !options.includes(subject)) setSubject(options[0]);
            }}><option value="">Seleziona uno studente</option>
              {[...people].sort((a, b) => studentName(a).localeCompare(studentName(b), "it"))
                .map((person) => <option key={person.id} value={person.id}>{studentName(person)}{person.status === "archived" ? " (archiviato)" : ""}</option>)}
            </select>
          </label>
          {selectedStudent && <>
            {allowedSubjects.length ? <label className={styles.field}>Materia associata
              <select value={allowedSubjects.includes(subject) ? subject : ""} onChange={(event) => {
                setSubject(event.target.value as SubjectSlug); setModelId("");
              }}>{!allowedSubjects.includes(subject) && <option value="">Seleziona una materia</option>}
                {allowedSubjects.map((slug) => <option key={slug} value={slug}>{subjects[slug].title}</option>)}
              </select>
            </label> : <p className={styles.message}>Lo studente non ha una delle tre materie associate.</p>}
            {allowedSubjects.includes(subject) && <label className={styles.field}>Punto di partenza
              <select value={modelId && selectedModel?.subject === subject ? modelId : ""}
                onChange={(event) => setModelId(event.target.value)}>
                <option value="">Programma da zero</option>
                {availableModels.map((model) => <option key={model.id} value={model.id}>Copia: {model.name}</option>)}
              </select>
            </label>}
            {modelId && !canCreate && <p className={styles.error}>Il modello scelto non corrisponde alle materie dello studente.</p>}
          </>}
          <button type="button" className={styles.primary} disabled={!canCreate} onClick={beginPersonal}>CONTINUA</button>
        </>}
      </section>}

      {archive.status === "ready" && !editor && !creatingPersonal && <>
        <div className={styles.sectionHead}>
          <h2>{view === "personal" ? "I miei programmi" : "Programmi modello"}</h2>
          <button type="button" onClick={() => view === "personal" ? createPersonalFlow() :
            openEditor(createModel(crypto.randomUUID(), new Date().toISOString()), true)}>
            {view === "personal" ? "+ NUOVO" : "+ NUOVO MODELLO"}
          </button>
        </div>
        <label className={styles.field}>Cerca per {view === "personal" ? "studente, materia o programma" : "materia o programma"}
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca" />
        </label>
        {visible.length ? <ul className={styles.cards}>
          {visible.map((program) => {
            const person = program.kind === "personal" ? people.find((item) => item.id === program.studentId) : undefined;
            return <li key={program.id}>
              <h3>{program.name}</h3>
              <p>{subjects[program.subject].title}{program.gradeClass && ` · Classe ${program.gradeClass}`}
                {program.schoolType && ` · ${program.schoolType}`}</p>
              {program.kind === "personal" && <>
                <p>{person ? studentName(person) : `Studente ${program.studentId}`}{person?.status === "archived" && " · ARCHIVIATO"}</p>
                <p>{completedTopics(program)} di {program.topics.length} argomenti completati</p>
                {program.sourceModelId && !programs.some((item) => item.id === program.sourceModelId) &&
                  <p>Modello di origine non più disponibile; questa copia resta modificabile.</p>}
                {program.topics.length > 0 && <details className={styles.quickProgress}>
                  <summary>AGGIORNA AVANZAMENTO</summary>
                  {program.topics.map((topic) => <label className={styles.field} key={topic.id}>{topic.name}
                    <select value={topic.status} onChange={(event) =>
                      changeQuickStatus(program, topic.id, event.target.value as TopicStatus)}>
                      {TOPIC_STATUSES.map((status) => <option value={status} key={status}>{STATUS_LABELS[status]}</option>)}
                    </select>
                  </label>)}
                </details>}
              </>}
              <div className={styles.rowActions}>
                <button type="button" onClick={() => openEditor(program)}>APRI / MODIFICA</button>
                {program.kind === "model" && <>
                  <button type="button" onClick={() => duplicate(program)}>DUPLICA</button>
                  <button type="button" onClick={() => createPersonalFlow(program)}>ASSEGNA</button>
                </>}
                <button type="button" className={styles.danger} onClick={() => remove(program.id, program.kind)}>ELIMINA</button>
              </div>
            </li>;
          })}
        </ul> : <p className={styles.message} role="status">{query ? "Nessun programma corrisponde alla ricerca." :
          view === "personal" ? "Nessun programma personale." : "Nessun programma modello."}</p>}
      </>}
    </section>
  </div></main>;
}
