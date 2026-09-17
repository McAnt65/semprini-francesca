"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function NewStudentHomeFamilyPage() {
  const router = useRouter();

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#efe3ce] text-[#4b3024]">
      <div className="mx-auto w-full max-w-[430px] py-0 sm:py-3">
        <div className="relative aspect-[941/1672] w-full overflow-hidden bg-[#f4e7cf] sm:rounded-[28px]">
          <Image src="/student-edit-menu.png" alt="Dove abita e famiglia" fill priority sizes="(max-width: 430px) 100vw, 430px" className="object-cover" />
          <button type="button" onClick={() => router.back()} aria-label="Indietro" className="antique-clickable absolute left-[3%] top-[1.5%] z-30 h-[5%] w-[24%] rounded-[12px] bg-transparent" />
          <section className="absolute left-[7%] right-[7%] top-[43%] z-20 rounded-[18px] border border-[#9b7658]/35 bg-[#f8ecd6]/95 px-5 py-6 text-center shadow-[0_8px_24px_rgba(72,48,30,0.12)]">
            <p className="font-field-label text-[clamp(13px,3.6vw,17px)] leading-tight text-[#6f1723]">Dove abita · Famiglia</p>
            <p className="mt-3 font-entry-elegant text-[clamp(12px,3.2vw,15px)] leading-snug text-[#5b3a2d]">Prossimo passaggio in preparazione.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
