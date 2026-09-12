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
        <div className="relative aspect-[977/1610] w-full overflow-hidden bg-[#f4e7cf] sm:rounded-[28px]">
          <Image
            src="/student-personal-bg.png"
            alt="Fotografia e dati personali dello studente"
            fill
            priority
            sizes="(max-width: 430px) 100vw, 430px"
            className="object-contain"
          />

          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Indietro"
            className="absolute left-[3.2%] top-[1.2%] z-30 h-[5.4%] w-[24%] bg-transparent"
          />

          <Link
            href="/menu"
            aria-label="Torna al menù"
            className="absolute right-[10.3%] top-[1.2%] z-30 h-[5.4%] w-[24%] bg-transparent"
          />

          {/* Area fotografia: copre il ritratto segnaposto della tavola finché non viene caricata una foto reale. */}
          <div className="absolute left-[15.0%] top-[32.0%] z-20 h-[20.2%] w-[29.9%] overflow-hidden bg-[#f3ead9]">
            {photoPreview && (
              <Image
                src={photoPreview}
                alt="Anteprima fotografia studente"
                fill
                className="object-cover"
              />
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
            className="absolute left-[11.8%] top-[54.9%] z-30 flex h-[4.8%] w-[35.6%] items-center justify-center bg-transparent pl-[8%] font-register text-[clamp(10px,2.8vw,14px)] italic text-[#553b2c]"
          >
            Carica fotografia
          </button>

          <button
            type="button"
            aria-label="Trasforma fotografia in acquerello"
            disabled={!photoPreview}
            className="absolute left-[11.8%] top-[60.6%] z-30 flex h-[4.8%] w-[35.6%] items-center justify-center bg-transparent pl-[7%] font-register text-[clamp(9px,2.6vw,13px)] italic text-[#553b2c] disabled:opacity-55"
          >
            Trasforma in acquerello
          </button>

          <Field
            label="Nome"
            labelTop="31.4%"
            inputTop="34.4%"
            placeholder="Inserisci il nome…"
          />
          <Field
            label="Cognome"
            labelTop="41.2%"
            inputTop="44.2%"
            placeholder="Inserisci il cognome…"
          />
          <Field
            label="Data di nascita"
            labelTop="51.2%"
            inputTop="54.4%"
            type="date"
          />
          <Field
            label="Mio studente da…"
            labelTop="61.5%"
            inputTop="64.8%"
            type="date"
          />

          <button
            type="button"
            aria-label="Salva dati personali"
            className="absolute bottom-[1.8%] left-[22.5%] z-30 h-[5.5%] w-[22.5%] bg-transparent"
          />

          <button
            type="button"
            aria-label="Avanti"
            className="absolute bottom-[1.8%] right-[26.5%] z-30 h-[5.5%] w-[21.5%] bg-transparent"
          />
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  labelTop,
  inputTop,
  type = "text",
  placeholder,
}: {
  label: string;
  labelTop: string;
  inputTop: string;
  type?: "text" | "date";
  placeholder?: string;
}) {
  return (
    <>
      <label
        className="absolute left-[52.0%] z-30 w-[37.0%] font-register text-[clamp(10px,2.8vw,14px)] text-[#4b3024]"
        style={{ top: labelTop }}
      >
        {label}
      </label>

      <input
        type={type}
        placeholder={placeholder}
        aria-label={label}
        className="absolute left-[52.0%] z-30 h-[4.5%] w-[37.0%] appearance-none border-0 bg-transparent px-[2.2%] font-register text-[clamp(10px,2.8vw,14px)] text-[#4b3024] outline-none placeholder:italic placeholder:text-[#8f735d]/55 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
        style={{ top: inputTop }}
      />
    </>
  );
}
