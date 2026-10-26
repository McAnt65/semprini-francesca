import { writeAndVerify, type SaveResult } from "../../data/save-result";
import { isSubjectSlug } from "../materie-data";
import { TOPIC_STATUSES, type ProgramRecord, type ProgramTopic } from "./program-model";

export const PROGRAMS_STORAGE_KEY = "semprini:materie:programmi:v1";
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type ProgramSource = { storage: StorageLike; persistent: boolean };
type Tombstone = { kind: "deleted"; id: string; updatedAt: string };
type Entry = ProgramRecord | Tombstone;
export type ProgramArchive =
  | { status: "error" }
  | { status: "ready"; programs: ProgramRecord[]; entries: Entry[]; limited: boolean };

export function browserProgramSources(): ProgramSource[] {
  if (typeof window === "undefined") return [];
  const sources: ProgramSource[] = [];
  try { sources.push({ storage: window.localStorage, persistent: true }); } catch { /* session fallback */ }
  try { sources.push({ storage: window.sessionStorage, persistent: false }); } catch { /* no fallback */ }
  return sources;
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function validText(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function validDate(value: unknown): value is string { return validText(value) && !Number.isNaN(Date.parse(value)); }
function validTopic(value: unknown): value is ProgramTopic {
  const item = object(value);
  return Boolean(item && validText(item.id) && validText(item.name) && TOPIC_STATUSES.includes(item.status as ProgramTopic["status"]));
}
function validEntry(value: unknown): value is Entry {
  const item = object(value);
  if (!item || !validText(item.id) || !validDate(item.updatedAt)) return false;
  if (item.kind === "deleted") return true;
  if (item.kind !== "model" && item.kind !== "personal") return false;
  return validText(item.name) && isSubjectSlug(String(item.subject)) &&
    typeof item.gradeClass === "string" && typeof item.schoolType === "string" &&
    typeof item.notes === "string" && validDate(item.createdAt) &&
    Array.isArray(item.topics) && item.topics.every(validTopic) &&
    new Set(item.topics.map((topic: ProgramTopic) => topic.id)).size === item.topics.length &&
    (item.kind === "model" || validText(item.studentId)) &&
    (item.sourceModelId === undefined || validText(item.sourceModelId));
}

export function readProgramArchive(sources: ProgramSource[]): ProgramArchive {
  if (!sources.length) return { status: "error" };
  const byId = new Map<string, Entry>();
  let limited = sources.length < 2;
  let readable = 0;
  for (const { storage } of sources) {
    let raw: string | null;
    try { raw = storage.getItem(PROGRAMS_STORAGE_KEY); readable += 1; }
    catch { limited = true; continue; }
    if (raw === null) continue;
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return { status: "error" }; }
    const envelope = object(parsed);
    if (!envelope || envelope.version !== 1 || !Array.isArray(envelope.entries) || !envelope.entries.every(validEntry)) {
      return { status: "error" };
    }
    for (const entry of envelope.entries as Entry[]) {
      const previous = byId.get(entry.id);
      if (!previous || entry.updatedAt > previous.updatedAt ||
        (entry.updatedAt === previous.updatedAt && entry.kind === "deleted")) byId.set(entry.id, entry);
    }
  }
  if (!readable) return { status: "error" };
  const entries = [...byId.values()];
  return { status: "ready", entries, programs: entries.filter((entry): entry is ProgramRecord => entry.kind !== "deleted"), limited };
}

function nextTimestamp(entries: Entry[], now: Date): string {
  const latest = entries.reduce((maximum, entry) => Math.max(maximum, Date.parse(entry.updatedAt)), 0);
  return new Date(Math.max(now.getTime(), latest + 1)).toISOString();
}

function writeEntries(sources: ProgramSource[], entries: Entry[]): SaveResult {
  const serialized = JSON.stringify({ version: 1, entries });
  for (const source of sources) {
    if (!writeAndVerify(source.storage, PROGRAMS_STORAGE_KEY, serialized)) continue;
    if (source.persistent) {
      for (const fallback of sources.filter((item) => !item.persistent)) {
        try { fallback.storage.removeItem(PROGRAMS_STORAGE_KEY); } catch { /* newer local entries still win */ }
      }
    }
    return { status: source.persistent ? "saved" : "temporary" };
  }
  return { status: "failed" };
}

export function saveProgram(sources: ProgramSource[], draft: ProgramRecord, now = new Date()):
  { result: SaveResult; program?: ProgramRecord; archive?: ProgramArchive } {
  const archive = readProgramArchive(sources);
  if (archive.status === "error" || !validEntry(draft)) return { result: { status: "failed" } };
  const previous = archive.entries.find((entry) => entry.id === draft.id);
  if (previous?.kind === "deleted") return { result: { status: "failed" } };
  if (previous && previous.updatedAt !== draft.updatedAt) return { result: { status: "failed" } };
  const program = { ...draft, createdAt: previous?.createdAt ?? draft.createdAt,
    updatedAt: nextTimestamp(archive.entries, now) } as ProgramRecord;
  const entries = [...archive.entries.filter((entry) => entry.id !== program.id), program];
  const result = writeEntries(sources, entries);
  return result.status === "failed" ? { result } : { result, program, archive: readProgramArchive(sources) };
}

export function deleteProgram(sources: ProgramSource[], id: string, now = new Date()):
  { result: SaveResult; archive?: ProgramArchive } {
  const archive = readProgramArchive(sources);
  if (archive.status === "error" || !archive.programs.some((program) => program.id === id)) {
    return { result: { status: "failed" } };
  }
  const entries: Entry[] = [...archive.entries.filter((entry) => entry.id !== id),
    { kind: "deleted", id, updatedAt: nextTimestamp(archive.entries, now) }];
  const result = writeEntries(sources, entries);
  return result.status === "failed" ? { result } : { result, archive: readProgramArchive(sources) };
}
