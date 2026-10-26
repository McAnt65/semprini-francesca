import type { CalendarOccurrence } from "../../data/calendario/calendar-types";
import type { LessonLocation } from "../../data/lesson-location";
import type { StudentRecord } from "../../data/students";
import { availableIntervalMinutes } from "./upcoming-lessons";

export type RouteAddress = {
  street: string;
  number: string;
  city: string;
  province?: string;
  postalCode?: string;
  country: string;
};

export type TransferLink = {
  id: string;
  kind: "first" | "between";
  from: RouteAddress;
  to: RouteAddress;
  interval?: number;
};

export function addressFor(lesson: CalendarOccurrence, students: StudentRecord[], location: LessonLocation): RouteAddress | null {
  if (lesson.mode === "online") return null;
  if (lesson.mode === "casa") {
    if (!location.street.trim() || !location.streetNumber.trim() || !location.city.trim() || !location.country.trim()) return null;
    return { street: location.street.trim(), number: location.streetNumber.trim(), city: location.city.trim(), province: location.province.trim(), country: location.country.trim() };
  }
  const student = students.find((item) => item.id === lesson.studentId);
  const match = student?.address.trim().match(/^(.+?)[,\s]+(\d+[a-zA-Z]?)$/);
  if (!student || !match || !student.city.trim()) return null;
  return { street: match[1].trim(), number: match[2], city: student.city.trim(), province: student.province?.trim(), postalCode: student.postalCode?.trim(), country: "Italia" };
}

function addressKey(address: RouteAddress) {
  return [address.street, address.number, address.city, address.province ?? "", address.postalCode ?? "", address.country]
    .map((part) => part.trim().toLocaleLowerCase("it-IT")).join("|");
}

export function buildTransferLinks(
  days: [string, CalendarOccurrence[]][],
  actualFirstIds: Set<string>,
  students: StudentRecord[],
  location: LessonLocation,
): TransferLink[] {
  const links: TransferLink[] = [];
  for (const [, dayLessons] of days) {
    const lessons = dayLessons.filter((lesson) => lesson.status !== "annullata");
    for (let index = 0; index < lessons.length; index++) {
      const lesson = lessons[index];
      if (index === 0 && actualFirstIds.has(lesson.occurrenceId) && lesson.mode === "domicilio") {
        const from = { street: location.street.trim(), number: location.streetNumber.trim(), city: location.city.trim(), province: location.province.trim(), country: location.country.trim() };
        const to = addressFor(lesson, students, location);
        if (to && from.street && from.number && from.city && from.country && addressKey(from) !== addressKey(to))
          links.push({ id: `first:${lesson.occurrenceId}`, kind: "first", from, to });
      }
      const next = lessons[index + 1];
      if (!next || lesson.mode === "online" || next.mode === "online") continue;
      const interval = availableIntervalMinutes(lesson, next);
      if (interval === null || interval > 120) continue;
      const from = addressFor(lesson, students, location);
      const to = addressFor(next, students, location);
      if (from && to && addressKey(from) !== addressKey(to))
        links.push({ id: `${lesson.occurrenceId}>${next.occurrenceId}`, kind: "between", from, to, interval });
    }
  }
  return links;
}

export function googleMapsRouteUrl(from: RouteAddress, to: RouteAddress) {
  const format = (place: RouteAddress) => [
    `${place.street} ${place.number}`,
    [place.postalCode, place.city, place.province ? `(${place.province})` : ""].filter(Boolean).join(" "),
    place.country,
  ].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", origin: format(from), destination: format(to) })}`;
}
