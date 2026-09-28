"use client";

import Link from "next/link";
import { useState } from "react";
import { contentKey, subjects, type SubjectSlug } from "../../materie-data";
import { saveLocalText, useLocalText } from "../../local-text";

export default function TopicEditor({ slug, topic }: { slug: SubjectSlug; topic: string }) {
  const key = contentKey(slug, `topic:${topic}`);
  const text = useLocalText(key);
  const [saved, setSaved] = useState(true);

  return <main className="min-h-screen bg-[#f8f2e7] px-4 py-8 font-serif text-[#49372f]">
    <article className="mx-auto max-w-[430px] rounded-lg border border-[#cbb99c] bg-[#fffbf2] p-6 shadow-sm">
      <nav className="mb-8 flex justify-between text-[#8e2942]"><Link href={`/materie/${slug}`}>← Indietro</Link><Link href="/menu">Menu</Link></nav>
      <p className="text-center italic text-[#8e2942]">{subjects[slug].title}</p>
      <h1 className="mb-6 text-center text-3xl italic">{topic}</h1>
      <label htmlFor="materia-appunti" className="mb-2 block text-lg">Regole, schemi e appunti</label>
      <textarea id="materia-appunti" value={text} onChange={(event) => setSaved(saveLocalText(key, event.target.value))}
        placeholder="Scrivi qui i tuoi appunti…" className="min-h-[55vh] w-full resize-y rounded border border-[#d8c9ae] bg-transparent p-3 leading-8 outline-[#8e2942]" />
      <p role="status" className="mt-2 text-sm text-[#765b50]">{saved ? "Salvato su questo dispositivo" : "Impossibile salvare su questo dispositivo"}</p>
    </article>
  </main>;
}
