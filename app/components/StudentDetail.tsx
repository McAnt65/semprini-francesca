"use client";

import Image from "next/image";
import Link from "next/link";
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

  return (
    <main className="relative min-h-dvh w-full overflow-x-hidden bg-[#f4eddf]">
      <div className="mx-auto w-full max-w-[430px]">
        <div className="relative aspect-[768/1376] w-full">
          {/* BASE GRAFICA */}
          <Image
            src="/student-profile-bg-v2.png"
            alt="Scheda dello studente"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-contain"
          />

          {/* TORNA A I MIEI STUDENTI */}
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Torna a I miei studenti"
            className="absolute left-[3%] top-[2.2%] z-20 h-[4%] w-[29%] cursor-pointer bg-transparent"
          />

          {/* MODIFICA */}
          <button
            type="button"
            aria-label="Modifica scheda studente"
            className="absolute right-[3%] top-[2.2%] z-20 h-[4%] w-[18%] cursor-pointer bg-transparent"
          />

          {/* DATA INIZIO */}
          <div className="absolute left-[35%] top-[10.9%] w-[48%] text-center font-serif text-[clamp(9px,2.1vw,16px)] text-[#3c2a21]">
            {student.enrollmentDate}
          </div>

          {/* FOTO */}
          <div className="absolute left-[7%] top-[14.8%] h-[23%] w-[35%] overflow-hidden">
            {student.avatarUrl && (
              <Image
                src={student.avatarUrl}
                alt={`${student.firstName} ${student.lastName}`}
                fill
                className="object-cover opacity-90"
              />
            )}
          </div>

          {/* AGGIUNGI FOTO */}
          {!student.avatarUrl && (
            <button
              type="button"
              aria-label="Aggiungi fotografia"
              className="absolute left-[14%] top-[24%] z-20 h-[9%] w-[22%] cursor-pointer bg-transparent"
            />
          )}

          {/* DATI PERSONALI */}
          <Field
            value={student.firstName}
            left="64%"
            top="20.0%"
            width="19%"
          />

          <Field
            value={student.lastName}
            left="64%"
            top="23.8%"
            width="19%"
          />

          <Field
            value={student.birthDate}
            left="64%"
            top="27.4%"
            width="19%"
          />

          <Field
            value={student.school}
            left="64%"
            top="31.2%"
            width="19%"
          />

          <Field
            value={student.gradeClass}
            left="64%"
            top="34.9%"
            width="19%"
          />

          {/* CONTATTI */}
          <Field
            value={student.phone}
            left="20%"
            top="46.8%"
            width="21%"
          />

          <Field
            value={student.whatsapp}
            left="20%"
            top="50.1%"
            width="21%"
          />

          <Field
            value={student.email}
            left="20%"
            top="53.6%"
            width="21%"
            small
          />

          {/* PULSANTI CONTATTI */}
          {student.phone && (
            <a
              href={`tel:${cleanPhone(student.phone)}`}
              aria-label="Chiama studente"
              className="absolute left-[36.6%] top-[45.8%] z-20 h-[3.5%] w-[5.8%]"
            />
          )}

          {student.whatsapp && (
            <a
              href={`https://wa.me/${cleanPhone(student.whatsapp)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp studente"
              className="absolute left-[36.6%] top-[49.3%] z-20 h-[3.5%] w-[5.8%]"
            />
          )}

          {student.email && (
            <a
              href={`mailto:${student.email}`}
              aria-label="Email studente"
              className="absolute left-[36.6%] top-[52.8%] z-20 h-[3.5%] w-[5.8%]"
            />
          )}

          {/* DOVE ABITA */}
          <Field
            value={student.address}
            left="57.5%"
            top="46.8%"
            width="31%"
          />

          <Field
            value={student.city}
            left="57.5%"
            top="52.0%"
            width="24%"
          />

          {(student.address || student.city) && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(
                `${student.address} ${student.city}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Apri indirizzo in Maps"
              className="absolute left-[50%] top-[56.3%] z-20 h-[4%] w-[28%]"
            />
          )}

          {/* FAMIGLIA */}
          <Field
            value={student.primaryParent}
            left="8%"
            top="67.6%"
            width="35%"
          />

          <Field
            value={student.primaryParentEmail}
            left="17%"
            top="75.1%"
            width="25%"
            small
          />

          <Field
            value={student.secondaryParent || ""}
            left="8%"
            top="82.0%"
            width="35%"
          />

          {/* GENITORE 1 */}
          {student.primaryParentPhone && (
            <a
              href={`tel:${cleanPhone(student.primaryParentPhone)}`}
              aria-label="Chiama genitore"
              className="absolute left-[32%] top-[72.5%] z-20 h-[3.7%] w-[6%]"
            />
          )}

          {student.primaryParentWhatsapp && (
            <a
              href={`https://wa.me/${cleanPhone(
                student.primaryParentWhatsapp
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp genitore"
              className="absolute left-[38.5%] top-[72.5%] z-20 h-[3.7%] w-[6%]"
            />
          )}

          {/* GENITORE 2 */}
          {student.secondaryParentPhone && (
            <a
              href={`tel:${cleanPhone(student.secondaryParentPhone)}`}
              aria-label="Chiama secondo genitore"
              className="absolute left-[8%] top-[91.2%] z-20 h-[3.7%] w-[6%]"
            />
          )}

          {student.secondaryParentWhatsapp && (
            <a
              href={`https://wa.me/${cleanPhone(
                student.secondaryParentWhatsapp
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp secondo genitore"
              className="absolute left-[15%] top-[91.2%] z-20 h-[3.7%] w-[6%]"
            />
          )}

          {/* MATERIE */}
          <Field
            value={student.subjects.join(" · ")}
            left="63%"
            top="68.7%"
            width="29%"
          />

          {/* LIBRI */}
          <Field
            value={student.textbooks.math || ""}
            left="64%"
            top="81.6%"
            width="28%"
            small
          />

          <Field
            value={student.textbooks.physics || ""}
            left="64%"
            top="85.2%"
            width="28%"
            small
          />

          <Field
            value={student.textbooks.chemistry || ""}
            left="64%"
            top="88.8%"
            width="28%"
            small
          />

          {/* DETTAGLIO LIBRI */}
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
}: {
  value: string;
  left: string;
  top: string;
  width: string;
  small?: boolean;
}) {
  if (!value) return null;

  return (
    <div
      className={`absolute overflow-hidden whitespace-nowrap font-serif text-[#3c2a21] ${
        small
          ? "text-[clamp(7px,1.65vw,12px)]"
          : "text-[clamp(8px,1.9vw,14px)]"
      }`}
      style={{
        left,
        top,
        width,
      }}
    >
      {value}
    </div>
  );
}