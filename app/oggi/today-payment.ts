import { isLocalDate } from "../data/calendario/calendar-dates";
import { inspectLessonPayment, settleLessonPayment } from "../data/calendario/calendar-payments";
import { selectDayOccurrences } from "../data/calendario/calendar-selectors";
import { loadCalendarAppointments, loadCalendarSeries } from "../data/calendario/calendar-storage";
import type { CalendarAppointment, CalendarOccurrence } from "../data/calendario/calendar-types";
import { findTodayLesson, type TodayLessonReference } from "./today-summary";

export function todayPaymentState(lesson: CalendarOccurrence) {
  const payment = inspectLessonPayment(lesson);
  const label = !payment.validLedger || payment.statusMismatch ? "DA VERIFICARE"
    : lesson.paymentStatus === "non_dovuta" ? "NON DOVUTA"
    : lesson.lessonAmountCents === 0 ? "NESSUN IMPORTO DOVUTO"
    : payment.outstandingCents === 0 ? "SALDATA"
    : payment.paidAmountCents > 0 ? "PARZIALE" : "DA SALDARE";
  return { label, action: label === "PARZIALE" ? "SALDA RESIDUO"
    : label === "DA SALDARE" ? "SEGNA SALDATA" : null,
    outstandingCents: payment.outstandingCents };
}

export interface TodayPaymentConfirmation {
  reference: TodayLessonReference;
  amountCents: number;
  paymentDate: string;
  operationId: string;
}

export type PrepareTodayPaymentResult =
  | { status: "ready"; lesson: CalendarOccurrence; confirmation: TodayPaymentConfirmation }
  | { status: "unavailable"; lesson: CalendarOccurrence }
  | { status: "stale" };

/** The first tap prepares a review; it does not write a payment. */
export function prepareTodayPayment(reference: TodayLessonReference, paymentDate: string): PrepareTodayPaymentResult {
  const current = findTodayLesson(reference, loadCalendarAppointments(), loadCalendarSeries());
  if (!current) return { status: "stale" };
  const payment = todayPaymentState(current);
  if (!payment.action) return { status: "unavailable", lesson: current };
  return { status: "ready", lesson: current, confirmation: {
    reference: current, amountCents: payment.outstandingCents, paymentDate, operationId: crypto.randomUUID(),
  } };
}

function lessonWithOperation(appointments: CalendarAppointment[], operationId: string) {
  const appointment = appointments.find((item) => item.paymentMovements?.some((movement) => movement.operationId === operationId));
  return appointment && selectDayOccurrences(appointments, loadCalendarSeries(), appointment.date)
    .find((item) => item.appointmentId === appointment.id);
}

export type ConfirmTodayPaymentResult =
  | { status: "saved" | "temporary" | "unchanged"; lesson: CalendarOccurrence }
  | { status: "changed" | "unavailable"; lesson: CalendarOccurrence }
  | { status: "stale" | "failed" | "invalid_date" };

/** Check the latest residual, then delegate the entire money movement to the shared engine. */
export function confirmTodayPayment(confirmation: TodayPaymentConfirmation): ConfirmTodayPaymentResult {
  if (!isLocalDate(confirmation.paymentDate)) return { status: "invalid_date" };
  const appointments = loadCalendarAppointments();
  const applied = lessonWithOperation(appointments, confirmation.operationId);
  if (applied) return { status: "unchanged", lesson: applied };

  const current = findTodayLesson(confirmation.reference, appointments, loadCalendarSeries());
  if (!current) return { status: "stale" };
  const payment = todayPaymentState(current);
  if (!payment.action) return { status: "unavailable", lesson: current };
  if (payment.outstandingCents !== confirmation.amountCents) return { status: "changed", lesson: current };

  const result = settleLessonPayment({ target: { occurrenceId: current.occurrenceId, date: current.date },
    paymentDate: confirmation.paymentDate, operationId: confirmation.operationId });
  if (result.status === "failed") return { status: "failed" };
  if (result.status === "blocked") return { status: "stale" };
  const latest = loadCalendarAppointments();
  const saved = lessonWithOperation(latest, confirmation.operationId);
  if (result.status === "unchanged" && !saved) {
    const updated = findTodayLesson(confirmation.reference, latest, loadCalendarSeries());
    return updated ? { status: "unavailable", lesson: updated } : { status: "stale" };
  }
  return saved ? { status: result.status, lesson: saved } : { status: "failed" };
}
