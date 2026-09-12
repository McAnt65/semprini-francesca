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
      <div className="mx-auto w-full max-w-[430px] py-0 sm:py-3">
        <div className="relative w-full overflow-hidden sm:rounded-[28px]">
          <Image
            src="/student-personal-bg-clean.png"
            alt="Fotografia e dati personali dello studente"
            width={977}
            height={1610}
            priority
            sizes="(max-width: 430px) 100vw, 430px"
            className="block h-auto w-full select-none"
          />

          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Indietro"
            className="absolute left-[3.1%] top-[1.2%] z-30 h-[5.2%] w-[24%] bg-transparent"
          />

          <Link
            href="/menu"
            aria-label="Torna al menù"
            className="absolute right-[3.1%] top-[1.2%] z-30 h-[5.2%] w-[24%] bg-transparent"
          />

          <div className="absolute left-[12.4%] top-[30.2%] z-20 h-[22.3%] w-[34.2%] overflow-hidden bg-[#f2e8d6]">
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
            className="absolute left-[11.2%] top-[54.0%] z-30 h-[4.9%] w-[36.2%] bg-transparent"
          />

          <button
            type="button"
            aria-label="Trasforma fotografia in acquerello"
            disabled={!photoPreview}
            className="absolute left-[11.2%] top-[59.9%] z-30 h-[4.9%] w-[36.2%] bg-transparent disabled:cursor-default"
          />

          <Field label="Nome" labelTop="32.2%" inputTop="34.0%" placeholder="Inserisci il nome…" />
          <Field label="Cognome" labelTop="41.9%" inputTop="43.7%" placeholder="Inserisci il cognome…" />
          <Field label="Data di nascita" labelTop="51.8%" inputTop="53.5%" type="date" />
          <Field label="Mio studente da…" labelTop="62.0%" inputTop="63.7%" type="date" />

          <button
            type="button"
            aria-label="Salva dati personali"
            className="absolute bottom-[2.2%] left-[22.5%] z-30 h-[5.6%] w-[22.8%] bg-transparent"
          />

          <button
            type="button"
            aria-label="Avanti"
            className="absolute bottom-[2.2%] right-[26.4%] z-30 h-[5.6%] w-[22.2%] bg-transparent"
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
      <span
        className="pointer-events-none absolute left-[49.3%] z-30 w-[39.3%] font-register text-[clamp(10px,2.7vw,14px)] leading-none text-[#4b3024]"
        style={{ top: labelTop }}
      >
        {label}
      </span>

      <input
        type={type}
        placeholder={placeholder}
        aria-label={label}
        className="absolute left-[49.3%] z-30 h-[4.25%] w-[39.3%] appearance-none !border-0 !bg-transparent px-[2.5%] py-0 font-register text-[clamp(10px,2.8vw,14px)] text-[#4b3024] !shadow-none !outline-none !ring-0 placeholder:italic placeholder:text-[#8f735d]/45 focus:!border-0 focus:!bg-transparent focus:!outline-none focus:!ring-0 [&::-webkit-calendar-picker-indicator]:opacity-0"
        style={{ top: inputTop }}
      />
    </>
  );
}
