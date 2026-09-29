"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import background from "../../../../assets/today-diary-watercolor.webp";
import { getStoredStudentById, saveStoredStudent } from "../../../../data/student-storage";
import type { StudentRecord } from "../../../../data/students";

type Section = "dati-personali" | "scuola" | "famiglia" | "note";
const names: Record<Section, string> = {
  "dati-personali": "Fotografia e dati personali",
  scuola: "Scuola, materie e libri",
  famiglia: "Dove abita e famiglia",
  note: "Note personali",
};
const subjects = ["Matematica", "Fisica", "Chimica"];
const fieldClass = "mt-1 w-full rounded-lg border border-[#aa8c6d]/55 bg-[#fff9eb]/70 px-3 py-2 font-entry-elegant text-base text-[#4b3024] outline-none focus-visible:ring-2 focus-visible:ring-[#843247]";

export default function EditStudentSection({
  params,
}: {
  params: Promise<{ id: string; sezione: string }>;
}) {
  const { id, sezione } = use(params);
  const section = sezione in names ? sezione as Section : null;
  const router = useRouter();
  const [student, setStudent] = useState<StudentRecord | null | undefined>(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    queueMicrotask(() => setStudent(getStoredStudentById(id) ?? null));
  }, [id]);

  function setText(key: keyof StudentRecord, value: string) {
    setStudent((current) => current ? { ...current, [key]: value } : current);
    setError("");
  }

  function setBook(index: number, key: "title" | "publisher", value: string) {
    setStudent((current) => current ? {
      ...current,
      books: (current.books ?? []).map((book, i) => i === index ? { ...book, [key]: value } : book),
    } : current);
  }

  function addBook() {
    setStudent((current) => current ? { ...current, books: [...(current.books ?? []), { title: "", publisher: "" }] } : current);
  }

  function changePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      setError("Scegli un'immagine inferiore a 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setText("avatarUrl", reader.result);
    };
    reader.readAsDataURL(file);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!student) return;
    if (!student.firstName.trim()) {
      setError("Il nome dello studente è necessario.");
      return;
    }
    const next = {
      ...student,
      firstName: student.firstName.trim(),
      lastName: student.lastName.trim(),
      books: (student.books ?? []).filter((book) => book.title.trim() || book.publisher.trim()),
      updatedAt: new Date().toISOString(),
    };
    if (!saveStoredStudent(next)) {
      setError("Non è stato possibile salvare. Se hai cambiato la foto, prova con un'immagine più leggera.");
      return;
    }
    router.replace("/studenti/" + encodeURIComponent(id));
  }

  const back = "/studenti/" + encodeURIComponent(id) + "/modifica";
  if (!section || student === null) return <main className="flex min-h-dvh items-center justify-center bg-[#f4eddf] px-6 text-center font-entry-elegant text-[#51372a]"><div><p>Pagina o studente non trovato.</p><Link href="/studenti" className="mt-4 inline-block underline">Torna agli studenti</Link></div></main>;
  if (!student) return <main className="min-h-dvh bg-[#f4eddf]" aria-label="Caricamento dati dello studente" />;

  return <main className="min-h-dvh bg-[#efe3ce] text-[#4b3024]">
    <div className="relative mx-auto min-h-dvh max-w-[430px] overflow-hidden bg-[#fcf1df]">
      <Image src={background} alt="" fill priority unoptimized sizes="(max-width: 430px) 100vw, 430px" className="pointer-events-none object-fill" />
      <div className="relative z-10 px-6 pb-8">
        <header className="pt-4">
          <div className="flex justify-between font-entry-elegant text-base"><Link href={back} className="py-2">‹ Modifica</Link><Link href="/menu" className="py-2">☰ Menù</Link></div>
          <h1 className="mt-4 text-center font-entry-elegant text-[clamp(25px,7vw,32px)] leading-tight text-[#762b3b]">{names[section]}</h1>
          <p className="mt-1 text-center font-entry-elegant text-base">{student.firstName} {student.lastName}</p>
          <div className="mx-auto my-5 h-px w-[75%] bg-[#ad8c6e]/60" />
        </header>
        <form onSubmit={save} className="space-y-4">
          {section === "dati-personali" && <>
            <div className="flex items-center gap-4">
              {student.avatarUrl && <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[#aa8c6d]/50"><Image src={student.avatarUrl} alt="Foto dello studente" fill unoptimized className="object-cover" /></div>}
              <label className="font-entry-elegant text-sm">Fotografia<input type="file" accept="image/*" onChange={changePhoto} className="mt-2 block w-full text-sm" /></label>
            </div>
            <Field label="Nome" value={student.firstName} onChange={(v) => setText("firstName", v)} required />
            <Field label="Cognome" value={student.lastName} onChange={(v) => setText("lastName", v)} />
            <Field label="Data di nascita" type="date" value={student.birthDate} onChange={(v) => setText("birthDate", v)} />
            <Field label="Mio studente dal" type="date" value={student.enrollmentDate} onChange={(v) => setText("enrollmentDate", v)} />
            <Field label="Telefono" type="tel" value={student.phone} onChange={(v) => setText("phone", v)} />
            <Field label="WhatsApp" type="tel" value={student.whatsapp} onChange={(v) => setText("whatsapp", v)} />
            <Field label="Email" type="email" value={student.email} onChange={(v) => setText("email", v)} />
          </>}
          {section === "scuola" && <>
            <Field label="Tipo di scuola" value={student.schoolType ?? ""} onChange={(v) => setText("schoolType", v)} />
            <Field label="Nome della scuola" value={student.schoolName ?? ""} onChange={(v) => setStudent({ ...student, schoolName: v, school: v })} />
            <Field label="Classe" value={student.gradeClass} onChange={(v) => setText("gradeClass", v)} />
            <Field label="Sezione" value={student.section ?? ""} onChange={(v) => setText("section", v)} />
            <fieldset><legend className="font-entry-elegant text-base">Materie</legend><div className="mt-2 flex flex-wrap gap-3">{subjects.map((subject) => <label key={subject} className="flex items-center gap-1.5 font-entry-elegant text-sm"><input type="checkbox" checked={student.subjects.includes(subject)} onChange={(event) => setStudent({ ...student, subjects: event.target.checked ? [...student.subjects, subject] : student.subjects.filter((item) => item !== subject) })} />{subject}</label>)}</div></fieldset>
            <div><h2 className="font-entry-elegant text-lg">Libri di riferimento</h2>{(student.books ?? []).map((book, index) => <div key={index} className="mt-3 grid grid-cols-2 gap-2"><Field label={"Titolo " + (index + 1)} value={book.title} onChange={(v) => setBook(index, "title", v)} /><Field label="Editore" value={book.publisher} onChange={(v) => setBook(index, "publisher", v)} /></div>)}<button type="button" onClick={addBook} className="mt-3 font-entry-elegant text-sm text-[#762b3b] underline">+ Aggiungi un libro</button></div>
          </>}
          {section === "famiglia" && <>
            <Field label="Indirizzo" value={student.address} onChange={(v) => setText("address", v)} />
            <div className="grid grid-cols-2 gap-2"><Field label="CAP" value={student.postalCode ?? ""} onChange={(v) => setText("postalCode", v)} /><Field label="Città" value={student.city} onChange={(v) => setText("city", v)} /></div>
            <Field label="Provincia" value={student.province ?? ""} onChange={(v) => setText("province", v)} />
            <h2 className="border-t border-[#ad8c6e]/50 pt-4 font-entry-elegant text-lg text-[#762b3b]">Genitore di riferimento</h2>
            <Field label="Nome" value={student.primaryParent} onChange={(v) => setText("primaryParent", v)} />
            <Field label="Telefono" type="tel" value={student.primaryParentPhone} onChange={(v) => setText("primaryParentPhone", v)} />
            <Field label="WhatsApp" type="tel" value={student.primaryParentWhatsapp} onChange={(v) => setText("primaryParentWhatsapp", v)} />
            <Field label="Email" type="email" value={student.primaryParentEmail} onChange={(v) => setText("primaryParentEmail", v)} />
            <h2 className="border-t border-[#ad8c6e]/50 pt-4 font-entry-elegant text-lg text-[#762b3b]">Altro contatto</h2>
            <Field label="Nome" value={student.secondaryParent ?? ""} onChange={(v) => setText("secondaryParent", v)} />
            <Field label="Telefono" type="tel" value={student.secondaryParentPhone ?? ""} onChange={(v) => setText("secondaryParentPhone", v)} />
            <Field label="WhatsApp" type="tel" value={student.secondaryParentWhatsapp ?? ""} onChange={(v) => setText("secondaryParentWhatsapp", v)} />
            <Field label="Email" type="email" value={student.secondaryParentEmail ?? ""} onChange={(v) => setText("secondaryParentEmail", v)} />
            <Area label="Riferimenti utili" value={student.usefulReferences ?? ""} onChange={(v) => setText("usefulReferences", v)} />
            <Area label="Note sulla famiglia" value={student.familyNotes ?? ""} onChange={(v) => setText("familyNotes", v)} />
          </>}
          {section === "note" && <Area label="Note personali su questo studente" value={student.personalNotes ?? ""} onChange={(v) => setText("personalNotes", v)} rows={12} />}
          {error && <p role="alert" className="rounded bg-[#fff5e7] p-2 font-entry-elegant text-sm text-[#9a293e]">{error}</p>}
          <div className="flex gap-3 border-t border-[#ad8c6e]/50 pt-5 font-entry-elegant">
            <Link href={back} className="flex min-h-12 flex-1 items-center justify-center rounded-full border border-[#aa8c6d]/70 bg-[#fff8e9]/65">Annulla</Link>
            <button type="submit" className="min-h-12 flex-1 rounded-full border border-[#855346]/70 bg-[#793444] text-[#fff8ee]">Salva</button>
          </div>
        </form>
      </div>
    </div>
  </main>;
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="block font-entry-elegant text-sm">{label}<input type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} className={fieldClass} /></label>;
}

function Area({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return <label className="block font-entry-elegant text-sm">{label}<textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} className={fieldClass + " resize-y"} /></label>;
}
