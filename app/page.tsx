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

    setTimeout(() => {
      router.push("/menu");
    }, 2400);
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#f4eddf]">

      {/* HOME */}
      <div
        className={`absolute inset-0 flex items-center justify-center ${
          transizione ? "opacity-0" : "opacity-100"
        }`}
        style={{
          transition:
            "opacity 2400ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
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
  className="absolute z-50 left-[8%] top-[76%] h-[18%] w-[84%] cursor-pointer bg-transparent border-none outline-none"
  style={{
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
  }}
>
</button>
        </div>
      </div>

      {/* MENU CHE APPARE DURANTE LA DISSOLVENZA */}
      <div
        className={`absolute inset-0 flex items-center justify-center ${
          transizione ? "opacity-100" : "opacity-0"
        }`}
        style={{
          transition:
            "opacity 2400ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
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