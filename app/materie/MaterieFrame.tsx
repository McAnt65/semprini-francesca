"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function Hotspot({ href, label, x, y, w, h }: { href: string; label: string; x: number; y: number; w: number; h: number }) {
  return <Link href={href} aria-label={label} className="absolute z-10 rounded-sm focus-visible:outline-2 focus-visible:outline-[#8e2942]" style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }} />;
}

export default function MaterieFrame({ image, alt, children, back = "/menu" }: { image: string; alt: string; children?: ReactNode; back?: string }) {
  const nav = [
    ["/studenti", "Studenti"],
    ["/calendario", "Calendario"],
    ["/calendario/nuova", "Lezione"],
    ["/materie", "Materie"],
    ["/menu", "Menu"],
  ];
  return <main className="min-h-screen bg-[#faf4e9] px-0 py-0 sm:py-4">
    <div className="relative mx-auto aspect-[941/1672] w-full max-w-[430px] overflow-hidden font-serif text-[#3e342e] shadow-sm">
      <Image src={image} alt={alt} fill sizes="(max-width: 430px) 100vw, 430px" priority unoptimized className="select-none object-fill" />
      <Hotspot href={back} label="Indietro" x={5} y={1} w={22} h={5} />
      <Hotspot href="/menu" label="Menu" x={74} y={1} w={22} h={5} />
      {children}
      {nav.map(([href, label], i) => <Hotspot key={label} href={href} label={label} x={i * 20} y={86} w={20} h={13} />)}
    </div>
  </main>;
}
