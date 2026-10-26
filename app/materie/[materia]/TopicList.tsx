"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { type SubjectSlug } from "../materie-data";
import { addTopic, removeTopic, renameTopic, type Topic } from "../topic-catalog";
import { topicDeletionBlocker } from "../topic-dependencies";
import { browserProgramSources } from "../programmi/program-storage";
import { StandardEmptyState, StandardSection, standardInteriorStyles as styles } from "../StandardInterior";

function newTopicId() {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return `topic:${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export default function TopicList({ slug, topics }: { slug: SubjectSlug; topics: Topic[] }) {
  const [mode, setMode] = useState<"add" | "menu" | "edit" | "delete" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function close() { setMode(null); setSelected(null); setName(""); setError(""); }
  function open(mode: "add" | "menu" | "edit" | "delete", topic?: Topic) {
    setMode(mode); setSelected(topic?.id ?? null); setName(topic?.name ?? ""); setError("");
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let result;
    try {
      result = mode === "add" ? addTopic(window.localStorage, slug, name, newTopicId()) :
        mode === "edit" && selected ? renameTopic(window.localStorage, slug, selected, name) : null;
    } catch { setError("Impossibile salvare gli argomenti su questo dispositivo."); return; }
    if (!result) return;
    if (!result.ok) { setError(result.reason); return; }
    close();
  }
  function confirmDelete() {
    const topic = topics.find((item) => item.id === selected);
    if (!topic) { setError("Argomento non trovato."); return; }
    let blocker: string | null;
    try { blocker = topicDeletionBlocker(slug, topic, window.localStorage, window.sessionStorage,
      browserProgramSources()); }
    catch { blocker = "Non è possibile verificare tutti gli archivi: eliminazione bloccata."; }
    if (blocker) { setError(blocker); return; }
    const result = removeTopic(window.localStorage, slug, topic.id);
    if (!result.ok) { setError(result.reason); return; }
    close();
  }

  return <StandardSection title="ARGOMENTI" action={<button type="button" className={styles.addTopic}
    onClick={() => mode === "add" ? close() : open("add")}>+ AGGIUNGI</button>}>
    {mode === "add" && <form className={styles.topicForm} onSubmit={submit}>
      <label htmlFor="nuovo-argomento">Nome del nuovo argomento</label>
      <input id="nuovo-argomento" value={name} maxLength={180} onChange={(event) => setName(event.target.value)} />
      <div className={styles.topicActions}><button type="submit">SALVA</button><button type="button" onClick={close}>ANNULLA</button></div>
      {error && <p role="alert" className={styles.saveError}>{error}</p>}
    </form>}
    {topics.length ? <ul className={styles.list}>{topics.map((topic) => <li key={topic.id} className={styles.row}>
      <div className={styles.topicRow}>
        <Link className={styles.topicLink} href={`/materie/${slug}/argomento?id=${encodeURIComponent(topic.id)}`}>
          <span className={styles.rowText}>{topic.name}</span><span aria-hidden="true">→</span>
        </Link>
        <button type="button" className={styles.topicMenuButton} aria-label={`Opzioni per ${topic.name}`}
          aria-expanded={selected === topic.id && mode !== null}
          onClick={() => selected === topic.id ? close() : open("menu", topic)}>⋯</button>
      </div>
      {selected === topic.id && <div className={styles.topicControls}>
        <div className={styles.topicActions}>
          <button type="button" aria-pressed={mode === "edit"} onClick={() => open("edit", topic)}>MODIFICA</button>
          <button type="button" aria-pressed={mode === "delete"} onClick={() => open("delete", topic)}>ELIMINA</button>
        </div>
        {mode === "edit" && <form className={styles.topicForm} onSubmit={submit}>
          <label htmlFor={`nome-${topic.id}`}>Rinomina {topic.name}</label>
          <input id={`nome-${topic.id}`} value={name} maxLength={180}
            onChange={(event) => setName(event.target.value)} />
          <div className={styles.topicActions}><button type="submit">SALVA</button><button type="button" onClick={close}>ANNULLA</button></div>
        </form>}
        {mode === "delete" && <div className={styles.topicForm}>
          <p>Confermi l’eliminazione di {topic.name}?</p>
          <div className={styles.topicActions}><button type="button" onClick={confirmDelete}>CONFERMA ELIMINA</button>
            <button type="button" onClick={close}>ANNULLA</button></div>
        </div>}
        {error && <p role="alert" className={styles.saveError}>{error}</p>}
      </div>}
    </li>)}</ul> : <StandardEmptyState>Nessun argomento disponibile.</StandardEmptyState>}
  </StandardSection>;
}
