"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { StudentRecord } from "../data/students";

export default function StudentDetail({
  student,
}: {
  student: StudentRecord;
}) {
  const router = useRouter();

  const fullName =
    `${student.firstName} ${student.lastName}`.trim();

  const narrative = useMemo(
    () => buildNarrative(student),
    [student]
  );

  const savedBooks = (student.books ?? [])
    .map((book) => [book.title, book.publisher].filter(Boolean).join(" — "))
    .filter(Boolean);

  const textbookBooks = [
    student.textbooks.math,
    student.textbooks.physics,
    student.textbooks.chemistry,
  ].filter(
    (book): book is string =>
      typeof book === "string" &&
      book.trim().length > 0
  );
  const books = savedBooks.length > 0 ? savedBooks : textbookBooks;

  function callPhone(phone: string) {
    const cleaned = cleanPhoneForCall(phone);

    if (!cleaned) return;

    window.location.href = `tel:${cleaned}`;
  }

  function openWhatsApp(phone: string) {
    const cleaned = cleanPhoneForWhatsApp(phone);

    if (!cleaned) return;

    window.open(
      `https://wa.me/${cleaned}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function sendMail(email: string) {
    if (!email.trim()) return;

    window.location.href = `mailto:${email.trim()}`;
  }

  function openMaps() {
    const destination = [
      student.address,
      student.postalCode,
      student.city,
      student.province,
    ]
      .filter(Boolean)
      .join(", ");

    if (!destination) return;

    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        destination
      )}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#efe3ce] text-[#4b3024]">
      <div className="mx-auto w-full max-w-[430px] py-0 sm:py-3">
        <div className="relative aspect-[941/1672] w-full overflow-hidden sm:rounded-[28px]">

          {/* SFONDO */}
          <Image
            src="/student-diary-bg.png"
            alt={`Diario di ${fullName}`}
            fill
            priority
            unoptimized
            sizes="(max-width: 430px) 100vw, 430px"
            className="select-none object-fill"
          />

          {/* INDIETRO */}
          <button
            type="button"
            onClick={() => router.push("/studenti")}
            aria-label="Torna a I miei studenti"
            className="antique-clickable absolute left-[1.8%] top-[0.8%] z-40 h-[5.6%] w-[19.5%] rounded-[12px] bg-transparent"
          />

          {/* MENU */}
          <button
            type="button"
            onClick={() => router.push("/menu")}
            aria-label="Torna al menù"
            className="antique-clickable absolute right-[1.7%] top-[0.8%] z-40 h-[5.6%] w-[18.8%] rounded-[12px] bg-transparent"
          />

          {/* NOME E COGNOME */}
          <div className="absolute left-[20%] right-[18%] top-[9.8%] z-30 text-center">
            <h1 className="font-entry-elegant text-[clamp(25px,6.5vw,36px)] font-medium leading-[0.92] text-[#6f2638]">
              {fullName}
            </h1>
          </div>

          {/* FOTOGRAFIA */}
          <div className="absolute left-[5.2%] top-[18.5%] z-30 h-[21.6%] w-[28.1%] overflow-hidden">
            {student.avatarUrl && (
              <Image
                src={student.avatarUrl}
                alt={`Fotografia di ${fullName}`}
                fill
                unoptimized
                className="object-cover opacity-95"
              />
            )}
          </div>

          {/* TESTO NARRATIVO */}
          <div className="absolute left-[39.5%] top-[22.7%] z-30 flex h-[24.5%] w-[44.2%] flex-col items-center justify-center overflow-hidden px-[1%] text-center">
            <p className="font-entry-elegant text-[clamp(10px,2.45vw,13.5px)] leading-[1.42] text-[#51372a]">
              {narrative}
            </p>

            {books.length > 0 && (
              <p className="mt-[6%] font-entry-elegant text-[clamp(9px,2.25vw,12.5px)] leading-[1.38] text-[#5b3a2d]">
                <span className="text-[#6f2638]">
                  Libri di riferimento:
                </span>{" "}
                {formatList(books)}.
              </p>
            )}
          </div>

          {/* NOTE PERSONALI */}
          {student.personalNotes && (
            <div className="absolute left-[23.2%] top-[55.3%] z-30 flex h-[10.4%] w-[66.5%] items-center justify-center overflow-hidden px-[1.5%] py-[1%] text-center">
              <p className="whitespace-pre-wrap font-entry-elegant text-[clamp(9px,2.35vw,12.5px)] leading-[1.38] text-[#5b3a2d]">
                {student.personalNotes}
              </p>
            </div>
          )}

          {/* CONTATTI STUDENTE */}
          <div className="absolute left-[28.5%] top-[74.0%] z-30 w-[27%] text-center">
            <span className="font-entry-elegant text-[clamp(11px,2.9vw,15px)] text-[#4b3024]">
              {student.firstName}
            </span>
          </div>

          <button
            type="button"
            aria-label={`Chiama ${student.firstName}`}
            disabled={!student.phone.trim()}
            onClick={() => callPhone(student.phone)}
            className="antique-clickable absolute left-[61.2%] top-[72.8%] z-40 h-[4.5%] w-[6.9%] rounded-full bg-transparent disabled:pointer-events-none"
          />

          <button
            type="button"
            aria-label={`Apri WhatsApp di ${student.firstName}`}
            disabled={
              !(
                student.whatsapp ||
                student.phone
              ).trim()
            }
            onClick={() =>
              openWhatsApp(
                student.whatsapp ||
                  student.phone
              )
            }
            className="antique-clickable absolute left-[68.9%] top-[72.8%] z-40 h-[4.5%] w-[6.9%] rounded-full bg-transparent disabled:pointer-events-none"
          />

          <button
            type="button"
            aria-label={`Invia email a ${student.firstName}`}
            disabled={!student.email.trim()}
            onClick={() => sendMail(student.email)}
            className="antique-clickable absolute left-[76.7%] top-[72.8%] z-40 h-[4.5%] w-[6.9%] rounded-full bg-transparent disabled:pointer-events-none"
          />

          <button
            type="button"
            aria-label={`Apri indirizzo di ${student.firstName} sulla mappa`}
            disabled={
              !student.address.trim() &&
              !student.city.trim()
            }
            onClick={openMaps}
            className="antique-clickable absolute left-[84.4%] top-[72.8%] z-40 h-[4.5%] w-[6.9%] rounded-full bg-transparent disabled:pointer-events-none"
          />

          {/* CONTATTI GENITORE */}
          <div className="absolute left-[28.5%] top-[80.0%] z-30 w-[27%] text-center">
            <span className="font-entry-elegant text-[clamp(11px,2.9vw,15px)] text-[#4b3024]">
              {student.primaryParent || "Genitore"}
            </span>
          </div>

          <button
            type="button"
            aria-label="Chiama il genitore di riferimento"
            disabled={!student.primaryParentPhone.trim()}
            onClick={() =>
              callPhone(
                student.primaryParentPhone
              )
            }
            className="antique-clickable absolute left-[61.2%] top-[78.8%] z-40 h-[4.5%] w-[6.9%] rounded-full bg-transparent disabled:pointer-events-none"
          />

          <button
            type="button"
            aria-label="Apri WhatsApp del genitore di riferimento"
            disabled={
              !(
                student.primaryParentWhatsapp ||
                student.primaryParentPhone
              ).trim()
            }
            onClick={() =>
              openWhatsApp(
                student.primaryParentWhatsapp ||
                  student.primaryParentPhone
              )
            }
            className="antique-clickable absolute left-[68.9%] top-[78.8%] z-40 h-[4.5%] w-[6.9%] rounded-full bg-transparent disabled:pointer-events-none"
          />

          <button
            type="button"
            aria-label="Invia email al genitore di riferimento"
            disabled={!student.primaryParentEmail.trim()}
            onClick={() =>
              sendMail(
                student.primaryParentEmail
              )
            }
            className="antique-clickable absolute left-[76.7%] top-[78.8%] z-40 h-[4.5%] w-[6.9%] rounded-full bg-transparent disabled:pointer-events-none"
          />

          {/* FINE */}
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

function buildNarrative(
  student: StudentRecord
) {
  const sentences: string[] = [];

  const firstName =
    student.firstName ||
    "Lo studente";

  const age =
    calculateAge(student.birthDate);

  const schoolReference = uniqueValues([
    student.schoolType,
    student.schoolName,
    student.school,
  ]).join(" — ");

  if (age !== null) {
    sentences.push(
      `${firstName} ha ${age} anni.`
    );
  }

  if (
    student.gradeClass &&
    schoolReference
  ) {
    sentences.push(
      `Frequenta ${student.gradeClass} presso ${schoolReference}.`
    );
  } else if (schoolReference) {
    sentences.push(
      `Frequenta ${schoolReference}.`
    );
  } else if (student.gradeClass) {
    sentences.push(
      `Frequenta ${student.gradeClass}.`
    );
  }

  const residence = [
    student.address,
    student.city
      ? `a ${student.city}`
      : "",
  ]
    .filter(Boolean)
    .join(", ");

  if (residence) {
    sentences.push(
      `Abita ${residence}.`
    );
  }

  if (
    student.primaryParent &&
    student.secondaryParent
  ) {
    sentences.push(
      `I suoi riferimenti familiari sono ${student.primaryParent} e ${student.secondaryParent}.`
    );
  } else if (
    student.primaryParent
  ) {
    sentences.push(
      `Il suo genitore di riferimento è ${student.primaryParent}.`
    );
  }

  if (
    student.subjects.length > 0
  ) {
    sentences.push(
      `È seguito in ${formatList(
        student.subjects
      )}.`
    );
  }

  if (
    student.enrollmentDate
  ) {
    sentences.push(
      `È mio studente dal ${formatItalianDate(
        student.enrollmentDate
      )}.`
    );
  }

  if (
    sentences.length === 0
  ) {
    return "Le informazioni dello studente compariranno qui automaticamente.";
  }

  return sentences.join(" ");
}

function calculateAge(
  value: string
) {
  if (!value) return null;

  let birth: Date;

  const italianMatch =
    value.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    );

  if (italianMatch) {
    const [
      ,
      day,
      month,
      year,
    ] = italianMatch;

    birth = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );
  } else {
    birth = new Date(value);
  }

  if (
    Number.isNaN(
      birth.getTime()
    )
  ) {
    return null;
  }

  const today =
    new Date();

  let age =
    today.getFullYear() -
    birth.getFullYear();

  const monthDifference =
    today.getMonth() -
    birth.getMonth();

  if (
    monthDifference < 0 ||
    (
      monthDifference === 0 &&
      today.getDate() <
        birth.getDate()
    )
  ) {
    age--;
  }

  return age >= 0
    ? age
    : null;
}

function formatItalianDate(
  value: string
) {
  if (!value) return "";

  let date: Date;

  const italianMatch =
    value.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    );

  if (italianMatch) {
    const [
      ,
      day,
      month,
      year,
    ] = italianMatch;

    date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );
  } else {
    date = new Date(value);
  }

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "it-IT",
    {
      month: "long",
      year: "numeric",
    }
  ).format(date);
}

function formatList(
  values: string[]
) {
  const cleanValues =
    values.filter(Boolean);

  if (cleanValues.length === 0) {
    return "";
  }

  if (cleanValues.length === 1) {
    return cleanValues[0];
  }

  if (cleanValues.length === 2) {
    return `${cleanValues[0]} e ${cleanValues[1]}`;
  }

  return `${cleanValues
    .slice(0, -1)
    .join(", ")} e ${
    cleanValues[
      cleanValues.length - 1
    ]
  }`;
}

function uniqueValues(values: Array<string | undefined>) {
  return values.filter(
    (value, index, allValues) =>
      Boolean(value) && allValues.indexOf(value) === index
  ) as string[];
}

function cleanPhoneForCall(
  value: string
) {
  return value
    .trim()
    .replace(/[^\d+]/g, "");
}

function cleanPhoneForWhatsApp(
  value: string
) {
  let cleaned =
    value.replace(/\D/g, "");

  if (
    cleaned &&
    !cleaned.startsWith("39")
  ) {
    cleaned =
      `39${cleaned}`;
  }

  return cleaned;
}
