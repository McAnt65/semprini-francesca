"use client";

import { useRouter } from "next/navigation";

export default function NewStudentNotesPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#efe3ce] px-6 text-[#4b3024]">
      <section className="w-full max-w-[430px] rounded-[28px] border border-[#9b7658]/35 bg-[#f8ecd6] px-8 py-12 text-center shadow-[0_8px_24px_rgba(72,48,30,0.12)]">
        <h1 className="font-field-label text-2xl text-[#6f1723]">Note personali</h1>
        <p className="mt-4 font-entry-elegant">La quarta pagina del profilo sarà il prossimo passaggio.</p>
        <button type="button" onClick={() => router.back()} className="antique-clickable mt-8 rounded-full border border-[#8b6a50]/40 px-7 py-3 font-entry-elegant">Indietro</button>
      </section>
    </main>
  );
}
