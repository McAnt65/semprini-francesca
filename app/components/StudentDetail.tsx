"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { StudentRecord } from "../data/students";
import { saveStoredStudent } from "../data/student-storage";

type StudentData = StudentRecord;

const defaultStudent: StudentData = {
  id: "",
  enrollmentDate: "",
  avatarUrl: undefined,
  firstName: "",
  lastName: "",
  birthDate: "",
  school: "",
  gradeClass: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  city: "",
  primaryParent: "",
  primaryParentPhone: "",
  primaryParentWhatsapp: "",
  primaryParentEmail: "",
  secondaryParent: "",
  secondaryParentPhone: "",
  secondaryParentWhatsapp: "",
  subjects: [],
  textbooks: { math: "", physics: "", chemistry: "" },
};

function cleanPhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function cleanWhatsApp(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits && !digits.startsWith("39") ? `39${digits}` : digits;
}

function formatDate(value: string) {
  if (!value) return "";
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  return value;
}

export default function StudentDetail({ student = defaultStudent }: { student?: StudentData }) {
  const router = useRouter();
  const [saved, setSaved] = useState<StudentData>(student);
  const [draft, setDraft] = useState<StudentData>(student);
  const [isEditing, setIsEditing] = useState(false);

  const current = isEditing ? draft : saved;
  const fullName = useMemo(
    () => `${current.firstName} ${current.lastName}`.trim(),
    [current.firstName, current.lastName]
  );

  function updateField<K extends keyof StudentData>(field: K, value: StudentData[K]) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function updateTextbook(field: keyof StudentData["textbooks"], value: string) {
    setDraft((prev) => ({
      ...prev,
      textbooks: { ...prev.textbooks, [field]: value },
    }));
  }

  function toggleEdit() {
    if (isEditing) {
      setSaved(draft);
      saveStoredStudent({ ...draft, updatedAt: new Date().toISOString() });
      setIsEditing(false);
    } else {
      setDraft(saved);
      setIsEditing(true);
    }
  }

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#f4eddf]">
      <div className="mx-auto w-full max-w-[430px]">
        <div className="relative aspect-[768/1376] w-full">
          <Image
            src="/student-profile-bg-v2.png"
            alt="Scheda dello studente"
            fill
            priority
            sizes="(max-width: 430px) 100vw, 430px"
            className="object-contain"
          />

          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Torna a I miei studenti"
            className="antique-clickable absolute left-[3%] top-[2.2%] z-20 h-[4%] w-[29%] rounded-[10px] bg-transparent"
          />

          <button
            type="button"
            onClick={toggleEdit}
            aria-label={isEditing ? "Salva scheda studente" : "Modifica scheda studente"}
            className="antique-clickable absolute right-[3%] top-[2.2%] z-30 h-[4%] w-[18%] rounded-[10px] bg-transparent"
          />

          {isEditing && (
            <div className="pointer-events-none absolute right-[3.4%] top-[2.38%] z-20 bg-[#f3e6ca]/90 px-2 font-serif text-[clamp(8px,1.7vw,11px)] italic text-[#4b3528]">
              Salva
            </div>
          )}

          {fullName && (
            <div className="absolute left-[22%] top-[7.0%] w-[56%] overflow-hidden text-center font-serif text-[clamp(10px,2.5vw,16px)] italic text-[#3c2a21]">
              {fullName}
            </div>
          )}

          {isEditing ? (
            <TransparentInput value={draft.enrollmentDate} onChange={(v) => updateField("enrollmentDate", v)} left="45%" top="10.45%" width="30%" align="center" />
          ) : (
            <Field value={formatDate(saved.enrollmentDate)} left="45%" top="10.62%" width="30%" align="center" />
          )}

          <div className="absolute left-[7%] top-[14.8%] h-[23%] w-[35%] overflow-hidden">
            {current.avatarUrl && (
              <Image src={current.avatarUrl} alt={`${current.firstName} ${current.lastName}`} fill unoptimized className="object-cover opacity-90" />
            )}
          </div>

          {!current.avatarUrl && (
            <button type="button" aria-label="Aggiungi fotografia" className="antique-clickable absolute left-[14%] top-[24%] z-20 h-[9%] w-[22%] rounded-[12px] bg-transparent" />
          )}

          {isEditing ? (
            <>
              <TransparentInput value={draft.firstName} onChange={(v) => updateField("firstName", v)} left="63.8%" top="19.75%" width="18.5%" />
              <TransparentInput value={draft.lastName} onChange={(v) => updateField("lastName", v)} left="63.8%" top="23.45%" width="18.5%" />
              <TransparentInput value={draft.birthDate} onChange={(v) => updateField("birthDate", v)} left="63.8%" top="27.12%" width="18.5%" />
              <TransparentInput value={draft.school} onChange={(v) => updateField("school", v)} left="63.8%" top="30.78%" width="18.5%" small />
              <TransparentInput value={draft.gradeClass} onChange={(v) => updateField("gradeClass", v)} left="63.8%" top="34.42%" width="18.5%" />
            </>
          ) : (
            <>
              <Field value={saved.firstName} left="63.8%" top="20.0%" width="18.5%" />
              <Field value={saved.lastName} left="63.8%" top="23.7%" width="18.5%" />
              <Field value={formatDate(saved.birthDate)} left="63.8%" top="27.36%" width="18.5%" />
              <Field value={saved.schoolName || saved.schoolType || saved.school} left="63.8%" top="31.02%" width="18.5%" small />
              <Field value={saved.gradeClass} left="63.8%" top="34.66%" width="18.5%" />
            </>
          )}

          {isEditing ? (
            <>
              <TransparentInput value={draft.phone} onChange={(v) => updateField("phone", v)} left="20%" top="46.55%" width="20%" />
              <TransparentInput value={draft.whatsapp} onChange={(v) => updateField("whatsapp", v)} left="20%" top="49.88%" width="20%" />
              <TransparentInput value={draft.email} onChange={(v) => updateField("email", v)} left="20%" top="53.28%" width="20%" small />
              <TransparentInput value={draft.address} onChange={(v) => updateField("address", v)} left="57.5%" top="46.55%" width="31%" />
              <TransparentInput value={draft.city} onChange={(v) => updateField("city", v)} left="57.5%" top="51.75%" width="27%" />
            </>
          ) : (
            <>
              <Field value={saved.phone} left="20%" top="46.8%" width="21%" />
              <Field value={saved.whatsapp} left="20%" top="50.1%" width="21%" />
              <Field value={saved.email} left="20%" top="53.6%" width="21%" small />
              <Field value={saved.address} left="57.5%" top="46.8%" width="31%" />
              <Field value={[saved.postalCode, saved.city, saved.province && `(${saved.province})`].filter(Boolean).join(" ")} left="57.5%" top="52.0%" width="27%" />
            </>
          )}

          {!isEditing && current.phone && <a href={`tel:${cleanPhone(current.phone)}`} aria-label="Chiama studente" className="antique-clickable absolute left-[36.6%] top-[45.8%] z-20 h-[3.5%] w-[5.8%] rounded-full" />}
          {!isEditing && current.whatsapp && <a href={`https://wa.me/${cleanWhatsApp(current.whatsapp)}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp studente" className="antique-clickable absolute left-[36.6%] top-[49.3%] z-20 h-[3.5%] w-[5.8%] rounded-full" />}
          {!isEditing && current.email && <a href={`mailto:${current.email}`} aria-label="Email studente" className="antique-clickable absolute left-[36.6%] top-[52.8%] z-20 h-[3.5%] w-[5.8%] rounded-full" />}

          {!isEditing && (current.address || current.city) && (
            <a href={`https://maps.google.com/?q=${encodeURIComponent(`${current.address} ${current.city}`)}`} target="_blank" rel="noopener noreferrer" aria-label="Apri indirizzo in Maps" className="antique-clickable absolute left-[50%] top-[56.3%] z-20 h-[4%] w-[28%] rounded-[10px]" />
          )}

          {isEditing ? (
            <>
              <TransparentInput value={draft.primaryParent} onChange={(v) => updateField("primaryParent", v)} left="8%" top="67.35%" width="35%" />
              <TransparentInput value={draft.primaryParentPhone} onChange={(v) => updateField("primaryParentPhone", v)} left="8%" top="70.15%" width="28%" small />
              <TransparentInput value={draft.primaryParentEmail} onChange={(v) => updateField("primaryParentEmail", v)} left="17%" top="74.85%" width="25%" small />
              <TransparentInput value={draft.secondaryParent || ""} onChange={(v) => updateField("secondaryParent", v)} left="8%" top="81.75%" width="35%" />
              <TransparentInput value={draft.secondaryParentPhone || ""} onChange={(v) => updateField("secondaryParentPhone", v)} left="8%" top="84.55%" width="28%" small />
            </>
          ) : (
            <>
              <Field value={saved.primaryParent} left="8%" top="67.6%" width="35%" />
              <Field value={saved.primaryParentPhone} left="8%" top="70.4%" width="28%" small />
              <Field value={saved.primaryParentEmail} left="17%" top="75.1%" width="25%" small />
              <Field value={saved.secondaryParent || ""} left="8%" top="82.0%" width="35%" />
              <Field value={saved.secondaryParentPhone || ""} left="8%" top="84.8%" width="28%" small />
            </>
          )}

          {!isEditing && current.primaryParentPhone && <a href={`tel:${cleanPhone(current.primaryParentPhone)}`} aria-label="Chiama genitore" className="antique-clickable absolute left-[32%] top-[72.5%] z-20 h-[3.7%] w-[6%] rounded-full" />}
          {!isEditing && current.primaryParentWhatsapp && <a href={`https://wa.me/${cleanWhatsApp(current.primaryParentWhatsapp)}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp genitore" className="antique-clickable absolute left-[38.5%] top-[72.5%] z-20 h-[3.7%] w-[6%] rounded-full" />}
          {!isEditing && current.secondaryParentPhone && <a href={`tel:${cleanPhone(current.secondaryParentPhone)}`} aria-label="Chiama secondo genitore" className="antique-clickable absolute left-[8%] top-[91.2%] z-20 h-[3.7%] w-[6%] rounded-full" />}
          {!isEditing && current.secondaryParentWhatsapp && <a href={`https://wa.me/${cleanWhatsApp(current.secondaryParentWhatsapp)}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp secondo genitore" className="antique-clickable absolute left-[15%] top-[91.2%] z-20 h-[3.7%] w-[6%] rounded-full" />}

          {isEditing ? (
            <>
              <TransparentInput
                value={draft.subjects.join(", ")}
                onChange={(v) => updateField("subjects", v.split(",").map((item) => item.trim()).filter(Boolean))}
                left="63%"
                top="68.45%"
                width="29%"
              />
              <TransparentInput value={draft.textbooks.math || ""} onChange={(v) => updateTextbook("math", v)} left="64%" top="81.35%" width="28%" small />
              <TransparentInput value={draft.textbooks.physics || ""} onChange={(v) => updateTextbook("physics", v)} left="64%" top="84.95%" width="28%" small />
              <TransparentInput value={draft.textbooks.chemistry || ""} onChange={(v) => updateTextbook("chemistry", v)} left="64%" top="88.55%" width="28%" small />
            </>
          ) : (
            <>
              <Field value={saved.subjects.join(" · ")} left="63%" top="68.7%" width="29%" />
              <Field value={saved.textbooks.math || ""} left="64%" top="81.6%" width="28%" small />
              <Field value={saved.textbooks.physics || ""} left="64%" top="85.2%" width="28%" small />
              <Field value={saved.textbooks.chemistry || ""} left="64%" top="88.8%" width="28%" small />
            </>
          )}

          {!isEditing && <Link href="#dettagli-diario" aria-label="Vedi dettagli libri" className="antique-clickable absolute left-[52%] top-[92.5%] z-20 h-[4%] w-[30%] rounded-[10px]" />}
        </div>

        <DiaryDetails student={current} />
      </div>
    </main>
  );
}

function DiaryDetails({ student }: { student: StudentData }) {
  const books = student.books ?? [];
  const hasDetails = Boolean(
    student.schoolType || student.usefulReferences || student.secondaryParentEmail
    || student.familyNotes || student.personalNotes || books.length
  );

  if (!hasDetails) return null;

  return (
    <section id="dettagli-diario" className="mx-4 mb-8 scroll-mt-4 rounded-[26px] border border-[#9b7658]/30 bg-[#f8ecd6] px-7 py-7 text-[#4b3024] shadow-[0_8px_24px_rgba(72,48,30,0.10)]">
      <h2 className="text-center font-field-label text-xl text-[#6f2638]">Appunti del diario</h2>

      {(student.schoolType || student.schoolName) && (
        <DetailBlock title="Scuola">
          {[student.schoolType, student.schoolName, student.gradeClass].filter(Boolean).join(" · ")}
        </DetailBlock>
      )}

      {books.length > 0 && (
        <DetailBlock title="Libri di riferimento">
          <ul className="space-y-1">
            {books.map((book, index) => (
              <li key={`${book.title}-${index}`}>
                {[book.title, book.publisher].filter(Boolean).join(" — ")}
              </li>
            ))}
          </ul>
        </DetailBlock>
      )}

      {student.usefulReferences && <DetailBlock title="Riferimenti utili">{student.usefulReferences}</DetailBlock>}
      {student.secondaryParentEmail && <DetailBlock title="Email altro genitore">{student.secondaryParentEmail}</DetailBlock>}
      {student.familyNotes && <DetailBlock title="Note familiari">{student.familyNotes}</DetailBlock>}
      {student.personalNotes && <DetailBlock title="Note personali">{student.personalNotes}</DetailBlock>}
    </section>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 border-t border-[#a8886e]/25 pt-4">
      <h3 className="font-field-label text-sm text-[#6f2638]">{title}</h3>
      <div className="mt-1 whitespace-pre-wrap font-entry-elegant text-sm leading-relaxed text-[#5b3a2d]">{children}</div>
    </div>
  );
}

function Field({ value, left, top, width, small = false, align = "left" }: { value: string; left: string; top: string; width: string; small?: boolean; align?: "left" | "center" }) {
  if (!value) return null;
  return (
    <div className={`absolute overflow-hidden whitespace-nowrap font-serif text-[#3c2a21] ${small ? "text-[clamp(7px,1.5vw,11px)]" : "text-[clamp(8px,1.75vw,12px)]"} ${align === "center" ? "text-center" : "text-left"}`} style={{ left, top, width }}>
      {value}
    </div>
  );
}

function TransparentInput({ value, onChange, left, top, width, small = false, align = "left" }: { value: string; onChange: (value: string) => void; left: string; top: string; width: string; small?: boolean; align?: "left" | "center" }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label="Campo scheda studente"
      className={`absolute z-30 border-0 bg-transparent p-0 font-serif text-[#3c2a21] outline-none ${small ? "text-[clamp(7px,1.5vw,11px)]" : "text-[clamp(8px,1.75vw,12px)]"} ${align === "center" ? "text-center" : "text-left"}`}
      style={{ left, top, width }}
    />
  );
}
