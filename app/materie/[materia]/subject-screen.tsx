"use client";

import MaterieFrame, { Hotspot } from "../MaterieFrame";
import { contentKey, type SubjectSlug } from "../materie-data";
import { saveLocalText, useLocalText } from "../local-text";

type Subject = { title: string; image: string; topics: string[]; quick: string[] };

function QuickNote({ slug, section, x, y, w, h }: { slug: SubjectSlug; section: string; x: number; y: number; w: number; h: number }) {
  const key = contentKey(slug, `quick:${section}`);
  const value = useLocalText(key);

  return <textarea aria-label={`${section} di ${slug}`} value={value} onChange={(event) => saveLocalText(key, event.target.value)}
    placeholder="Tocca per scrivere"
    className="absolute z-10 resize-none overflow-auto border-0 bg-transparent px-1 text-[clamp(10px,2.7vw,13px)] leading-[1.3] text-[#493b32] outline-none placeholder:text-[#a39284]/60 focus:bg-[#fffaf0]/80"
    style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }} />;
}

export default function SubjectScreen({ slug, subject }: { slug: SubjectSlug; subject: Subject }) {
  const layout = {
    matematica: { topics: { x: 18, y: 42, w: 29, h: 3.9, gap: 3.95 }, notes: { x: 58, y: 43.5, w: 31, h: 5.5, gap: 8.8 }, studentsY: 72 },
    fisica: { topics: { x: 19, y: 31.5, w: 29, h: 4.5, gap: 4.9 }, notes: { x: 55, y: 34, w: 35, h: 6.5, gap: 11 }, studentsY: 75 },
    chimica: { topics: { x: 18, y: 31.5, w: 30, h: 4.7, gap: 5.05 }, notes: { x: 57, y: 33.5, w: 30, h: 6, gap: 10.1 }, studentsY: 74 },
  }[slug];

  return <MaterieFrame image={subject.image} alt={`Pagina ${subject.title}`} back="/materie">
    {subject.topics.map((topic, i) => <Hotspot key={topic}
      href={`/materie/${slug}/argomento?nome=${encodeURIComponent(topic)}`}
      label={`${topic}: apri appunti e schemi`}
      x={layout.topics.x} y={layout.topics.y + i * layout.topics.gap} w={layout.topics.w} h={layout.topics.h} />)}
    {subject.quick.map((section, i) => <QuickNote key={section} slug={slug} section={section}
      x={layout.notes.x} y={layout.notes.y + i * layout.notes.gap} w={layout.notes.w} h={layout.notes.h} />)}
    <Hotspot href={`/materie/${slug}/studenti`} label={`Studenti associati a ${subject.title}`}
      x={22} y={layout.studentsY} w={67} h={6} />
  </MaterieFrame>;
}
