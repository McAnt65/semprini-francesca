"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildStudentFromSavedDrafts,
  clearNewStudentDrafts,
  saveStoredStudent,
} from "../../../data/student-storage";

type AnyRecord = Record<string, unknown>;

type DiaryData = {
  firstName: string;
  lastName: string;
  birthDate: string;
  studentSince: string;

  phone: string;
  email: string;

  photo: string;

  schoolType: string;
  school: string;
  gradeClass: string;
  subjects: string[];
  books: string[];

  address: string;
  city: string;
  province: string;

  referenceName: string;
  referenceContact: string;
  referenceEmail: string;

  otherName: string;

  personalNotes: string;
  reminders: string;
};

const EMPTY_DATA: DiaryData = {
  firstName: "",
  lastName: "",
  birthDate: "",
  studentSince: "",

  phone: "",
  email: "",

  photo: "",

  schoolType: "",
  school: "",
  gradeClass: "",
  subjects: [],
  books: [],

  address: "",
  city: "",
  province: "",

  referenceName: "",
  referenceContact: "",
  referenceEmail: "",

  otherName: "",

  personalNotes: "",
  reminders: "",
};

export default function StudentDiaryPage() {
  const router = useRouter();
  const hasConsolidated = useRef(false);

  const [data] =
    useState<DiaryData>(() => readAllDrafts());

  useEffect(() => {
    if (hasConsolidated.current) return;
    hasConsolidated.current = true;

    const student = buildStudentFromSavedDrafts();

    if (!student.firstName && !student.lastName) return;
    if (!saveStoredStudent(student)) return;

    clearNewStudentDrafts();
    router.replace(`/studenti/${student.id}`);
  }, [router]);

  const fullName =
    [data.firstName, data.lastName]
      .filter(Boolean)
      .join(" ") || "Nome Cognome";

  const narrative = useMemo(
    () => buildNarrative(data),
    [data]
  );

  const studentContactName =
    data.firstName || "Studente";

  const parentContactName =
    data.referenceName ||
    "Genitore di riferimento";

  function goBack() {
    router.back();
  }

  function goToMenu() {
    router.push("/menu");
  }

  function finish() {
    router.push("/studenti");
  }

  function callPhone(phone: string) {
    const cleaned =
      cleanPhoneForCall(phone);

    if (!cleaned) return;

    window.location.href =
      `tel:${cleaned}`;
  }

  function openWhatsApp(
    phone: string
  ) {
    const cleaned =
      cleanPhoneForWhatsApp(phone);

    if (!cleaned) return;

    window.open(
      `https://wa.me/${cleaned}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function sendMail(email: string) {
    if (!email.trim()) return;

    window.location.href =
      `mailto:${email.trim()}`;
  }

  function openMaps() {
    const destination = [
      data.address,
      data.city,
      data.province,
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
            alt="Diario riassuntivo dello studente"
            fill
            priority
            unoptimized
            sizes="(max-width: 430px) 100vw, 430px"
            className="select-none object-fill"
          />

          {/* INDIETRO */}

          <button
            type="button"
            onClick={goBack}
            aria-label="Indietro"
            className="antique-clickable absolute left-[1.8%] top-[0.8%] z-40 h-[5.6%] w-[19.5%] rounded-[12px] bg-transparent"
          />

          {/* MENU */}

          <button
            type="button"
            onClick={goToMenu}
            aria-label="Torna al menù"
            className="antique-clickable absolute right-[1.7%] top-[0.8%] z-40 h-[5.6%] w-[18.8%] rounded-[12px] bg-transparent"
          />

          {/* NOME E COGNOME */}

          <div className="absolute left-[21%] right-[19%] top-[8.7%] z-30 text-center">
            <h1 className="font-handwritten text-[clamp(25px,7vw,38px)] leading-none text-[#6f2638]">
              {fullName}
            </h1>
          </div>

          {/* FOTO */}

          <div className="absolute left-[4.8%] top-[18.2%] z-30 h-[22.2%] w-[28.5%] overflow-hidden">
            {data.photo ? (
              <Image
                src={data.photo}
                alt={`Fotografia di ${fullName}`}
                fill
                unoptimized
                sizes="123px"
                className="object-cover"
              />
            ) : null}
          </div>

          {/* TESTO NARRATIVO */}

          <div className="absolute left-[37.2%] top-[21.5%] z-30 flex h-[25.3%] w-[46.8%] items-center justify-center overflow-hidden px-[1%] text-center">
            <p className="font-entry-elegant text-[clamp(10px,2.6vw,14px)] leading-[1.42] text-[#51372a]">
              {narrative}
            </p>
          </div>

          {/* NOTE PERSONALI */}

          <div className="absolute left-[23.2%] top-[55.3%] z-30 flex h-[10.5%] w-[67.2%] items-center justify-center overflow-hidden px-[1.5%] py-[1%] text-center">
            <p className="whitespace-pre-wrap font-entry-elegant text-[clamp(9px,2.45vw,13px)] leading-[1.38] text-[#5b3a2d]">
              {data.personalNotes ||
                "Nessuna nota personale inserita."}
            </p>
          </div>

          {/* CONTATTI STUDENTE - NOME */}

          <div className="absolute left-[28%] top-[74.0%] z-30 w-[30%] text-center">
            <span className="font-entry-elegant text-[clamp(11px,3vw,15px)] text-[#4b3024]">
              {studentContactName}
            </span>
          </div>

          {/* CONTATTI GENITORE - NOME */}

          <div className="absolute left-[28%] top-[80.0%] z-30 w-[30%] text-center">
            <span className="font-entry-elegant text-[clamp(11px,3vw,15px)] text-[#4b3024]">
              {parentContactName}
            </span>
          </div>

          {/* =====================================================
              CONTATTI STUDENTE
             ===================================================== */}

          <button
            type="button"
            aria-label="Chiama lo studente"
            disabled={!data.phone}
            onClick={() =>
              callPhone(data.phone)
            }
            className="antique-clickable absolute left-[61.4%] top-[72.9%] z-40 h-[4.5%] w-[6.8%] rounded-full bg-transparent disabled:pointer-events-none"
          />

          <button
            type="button"
            aria-label="Apri WhatsApp dello studente"
            disabled={!data.phone}
            onClick={() =>
              openWhatsApp(data.phone)
            }
            className="antique-clickable absolute left-[69.0%] top-[72.9%] z-40 h-[4.5%] w-[6.8%] rounded-full bg-transparent disabled:pointer-events-none"
          />

          <button
            type="button"
            aria-label="Invia email allo studente"
            disabled={!data.email}
            onClick={() =>
              sendMail(data.email)
            }
            className="antique-clickable absolute left-[76.8%] top-[72.9%] z-40 h-[4.5%] w-[6.8%] rounded-full bg-transparent disabled:pointer-events-none"
          />

          <button
            type="button"
            aria-label="Apri indirizzo dello studente sulla mappa"
            disabled={
              !data.address &&
              !data.city
            }
            onClick={openMaps}
            className="antique-clickable absolute left-[84.4%] top-[72.9%] z-40 h-[4.5%] w-[6.8%] rounded-full bg-transparent disabled:pointer-events-none"
          />

          {/* =====================================================
              CONTATTI GENITORE
             ===================================================== */}

          <button
            type="button"
            aria-label="Chiama il genitore di riferimento"
            disabled={
              !data.referenceContact
            }
            onClick={() =>
              callPhone(
                data.referenceContact
              )
            }
            className="antique-clickable absolute left-[61.4%] top-[78.9%] z-40 h-[4.5%] w-[6.8%] rounded-full bg-transparent disabled:pointer-events-none"
          />

          <button
            type="button"
            aria-label="Apri WhatsApp del genitore di riferimento"
            disabled={
              !data.referenceContact
            }
            onClick={() =>
              openWhatsApp(
                data.referenceContact
              )
            }
            className="antique-clickable absolute left-[69.0%] top-[78.9%] z-40 h-[4.5%] w-[6.8%] rounded-full bg-transparent disabled:pointer-events-none"
          />

          <button
            type="button"
            aria-label="Invia email al genitore di riferimento"
            disabled={
              !data.referenceEmail
            }
            onClick={() =>
              sendMail(
                data.referenceEmail
              )
            }
            className="antique-clickable absolute left-[76.8%] top-[78.9%] z-40 h-[4.5%] w-[6.8%] rounded-full bg-transparent disabled:pointer-events-none"
          />

          {/* FINE */}

          <button
            type="button"
            onClick={finish}
            aria-label="Fine"
            className="antique-clickable absolute bottom-[2.0%] right-[5.8%] z-40 h-[6.2%] w-[26.5%] rounded-[16px] bg-transparent"
          />

        </div>
      </div>
    </main>
  );
}

/* =========================================================
   LETTURA DI TUTTE LE BOZZE
   ========================================================= */

function readAllDrafts(): DiaryData {
  if (
    typeof window === "undefined"
  ) {
    return EMPTY_DATA;
  }

  const merged: AnyRecord = {};

  const storages = [
    window.localStorage,
    window.sessionStorage,
  ];

  for (const storage of storages) {
    for (
      let index = 0;
      index < storage.length;
      index++
    ) {
      const key =
        storage.key(index);

      if (
        !key ||
        !key.startsWith(
          "semprini:new-student:"
        )
      ) {
        continue;
      }

      const raw =
        storage.getItem(key);

      if (!raw) continue;

      try {
        const parsed =
          JSON.parse(raw);

        if (
          parsed &&
          typeof parsed === "object" &&
          !Array.isArray(parsed)
        ) {
          Object.assign(
            merged,
            parsed
          );
        }
      } catch {
        // Ignora valori non JSON
      }
    }
  }

  return {
    firstName: getString(
      merged,
      [
        "firstName",
        "name",
        "nome",
      ]
    ),

    lastName: getString(
      merged,
      [
        "lastName",
        "surname",
        "cognome",
      ]
    ),

    birthDate: getString(
      merged,
      [
        "birthDate",
        "dateOfBirth",
        "dataNascita",
      ]
    ),

    studentSince: getString(
      merged,
      [
        "studentSince",
        "studentFrom",
        "mioStudenteDa",
      ]
    ),

    phone: getString(
      merged,
      [
        "phone",
        "telephone",
        "studentPhone",
        "contactPhone",
        "whatsapp",
      ]
    ),

    email: getString(
      merged,
      [
        "email",
        "mail",
        "studentEmail",
      ]
    ),

    photo: getString(
      merged,
      [
        "watercolorPreview",
        "watercolorPhoto",
        "photoPreview",
        "photo",
        "photoOriginal",
        "image",
      ]
    ),

    schoolType: getString(
      merged,
      [
        "schoolType",
        "typeOfSchool",
        "tipoScuola",
        "tipoDiScuola",
      ]
    ),

    school: getString(
      merged,
      [
        "school",
        "schoolName",
        "scuola",
      ]
    ),

    gradeClass: getString(
      merged,
      [
        "gradeClass",
        "grade",
        "classYear",
        "class",
        "classe",
      ]
    ),

    subjects: getStringArray(
      merged,
      [
        "subjects",
        "materie",
        "selectedSubjects",
      ]
    ),

    books: getStringArray(
      merged,
      [
        "books",
        "referenceBooks",
        "libri",
      ]
    ),

    address: getString(
      merged,
      [
        "address",
        "indirizzo",
      ]
    ),

    city: getString(
      merged,
      [
        "city",
        "citta",
      ]
    ),

    province: getString(
      merged,
      [
        "province",
        "provincia",
      ]
    ),

    referenceName: getString(
      merged,
      [
        "referenceName",
        "referenceParentName",
        "parentName",
      ]
    ),

    referenceContact: getString(
      merged,
      [
        "referenceContact",
        "referencePhone",
        "referenceWhatsapp",
      ]
    ),

    referenceEmail: getString(
      merged,
      [
        "referenceEmail",
        "parentEmail",
      ]
    ),

    otherName: getString(
      merged,
      [
        "otherName",
        "otherParentName",
      ]
    ),

    personalNotes: getString(
      merged,
      [
        "personalNotes",
        "notes",
        "notePersonali",
      ]
    ),

    reminders: getString(
      merged,
      [
        "reminders",
        "promemoria",
      ]
    ),
  };
}

/* =========================================================
   TESTO NARRATIVO
   ========================================================= */

function buildNarrative(
  data: DiaryData
) {
  const sentences: string[] = [];

  const name =
    data.firstName || "Lo studente";

  const age =
    calculateAge(data.birthDate);

  if (age !== null) {
    sentences.push(
      `${name} ha ${age} anni.`
    );
  }

  const schoolReference = [
    data.schoolType,
    data.school,
  ]
    .filter(Boolean)
    .join(" — ");

  if (data.gradeClass && schoolReference) {
    sentences.push(
      `Frequenta ${data.gradeClass} presso ${schoolReference}.`
    );
  } else if (schoolReference) {
    sentences.push(
      `Frequenta ${schoolReference}.`
    );
  } else if (data.gradeClass) {
    sentences.push(
      `Frequenta ${data.gradeClass}.`
    );
  }

  const residence = [
    data.address,
    data.city
      ? `a ${data.city}`
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
    data.referenceName &&
    data.otherName
  ) {
    sentences.push(
      `I suoi riferimenti familiari sono ${data.referenceName} e ${data.otherName}.`
    );
  } else if (
    data.referenceName
  ) {
    sentences.push(
      `Il suo genitore di riferimento è ${data.referenceName}.`
    );
  }

  if (data.subjects.length > 0) {
    sentences.push(
      `È seguito in ${formatList(
        data.subjects
      )}.`
    );
  }

  if (data.books.length > 0) {
    sentences.push(
      `Tra i suoi riferimenti di studio utilizza ${formatList(
        data.books
      )}.`
    );
  }

  if (data.studentSince) {
    sentences.push(
      `È mio studente dal ${formatItalianDate(
        data.studentSince
      )}.`
    );
  }

  if (sentences.length === 0) {
    return "I dati dello studente compariranno qui automaticamente dopo la compilazione delle pagine precedenti.";
  }

  return sentences.join(" ");
}

/* =========================================================
   UTILITÀ
   ========================================================= */

function getString(
  record: AnyRecord,
  keys: string[]
) {
  for (const key of keys) {
    const value = record[key];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return "";
}

function getStringArray(
  record: AnyRecord,
  keys: string[]
) {
  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value
        .filter(
          (item): item is string =>
            typeof item === "string"
        )
        .map((item) =>
          item.trim()
        )
        .filter(Boolean);
    }

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value
        .split(/[,;|]/)
        .map((item) =>
          item.trim()
        )
        .filter(Boolean);
    }
  }

  return [];
}

function calculateAge(
  value: string
) {
  if (!value) return null;

  const birth =
    new Date(value);

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

  const month =
    today.getMonth() -
    birth.getMonth();

  if (
    month < 0 ||
    (
      month === 0 &&
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

  const date =
    new Date(value);

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
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} e ${values[1]}`;
  }

  return `${values
    .slice(0, -1)
    .join(", ")} e ${
    values[values.length - 1]
  }`;
}

function cleanPhoneForCall(
  value: string
) {
  return value
    .trim()
    .replace(
      /[^\d+]/g,
      ""
    );
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
