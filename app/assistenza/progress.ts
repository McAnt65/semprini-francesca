import { TOURS, type TourId } from "./content";

const KEY = "semprini:assistenza:v1";
export const START_TOUR_EVENT = "semprini:assistenza:start-tour";
const TOUR_IDS = Object.keys(TOURS) as TourId[];

export type AssistanceProgress = {
  dismissedWelcome: boolean;
  activeTour: TourId | null;
  steps: Record<TourId, number>;
  pausedTours: TourId[];
  completedTours: TourId[];
};

const emptySteps = (): Record<TourId, number> => ({
  "primi-passi": 0, studenti: 0, materie: 0, lezioni: 0, pagamenti: 0,
});

export const emptyProgress: AssistanceProgress = {
  dismissedWelcome: false, activeTour: null, steps: emptySteps(), pausedTours: [], completedTours: [],
};

function isTourId(value: unknown): value is TourId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(TOURS, value);
}

function boundedStep(value: unknown, id: TourId) {
  return typeof value === "number" && Number.isInteger(value)
    ? Math.max(0, Math.min(value, TOURS[id].steps.length - 1)) : 0;
}

/** Reads the original single paused-tour format as well as independent tour progress. */
export function parseProgress(value: unknown): AssistanceProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...emptyProgress, steps: emptySteps() };
  const record = value as Record<string, unknown>;
  const activeTour = isTourId(record.activeTour) ? record.activeTour : null;
  const legacyPaused = isTourId(record.pausedTour) ? record.pausedTour : null;
  const storedSteps = record.steps && typeof record.steps === "object" && !Array.isArray(record.steps)
    ? record.steps as Record<string, unknown> : null;
  const steps = emptySteps();
  for (const id of TOUR_IDS) steps[id] = boundedStep(storedSteps?.[id], id);
  if (!storedSteps && (activeTour || legacyPaused)) {
    const id = activeTour || legacyPaused!;
    steps[id] = boundedStep(record.step, id);
  }
  const pausedTours = Array.isArray(record.pausedTours)
    ? record.pausedTours.filter(isTourId) : legacyPaused ? [legacyPaused] : [];
  return {
    dismissedWelcome: record.dismissedWelcome === true,
    activeTour,
    steps,
    pausedTours: [...new Set(pausedTours)].filter((id) => id !== activeTour),
    completedTours: Array.isArray(record.completedTours) ? [...new Set(record.completedTours.filter(isTourId))] : [],
  };
}

export function readProgress(): AssistanceProgress {
  if (typeof window === "undefined") return parseProgress(null);
  try {
    const raw = window.localStorage.getItem(KEY);
    return parseProgress(raw ? JSON.parse(raw) : null);
  } catch { return parseProgress(null); }
}

export function writeProgress(progress: AssistanceProgress): boolean {
  try {
    // Retain the original fields alongside the independent per-tour state.
    const pausedTour = progress.pausedTours.at(-1) ?? null;
    const step = progress.activeTour ? progress.steps[progress.activeTour]
      : pausedTour ? progress.steps[pausedTour] : 0;
    window.localStorage.setItem(KEY, JSON.stringify({ ...progress, pausedTour, step }));
    return true;
  } catch { return false; }
}

export function startTourProgress(progress: AssistanceProgress, id: TourId, resume = false): AssistanceProgress {
  const pausedTours = progress.activeTour && progress.activeTour !== id
    ? [...progress.pausedTours, progress.activeTour] : progress.pausedTours;
  return {
    ...progress, dismissedWelcome: true, activeTour: id,
    steps: { ...progress.steps, [id]: resume && (progress.pausedTours.includes(id) || progress.activeTour === id) ? progress.steps[id] : 0 },
    pausedTours: [...new Set(pausedTours)].filter((item) => item !== id),
  };
}

export function pauseTourProgress(progress: AssistanceProgress): AssistanceProgress {
  if (!progress.activeTour) return progress;
  return { ...progress, activeTour: null,
    pausedTours: [...new Set([...progress.pausedTours, progress.activeTour])] };
}

export function moveTourProgress(progress: AssistanceProgress, index: number): AssistanceProgress {
  const id = progress.activeTour;
  if (!id) return progress;
  if (index >= TOURS[id].steps.length) return {
    ...progress, activeTour: null, steps: { ...progress.steps, [id]: 0 },
    pausedTours: progress.pausedTours.filter((item) => item !== id),
    completedTours: [...new Set([...progress.completedTours, id])],
  };
  return { ...progress, steps: { ...progress.steps, [id]: boundedStep(index, id) } };
}

export function requestTour(id: TourId, resume = false) {
  window.dispatchEvent(new CustomEvent<{ id: TourId; resume: boolean }>(START_TOUR_EVENT, { detail: { id, resume } }));
}
