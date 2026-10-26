"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { addDays, isLocalDate, parseLocalDate, parseLocalTime, toLocalDate } from "../../data/calendario/calendar-dates";
import { selectDayOccurrences } from "../../data/calendario/calendar-selectors";
import { loadCalendarAppointments, loadCalendarSeries } from "../../data/calendario/calendar-storage";
import type { CalendarAppointment, CalendarOccurrence, CalendarSeries, LessonMode, LessonStatus } from "../../data/calendario/calendar-types";
import { calendarSelectionHref, evaluateCalendarSelection, loadNewLessonDraft, returnToNewLessonHref, saveNewLessonDraft, validSelectionToken } from "../nuova/lesson-selection";
import { lessonEditHref } from "../lesson-navigation";
import styles from "./day.module.css";

const months = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const weekdays = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const modes: Record<LessonMode, string> = { casa: "Casa", domicilio: "A domicilio", online: "Online" };
const statusLabels: Record<LessonStatus, string> = {
  confermata: "Confermata",
  attesa: "In attesa",
  richiesta: "Richiesta",
  svolta: "SVOLTA",
  annullata: "Annullata",
};
const FIRST = 480;
const HALF_HOUR = 30;
const LAST = 1320;

export default function DayPage() {
  return <Suspense fallback={<main className={styles.page} />}><Day /></Suspense>;
}

function Day() {
  const router = useRouter();
  const search = useSearchParams();
  const today = useMemo(() => toLocalDate(new Date()), []);
  const requested = search.get("data");
  const selected = isLocalDate(requested) ? requested : today;
  const fromView = search.get("vista");
  const calendarReturn = fromView === "mese" ? "/calendario/mese?data=" + selected
    : fromView === "settimana" ? "/calendario/settimana?data=" + selected : "/calendario/giorno?data=" + selected;
  const rawToken = search.get("seleziona");
  const [selectionToken, setSelectionToken] = useState<string | undefined>();
  useEffect(() => {
    queueMicrotask(() => setSelectionToken(validSelectionToken(rawToken) && loadNewLessonDraft(rawToken) ? rawToken : undefined));
  }, [rawToken]);
  const editing = selectionToken ? loadNewLessonDraft(selectionToken)?.editing : undefined;
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [series, setSeries] = useState<CalendarSeries[]>([]);
  const [selectionError, setSelectionError] = useState("");
  const scroll = useRef<HTMLElement>(null);
  useEffect(() => {
    queueMicrotask(() => {
      setAppointments(loadCalendarAppointments());
      setSeries(loadCalendarSeries());
    });
  }, []);

  const lessons = useMemo(() => selectDayOccurrences(appointments, series, selected).sort((a, b) => a.startTime.localeCompare(b.startTime)), [appointments, series, selected]);
  const placed = useMemo(() => layout(lessons), [lessons]);
  const active = lessons.filter((item) => item.status !== "annullata");
  const total = active.reduce((sum, item) => sum + item.durationMinutes, 0);
  const parts = parseLocalDate(selected)!;
  const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  const title = weekdays[weekday] + " " + parts.day + " " + months[parts.month - 1] + " " + parts.year;
  const firstTime = active[0]?.startTime;
  useEffect(() => {
    const time = parseLocalTime(firstTime);
    const minute = time ? Math.max(FIRST, Math.min(LAST - HALF_HOUR, FIRST + Math.floor((time.hour * 60 + time.minute - FIRST) / HALF_HOUR) * HALF_HOUR)) : FIRST;
    const row = scroll.current?.querySelector<HTMLElement>('[data-minute="' + minute + '"]');
    if (scroll.current) scroll.current.scrollTop = Math.max(0, (row?.offsetTop ?? 0) - 8);
  }, [selected, firstTime]);

  function showSelectionError(message: string) {
    setSelectionError(message);
    if (scroll.current) scroll.current.scrollTop = 0;
  }

  function choose(time: string) {
    if (!selectionToken) return;
    const draft = loadNewLessonDraft(selectionToken);
    if (!draft) { showSelectionError("La selezione è scaduta. Torna a Nuova Lezione."); return; }
    const result = evaluateCalendarSelection(draft, selected, time, loadCalendarAppointments(), loadCalendarSeries());
    if (result.state === "conflict") {
      showSelectionError("Fascia occupata: " + result.occurrence.studentNameSnapshot + ", " + result.occurrence.date + " alle " + result.occurrence.startTime + "."); return;
    }
    if (result.state === "incomplete") { showSelectionError(result.reason); return; }
    if (!saveNewLessonDraft(selectionToken, { ...draft, date: selected, time })) {
      showSelectionError("Impossibile conservare la scelta in questo browser."); return;
    }
    router.push(returnToNewLessonHref(selectionToken, selected, time));
  }

  function navigate(date: string) {
    if (selectionToken) return calendarSelectionHref("day", date, selectionToken);
    const source = fromView === "mese" || fromView === "settimana" ? "&vista=" + fromView : "";
    return "/calendario/giorno?data=" + date + source;
  }

  function viewHref(view: "month" | "week" | "day") {
    if (selectionToken) return calendarSelectionHref(view, selected, selectionToken);
    const path = view === "month" ? "mese" : view === "week" ? "settimana" : "giorno";
    return "/calendario/" + path + "?data=" + selected;
  }

  return <main className={styles.page}>
    <div className={styles.sheet}>
      <Image src="/SfondoGiornoCalendario.png" alt="" fill priority unoptimized sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <h1 className="sr-only">Calendario, vista giorno</h1>

      <nav className={styles.views} aria-label="Viste del calendario">
        <Link href={viewHref("month")}>MESE</Link>
        <Link href={viewHref("week")}>SETTIMANA</Link>
        <Link href={viewHref("day")} aria-current="page">GIORNO</Link>
      </nav>

      <div className={styles.dateSelector}>
        <button type="button" onClick={() => router.push(navigate(addDays(selected, -1)))} aria-label="Giorno precedente">‹</button>
        <h2 aria-live="polite" className={selected === today ? styles.today : undefined}>{title}</h2>
        <button type="button" onClick={() => router.push(navigate(addDays(selected, 1)))} aria-label="Giorno successivo">›</button>
      </div>

      <div className={styles.context}>
        {selectionToken
          ? <Link href={returnToNewLessonHref(selectionToken)} className={styles.returnLink}>TORNA ALLA LEZIONE</Link>
          : <p className={styles.summary}>{active.length} {active.length === 1 ? "lezione" : "lezioni"} · {total % 60 ? Math.floor(total / 60) + " ore " + total % 60 + " min" : total / 60 + (total === 60 ? " ora" : " ore")}</p>}
      </div>

      <section aria-label={"Agenda di " + title} ref={scroll} className={styles.agenda}>
        {selectionError && <p role="alert" className={styles.selectionError}>{selectionError}</p>}
        <div className={styles.timeline}>
          {Array.from({ length: (LAST - FIRST) / HALF_HOUR }, (_, index) => {
            const minute = FIRST + index * HALF_HOUR;
            const time = String(Math.floor(minute / 60)).padStart(2, "0") + ":" + String(minute % 60).padStart(2, "0");
            const occupied = active.some((item) => {
              const t = parseLocalTime(item.startTime);
              const start = t ? t.hour * 60 + t.minute : 0;
              return minute < start + item.durationMinutes && start < minute + HALF_HOUR;
            });
            const atTime = placed.filter((entry) => entry.start >= minute && entry.start < minute + HALF_HOUR);
            return <div key={time} data-minute={minute} data-occupied={occupied ? "true" : undefined} className={styles.slot}>
              {selectionToken
                ? <button type="button" onClick={() => choose(time)} aria-label={time + ", " + (occupied ? "fascia occupata" : "fascia libera")} className={styles.slotAction}>{time}</button>
                : <Link href={"/calendario/nuova?data=" + selected + "&ora=" + time} aria-label={"Nuova lezione alle " + time} className={styles.slotAction}>{time}</Link>}
              <div className={styles.slotLessons}>
                {atTime.map(({ item }) => {
                  const content = <>
                    <span className={styles.lessonPrimary}>
                      {item.startTime !== time && <span className={styles.offsetTime}>{item.startTime}</span>}
                      <span className={styles.studentName}>{item.studentNameSnapshot}</span>
                    </span>
                    <span className={styles.subject}>{item.subject}</span>
                    <span className={styles.lessonDetails}>
                      <span>{item.durationMinutes} min · {modes[item.mode]} ·</span>
                      <span className={item.status === "svolta" ? styles.completedStatus : undefined}>{statusLabels[item.status]}</span>
                      {item.isException && item.status !== "annullata" && <span>· Modificata</span>}
                    </span>
                  </>;
                  const ownLesson = editing && (
                    (item.appointmentId && item.appointmentId === editing.exclude.appointmentId) ||
                    (editing.exclude.seriesId && item.seriesId === editing.exclude.seriesId && item.originalOccurrenceDate === editing.exclude.originalOccurrenceDate)
                  );
                  return selectionToken
                    ? <button key={item.occurrenceId} type="button" onClick={() => item.status === "annullata" || ownLesson ? choose(item.startTime) : showSelectionError("Fascia occupata: " + item.studentNameSnapshot + ", " + item.date + " alle " + item.startTime + ".")} aria-label={item.studentNameSnapshot + ", " + item.startTime + ", " + item.status} className={styles.lesson}>{content}</button>
                    : <Link key={item.occurrenceId} href={lessonEditHref(item, calendarReturn)} aria-label={"Modifica " + item.studentNameSnapshot + " alle " + item.startTime} className={styles.lesson}>{content}</Link>;
                })}
              </div>
            </div>;
          })}
          <span className={styles.timelineEnd}>22:00</span>
        </div>
      </section>

      <nav className={styles.bottomNavigation} aria-label="Navigazione della pagina">
        <Link href="/oggi">OGGI</Link>
        <Link href="/menu">MENU</Link>
      </nav>
    </div>
  </main>;
}

function layout(items: CalendarOccurrence[]) {
  const valid = items.map((item) => {
    const time = parseLocalTime(item.startTime);
    if (!time) return null;
    const start = Math.max(FIRST, time.hour * 60 + time.minute);
    const end = Math.min(LAST, time.hour * 60 + time.minute + item.durationMinutes);
    return end > start ? { item, start, end, lane: 0, lanes: 1 } : null;
  }).filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => a.start - b.start);
  let cluster: typeof valid = [], clusterEnd = 0;
  function assign() {
    const ends: number[] = [];
    for (const item of cluster) {
      let lane = ends.findIndex((end) => end <= item.start);
      if (lane < 0) { lane = ends.length; ends.push(item.end); } else ends[lane] = item.end;
      item.lane = lane;
    }
    for (const item of cluster) item.lanes = ends.length;
  }
  for (const item of valid) {
    if (cluster.length && item.start >= clusterEnd) { assign(); cluster = []; }
    cluster.push(item); clusterEnd = Math.max(clusterEnd, item.end);
  }
  if (cluster.length) assign();
  return valid;
}
