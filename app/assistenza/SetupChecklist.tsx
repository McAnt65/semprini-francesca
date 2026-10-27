"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readSetupChecks, type SetupCheck } from "./checklist-model";
import styles from "./guide.module.css";

export default function SetupChecklist() {
  const [checks, setChecks] = useState<SetupCheck[] | null>(null);
  useEffect(() => {
    const refresh = () => setChecks(readSetupChecks());
    queueMicrotask(refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("pageshow", refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("pageshow", refresh); };
  }, []);

  const unreadable = checks?.some((item) => item.status === "unreadable");
  return <section className={styles.checklist} aria-labelledby="setup-title">
    <h2 id="setup-title">La tua configurazione</h2>
    <p>Questa lista legge i dati salvati nel browser senza modificarli. Non serve registrare un pagamento per completarla.</p>
    {checks === null ? <p role="status">Lettura della configurazione…</p> : <>
      <p className={styles.count}>{checks.filter((item) => item.status === "completed").length} di {checks.length} passaggi completati</p>
      {unreadable && <p role="alert">Alcuni archivi non sono leggibili. Riprova quando i dati sono disponibili.</p>}
      <ul>{checks.map((item) => <li key={item.label}>
        <span aria-hidden="true" className={item.status === "completed" ? styles.done : styles.todo}>
          {item.status === "completed" ? "✓" : item.status === "unreadable" ? "!" : "○"}
        </span>
        <span>{item.label} · {item.status === "completed" ? "Completato" :
          item.status === "unreadable" ? "Dati non leggibili" : "Da configurare"}</span>
        {item.status === "todo" && <Link href={item.href}>{item.action} →</Link>}
      </li>)}</ul>
      {unreadable && <button type="button" onClick={() => setChecks(readSetupChecks())}>Rileggi dati</button>}
    </>}
  </section>;
}
