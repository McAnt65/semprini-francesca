"use client";

import Image from "next/image";
import Link from "next/link";

export default function MenuPage() {
  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#f4eddf]">
      <div className="mx-auto w-full max-w-[430px]">
        <div className="relative aspect-[9/16] w-full">
          <Image
            src="/menu.png"
            alt="Menu del Registro"
            fill
            priority
            sizes="(max-width: 430px) 100vw, 430px"
            className="object-contain"
          />

          <Link
            href="/studenti"
            aria-label="I miei studenti"
            className="absolute left-[8%] top-[18.2%] h-[18.5%] w-[25.5%] cursor-pointer rounded-xl bg-transparent transition-all hover:bg-[#3C2A21]/5 active:bg-[#3C2A21]/10"
          />

          <Link
            href="/calendario"
            aria-label="Calendario"
            className="absolute left-[37.2%] top-[18.2%] h-[18.5%] w-[25.5%] cursor-pointer rounded-xl bg-transparent transition-all hover:bg-[#3C2A21]/5 active:bg-[#3C2A21]/10"
          />

          <Link
            href="/materie"
            aria-label="Materie"
            className="absolute left-[66.5%] top-[18.2%] h-[18.5%] w-[25.5%] cursor-pointer rounded-xl bg-transparent transition-all hover:bg-[#3C2A21]/5 active:bg-[#3C2A21]/10"
          />

          <Link
            href="/libri"
            aria-label="Libri di testo"
            className="absolute left-[8%] top-[38.8%] h-[18.5%] w-[25.5%] cursor-pointer rounded-xl bg-transparent transition-all hover:bg-[#3C2A21]/5 active:bg-[#3C2A21]/10"
          />

          <Link
            href="/archivio-condiviso"
            aria-label="Archivio condiviso"
            className="absolute left-[37.2%] top-[38.8%] h-[18.5%] w-[25.5%] cursor-pointer rounded-xl bg-transparent transition-all hover:bg-[#3C2A21]/5 active:bg-[#3C2A21]/10"
          />

          <Link
            href="/archivio-personale"
            aria-label="Archivio personale"
            className="absolute left-[66.5%] top-[38.8%] h-[18.5%] w-[25.5%] cursor-pointer rounded-xl bg-transparent transition-all hover:bg-[#3C2A21]/5 active:bg-[#3C2A21]/10"
          />

          <Link
            href="/richieste"
            aria-label="Richieste lezioni"
            className="absolute left-[8%] top-[59.4%] h-[18.5%] w-[25.5%] cursor-pointer rounded-xl bg-transparent transition-all hover:bg-[#3C2A21]/5 active:bg-[#3C2A21]/10"
          />

          <Link
            href="/domicilio"
            aria-label="Lezioni a domicilio"
            className="absolute left-[37.2%] top-[59.4%] h-[18.5%] w-[25.5%] cursor-pointer rounded-xl bg-transparent transition-all hover:bg-[#3C2A21]/5 active:bg-[#3C2A21]/10"
          />

          <Link
            href="/tariffe"
            aria-label="Tariffe e pagamenti"
            className="absolute left-[66.5%] top-[59.4%] h-[18.5%] w-[25.5%] cursor-pointer rounded-xl bg-transparent transition-all hover:bg-[#3C2A21]/5 active:bg-[#3C2A21]/10"
          />

          <Link
            href="/diario"
            aria-label="Diario della professoressa"
            className="absolute left-[8%] top-[80%] h-[12.5%] w-[84%] cursor-pointer rounded-2xl bg-transparent transition-all hover:bg-[#3C2A21]/5 active:bg-[#3C2A21]/10"
          />
        </div>
      </div>
    </main>
  );
}
