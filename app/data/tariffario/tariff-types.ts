import type { LessonMode } from "../calendario/calendar-types";

export interface Tariff {
  id: string;
  code: string;
  subject: string;
  schoolBand: string;
  mode: LessonMode;
  hourlyRateCents: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TariffDraft = Pick<
  Tariff,
  "subject" | "schoolBand" | "mode" | "hourlyRateCents" | "active"
>;
