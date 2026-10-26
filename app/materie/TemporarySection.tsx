import Link from "next/link";
import type { ReactNode } from "react";

export default function TemporarySection({ title, children }: { title: string; children?: ReactNode }) {
  return <main className="grid min-h-dvh place-items-center bg-[#f3e4ce] px-6 py-10 font-serif text-[#493025]">
    <section className="w-full max-w-md border border-[#b69a7b] bg-[#fff8ed] px-6 py-10 text-center">
      <h1 className="text-3xl text-[#741d32]">{title}</h1>
      <p className="mt-5">Pagina in preparazione.</p>
      {children}
      <Link href="/materie" className="mt-8 inline-flex min-h-11 items-center text-[#741d32] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">
        Torna a Materie
      </Link>
    </section>
  </main>;
}
