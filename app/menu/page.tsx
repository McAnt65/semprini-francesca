"use client";

import Image from "next/image";
import Link from "next/link";

export default function MenuPage() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#f4eddf]">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-dvh aspect-[9/16] max-w-full">
          {/* Grafica di sfondo del menu */}
          <Image
            src="/menu.png"
            alt="Menu del Registro"
            fill
            priority
            className="object-contain"
          />

          {/* -------------------------------------------------- */}
          {/* GRID 3x3 - HOTSPOT CLICCABILI                     */}
          {/* -------------------------------------------------- */}

          {/* RIGA 1 */}
          {/* 1. I miei studenti */}
          <Link
            href="/studenti"
            aria-label="I miei studenti"
            className="absolute left-[8%] top-[18.2%] w-[25.5%] h-[18.5%] cursor-pointer bg-transparent rounded-xl transition-all hover:bg-[#3C2A21]/5 active:bg-[#3C2A21]/10"
          />

          {/* 2. Calendario */}
          <Link
            href="/calendario"
            aria-label="Calendario"
            className="absolute left-[37.2%] top-[18.2%] w-[25.5%] h-[18.5%] cursor-pointer bg-transparent rounded-xl transition-all hover:bg-[#3C2A21]/5 active:bg-[#3C2A21]/10"
          />

          {/* 3. Materie */}
          <Link
            href="/materie"
            aria-label="Materie"
            className="absolute left-[66.5%] top-[18.2%] w-[25.5%] h-[18.5%] cursor-pointer bg-transparent rounded-xl transition-all hover:bg-[#3C2A21]/5 active:bg-[#3C2A21]/10"
          />

          {/* RIGA 2 */}
          {/* 4. Libri di testo */}
          <Link
            href="/libri"
            aria-label="Libri di testo"
            className="absolute left-[8%] top-[38.8%] w-[25.5%] h-[18.5%] cursor-pointer bg-transparent rounded-xl transition-all hover:bg-[#3C2A21]/5 active:bg-[#3C2A21]/10"
          />

          {/* 5. Archivio condiviso */}
          <Link
            href="/archivio-condiviso"
            aria-label="Archivio condiviso"
            className="absolute left-[37.2%] top-[38.8%] w-[25.5%] h-[18.5%] cursor-pointer bg-transparent rounded-xl transition-all hover:bg-[#3C2A21]/5 active:bg-[#3C2A21]/10"
          />

          {/* 6. Archivio personale */}
          <Link
            href="/archivio-personale"
            aria-label="Archivio personale"
            className="absolute left-[66.5%] top-[38.8%] w-[25.5%] h-[18.5%] cursor-pointer bg-transparent rounded-xl transition-all hover:bg-[#3C2A21]/5 active:bg-[#3C2A21]/10"
          />

          {/* RIGA 3 */}
          {/* 7. Richieste lezioni */}
          <Link
            href="/richieste"
            aria-label="Richieste lezioni"
            className="absolute left-[8%] top-[59.4%] w-[25.5%] h-[18.5%] cursor-pointer bg-transparent rounded-xl transition-all hover:bg-[#3C2A21]/5 active:bg-[#3C2A21]/10"
          />

          {/* 8. Lezioni a domicilio */}
          <Link
            href="/domicilio"
            aria-label="Lezioni a domicilio"
            className="absolute left-[37.2%] top-[59.4%] w-[25.5%] h-[18.5%] cursor-pointer bg-transparent rounded-xl transition-all hover:bg-[#3C2A21]/5 active:bg-[#3C2A21]/10"
          />

          {/* 9. Tariffe e pagamenti */}
          <Link
            href="/tariffe"
            aria-label="Tariffe e pagamenti"
            className="absolute left-[66.5%] top-[59.4%] w-[25.5%] h-[18.5%] cursor-pointer bg-transparent rounded-xl transition-all hover:bg-[#3C2A21]/5 active:bg-[#3C2A21]/10"
          />

          {/* -------------------------------------------------- */}
          {/* BANNER IN BASSO - DIARIO DELLA PROFESSORESSA      */}
          {/* -------------------------------------------------- */}
          <Link
            href="/diario"
            aria-label="Diario della professoressa"
            className="absolute left-[8%] top-[80%] w-[84%] h-[12.5%] cursor-pointer bg-transparent rounded-2xl transition-all hover:bg-[#3C2A21]/5 active:bg-[#3C2A21]/10"
          />

        </div>
      </div>
    </main>
  );
}