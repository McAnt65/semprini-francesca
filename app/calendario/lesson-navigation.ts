import { isLocalDate } from "../data/calendario/calendar-dates";
import type { CalendarOccurrence } from "../data/calendario/calendar-types";
import type { SaveResult } from "../data/save-result";

/** Accept only destinations that belong to the lesson workflow. Never follow arbitrary URLs. */
export function lessonReturnHref(raw: string | null, occurrenceDate: string): string {
  const fallback = isLocalDate(occurrenceDate)
    ? `/calendario/giorno?data=${encodeURIComponent(occurrenceDate)}` : "/calendario/giorno";
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  let url: URL;
  try { url = new URL(raw, "https://registro.invalid"); } catch { return fallback; }
  if (url.origin !== "https://registro.invalid" || url.hash || raw.split("?")[0] !== url.pathname) return fallback;
  const path = url.pathname;
  if (path === "/oggi") {
    const day = url.searchParams.get("giorno");
    if ([...url.searchParams.keys()].some((key) => key !== "giorno") || (day !== null && day !== "domani")) return fallback;
    return day === "domani" ? "/oggi?giorno=domani" : "/oggi";
  }
  if (["/lezioni/in-programma", "/lezioni/storico", "/lezioni/diario"].includes(path)) return url.search ? fallback : path;
  if (path === "/studenti/diario") {
    const id = url.searchParams.get("id");
    return id && validStudentId(id) && [...url.searchParams.keys()].every((key) => key === "id")
      ? `/studenti/diario?id=${encodeURIComponent(id)}` : fallback;
  }
  const singleDiary = /^\/studenti\/([^/]+)\/lezioni$/.exec(path);
  if (singleDiary) {
    let id: string;
    try { id = decodeURIComponent(singleDiary[1]); } catch { return fallback; }
    return validStudentId(id) && !url.search ? `/studenti/${encodeURIComponent(id)}/lezioni` : fallback;
  }
  if (["/calendario", "/calendario/mese", "/calendario/settimana", "/calendario/giorno"].includes(path)) {
    const date = url.searchParams.get("data");
    return date && isLocalDate(date) && [...url.searchParams.keys()].every((key) => key === "data")
      ? `${path === "/calendario" ? "/calendario/mese" : path}?data=${encodeURIComponent(date)}` : fallback;
  }
  return fallback;
}

function validStudentId(id: string) {
  return id.length > 0 && id.length <= 200 && !/[\u0000-\u001f\/\\]/.test(id);
}

export function lessonEditHref(lesson: CalendarOccurrence, returnTo: string): string {
  const id = lesson.appointmentId ?? lesson.occurrenceId;
  const query = new URLSearchParams({ data: lesson.date, ritorno: returnTo });
  return `/calendario/${encodeURIComponent(id)}/modifica?${query.toString()}`;
}

export function lessonSaveDestination(result: SaveResult, returnTo: string): string | null {
  return result.status === "saved" ? returnTo : null;
}
