"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TOURS, topicForPath } from "./content";
import { emptyProgress, moveTourProgress, pauseTourProgress, readProgress, requestTour, START_TOUR_EVENT, startTourProgress, writeProgress, type AssistanceProgress } from "./progress";
import styles from "./assistance.module.css";

export default function AssistanceUI() {
  const pathname = usePathname();
  const router = useRouter();
  const [progress, setProgress] = useState<AssistanceProgress>(emptyProgress);
  const [ready, setReady] = useState(false);
  const [helpPath, setHelpPath] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const topic = topicForPath(pathname);
  const active = progress.activeTour ? TOURS[progress.activeTour] : null;
  const stepIndex = progress.activeTour ? progress.steps[progress.activeTour] : 0;
  const step = active?.steps[stepIndex];
  const welcome = pathname === "/menu" && !progress.dismissedWelcome && !active;
  const showHelp = helpPath === pathname;

  useEffect(() => {
    queueMicrotask(() => { setProgress(readProgress()); setReady(true); });
    const refresh = () => setProgress(readProgress());
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  useEffect(() => {
    queueMicrotask(() => setHelpPath(null));
  }, [pathname]);

  useEffect(() => {
    if (!ready || (!welcome && (!active || minimized))) return;
    const showPanel = () => {
      if (panelRef.current) window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
    };
    const frame = requestAnimationFrame(showPanel);
    const afterNavigation = window.setTimeout(showPanel, 160);
    return () => { cancelAnimationFrame(frame); window.clearTimeout(afterNavigation); };
  }, [ready, welcome, active, minimized, pathname, stepIndex]);

  useEffect(() => {
    document.body.classList.toggle("assistance-tour-open", ready && (welcome || Boolean(active)));
    return () => document.body.classList.remove("assistance-tour-open");
  }, [ready, welcome, active]);

  function change(next: AssistanceProgress) {
    setProgress(next);
    setStorageWarning(!writeProgress(next));
  }

  useEffect(() => {
    const start = (event: Event) => {
      const { id, resume } = (event as CustomEvent<{ id: keyof typeof TOURS; resume: boolean }>).detail;
      if (!Object.prototype.hasOwnProperty.call(TOURS, id)) return;
      const next = startTourProgress(readProgress(), id, resume);
      const step = next.steps[id];
      setProgress(next);
      setStorageWarning(!writeProgress(next));
      setHelpPath(null);
      setMinimized(false);
      router.push(TOURS[id].steps[step].href);
    };
    window.addEventListener(START_TOUR_EVENT, start);
    return () => window.removeEventListener(START_TOUR_EVENT, start);
  }, [router]);

  if (!ready || pathname === "/" || pathname === "/benvenuto" || pathname.startsWith("/test-dati")) return null;

  function move(index: number) {
    if (!active || !progress.activeTour) return;
    change(moveTourProgress(progress, index));
    if (index >= active.steps.length) return;
    setMinimized(false);
    router.push(active.steps[index].href);
  }

  return <>
    {topic && !active && !welcome && !pathname.startsWith("/impostazioni") &&
      <button type="button" className={styles.helpTab} onClick={() => setHelpPath((current) => current === pathname ? null : pathname)}
        aria-expanded={showHelp} aria-controls="context-help">Aiuto</button>}
    {showHelp && topic && !active && <aside id="context-help" className={styles.context} aria-label={`Aiuto: ${topic.title}`}>
      <button type="button" className={styles.close} onClick={() => setHelpPath(null)} aria-label="Chiudi aiuto">×</button>
      <h2>{topic.title}</h2><p>{topic.summary}</p>
      <Link href={`/impostazioni/guida#${topic.id}`} onClick={() => setHelpPath(null)}>Leggi la guida →</Link>
    </aside>}
    {welcome && <aside ref={panelRef} className={styles.panel} aria-label="Benvenuta nel Registro">
      <p className={styles.eyebrow}>PRIMO UTILIZZO</p>
      <h2>Facciamo un giro nel Registro?</h2>
      <p>Ti accompagno nelle sezioni reali. Puoi interrompere il tour in qualsiasi momento; nessun dato viene creato automaticamente.</p>
      <div className={styles.actions}>
        <button type="button" onClick={() => requestTour("primi-passi")}>Inizia il tour</button>
        <button type="button" onClick={() => change({ ...progress, dismissedWelcome: true })}>Non ora</button>
      </div>
    </aside>}
    {active && step && minimized && <aside className={styles.minimized} aria-label={`${active.title}, passo ${stepIndex + 1}`}>
      <span>{active.title} · {stepIndex + 1}/{active.steps.length}</span>
      <button type="button" onClick={() => setMinimized(false)}>Espandi</button>
      <button type="button" onClick={() => change(pauseTourProgress(progress))}>Interrompi</button>
    </aside>}
    {active && step && !minimized && <aside ref={panelRef} className={styles.panel} aria-label={`${active.title}, passo ${stepIndex + 1}`}>
      <p className={styles.eyebrow}>{active.title.toUpperCase()} · {stepIndex + 1} DI {active.steps.length}</p>
      <h2>{step.title}</h2><p>{step.description}</p>
      <div className={styles.actions}>
        <button type="button" onClick={() => setMinimized(true)}>Riduci</button>
        {pathname !== step.href && <Link href={step.href}>{step.action}</Link>}
        {stepIndex > 0 && <button type="button" onClick={() => move(stepIndex - 1)}>Precedente</button>}
        <button type="button" onClick={() => move(stepIndex + 1)}>{stepIndex === active.steps.length - 1 ? "Termina" : "Passo successivo"}</button>
        <button type="button" onClick={() => change(pauseTourProgress(progress))}>Interrompi</button>
      </div>
      {storageWarning && <p role="status">Il browser non consente di conservare i progressi: il tour resta disponibile in questa sessione.</p>}
    </aside>}
  </>;
}
