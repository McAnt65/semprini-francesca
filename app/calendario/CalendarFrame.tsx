"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

type View = "month" | "week" | "day";

const images: Record<View, string> = {
  month: "/calendar-month-watercolor-approved.png",
  week: "/calendar-week-watercolor-approved.png",
  day: "/calendar-day-watercolor-approved.png",
};

export default function CalendarFrame({ view, date, children, previous, next }: {
  view: View; date: string; children: ReactNode; previous: () => void; next: () => void;
}) {
  const router = useRouter();
  const hit = "antique-clickable absolute z-30 bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#813247]";
  return <main className="min-h-dvh w-full overflow-x-hidden bg-[#efe3ce] text-[#4b3024]">
    <div className="mx-auto w-full max-w-[430px] sm:py-3">
      <div className="relative aspect-[941/1672] w-full min-h-dvh overflow-hidden bg-[#f4e7cf] sm:min-h-0 sm:rounded-[28px]">
        <Image src={images[view]} alt="" fill priority unoptimized sizes="(max-width: 430px) 100vw, 430px" className="pointer-events-none select-none object-fill" />
        <button onClick={() => router.back()} aria-label="Indietro" className={`${hit} left-[3%] top-[1.4%] h-[7.3%] w-[23%]`} />
        <Link href="/menu" aria-label="Menu" className={`${hit} right-[3%] top-[1.4%] h-[8%] w-[16%]`} />
        <Link href={`/calendario?data=${date}`} aria-label="Vista mese" aria-current={view === "month" ? "page" : undefined} className={`${hit} left-[5%] top-[14.5%] h-[5.3%] w-[30%]`} />
        <Link href={`/calendario/settimana?data=${date}`} aria-label="Vista settimana" aria-current={view === "week" ? "page" : undefined} className={`${hit} left-[35%] top-[14.5%] h-[5.3%] w-[30%]`} />
        <Link href={`/calendario/giorno?data=${date}`} aria-label="Vista giorno" aria-current={view === "day" ? "page" : undefined} className={`${hit} left-[65%] top-[14.5%] h-[5.3%] w-[30%]`} />
        <button onClick={previous} aria-label="Periodo precedente" className={`${hit} left-[3%] top-[20.7%] h-[6.4%] w-[14%]`} />
        <button onClick={next} aria-label="Periodo successivo" className={`${hit} right-[3%] top-[20.7%] h-[6.4%] w-[14%]`} />
        {children}
        <nav aria-label="Navigazione principale" className="absolute inset-x-[2%] bottom-[1%] z-30 h-[10.2%]">
          <Link href="/studenti" aria-label="Studenti" className={`${hit} inset-y-0 left-0 w-[20%]`} />
          <Link href="/calendario" aria-label="Calendario" aria-current="page" className={`${hit} inset-y-0 left-[20%] w-[20%]`} />
          <Link href={`/calendario/nuova?data=${date}`} aria-label="Nuova lezione" className={`${hit} inset-y-0 left-[40%] w-[20%]`} />
          <Link href="/materie" aria-label="Materie" className={`${hit} inset-y-0 left-[60%] w-[20%]`} />
          <Link href="/menu" aria-label="Menu" className={`${hit} inset-y-0 left-[80%] w-[20%]`} />
        </nav>
      </div>
    </div>
  </main>;
}
