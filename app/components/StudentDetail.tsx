"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Struttura dati di esempio (sostituibile con i dati da Supabase/Database)
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
  enrollmentDate: "12 Settembre 2023",
  avatarUrl: "/avatars/marco.jpg",
  firstName: "Marco",
  lastName: "Bianchi",
  birthDate: "24/05/2007",
  school: "Liceo Scientifico G. Galilei",
  gradeClass: "3ª A",
  phone: "345 678 9012",
  whatsapp: "3456789012",
  email: "marco.bianchi07@email.it",
  address: "Via delle Rose, 12",
  city: "47030 San Mauro (FC)",
  primaryParent: "Laura Rossi",
  primaryParentPhone: "333 123 4567",
  primaryParentWhatsapp: "3331234567",
  primaryParentEmail: "laurarossi@email.it",
  secondaryParent: "Andrea Bianchi",
  secondaryParentPhone: "334 987 6543",
  secondaryParentWhatsapp: "3349876543",
  subjects: ["Matematica", "Fisica", "Chimica"],
  textbooks: {
    math: "Bergamini - Matematica.blu 2.0 - Vol. 3",
    physics: "Amaldi - L'Amaldi per i licei scientifici - Vol. 1",
    chemistry: "Valitutti - Chimica: concetti e modelli - Vol. 1",
  },
};

export default function StudentDetail({
  student = defaultStudent,
}: {
  student?: StudentData;
}) {
  const router = useRouter();

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#f4eddf] select-none">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-dvh aspect-[9/16] max-w-full">
          {/* Grafica di sfondo */}
          <Image
            src="/student-profile-bg.png"
            alt="Scheda Studente"
            fill
            priority
            className="object-contain"
          />

          {/* 1. FRECCIA INDIETRO / TORNA AGLI STUDENTI */}
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute top-[2.2%] left-[4%] z-20 flex items-center gap-2 text-[#3C2A21] font-serif text-sm cursor-pointer hover:opacity-75 transition-opacity"
          >
            ← I miei studenti
          </button>

          {/* 2. INTESTAZIONE: DATA ISCRIZIONE */}
          <div className="absolute top-[12%] left-0 right-0 text-center font-serif text-xs text-[#3C2A21]/80 italic">
            Studente dal {student.enrollmentDate} ♡
          </div>

          {/* 3. FOTO STUDENTE */}
          <div className="absolute top-[15.8%] left-[6.8%] w-[33.5%] h-[20.8%] overflow-hidden rounded-md border border-[#8C6D53]/30 shadow-inner">
            {student.avatarUrl ? (
              <Image
                src={student.avatarUrl}
                alt={`${student.firstName} ${student.lastName}`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#EFE8D8] flex items-center justify-center text-[#8C6D53] text-xs italic">
                Nessuna foto
              </div>
            )}
          </div>

          {/* 4. DATI PERSONALI */}
          <div className="absolute top-[20.8%] left-[58%] right-[8%] font-serif text-[11px] text-[#3C2A21] leading-[2.1rem]">
            <p className="truncate">{student.firstName}</p>
            <p className="truncate">{student.lastName}</p>
            <p className="truncate">{student.birthDate}</p>
            <p className="truncate">{student.school}</p>
            <p className="truncate">{student.gradeClass}</p>
          </div>

          {/* 5. CONTATTI */}
          <div className="absolute top-[50.2%] left-[18%] right-[58%] font-serif text-[11px] text-[#3C2A21] leading-[1.85rem]">
            <p className="truncate">{student.phone}</p>
            <p className="truncate">{student.whatsapp}</p>
            <p className="truncate text-[9.5px]">{student.email}</p>
          </div>

          {/* Pulsanti Azione Contatti */}
          {/* Chiamata */}
          <a
            href={`tel:${student.phone.replace(/\s+/g, "")}`}
            aria-label="Chiama studente"
            className="absolute top-[50%] left-[35.5%] w-[5.5%] h-[2.8%] cursor-pointer rounded-full bg-transparent hover:bg-[#3C2A21]/10"
          />
          {/* WhatsApp */}
          <a
            href={`https://wa.me/${student.whatsapp.replace(/\s+/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Invia WhatsApp a studente"
            className="absolute top-[53.2%] left-[35.5%] w-[5.5%] h-[2.8%] cursor-pointer rounded-full bg-transparent hover:bg-[#3C2A21]/10"
          />
          {/* Email */}
          <a
            href={`mailto:${student.email}`}
            aria-label="Invia Email a studente"
            className="absolute top-[56.6%] left-[35.5%] w-[5.5%] h-[2.8%] cursor-pointer rounded-full bg-transparent hover:bg-[#3C2A21]/10"
          />

          {/* 6. DOVE ABITA */}
          <div className="absolute top-[50.2%] left-[58%] right-[8%] font-serif text-[11px] text-[#3C2A21] leading-[1.85rem]">
            <p className="truncate">{student.address}</p>
            <p className="truncate">{student.city}</p>
          </div>

          {/* Pulsante Apri in Maps */}
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(
              `${student.address}, ${student.city}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Apri in Mappe"
            className="absolute top-[59.2%] left-[48.2%] w-[26.5%] h-[3.2%] cursor-pointer bg-transparent rounded-lg hover:bg-[#3C2A21]/10"
          />

          {/* 7. FAMIGLIA */}
          <div className="absolute top-[71.2%] left-[8%] right-[58%] font-serif text-[11px] text-[#3C2A21]">
            <p className="font-semibold text-[10.5px]">{student.primaryParent}</p>
            <p className="mt-[2.2rem] truncate text-[9.5px]">{student.primaryParentEmail}</p>
            <p className="mt-[2.2rem] font-semibold text-[10.5px]">{student.secondaryParent}</p>
          </div>

          {/* Pulsanti Contatto Genitori */}
          {/* Genitore 1 - Chiamata */}
          <a
            href={`tel:${student.primaryParentPhone.replace(/\s+/g, "")}`}
            className="absolute top-[75%] left-[27.2%] w-[5.5%] h-[2.8%] cursor-pointer bg-transparent hover:bg-[#3C2A21]/10"
          />
          {/* Genitore 1 - WhatsApp */}
          <a
            href={`https://wa.me/${student.primaryParentWhatsapp.replace(/\s+/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-[75%] left-[34.8%] w-[5.5%] h-[2.8%] cursor-pointer bg-transparent hover:bg-[#3C2A21]/10"
          />
          {/* Genitore 2 - Chiamata */}
          {student.secondaryParentPhone && (
            <a
              href={`tel:${student.secondaryParentPhone.replace(/\s+/g, "")}`}
              className="absolute top-[90.5%] left-[13.5%] w-[5.5%] h-[2.8%] cursor-pointer bg-transparent hover:bg-[#3C2A21]/10"
            />
          )}
          {/* Genitore 2 - WhatsApp */}
          {student.secondaryParentWhatsapp && (
            <a
              href={`https://wa.me/${student.secondaryParentWhatsapp.replace(/\s+/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-[90.5%] left-[20.8%] w-[5.5%] h-[2.8%] cursor-pointer bg-transparent hover:bg-[#3C2A21]/10"
            />
          )}

          {/* 8. MATERIE SEGUITE */}
          <div className="absolute top-[71.2%] left-[58%] right-[8%] font-serif text-[11px] text-[#3C2A21]">
            <p className="truncate">{student.subjects.join(", ")}</p>
          </div>

          {/* 9. LIBRI DI TESTO */}
          <div className="absolute top-[81.8%] left-[58%] right-[8%] font-serif text-[9.5px] text-[#3C2A21] leading-[1.75rem]">
            <p className="truncate">{student.textbooks.math || "-"}</p>
            <p className="truncate">{student.textbooks.physics || "-"}</p>
            <p className="truncate">{student.textbooks.chemistry || "-"}</p>
          </div>

          {/* Pulsante Vedi Dettagli Libri */}
          <Link
            href={`/studenti/${student.firstName.toLowerCase()}/libri`}
            aria-label="Vedi dettagli libri"
            className="absolute top-[93%] left-[53.5%] w-[26.5%] h-[3.2%] cursor-pointer bg-transparent rounded-lg hover:bg-[#3C2A21]/10"
          />

        </div>
      </div>
    </main>
  );
}