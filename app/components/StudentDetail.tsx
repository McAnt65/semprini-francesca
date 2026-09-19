"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { StudentRecord } from "../data/students";

export default function StudentDetail({ student }: { student: StudentRecord }) {
  const router = useRouter();
  const fullName = [student.firstName, student.lastName].filter(Boolean).join(" ") || "Nome Cognome";
  const narrative = useMemo(() => buildNarrative(student), [student]);
  const studentContactName = student.firstName || "Studente";
  const parentContactName = student.primaryParent || "Genitore di riferimento";

  function callPhone(phone: string) {
    const cleaned = phone.trim().replace(/[^\d+]/g, "");
    if (cleaned) window.location.href = `tel:${cleaned}`;
  }

  function openWhatsApp(phone: string) {
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned && !cleaned.startsWith("39")) cleaned = `39${cleaned}`;
    if (cleaned) window.open(`https://wa.me/${cleaned}`, "_blank", "noopener,noreferrer");
  }

  function sendMail(email: string) {
    if (email.trim()) window.location.href = `mailto:${email.trim()}`;
  }

  function openMaps() {
    const destination = [
      student.address,
      student.postalCode,
      student.city,
      student.province,
    ].filter(Boolean).join(", ");

    if (destination) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  }

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#efe3ce] text-[#4b3024]">
      <div className="mx-auto w-full max-w-[430px] py-0 sm:py-3">
        <div className="relative aspect-[941/1672] w-full overflow-hidden sm:rounded-[28px]">
          <Image
            src="/student-diary-bg.webp"
            alt="Diario riassuntivo dello studente"
            fill
            priority
            unoptimized
            sizes="(max-width: 430px) 100vw, 430px"
            className="select-none object-fill"
          />

          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Indietro"
            className="antique-clickable absolute left-[1.8%] top-[0.8%] z-40 h-[5.6%] w-[19.5%] rounded-[12px] bg-transparent"
          />
          <button
            type="button"
            onClick={() => router.push("/menu")}
            aria-label="Torna al menù"
            className="antique-clickable absolute right-[1.7%] top-[0.8%] z-40 h-[5.6%] w-[18.8%] rounded-[12px] bg-transparent"
          />

          <div className="absolute left-[21%] right-[19%] top-[8.7%] z-30 text-center">
            <h1 className="font-handwritten text-[clamp(25px,7vw,38px)] leading-none text-[#6f2638]">
              {fullName}
            </h1>
          </div>

          <div className="absolute left-[4.8%] top-[18.2%] z-30 h-[22.2%] w-[28.5%] overflow-hidden">
            {student.avatarUrl ? (
              <Image
                src={student.avatarUrl}
                alt={`Fotografia di ${fullName}`}
                fill
                unoptimized
                sizes="123px"
                className="object-cover"
              />
            ) : null}
          </div>

          <div className="absolute left-[37.2%] top-[21.5%] z-30 flex h-[25.3%] w-[46.8%] items-center justify-center overflow-hidden px-[1%] text-center">
            <p className="font-entry-elegant text-[clamp(10px,2.6vw,14px)] leading-[1.42] text-[#51372a]">
              {narrative}
            </p>
          </div>

          <div className="absolute left-[23.2%] top-[55.3%] z-30 flex h-[10.5%] w-[67.2%] items-center justify-center overflow-hidden px-[1.5%] py-[1%] text-center">
            <p className="whitespace-pre-wrap font-entry-elegant text-[clamp(9px,2.45vw,13px)] leading-[1.38] text-[#5b3a2d]">
              {student.personalNotes || "Nessuna nota personale inserita."}
            </p>
          </div>

          <div className="absolute left-[28%] top-[74.0%] z-30 w-[30%] text-center">
            <span className="font-entry-elegant text-[clamp(11px,3vw,15px)] text-[#4b3024]">
              {studentContactName}
            </span>
          </div>
          <div className="absolute left-[28%] top-[80.0%] z-30 w-[30%] text-center">
            <span className="font-entry-elegant text-[clamp(11px,3vw,15px)] text-[#4b3024]">
              {parentContactName}
            </span>
          </div>

          <button
            type="button"
            aria-label="Chiama lo studente"
            disabled={!student.phone}
            onClick={() => callPhone(student.phone)}
            className="antique-clickable absolute left-[61.4%] top-[72.9%] z-40 h-[4.5%] w-[6.8%] rounded-full bg-transparent disabled:pointer-events-none"
          />
          <button
            type="button"
            aria-label="Apri WhatsApp dello studente"
            disabled={!student.whatsapp && !student.phone}
            onClick={() => openWhatsApp(student.whatsapp || student.phone)}
            className="antique-clickable absolute left-[69.0%] top-[72.9%] z-40 h-[4.5%] w-[6.8%] rounded-full bg-transparent disabled:pointer-events-none"
          />
          <button
            type="button"
            aria-label="Invia email allo studente"
            disabled={!student.email}
            onClick={() => sendMail(student.email)}
            className="antique-clickable absolute left-[76.8%] top-[72.9%] z-40 h-[4.5%] w-[6.8%] rounded-full bg-transparent disabled:pointer-events-none"
          />
          <button
            type="button"
            aria-label="Apri indirizzo dello studente sulla mappa"
            disabled={!student.address && !student.city}
            onClick={openMaps}
            className="antique-clickable absolute left-[84.4%] top-[72.9%] z-40 h-[4.5%] w-[6.8%] rounded-full bg-transparent disabled:pointer-events-none"
          />

          <button
            type="button"
            aria-label="Chiama il genitore di riferimento"
            disabled={!student.primaryParentPhone}
            onClick={() => callPhone(student.primaryParentPhone)}
            className="antique-clickable absolute left-[61.4%] top-[78.9%] z-40 h-[4.5%] w-[6.8%] rounded-full bg-transparent disabled:pointer-events-none"
          />
          <button
            type="button"
            aria-label="Apri WhatsApp del genitore di riferimento"
            disabled={!student.primaryParentWhatsapp && !student.primaryParentPhone}
            onClick={() => openWhatsApp(student.primaryParentWhatsapp || student.primaryParentPhone)}
            className="antique-clickable absolute left-[69.0%] top-[78.9%] z-40 h-[4.5%] w-[6.8%] rounded-full bg-transparent disabled:pointer-events-none"
          />
          <button
            type="button"
            aria-label="Invia email al genitore di riferimento"
            disabled={!student.primaryParentEmail}
            onClick={() => sendMail(student.primaryParentEmail)}
            className="antique-clickable absolute left-[76.8%] top-[78.9%] z-40 h-[4.5%] w-[6.8%] rounded-full bg-transparent disabled:pointer-events-none"
          />

          <button
            type="button"
            onClick={() => router.push(`/studenti/${student.id}/modifica`)}
            aria-label="Modifica studente"
            className="antique-clickable absolute bottom-[2.0%] right-[5.8%] z-40 h-[6.2%] w-[26.5%] rounded-[16px] bg-transparent"
          />
        </div>
      </div>
    </main>
  );
}

function buildNarrative(student: StudentRecord) {
  const sentences: string[] = [];
  const name = student.firstName || "Lo studente";
  const age = calculateAge(student.birthDate);
  if (age !== null) sentences.push(`${name} ha ${age} anni.`);

  const schoolReference = uniqueValues([
    student.schoolType,
    student.schoolName,
    student.school,
  ]).join(" — ");
  if (student.gradeClass && schoolReference) {
    sentences.push(`Frequenta ${student.gradeClass} presso ${schoolReference}.`);
  } else if (schoolReference) {
    sentences.push(`Frequenta ${schoolReference}.`);
  } else if (student.gradeClass) {
    sentences.push(`Frequenta ${student.gradeClass}.`);
  }

  const residence = [student.address, student.city ? `a ${student.city}` : ""]
    .filter(Boolean)
    .join(", ");
  if (residence) sentences.push(`Abita ${residence}.`);

  if (student.primaryParent && student.secondaryParent) {
    sentences.push(`I suoi riferimenti familiari sono ${student.primaryParent} e ${student.secondaryParent}.`);
  } else if (student.primaryParent) {
    sentences.push(`Il suo genitore di riferimento è ${student.primaryParent}.`);
  }

  if (student.subjects.length) sentences.push(`È seguito in ${formatList(student.subjects)}.`);

  const bookLabels = (student.books ?? [])
    .map((book) => [book.title, book.publisher].filter(Boolean).join(" — "))
    .filter(Boolean);
  if (bookLabels.length) {
    sentences.push(`Tra i suoi riferimenti di studio utilizza ${formatList(bookLabels)}.`);
  }

  if (student.enrollmentDate) {
    sentences.push(`È mio studente dal ${formatItalianDate(student.enrollmentDate)}.`);
  }

  return sentences.join(" ") || "I dati dello studente compariranno qui automaticamente.";
}

function uniqueValues(values: Array<string | undefined>) {
  const seen = new Set<string>();
  return values.filter((value): value is string => {
    const trimmed = value?.trim();
    if (!trimmed) return false;
    const key = trimmed.toLocaleLowerCase("it");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseDate(value: string) {
  const italian = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (italian) return new Date(Number(italian[3]), Number(italian[2]) - 1, Number(italian[1]));
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return new Date(value);
}

function calculateAge(value: string) {
  if (!value) return null;
  const birth = parseDate(value);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const month = today.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

function formatItalianDate(value: string) {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(date);
}

function formatList(values: string[]) {
  if (values.length < 2) return values[0] || "";
  if (values.length === 2) return `${values[0]} e ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} e ${values.at(-1)}`;
}
