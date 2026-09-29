"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { StudentRecord } from "../data/students";
import cardBackground from "../assets/student-card-watercolor.webp";

const ink = "font-entry-elegant text-[#51372a]";

function whatsappNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits && !digits.startsWith("39") ? `39${digits}` : digits;
}

function ContactActions({ name, phone, whatsapp, email }: { name: string; phone: string; whatsapp: string; email: string }) {
  const links = [
    { label: `Chiama ${name}`, href: phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : "", left: "65%" },
    { label: `WhatsApp di ${name}`, href: whatsappNumber(whatsapp || phone) ? `https://wa.me/${whatsappNumber(whatsapp || phone)}` : "", left: "74%" },
    { label: `Email di ${name}`, href: email ? `mailto:${email.trim()}` : "", left: "83%" },
  ];
  return <>{links.map(({ label, href, left }) => href
    ? <a key={label} href={href} aria-label={label} className="absolute top-0 h-full w-[8%] rounded-full focus-visible:outline-2 focus-visible:outline-[#813247]" style={{ left }} />
    : null)}</>;
}

export default function StudentCard({ student }: { student: StudentRecord }) {
  const [notesOpen, setNotesOpen] = useState(false);
  const name = `${student.firstName} ${student.lastName}`.trim();
  const books = (student.books ?? []).map(book => [book.title, book.publisher].filter(Boolean).join(" — ")).filter(Boolean);
  const fallbackBooks = [student.textbooks.math, student.textbooks.physics, student.textbooks.chemistry].filter(Boolean);
  const address = [student.address, student.postalCode, student.city, student.province].filter(Boolean).join(", ");
  const mapHref = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "";

  return <main className="min-h-dvh w-full bg-[#efe3ce] text-[#51372a]">
    <div className="relative mx-auto aspect-[941/1672] min-h-dvh w-full max-w-[430px] overflow-hidden sm:min-h-0 sm:rounded-[28px]">
      <Image src={cardBackground} alt="" fill priority unoptimized sizes="(max-width: 430px) 100vw, 430px" className="pointer-events-none object-fill" />
      <h1 className="sr-only">Scheda di {name}</h1>
      <Link href="/studenti" aria-label="Indietro agli studenti" className="absolute left-[2%] top-[1%] z-30 h-[6%] w-[25%]" />
      <Link href="/menu" aria-label="Menu" className="absolute right-[2%] top-[1%] z-30 h-[6%] w-[25%]" />

      <div className="absolute left-[4%] top-[8.5%] h-[20.5%] w-[32%] overflow-hidden -rotate-[4deg]">
        {student.avatarUrl && <Image src={student.avatarUrl} alt={`Fotografia di ${name}`} fill unoptimized className="object-cover" />}
      </div>
      <div className={`absolute left-[39%] top-[19%] h-[10%] w-[49%] overflow-auto text-center ${ink}`}>
        <p className="text-[clamp(19px,5.1vw,26px)] leading-tight text-[#762b3b]">{name}</p>
        <p className="mt-1 text-[clamp(11px,3vw,15px)]">{student.subjects.join(" · ")}</p>
      </div>
      {student.personalNotes && <button type="button" onClick={() => setNotesOpen(true)} className="absolute left-[43%] top-[29.5%] z-20 w-[41%] text-center font-entry-elegant text-[clamp(11px,3vw,15px)] text-[#762b3b] underline">Note personali</button>}

      <section aria-label="Scuola e materie" className={`absolute left-[23%] top-[39.4%] h-[21%] w-[66%] ${ink} text-[clamp(12px,3.1vw,16px)]`}>
        <p className="absolute top-[0%] max-h-[20%] w-full overflow-auto">{student.schoolName || student.school || student.schoolType || "—"}</p>
        <p className="absolute top-[22%] max-h-[20%] w-full overflow-auto">{student.gradeClass || "—"}</p>
        <p className="absolute top-[45%] max-h-[20%] w-full overflow-auto">{student.subjects.join(", ") || "—"}</p>
        <p className="absolute top-[68%] max-h-[30%] w-full overflow-auto leading-tight">{(books.length ? books : fallbackBooks).join("; ") || "—"}</p>
      </section>

      <section aria-label="Contatti e famiglia" className="absolute inset-x-[4%] top-[69.1%] h-[10.3%]">
        <div className="relative h-[46%]">
          <span className={`absolute left-[29%] top-[4%] w-[33%] truncate text-center ${ink} text-[clamp(10px,2.7vw,14px)]`}>{student.firstName}<small className="block truncate text-[clamp(9px,2.4vw,12px)]">{student.phone}</small></span>
          <ContactActions name={student.firstName} phone={student.phone} whatsapp={student.whatsapp} email={student.email} />
        </div>
        <div className="relative mt-[2%] h-[46%]">
          <span className={`absolute left-[35%] top-[4%] w-[27%] truncate text-center ${ink} text-[clamp(10px,2.7vw,14px)]`}>{student.primaryParent || "—"}<small className="block truncate text-[clamp(9px,2.4vw,12px)]">{student.primaryParentPhone}</small></span>
          <ContactActions name={student.primaryParent || "genitore"} phone={student.primaryParentPhone} whatsapp={student.primaryParentWhatsapp} email={student.primaryParentEmail} />
        </div>
      </section>

      <p className={`absolute left-[13%] top-[86.2%] h-[3%] w-[65%] truncate ${ink} text-[clamp(11px,3vw,15px)]`}>{address || "Indirizzo non inserito"}</p>
      {mapHref && <a href={mapHref} target="_blank" rel="noopener noreferrer" aria-label={`Apri su Maps l'indirizzo di ${name}`} className="absolute left-[81%] top-[84.5%] h-[6%] w-[9%]" />}

      {notesOpen && <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#4c3324]/30 px-6">
        <section role="dialog" aria-modal="true" aria-label={`Note personali su ${name}`} className="w-full rounded-xl border border-[#a8886b] bg-[#fbf0dc] p-5 font-entry-elegant text-[#51372a] shadow-xl">
          <h2 className="text-xl text-[#762b3b]">Note personali</h2>
          <p className="mt-3 max-h-[55vh] overflow-y-auto whitespace-pre-wrap text-base leading-relaxed">{student.personalNotes}</p>
          <button type="button" onClick={() => setNotesOpen(false)} className="mt-4 text-[#762b3b] underline">Chiudi</button>
        </section>
      </div>}

      <nav aria-label="Azioni studente" className="absolute inset-x-[2%] bottom-[1%] h-[8%]">
        <Link href={`/calendario/nuova?studente=${encodeURIComponent(student.id)}&origine=profilo`} aria-label={`Nuova lezione per ${name}`} className="absolute inset-y-0 left-0 w-[33.3%]" />
        <Link href={`/studenti/${encodeURIComponent(student.id)}/percorso`} aria-label={`Percorso di ${name}`} className="absolute inset-y-0 left-[33.3%] w-[33.4%]" />
        <Link href={`/studenti/${encodeURIComponent(student.id)}/modifica`} aria-label={`Modifica ${name}`} className="absolute inset-y-0 right-0 w-[33.3%]" />
      </nav>
    </div>
  </main>;
}
