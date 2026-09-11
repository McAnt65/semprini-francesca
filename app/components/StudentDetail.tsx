"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface StudentData {
  enrollmentDate: string;
  avatarUrl?: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  school: string;
  gradeClass: string;

  phone: string;
  whatsapp: string;
  email: string;

  address: string;
  city: string;

  primaryParent: string;
  primaryParentPhone: string;
  primaryParentWhatsapp: string;
  primaryParentEmail: string;

  secondaryParent?: string;
  secondaryParentPhone?: string;
  secondaryParentWhatsapp?: string;

  subjects: string[];

  textbooks: {
    math?: string;
    physics?: string;
    chemistry?: string;
  };
}

const defaultStudent: StudentData = {
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
  textbooks: {
    math: "",
    physics: "",
    chemistry: "",
  },
};

function cleanPhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

export default function StudentDetail({
  student = defaultStudent,
}: {
  student?: StudentData;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<StudentData>(student);

  const current = isEditing ? draft : student;

  const fullName = useMemo(
    () => `${current.firstName} ${current.lastName}`.trim(),
    [current.firstName, current.lastName]
  );

  function updateField<K extends keyof StudentData>(
    field: K,
    value: StudentData[K]
  ) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function handleEditToggle() {
    if (isEditing) {
      setIsEditing(false);
      return;
    }

    setDraft(student);
    setIsEditing(true);
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
            className="absolute left-[3%] top-[2.2%] z-20 h-[4%] w-[29%] cursor-pointer bg-transparent"
          />

          <button
            type="button"
            onClick={handleEditToggle}
            aria-label={isEditing ? "Salva scheda studente" : "Modifica scheda studente"}
            className="absolute right-[3%] top-[2.2%] z-20 h-[4%] w-[18%] cursor-pointer bg-transparent"
          />

          {fullName && (
            <div className="absolute left-[23%] top-[7.3%] w-[54%] overflow-hidden text-center font-serif text-[clamp(11px,2.8vw,18px)] italic text-[#3c2a21]">
              {fullName}
            </div>
          )}

          {isEditing ? (
            <TransparentInput
              value={draft.enrollmentDate}
              onChange={(value) => updateField("enrollmentDate", value)}
              left="39%"
              top="10.55%"
              width="39%"
              align="center"
              placeholder="giorno mese anno"
            />
          ) : (
            <Field
              value={student.enrollmentDate}
              left="39%"
              top="10.7%"
              width="39%"
              align="center"
            />
          )}

          <div className="absolute left-[7%] top-[14.8%] h-[23%] w-[35%] overflow-hidden">
            {current.avatarUrl && (
              <Image
                src={current.avatarUrl}
                alt={`${current.firstName} ${current.lastName}`}
                fill
                className="object-cover opacity-90"
              />
            )}
          </div>

          {!current.avatarUrl && (
            <button
              type="button"
              aria-label="Aggiungi fotografia"
              className="absolute left-[14%] top-[24%] z-20 h-[9%] w-[22%] cursor-pointer bg-transparent"
            />
          )}

          {isEditing ? (
            <>
              <TransparentInput
                value={draft.firstName}
                onChange={(value) => updateField("firstName", value)}
                left="64%"
                top="19.55%"
                width="19%"
                placeholder="Nome"
              />
              <TransparentInput
                value={draft.lastName}
                onChange={(value) => updateField("lastName", value)}
                left="64%"
                top="23.35%"
                width="19%"
                placeholder="Cognome"
              />
              <TransparentInput
                value={draft.birthDate}
                onChange={(value) => updateField("birthDate", value)}
                left="64%"
                top="26.95%"
                width="19%"
                placeholder="gg/mm/aaaa"
              />
              <TransparentInput
                value={draft.school}
                onChange={(value) => updateField("school", value)}
                left="64%"
                top="30.75%"
                width="19%"
                placeholder="Scuola"
                small
              />
              <TransparentInput
                value={draft.gradeClass}
                onChange={(value) => updateField("gradeClass", value)}
                left="64%"
                top="34.45%"
                width="19%"
                placeholder="Classe"
              />
            </>
          ) : (
            <>
              <Field value={student.firstName} left="64%" top="20.0%" width="19%" />
              <Field value={student.lastName} left="64%" top="23.8%" width="19%" />
              <Field value={student.birthDate} left="64%" top="27.4%" width="19%" />
              <Field value={student.school} left="64%" top="31.2%" width="19%" small />
              <Field value={student.gradeClass} left="64%" top="34.9%" width="19%" />
            </>
          )}

          <Field value={current.phone} left="20%" top="46.8%" width="21%" />
          <Field value={current.whatsapp} left="20%" top="50.1%" width="21%" />
          <Field value={current.email} left="20%" top="53.6%" width="21%" small />

          {current.phone && (
            <a
              href={`tel:${cleanPhone(current.phone)}`}
              aria-label="Chiama studente"
              className="absolute left-[36.6%] top-[45.8%] z-20 h-[3.5%] w-[5.8%]"
            />
          )}

          {current.whatsapp && (
            <a
              href={`https://wa.me/${cleanPhone(current.whatsapp)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp studente"
              className="absolute left-[36.6%] top-[49.3%] z-20 h-[3.5%] w-[5.8%]"
            />
          )}

          {current.email && (
            <a
              href={`mailto:${current.email}`}
              aria-label="Email studente"
              className="absolute left-[36.6%] top-[52.8%] z-20 h-[3.5%] w-[5.8%]"
            />
          )}

          <Field value={current.address} left="57.5%" top="46.8%" width="31%" />
          <Field value={current.city} left="57.5%" top="52.0%" width="24%" />

          {(current.address || current.city) && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(
                `${current.address} ${current.city}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Apri indirizzo in Maps"
              className="absolute left-[50%] top-[56.3%] z-20 h-[4%] w-[28%]"
            />
          )}

          <Field value={current.primaryParent} left="8%" top="67.6%" width="35%" />
          <Field value={current.primaryParentEmail} left="17%" top="75.1%" width="25%" small />
          <Field value={current.secondaryParent || ""} left="8%" top="82.0%" width="35%" />

          {current.primaryParentPhone && (
            <a
              href={`tel:${cleanPhone(current.primaryParentPhone)}`}
              aria-label="Chiama genitore"
              className="absolute left-[32%] top-[72.5%] z-20 h-[3.7%] w-[6%]"
            />
          )}

          {current.primaryParentWhatsapp && (
            <a
              href={`https://wa.me/${cleanPhone(current.primaryParentWhatsapp)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp genitore"
              className="absolute left-[38.5%] top-[72.5%] z-20 h-[3.7%] w-[6%]"
            />
          )}

          {current.secondaryParentPhone && (
            <a
              href={`tel:${cleanPhone(current.secondaryParentPhone)}`}
              aria-label="Chiama secondo genitore"
              className="absolute left-[8%] top-[91.2%] z-20 h-[3.7%] w-[6%]"
            />
          )}

          {current.secondaryParentWhatsapp && (
            <a
              href={`https://wa.me/${cleanPhone(current.secondaryParentWhatsapp)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp secondo genitore"
              className="absolute left-[15%] top-[91.2%] z-20 h-[3.7%] w-[6%]"
            />
          )}

          <Field value={current.subjects.join(" · ")} left="63%" top="68.7%" width="29%" />
          <Field value={current.textbooks.math || ""} left="64%" top="81.6%" width="28%" small />
          <Field value={current.textbooks.physics || ""} left="64%" top="85.2%" width="28%" small />
          <Field value={current.textbooks.chemistry || ""} left="64%" top="88.8%" width="28%" small />

          <Link
            href="/studenti/libri"
            aria-label="Vedi dettagli libri"
            className="absolute left-[52%] top-[92.5%] z-20 h-[4%] w-[30%]"
          />
        </div>
      </div>
    </main>
  );
}

function Field({
  value,
  left,
  top,
  width,
  small = false,
  align = "left",
}: {
  value: string;
  left: string;
  top: string;
  width: string;
  small?: boolean;
  align?: "left" | "center";
}) {
  if (!value) return null;

  return (
    <div
      className={`absolute overflow-hidden whitespace-nowrap font-serif text-[#3c2a21] ${
        small ? "text-[clamp(7px,1.65vw,12px)]" : "text-[clamp(8px,1.9vw,14px)]"
      } ${align === "center" ? "text-center" : "text-left"}`}
      style={{ left, top, width }}
    >
      {value}
    </div>
  );
}

function TransparentInput({
  value,
  onChange,
  left,
  top,
  width,
  placeholder,
  small = false,
  align = "left",
}: {
  value: string;
  onChange: (value: string) => void;
  left: string;
  top: string;
  width: string;
  placeholder: string;
  small?: boolean;
  align?: "left" | "center";
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`absolute z-30 border-0 bg-transparent p-0 font-serif text-[#3c2a21] outline-none placeholder:text-[#6f5b4d]/45 ${
        small ? "text-[clamp(7px,1.65vw,12px)]" : "text-[clamp(8px,1.9vw,14px)]"
      } ${align === "center" ? "text-center" : "text-left"}`}
      style={{ left, top, width }}
    />
  );
}
