export const PREFERENCES_STORAGE_KEY = "semprini:preferences:v1";
export const DEFAULT_TRAVEL_MARGIN_MINUTES = 10;

export interface LessonLocation {
  street: string;
  streetNumber: string;
  city: string;
  province: string;
  country: string;
}

export const DEFAULT_LESSON_LOCATION: LessonLocation = {
  street: "Camilluccia",
  streetNumber: "27",
  city: "Misano Adriatico",
  province: "RN",
  country: "Italia",
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readPreferences(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    return raw === null ? {} : asObject(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Returns the saved location, or the initial location without writing it. */
export function loadLessonLocation(): LessonLocation {
  const saved = asObject(readPreferences()?.lessonLocation);
  if (!saved) return { ...DEFAULT_LESSON_LOCATION };
  return {
    street: typeof saved.street === "string" ? saved.street : "",
    streetNumber: typeof saved.streetNumber === "string" ? saved.streetNumber : "",
    city: typeof saved.city === "string" ? saved.city : "",
    province: typeof saved.province === "string" ? saved.province : "",
    country: typeof saved.country === "string" ? saved.country : "Italia",
  };
}

/** Returns the saved travel margin without changing existing preferences. */
export function loadTravelMarginMinutes(): number {
  const value = readPreferences()?.travelMarginMinutes;
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value : DEFAULT_TRAVEL_MARGIN_MINUTES;
}

/** A displayed default address is not evidence that preferences were saved. */
export function inspectSavedLessonLocation(): { configured: boolean; readable: boolean } {
  const preferences = readPreferences();
  if (!preferences) return { configured: false, readable: false };
  if (preferences.lessonLocation === undefined) return { configured: false, readable: true };
  const saved = asObject(preferences.lessonLocation);
  if (!saved) return { configured: false, readable: false };
  const configured = (["street", "streetNumber", "city", "province", "country"] as const)
    .every((key) => typeof saved[key] === "string" && saved[key].trim().length > 0);
  return { configured, readable: true };
}

/** Updates the lesson location and, when provided, the travel margin atomically. */
export function saveLessonPreferences(location: LessonLocation, travelMarginMinutes?: number): boolean {
  const preferences = readPreferences();
  if (!preferences) return false;
  if (travelMarginMinutes !== undefined && (!Number.isSafeInteger(travelMarginMinutes) || travelMarginMinutes < 0)) return false;
  const normalized = {
    street: location.street.trim(),
    streetNumber: location.streetNumber.trim(),
    city: location.city.trim(),
    province: location.province.trim().toUpperCase(),
    country: location.country.trim(),
  };
  if (Object.values(normalized).some((value) => !value)) return false;
  try {
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ ...preferences, lessonLocation: normalized,
        ...(travelMarginMinutes === undefined ? {} : { travelMarginMinutes }) }),
    );
    return true;
  } catch {
    return false;
  }
}

/** Preserves the existing address-only update for other callers. */
export function saveLessonLocation(location: LessonLocation): boolean {
  return saveLessonPreferences(location);
}
