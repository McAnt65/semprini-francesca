"use client";

import Image from "next/image";
import Link from "next/link";

export default function MenuPage() {
  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#f4eddf]">
      <div className="mx-auto w-full max-w-[430px]">
        <div className="relative aspect-[9/16] w-full min-h-dvh sm:min-h-0">
          <Image
            src="/menu.png"
            alt="Menu del Registro"
            fill
            priority
            sizes="(max-width: 430px) 100vw, 430px"
            className="object-fill"
          />

          <Link
            href="/studenti"
            aria-label="I miei studenti"
            className="antique-clickable absolute left-[8%] top-[18.2%] h-[18.5%] w-[25.5%] rounded-xl bg-transparent"
          />

          <Link
            href="/calendario"
            aria-label="Calendario"
            className="antique-clickable absolute left-[37.2%] top-[18.2%] h-[18.5%] w-[25.5%] rounded-xl bg-transparent"
          />

          <Link
            href="/materie"
            aria-label="Materie"
            className="antique-clickable absolute left-[66.5%] top-[18.2%] h-[18.5%] w-[25.5%] rounded-xl bg-transparent"
          />

          <Link
            href="/libri"
            aria-label="Libri di testo"
            className="antique-clickable absolute left-[8%] top-[38.8%] h-[18.5%] w-[25.5%] rounded-xl bg-transparent"
          />

          <Link
            href="/archivio-condiviso"
            aria-label="Archivio condiviso"
            className="antique-clickable absolute left-[37.2%] top-[38.8%] h-[18.5%] w-[25.5%] rounded-xl bg-transparent"
          />

          <Link
            href="/archivio-personale"
            aria-label="Archivio personale"
            className="antique-clickable absolute left-[66.5%] top-[38.8%] h-[18.5%] w-[25.5%] rounded-xl bg-transparent"
          />

          <Link
            href="/richieste"
            aria-label="Richieste lezioni"
            className="antique-clickable absolute left-[8%] top-[59.4%] h-[18.5%] w-[25.5%] rounded-xl bg-transparent"
          />

          <Link
            href="/domicilio"
            aria-label="Lezioni a domicilio"
            className="antique-clickable absolute left-[37.2%] top-[59.4%] h-[18.5%] w-[25.5%] rounded-xl bg-transparent"
          />

          <Link
            href="/tariffe"
            aria-label="Tariffe e pagamenti"
            className="antique-clickable absolute left-[66.5%] top-[59.4%] h-[18.5%] w-[25.5%] rounded-xl bg-transparent"
          />

          <Link
            href="/diario"
            aria-label="Diario della professoressa"
            className="antique-clickable absolute left-[8%] top-[80%] h-[12.5%] w-[84%] rounded-2xl bg-transparent"
          />
        </div>
      </div>
    </main>
  );
}
