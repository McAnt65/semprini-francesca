"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import todayBackground from "./assets/today-diary-watercolor.webp";
import IdentityCallback from "./components/IdentityCallback";

export default function Home() {
  const [transizione, setTransizione] = useState(false);

  return (
    <main className="relative h-dvh w-full overflow-x-hidden bg-[#f4eddf]">
      <IdentityCallback />

      {/* SCHERMATA HOME */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ease-in-out ${
          transizione ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="relative h-full w-full max-w-[430px] sm:aspect-[9/16] sm:h-auto">
          <Image
            src="/Homepage.png"
            alt="Semprini Francesca - Insegnante"
            fill
            priority
            className="object-fill"
          />

          {/* Area cliccabile invisibile */}
          <Link
            href="/benvenuto"
            onClick={() => setTransizione(true)}
            aria-label="Entra nel registro"
            className="antique-clickable absolute z-50 left-[13%] top-[81%] h-[14.5%] w-[73%] rounded-[18px] bg-transparent border-none outline-none"
            style={{ WebkitTapHighlightColor: "transparent" }}
          />
        </div>
      </div>

      {/* ANTEPRIMA DEL DIARIO IN DISSOLVENZA */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ease-in-out ${
          transizione ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="relative h-full w-full max-w-[430px] sm:aspect-[9/16] sm:h-auto">
          <Image
            src={todayBackground}
            alt=""
            fill
            priority
            unoptimized
            className="object-fill"
          />
          <span className="absolute left-[10%] top-[13%] font-handwritten text-5xl text-[#71313b]">Oggi</span>
        </div>
      </div>

    </main>
  );
}
