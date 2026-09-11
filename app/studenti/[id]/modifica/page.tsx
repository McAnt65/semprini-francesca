"use client";

import Image from "next/image";
import Link from "next/link";
import { use } from "react";

export default function StudentEditMenuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <main className="min-h-dvh w-full bg-[#f4eddf]">
      <div className="mx-auto w-full max-w-[430px]">
        <div className="relative aspect-[2/3] w-full">
          <Image
            src="/student-edit-menu.png"
            alt="Completa il profilo dello studente"
            fill
            priority
            sizes="(max-width: 430px) 100vw, 430px"
            className="object-contain"
          />

          <Link
            href={`/studenti/${id}`}
            aria-label="Torna al profilo dello studente"
            className="absolute left-[2.5%] top-[1.5%] z-20 h-[6%] w-[13%]"
          />

          <Link
            href={`/studenti/${id}/modifica/dati-personali`}
            aria-label="Fotografia e dati personali"
            className="absolute left-[5%] top-[25.5%] z-20 h-[14.5%] w-[90%] rounded-[18px]"
          />

          <Link
            href={`/studenti/${id}/modifica/scuola`}
            aria-label="Scuola, materie e libri di riferimento"
            className="absolute left-[5%] top-[42%] z-20 h-[14.5%] w-[90%] rounded-[18px]"
          />

          <Link
            href={`/studenti/${id}/modifica/famiglia`}
            aria-label="Dove abita e famiglia"
            className="absolute left-[5%] top-[58.5%] z-20 h-[14.5%] w-[90%] rounded-[18px]"
          />

          <Link
            href={`/studenti/${id}/modifica/note`}
            aria-label="Note personali"
            className="absolute left-[5%] top-[75%] z-20 h-[14.5%] w-[90%] rounded-[18px]"
          />
        </div>
      </div>
    </main>
  );
}
