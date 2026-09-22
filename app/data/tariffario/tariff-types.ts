import type { LessonMode } from "../calendario/calendar-types";

export type LessonFormat = "singola" | "gruppo";

export interface Tariff {
  id: string;
  code: string;
  subject: string;
  schoolBand: string;
  mode: LessonMode;
  format: LessonFormat;
  hourlyRateCents: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TariffDraft = Pick<
  Tariff,
  "subject" | "schoolBand" | "mode" | "format" | "hourlyRateCents" | "active"
>;
