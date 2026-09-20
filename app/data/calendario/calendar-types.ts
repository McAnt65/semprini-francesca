export type LocalDate = string;
export type LocalTime = string;

export type LessonMode = "casa" | "studio" | "online";

export type LessonStatus =
  | "confermata"
  | "attesa"
  | "richiesta"
  | "annullata";

export type PaymentStatus =
  | "non_pagata"
  | "pagata"
  | "parziale"
  | "non_dovuta";

export type AppointmentSource =
  | "manuale"
  | "richiesta_ricevuta"
  | "proposta_inviata";

export type RequestDirection = "ricevuta" | "inviata";

export interface LessonSnapshot {
  studentId: string;
  studentNameSnapshot: string;
  subject: string;
  durationMinutes: number;
  mode: LessonMode;
  status: LessonStatus;
  topic: string;
  notes: string;
  hourlyRateCents: number;
  lessonAmountCents: number;
  paymentStatus: PaymentStatus;
}

export interface CalendarAppointment extends LessonSnapshot {
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

export interface CalendarOccurrence extends LessonSnapshot {
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
    | "notes"
    | "hourlyRateCents"
    | "lessonAmountCents"
    | "paymentStatus"
    | "source"
    | "recurrence"
  >
>;
