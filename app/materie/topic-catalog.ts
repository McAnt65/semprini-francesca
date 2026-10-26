import { writeAndVerify } from "../data/save-result";
import { contentKey, subjects, type SubjectSlug } from "./materie-data";

export const TOPIC_CATALOG_KEY = "semprini:materie:argomenti:v1";
export const TOPIC_CATALOG_CHANGED = "semprini:materie:argomenti:changed";
export type Topic = { id: string; name: string; noteName: string; aliases: string[] };
type Catalog = Record<SubjectSlug, Topic[]>;
type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "getItem" | "setItem">;
export type TopicCatalog = { status: "ready"; topics: Catalog } | { status: "error" };
export type TopicChange = { ok: true; topics: Topic[] } | { ok: false; reason: string };

const slugs: SubjectSlug[] = ["matematica", "fisica", "chimica"];
const same = (a: string, b: string) => a.trim().localeCompare(b.trim(), "it", { sensitivity: "base" }) === 0;

function defaults(): Catalog {
  return Object.fromEntries(slugs.map((slug) => [slug, subjects[slug].topics.map((name) => ({
    id: `default:${slug}:${encodeURIComponent(name)}`, name, noteName: name, aliases: [name],
  }))])) as Catalog;
}

function validTopic(value: unknown): value is Topic {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const topic = value as Partial<Topic>;
  return typeof topic.id === "string" && !!topic.id && typeof topic.name === "string" && !!topic.name.trim() &&
    typeof topic.noteName === "string" && !!topic.noteName && Array.isArray(topic.aliases) &&
    topic.aliases.every((alias) => typeof alias === "string" && !!alias.trim());
}

export function readTopicCatalog(storage: StorageReader): TopicCatalog {
  try {
    const raw = storage.getItem(TOPIC_CATALOG_KEY);
    if (raw === null) return { status: "ready", topics: defaults() };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { status: "error" };
    const envelope = parsed as { version?: unknown; topics?: unknown };
    if (envelope.version !== 1 || !envelope.topics || typeof envelope.topics !== "object") return { status: "error" };
    const topics = envelope.topics as Record<string, unknown>;
    if (slugs.some((slug) => !Array.isArray(topics[slug]) || !(topics[slug] as unknown[]).every(validTopic))) return { status: "error" };
    const catalog = topics as Catalog;
    const all = slugs.flatMap((slug) => catalog[slug]);
    if (new Set(all.map((topic) => topic.id)).size !== all.length) return { status: "error" };
    return { status: "ready", topics: catalog };
  } catch { return { status: "error" }; }
}

export function topicNoteKey(slug: SubjectSlug, topic: Topic) {
  return contentKey(slug, `topic:${topic.noteName}`);
}

export function findTopic(topics: Topic[], id?: string, legacyName?: string): Topic | undefined {
  return id ? topics.find((topic) => topic.id === id) :
    legacyName ? topics.find((topic) => topic.aliases.some((alias) => same(alias, legacyName))) : undefined;
}

function save(storage: StorageWriter, catalog: Catalog, slug: SubjectSlug, next: Topic[]): TopicChange {
  const topics = { ...catalog, [slug]: next };
  if (!writeAndVerify(storage, TOPIC_CATALOG_KEY, JSON.stringify({ version: 1, topics }))) {
    return { ok: false, reason: "Impossibile salvare stabilmente gli argomenti su questo dispositivo." };
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(TOPIC_CATALOG_CHANGED));
  return { ok: true, topics: next };
}

export function addTopic(storage: StorageWriter, slug: SubjectSlug, input: string, id: string): TopicChange {
  const catalog = readTopicCatalog(storage);
  if (catalog.status === "error") return { ok: false, reason: "Archivio argomenti non leggibile." };
  const name = input.trim();
  if (!name) return { ok: false, reason: "Inserisci il nome dell’argomento." };
  if (catalog.topics[slug].some((topic) => [topic.name, ...topic.aliases].some((alias) => same(alias, name)))) {
    return { ok: false, reason: "Questo argomento esiste già nella materia." };
  }
  if (!id || slugs.some((key) => catalog.topics[key].some((topic) => topic.id === id))) {
    return { ok: false, reason: "Identificativo dell’argomento non valido." };
  }
  return save(storage, catalog.topics, slug, [...catalog.topics[slug],
    { id, name, noteName: `id:${id}`, aliases: [name] }]);
}

export function renameTopic(storage: StorageWriter, slug: SubjectSlug, id: string, input: string): TopicChange {
  const catalog = readTopicCatalog(storage);
  if (catalog.status === "error") return { ok: false, reason: "Archivio argomenti non leggibile." };
  const current = findTopic(catalog.topics[slug], id);
  if (!current) return { ok: false, reason: "Argomento non trovato." };
  const name = input.trim();
  if (!name) return { ok: false, reason: "Inserisci il nome dell’argomento." };
  if (catalog.topics[slug].some((topic) => topic.id !== id &&
    [topic.name, ...topic.aliases].some((alias) => same(alias, name)))) {
    return { ok: false, reason: "Questo nome è già usato nella materia." };
  }
  const aliases = [...new Set([...current.aliases, current.name, name])];
  return save(storage, catalog.topics, slug, catalog.topics[slug].map((topic) =>
    topic.id === id ? { ...topic, name, aliases } : topic));
}

export function removeTopic(storage: StorageWriter, slug: SubjectSlug, id: string): TopicChange {
  const catalog = readTopicCatalog(storage);
  if (catalog.status === "error") return { ok: false, reason: "Archivio argomenti non leggibile." };
  if (!findTopic(catalog.topics[slug], id)) return { ok: false, reason: "Argomento non trovato." };
  return save(storage, catalog.topics, slug, catalog.topics[slug].filter((topic) => topic.id !== id));
}
