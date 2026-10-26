export type LocalDate = string;
export type LocalTime = string;

export type LessonMode = "casa" | "domicilio" | "online";

export type LessonStatus =
  | "confermata"
  | "attesa"
  | "richiesta"
  | "svolta"
  | "annullata";

export type PaymentStatus =
  | "non_pagata"
  | "pagata"
  | "parziale"
  | "non_dovuta";

export type PaymentMovement =
  | { id: string; kind: "payment"; amountCents: number; paymentDate: LocalDate; recordedAt: string; operationId: string }
  | { id: string; kind: "reversal"; amountCents: number; originalMovementId: string; recordedAt: string; operationId: string }
  | { id: string; kind: "legacy_adjustment"; amountCents: number; recordedAt: string; operationId: string };

export interface PaymentHistory {
  /** Existing undated payments, captured only when the first new movement is recorded. */
  historicalPaidAmountCents?: number;
  paymentMovements?: PaymentMovement[];
}

export type AppointmentSource =
  | "manuale"
  | "richiesta_ricevuta"
  | "proposta_inviata";

export type RequestDirection = "ricevuta" | "inviata";

export interface LessonSnapshot {
  tariffId?: string;
  tariffCode?: string;
  paidAmountCents?: number;
  studentId: string;
  studentNameSnapshot: string;
  subject: string;
  durationMinutes: number;
  travelMinutes?: number;
  mode: LessonMode;
  status: LessonStatus;
  topic: string;
  /** Set on new lessons: `topic` is a plan, never proof that it was taught. */
  topicKind?: "planned";
  /** Explicitly recorded after the lesson. Undefined means no such confirmation exists. */
  coveredTopic?: string;
  notes: string;
  hourlyRateCents: number;
  lessonAmountCents: number;
  paymentStatus: PaymentStatus;
}

export interface CalendarAppointment extends LessonSnapshot, PaymentHistory {
  id: string;
  date: LocalDate;
  startTime: LocalTime;
  source: AppointmentSource;
  seriesId?: string;
  originalOccurrenceDate?: LocalDate;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyRecurrence {
  frequency: "weekly";
  intervalWeeks: number;
  endsOn?: LocalDate;
}

export interface CalendarSeries extends LessonSnapshot {
  id: string;
  startsOn: LocalDate;
  startTime: LocalTime;
  recurrence: WeeklyRecurrence;
  source: AppointmentSource;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarRequest extends LessonSnapshot {
  id: string;
  direction: RequestDirection;
  proposedDate: LocalDate;
  proposedStartTime: LocalTime;
  linkedAppointmentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarOccurrence extends LessonSnapshot, PaymentHistory {
  occurrenceId: string;
  appointmentId?: string;
  seriesId?: string;
  originalOccurrenceDate?: LocalDate;
  date: LocalDate;
  startTime: LocalTime;
  source: AppointmentSource;
  isRecurring: boolean;
  isException: boolean;
}

export type SeriesLessonPatch = Partial<
  Pick<
    CalendarSeries,
    | "studentId"
    | "studentNameSnapshot"
    | "subject"
    | "startTime"
    | "durationMinutes"
    | "mode"
    | "status"
    | "topic"
    | "topicKind"
    | "coveredTopic"
    | "notes"
    | "hourlyRateCents"
    | "lessonAmountCents"
    | "paymentStatus"
    | "source"
    | "recurrence"
    | "travelMinutes"
  >
>;
