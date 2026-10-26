"use client";

import { useState, type FormEvent } from "react";
import { subjects, type SubjectSlug } from "../materie-data";
import { useTopicCatalog } from "../use-topic-catalog";
import { addProgramTopic, completedTopics, moveProgramTopic, removeProgramTopic,
  STATUS_LABELS, TOPIC_STATUSES, type ProgramRecord, type TopicStatus } from "./program-model";
import styles from "./programmi.module.css";

const slugs: SubjectSlug[] = ["matematica", "fisica", "chimica"];

export default function ProgramEditor({ program, studentName, isNew, onChange, onPendingTopicChange, onSave, onCancel, onDelete }:
  { program: ProgramRecord; studentName?: string; isNew: boolean; onChange: (program: ProgramRecord) => void;
    onPendingTopicChange: () => void; onSave: () => void; onCancel: () => void; onDelete: () => void }) {
  const [newTopic, setNewTopic] = useState("");
  const [validation, setValidation] = useState("");
  const catalog = useTopicCatalog();
  const topicSuggestions = catalog?.status === "ready" ? catalog.topics[program.subject].map((topic) => topic.name) : [];

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newTopic.trim()) { setValidation("Premi AGGIUNGI per includere il nuovo argomento prima di salvare."); return; }
    if (!program.name.trim()) { setValidation("Inserisci un nome per il programma."); return; }
    if (program.topics.some((topic) => !topic.name.trim())) {
      setValidation("Dai un nome a ogni argomento oppure rimuovi la riga vuota."); return;
    }
    setValidation("");
    onSave();
  }

  function changeTopic(id: string, patch: { name?: string; status?: TopicStatus }) {
    onChange({ ...program, topics: program.topics.map((topic) => topic.id === id ? { ...topic, ...patch } : topic) });
  }

  return <form className={styles.editor} onSubmit={save}>
    <div className={styles.sectionHead}>
      <h2>{program.kind === "model" ? "Programma modello" : "Programma personale"}</h2>
      <button type="button" onClick={onCancel}>← ELENCO</button>
    </div>
    {program.kind === "personal" && <p className={styles.context}>Studente: {studentName || program.studentId}
      {program.sourceModelId && <span> · Copia indipendente da un modello</span>}</p>}
    <label className={styles.field}>Nome del programma
      <input value={program.name} maxLength={160} onChange={(event) => onChange({ ...program, name: event.target.value })} required />
    </label>
    <label className={styles.field}>Materia
      {program.kind === "model" ? <select value={program.subject} onChange={(event) =>
        onChange({ ...program, subject: event.target.value as SubjectSlug })}>
        {slugs.map((slug) => <option key={slug} value={slug}>{subjects[slug].title}</option>)}
      </select> : <span className={styles.readonly}>{subjects[program.subject].title}</span>}
    </label>
    <label className={styles.field}>Classe, se pertinente
      <input value={program.gradeClass} maxLength={80} onChange={(event) => onChange({ ...program, gradeClass: event.target.value })} />
    </label>
    <label className={styles.field}>Tipo di scuola, se pertinente
      <input value={program.schoolType} maxLength={120} onChange={(event) => onChange({ ...program, schoolType: event.target.value })} />
    </label>
    <div className={styles.sectionHead}><h3>Argomenti nell’ordine scelto</h3>
      {program.kind === "personal" && <span>{completedTopics(program)} di {program.topics.length} completati</span>}
    </div>
    {program.topics.length === 0 && <p className={styles.message}>Nessun argomento inserito.</p>}
    <ol className={styles.topicList}>
      {program.topics.map((topic, index) => <li key={topic.id}>
        <label className={styles.field}><span>Argomento {index + 1}</span>
          <input value={topic.name} maxLength={180} onChange={(event) => changeTopic(topic.id, { name: event.target.value })} />
        </label>
        {program.kind === "personal" && <label className={styles.field}>Stato
          <select value={topic.status} onChange={(event) => changeTopic(topic.id, { status: event.target.value as TopicStatus })}>
            {TOPIC_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
          </select>
        </label>}
        <div className={styles.rowActions}>
          <button type="button" disabled={index === 0} onClick={() => onChange(moveProgramTopic(program, topic.id, -1))} aria-label={`Sposta ${topic.name || "argomento"} su`}>↑ SU</button>
          <button type="button" disabled={index === program.topics.length - 1} onClick={() => onChange(moveProgramTopic(program, topic.id, 1))} aria-label={`Sposta ${topic.name || "argomento"} giù`}>↓ GIÙ</button>
          <button type="button" onClick={() => onChange(removeProgramTopic(program, topic.id))} aria-label={`Rimuovi ${topic.name || "argomento"}`}>RIMUOVI</button>
        </div>
      </li>)}
    </ol>
    <div className={styles.addTopic}>
      <label className={styles.field}>Nuovo argomento
        <input value={newTopic} maxLength={180} list="argomenti-esistenti" onChange={(event) => {
          setNewTopic(event.target.value); onPendingTopicChange();
        }}
          placeholder="Scrivi o scegli un argomento" />
      </label>
      <datalist id="argomenti-esistenti">{topicSuggestions.map((topic) => <option key={topic} value={topic} />)}</datalist>
      <button type="button" disabled={!newTopic.trim()} onClick={() => {
        onChange(addProgramTopic(program, crypto.randomUUID(), newTopic)); setNewTopic("");
      }}>AGGIUNGI</button>
    </div>
    <label className={styles.field}>Note generali
      <textarea rows={4} value={program.notes} onChange={(event) => onChange({ ...program, notes: event.target.value })} />
    </label>
    {validation && <p className={styles.error} role="alert">{validation}</p>}
    <div className={styles.actions}>
      <button type="submit" className={styles.primary}>SALVA PROGRAMMA</button>
      {!isNew && <button type="button" className={styles.danger} onClick={onDelete}>ELIMINA</button>}
    </div>
  </form>;
}
