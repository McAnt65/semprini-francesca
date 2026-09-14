"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [transizione, setTransizione] = useState(false);

  const entraNelRegistro = () => {
    if (transizione) return;

    setTransizione(true);

    // Durata ridotta a 700ms per una sfumatura fluida e reattiva
    setTimeout(() => {
      router.push("/menu");
    }, 700);
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#f4eddf]">

      {/* SCHERMATA HOME */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ease-in-out ${
          transizione ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="relative h-dvh aspect-[9/16] max-w-full">
          <Image
            src="/Homepage.png"
            alt="Semprini Francesca - Insegnante"
            fill
            priority
            className="object-contain"
          />

          {/* Area cliccabile invisibile */}
          <button
            type="button"
            onClick={entraNelRegistro}
            aria-label="Entra nel registro"
            className="antique-clickable absolute z-50 left-[8%] top-[76%] h-[18%] w-[84%] rounded-[18px] bg-transparent border-none outline-none"
            style={{
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          />
        </div>
      </div>

      {/* OVERLAY MENU IN DISSOLVENZA */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ease-in-out ${
          transizione ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="relative h-dvh aspect-[9/16] max-w-full">
          <Image
            src="/menu.png"
            alt="Menu del Registro"
            fill
            priority
            className="object-contain"
          />
        </div>
      </div>

    </main>
  );
}
