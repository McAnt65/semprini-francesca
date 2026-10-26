import { endOfLocalMonth, isLocalDate, startOfLocalMonth } from "./calendar-dates";
import { createSingleOccurrenceException } from "./calendar-recurrence";
import { selectDayOccurrences, selectOccurrencesInRange } from "./calendar-selectors";
import { loadCalendarAppointments, loadCalendarSeries, saveCalendarAppointmentsResult } from "./calendar-storage";
import type { CalendarAppointment, CalendarOccurrence, CalendarSeries, LessonSnapshot, LocalDate, PaymentHistory, PaymentMovement, PaymentStatus } from "./calendar-types";
import type { SaveResult } from "../save-result";

export type PaymentTarget = Pick<CalendarOccurrence, "occurrenceId" | "date">;
export type PaymentOperationResult = SaveResult | { status: "blocked" | "unchanged"; reason: string };

type PayableLesson = LessonSnapshot & PaymentHistory;
type Ledger = { opening: number; movements: PaymentMovement[]; paid: number };
type PaymentInput = { target: PaymentTarget; paymentDate: LocalDate; operationId: string; recordedAt?: string };

function storedPaid(lesson: PayableLesson) {
  return lesson.paidAmountCents ?? (lesson.paymentStatus === "pagata" ? lesson.lessonAmountCents : 0);
}

function validCents(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function validInstant(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

/** A missing ledger is a legacy, undated balance. Invalid ledgers are never rewritten by payment operations. */
export function readPaymentLedger(lesson: PayableLesson): Ledger | null {
  const paid = storedPaid(lesson);
  if (!validCents(paid)) return null;
  const raw = lesson.paymentMovements;
  if (raw === undefined && lesson.historicalPaidAmountCents === undefined) {
    return { opening: paid, movements: [], paid };
  }
  if (!Array.isArray(raw) || !validCents(lesson.historicalPaidAmountCents)) return null;
  const ids = new Set<string>();
  const operationIds = new Set<string>();
  const payments = new Map<string, Extract<PaymentMovement, { kind: "payment" }>>();
  const reversed = new Set<string>();
  let total = lesson.historicalPaidAmountCents;
  for (const movement of raw) {
    if (!movement || typeof movement !== "object" || typeof movement.id !== "string" || !movement.id.trim() ||
        typeof movement.operationId !== "string" || !movement.operationId.trim() ||
        !validInstant(movement.recordedAt) || ids.has(movement.id) || operationIds.has(movement.operationId)) return null;
    ids.add(movement.id);
    operationIds.add(movement.operationId);
    if (movement.kind === "payment") {
      if (!validCents(movement.amountCents) || movement.amountCents === 0 || !isLocalDate(movement.paymentDate)) return null;
      payments.set(movement.id, movement);
    } else if (movement.kind === "reversal") {
      const original = payments.get(movement.originalMovementId);
      if (!original || reversed.has(original.id) || movement.amountCents !== -original.amountCents) return null;
      reversed.add(original.id);
    } else if (movement.kind === "legacy_adjustment") {
      if (!Number.isSafeInteger(movement.amountCents) || movement.amountCents >= 0) return null;
    } else return null;
    total += movement.amountCents;
    if (!Number.isSafeInteger(total) || total < 0) return null;
  }
  return total === paid ? { opening: lesson.historicalPaidAmountCents, movements: raw, paid } : null;
}

export function inspectLessonPayment(lesson: PayableLesson) {
  const ledger = readPaymentLedger(lesson);
  const paidAmountCents = storedPaid(lesson);
  const dueCents = lesson.paymentStatus === "non_dovuta" || lesson.status === "annullata" ? 0 : lesson.lessonAmountCents;
  const allocatedPaidCents = Math.min(dueCents, paidAmountCents);
  const outstandingCents = Math.max(0, dueCents - allocatedPaidCents);
  const excessCents = Math.max(0, paidAmountCents - dueCents);
  const expectedStatus: PaymentStatus = lesson.paymentStatus === "non_dovuta" ? "non_dovuta"
    : paidAmountCents >= lesson.lessonAmountCents && lesson.lessonAmountCents > 0 ? "pagata"
      : paidAmountCents > 0 ? "parziale" : "non_pagata";
  return { validLedger: ledger !== null, paidAmountCents, dueCents, allocatedPaidCents,
    outstandingCents, excessCents, expectedStatus, statusMismatch: expectedStatus !== lesson.paymentStatus };
}

/** Use after a price or duration edit; it keeps every payment and reports any excess. */
export function reconcileLessonPayment<T extends PayableLesson>(lesson: T) {
  const inspection = inspectLessonPayment(lesson);
  return { lesson: { ...lesson, paymentStatus: inspection.expectedStatus }, inspection };
}

function timestampAfter(previous: string, requested?: string) {
  const candidate = requested && validInstant(requested) ? Date.parse(requested) : Date.now();
  const previousTime = Date.parse(previous);
  return new Date(Math.max(candidate, Number.isNaN(previousTime) ? 0 : previousTime + 1)).toISOString();
}

function validInput(input: PaymentInput) {
  return isLocalDate(input.paymentDate) && typeof input.operationId === "string" && Boolean(input.operationId.trim()) &&
    (input.recordedAt === undefined || validInstant(input.recordedAt));
}

function operationSeen(appointments: CalendarAppointment[], operationId: string) {
  return appointments.some((appointment) => Array.isArray(appointment.paymentMovements) &&
    appointment.paymentMovements.some((movement) => movement && movement.operationId === operationId));
}

function findTarget(target: PaymentTarget, appointments: CalendarAppointment[], series: CalendarSeries[]) {
  return isLocalDate(target.date)
    ? selectDayOccurrences(appointments, series, target.date).find((item) => item.occurrenceId === target.occurrenceId)
    : undefined;
}

function appointmentFor(occurrence: CalendarOccurrence, appointments: CalendarAppointment[], series: CalendarSeries[]) {
  const existing = appointments.find((item) => item.id === occurrence.appointmentId);
  if (existing) return existing;
  const source = series.find((item) => item.id === occurrence.seriesId);
  return source && occurrence.originalOccurrenceDate
    ? createSingleOccurrenceException(source, occurrence.originalOccurrenceDate, crypto.randomUUID(), {})
    : null;
}

function withMovement(appointment: CalendarAppointment, ledger: Ledger, movement: PaymentMovement) {
  const paidAmountCents = ledger.paid + movement.amountCents;
  const status: PaymentStatus = appointment.paymentStatus === "non_dovuta" ? "non_dovuta"
    : appointment.lessonAmountCents > 0 && paidAmountCents >= appointment.lessonAmountCents ? "pagata"
    : paidAmountCents > 0 ? "parziale" : "non_pagata";
  return { ...appointment, historicalPaidAmountCents: ledger.opening,
    paymentMovements: [...ledger.movements, movement], paidAmountCents,
    paymentStatus: status, updatedAt: timestampAfter(appointment.updatedAt, movement.recordedAt) };
}

function saveChanges(appointments: CalendarAppointment[], changed: CalendarAppointment[]): SaveResult {
  const byId = new Map(changed.map((item) => [item.id, item]));
  return saveCalendarAppointmentsResult([...changed, ...appointments.filter((item) => !byId.has(item.id))]);
}

function recordPayment(input: PaymentInput, amountCents?: number): PaymentOperationResult {
  if (!validInput(input) || (amountCents !== undefined && (!validCents(amountCents) || amountCents === 0)))
    return { status: "blocked", reason: "invalid_input" };
  const appointments = loadCalendarAppointments();
  const series = loadCalendarSeries();
  if (operationSeen(appointments, input.operationId)) return { status: "unchanged", reason: "already_applied" };
  const occurrence = findTarget(input.target, appointments, series);
  if (!occurrence) return { status: "blocked", reason: "stale_target" };
  if (occurrence.status === "annullata" || occurrence.paymentStatus === "non_dovuta" || occurrence.lessonAmountCents <= 0)
    return { status: "blocked", reason: "not_payable" };
  const appointment = appointmentFor(occurrence, appointments, series);
  if (!appointment) return { status: "blocked", reason: "stale_target" };
  const ledger = readPaymentLedger(appointment);
  if (!ledger) return { status: "blocked", reason: "invalid_ledger" };
  if (occurrence.paymentStatus === "pagata" && ledger.paid < occurrence.lessonAmountCents)
    return { status: "blocked", reason: "inconsistent_payment" };
  const remaining = occurrence.lessonAmountCents - ledger.paid;
  if (remaining <= 0) return { status: "unchanged", reason: "already_settled" };
  const amount = amountCents ?? remaining;
  if (amount > remaining) return { status: "blocked", reason: "exceeds_outstanding" };
  const movement: PaymentMovement = { id: crypto.randomUUID(), kind: "payment", amountCents: amount,
    paymentDate: input.paymentDate, recordedAt: input.recordedAt ?? new Date().toISOString(), operationId: input.operationId };
  return saveChanges(appointments, [withMovement(appointment, ledger, movement)]);
}

export function settleLessonPayment(input: PaymentInput): PaymentOperationResult {
  return recordPayment(input);
}

export function recordPartialLessonPayment(input: PaymentInput & { amountCents: number }): PaymentOperationResult {
  return recordPayment(input, input.amountCents);
}

export function reverseLessonPayment(input: { target: PaymentTarget; movementId: string; operationId: string; recordedAt?: string }): PaymentOperationResult {
  if (typeof input.operationId !== "string" || !input.operationId.trim() ||
      typeof input.movementId !== "string" || !input.movementId.trim() ||
      (input.recordedAt !== undefined && !validInstant(input.recordedAt)))
    return { status: "blocked", reason: "invalid_input" };
  const appointments = loadCalendarAppointments();
  const series = loadCalendarSeries();
  if (operationSeen(appointments, input.operationId)) return { status: "unchanged", reason: "already_applied" };
  const occurrence = findTarget(input.target, appointments, series);
  const appointment = occurrence && appointments.find((item) => item.id === occurrence.appointmentId);
  if (!appointment) return { status: "blocked", reason: "stale_target" };
  const ledger = readPaymentLedger(appointment);
  if (!ledger) return { status: "blocked", reason: "invalid_ledger" };
  const original = ledger.movements.find((item) => item.id === input.movementId && item.kind === "payment");
  if (!original || original.kind !== "payment") return { status: "blocked", reason: "payment_not_found" };
  if (ledger.movements.some((item) => item.kind === "reversal" && item.originalMovementId === original.id))
    return { status: "unchanged", reason: "already_reversed" };
  const movement: PaymentMovement = { id: crypto.randomUUID(), kind: "reversal", amountCents: -original.amountCents,
    originalMovementId: original.id, recordedAt: input.recordedAt ?? new Date().toISOString(), operationId: input.operationId };
  return saveChanges(appointments, [withMovement(appointment, ledger, movement)]);
}

/** Explicitly reduces a legacy balance without inventing a historical payment date. */
export function correctUndatedPayment(input: { target: PaymentTarget; amountCents: number; operationId: string; recordedAt?: string }): PaymentOperationResult {
  if (!validCents(input.amountCents) || input.amountCents === 0 || typeof input.operationId !== "string" || !input.operationId.trim() ||
      (input.recordedAt !== undefined && !validInstant(input.recordedAt)))
    return { status: "blocked", reason: "invalid_input" };
  const appointments = loadCalendarAppointments();
  const series = loadCalendarSeries();
  if (operationSeen(appointments, input.operationId)) return { status: "unchanged", reason: "already_applied" };
  const occurrence = findTarget(input.target, appointments, series);
  if (!occurrence) return { status: "blocked", reason: "stale_target" };
  const appointment = appointmentFor(occurrence, appointments, series);
  if (!appointment) return { status: "blocked", reason: "stale_target" };
  const ledger = readPaymentLedger(appointment);
  if (!ledger) return { status: "blocked", reason: "invalid_ledger" };
  const remainingLegacy = ledger.opening + ledger.movements
    .filter((item) => item.kind === "legacy_adjustment").reduce((sum, item) => sum + item.amountCents, 0);
  if (input.amountCents > remainingLegacy) return { status: "blocked", reason: "exceeds_legacy_balance" };
  const movement: PaymentMovement = { id: crypto.randomUUID(), kind: "legacy_adjustment", amountCents: -input.amountCents,
    recordedAt: input.recordedAt ?? new Date().toISOString(), operationId: input.operationId };
  return saveChanges(appointments, [withMovement(appointment, ledger, movement)]);
}

export function settleStudentLessons(input: { targets: PaymentTarget[]; studentId: string; receivedAmountCents: number;
  paymentDate: LocalDate; operationId: string; recordedAt?: string }): PaymentOperationResult {
  if (!isLocalDate(input.paymentDate) || typeof input.studentId !== "string" || !input.studentId.trim() ||
      typeof input.operationId !== "string" || !input.operationId.trim() ||
      !validCents(input.receivedAmountCents) || input.receivedAmountCents === 0 || !input.targets.length ||
      (input.recordedAt !== undefined && !validInstant(input.recordedAt)))
    return { status: "blocked", reason: "invalid_input" };
  const ids = input.targets.map((item) => item.occurrenceId);
  if (new Set(ids).size !== ids.length) return { status: "blocked", reason: "duplicate_target" };
  const appointments = loadCalendarAppointments();
  const series = loadCalendarSeries();
  if (operationSeen(appointments, input.operationId)) return { status: "unchanged", reason: "already_applied" };
  const prepared: Array<{ appointment: CalendarAppointment; ledger: Ledger; remaining: number }> = [];
  for (const target of input.targets) {
    const occurrence = findTarget(target, appointments, series);
    if (!occurrence || occurrence.studentId !== input.studentId) return { status: "blocked", reason: "stale_or_other_student" };
    if (occurrence.status === "annullata" || occurrence.paymentStatus === "non_dovuta" || occurrence.lessonAmountCents <= 0)
      return { status: "blocked", reason: "not_payable" };
    const appointment = appointmentFor(occurrence, appointments, series);
    if (!appointment) return { status: "blocked", reason: "stale_target" };
    const ledger = readPaymentLedger(appointment);
    if (!ledger) return { status: "blocked", reason: "invalid_ledger" };
    if (occurrence.paymentStatus === "pagata" && ledger.paid < occurrence.lessonAmountCents)
      return { status: "blocked", reason: "inconsistent_payment" };
    const remaining = occurrence.lessonAmountCents - ledger.paid;
    if (remaining <= 0) return { status: "blocked", reason: "already_settled" };
    prepared.push({ appointment, ledger, remaining });
  }
  if (new Set(prepared.map((item) => item.appointment.id)).size !== prepared.length)
    return { status: "blocked", reason: "duplicate_target" };
  if (prepared.reduce((sum, item) => sum + item.remaining, 0) !== input.receivedAmountCents)
    return { status: "blocked", reason: "allocation_required" };
  const recordedAt = input.recordedAt ?? new Date().toISOString();
  const changed = prepared.map(({ appointment, ledger, remaining }) => withMovement(appointment, ledger,
    { id: crypto.randomUUID(), kind: "payment", amountCents: remaining, paymentDate: input.paymentDate,
      recordedAt, operationId: input.operationId }));
  return saveChanges(appointments, changed);
}

export interface LessonPaymentTotals {
  lessonCount: number;
  durationMinutes: number;
  valueCents: number;
  dueCents: number;
  paidAttributedCents: number;
  outstandingCents: number;
  excessCents: number;
}

function emptyTotals(): LessonPaymentTotals {
  return { lessonCount: 0, durationMinutes: 0, valueCents: 0, dueCents: 0,
    paidAttributedCents: 0, outstandingCents: 0, excessCents: 0 };
}

function addLesson(total: LessonPaymentTotals, lesson: CalendarOccurrence) {
  const payment = inspectLessonPayment(lesson);
  total.lessonCount += 1;
  total.durationMinutes += lesson.durationMinutes;
  total.valueCents += lesson.lessonAmountCents;
  total.dueCents += payment.dueCents;
  total.paidAttributedCents += payment.allocatedPaidCents;
  total.outstandingCents += payment.outstandingCents;
  total.excessCents += payment.excessCents;
}

export function selectLessonMonthPaymentTotals(appointments: CalendarAppointment[], series: CalendarSeries[],
  monthDate: LocalDate, asOf: LocalDate) {
  if (!isLocalDate(monthDate) || !isLocalDate(asOf)) throw new Error("Invalid local date");
  const lessons = selectOccurrencesInRange(appointments, series, startOfLocalMonth(monthDate), endOfLocalMonth(monthDate))
    .filter((item) => item.status !== "annullata");
  const all = emptyTotals(), completed = emptyTotals(), futureConfirmed = emptyTotals();
  const byStudent = new Map<string, { studentId: string; name: string; totals: LessonPaymentTotals }>();
  for (const lesson of lessons) {
    addLesson(all, lesson);
    if (lesson.status === "svolta") addLesson(completed, lesson);
    if (lesson.status === "confermata" && lesson.date >= asOf) addLesson(futureConfirmed, lesson);
    const group = byStudent.get(lesson.studentId) ??
      { studentId: lesson.studentId, name: lesson.studentNameSnapshot, totals: emptyTotals() };
    addLesson(group.totals, lesson);
    byStudent.set(lesson.studentId, group);
  }
  return { all, completed, futureConfirmed, byStudent: [...byStudent.values()]
    .sort((a, b) => a.name.localeCompare(b.name, "it")) };
}

/** Receipts are grouped by actual payment date, regardless of the lesson date. */
export function selectReceiptMonthTotals(appointments: CalendarAppointment[], monthDate: LocalDate) {
  if (!isLocalDate(monthDate)) throw new Error("Invalid local date");
  const from = startOfLocalMonth(monthDate), to = endOfLocalMonth(monthDate);
  let receivedCents = 0, movementCount = 0;
  const invalidLedgerIds: string[] = [];
  for (const appointment of appointments) {
    const ledger = readPaymentLedger(appointment);
    if (!ledger) { invalidLedgerIds.push(appointment.id); continue; }
    const reversed = new Set(ledger.movements.filter((item) => item.kind === "reversal")
      .map((item) => item.kind === "reversal" ? item.originalMovementId : ""));
    for (const movement of ledger.movements) {
      if (movement.kind === "payment" && !reversed.has(movement.id) &&
          movement.paymentDate >= from && movement.paymentDate <= to) {
        receivedCents += movement.amountCents;
        movementCount += 1;
      }
    }
  }
  return { receivedCents, movementCount, invalidLedgerIds };
}
