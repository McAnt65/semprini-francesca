"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentPersonalDataPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#efe3ce] text-[#4b3024]">
      <div className="mx-auto w-full max-w-[430px]">
        <div className="relative aspect-[1024/1536] w-full overflow-hidden bg-[#f4e7cf] sm:rounded-[28px]">
          <Image
            src="/student-personal-bg.png"
            alt="Fotografia e dati personali dello studente"
            fill
            priority
            sizes="(max-width: 430px) 100vw, 430px"
            className="object-cover"
          />

          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Indietro"
            className="absolute left-[3.5%] top-[1.7%] z-30 h-[5.2%] w-[24%] bg-transparent"
          />

          <Link
            href="/menu"
            aria-label="Torna al menù"
            className="absolute right-[3.5%] top-[1.7%] z-30 h-[5.2%] w-[22%] bg-transparent"
          />

          <div className="absolute left-[13.6%] top-[29.2%] z-20 h-[23.6%] w-[31.2%] overflow-hidden rounded-[2px] bg-[#eee2cc]/88">
            {photoPreview ? (
              <Image
                src={photoPreview}
                alt="Anteprima fotografia studente"
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center px-5 text-center font-register text-[clamp(10px,2.8vw,14px)] italic text-[#92765e]/75">
                Fotografia dello studente
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Carica fotografia"
            className="absolute left-[11.5%] top-[54.4%] z-30 h-[5.2%] w-[34%] bg-transparent"
          />

          <button
            type="button"
            aria-label="Trasforma fotografia in acquerello"
            className="absolute left-[11.5%] top-[60.6%] z-30 h-[5.2%] w-[34%] bg-transparent"
          />

          <Field label="Nome" top="34.7%" />
          <Field label="Cognome" top="44.4%" />
          <Field label="Data di nascita" top="54.6%" type="date" />
          <Field label="Mio studente da…" top="65.1%" type="date" />

          <button
            type="button"
            aria-label="Salva dati personali"
            className="absolute bottom-[2.4%] left-[21.5%] z-30 h-[6%] w-[21.5%] bg-transparent"
          />

          <button
            type="button"
            aria-label="Avanti"
            className="absolute bottom-[2.4%] right-[22.5%] z-30 h-[6%] w-[22%] bg-transparent"
          />
        </div>
      </div>
    </main>
  );
}

function Field({ label, top, type = "text" }: { label: string; top: string; type?: "text" | "date" }) {
  return (
    <label className="absolute left-[48.1%] z-30 w-[34.8%]" style={{ top }}>
      <span className="mb-1 block font-register text-[clamp(10px,2.9vw,14px)] text-sepia">{label}</span>
      <input
        type={type}
        className="h-[34px] w-full rounded-[12px] border border-[#b99879]/35 bg-[#f8ecd8]/70 px-3 font-register text-[clamp(10px,2.8vw,14px)] text-[#4b3024] outline-none backdrop-blur-[1px] focus:border-[#8d684a]/55"
      />
    </label>
  );
}
