"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewStudentPage() {
  const router = useRouter();

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#efe3ce]">
      <div className="mx-auto w-full max-w-[430px]">
        <div className="relative aspect-[1024/1792] w-full overflow-hidden bg-[#f4e7cf] sm:rounded-[28px]">
          <Image
            src="/student-edit-menu.png"
            alt="Inserimento nuovo studente"
            fill
            priority
            sizes="(max-width: 430px) 100vw, 430px"
            className="object-cover"
          />

          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Indietro"
            className="absolute left-[3%] top-[1.5%] z-30 h-[5%] w-[24%] bg-transparent"
          />

          <Link
            href="/menu"
            aria-label="Torna al menù"
            className="absolute right-[3%] top-[1.5%] z-30 h-[5%] w-[21%] bg-transparent"
          />
        </div>
      </div>
    </main>
  );
}
