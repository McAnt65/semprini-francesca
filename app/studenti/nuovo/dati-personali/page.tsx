"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const WATER_SCALE = 0.72;
const DRAFT_STORAGE_KEY = "semprini:new-student:personal-data";

type PersonalDataDraft = {
  firstName: string;
  lastName: string;
  birthDate: string;
  studentSince: string;
  phone: string;
  whatsapp: string;
  email: string;
  originalPhotoPreview: string | null;
  photoPreview: string | null;
  isWatercolor: boolean;
};

export default function StudentPersonalDataPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [studentSince, setStudentSince] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [originalPhotoPreview, setOriginalPhotoPreview] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isWatercolor, setIsWatercolor] = useState(false);
  const [isProcessingWatercolor, setIsProcessingWatercolor] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const draft = loadDraft();
    if (!draft) return;

    queueMicrotask(() => {
      setFirstName(draft.firstName);
      setLastName(draft.lastName);
      setBirthDate(draft.birthDate);
      setStudentSince(draft.studentSince);
      setPhone(draft.phone);
      setWhatsapp(draft.whatsapp);
      setEmail(draft.email);
      setOriginalPhotoPreview(draft.originalPhotoPreview);
      setPhotoPreview(draft.photoPreview);
      setIsWatercolor(draft.isWatercolor);
    });
  }, []);

  function collectDraft(): PersonalDataDraft {
    return {
      firstName,
      lastName,
      birthDate,
      studentSince,
      phone,
      whatsapp,
      email,
      originalPhotoPreview,
      photoPreview,
      isWatercolor,
    };
  }

  function handleSave() {
    const saved = saveDraft(collectDraft());
    setSaveMessage(saved ? "Dati salvati" : "Impossibile salvare: prova con una fotografia più leggera");
  }

  function handleNext() {
    const saved = saveDraft(collectDraft());
    if (!saved) {
      setSaveMessage("Impossibile salvare: prova con una fotografia più leggera");
      return;
    }

    router.push("/studenti/nuovo/scuola-materie-libri");
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === "string") {
        const storedPreview = await createStoredPhotoPreview(reader.result);
        setOriginalPhotoPreview(storedPreview);
        setPhotoPreview(storedPreview);
        setIsWatercolor(false);
        setSaveMessage("");
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleWatercolorToggle() {
    if (!originalPhotoPreview || isProcessingWatercolor) return;

    if (isWatercolor) {
      setPhotoPreview(originalPhotoPreview);
      setIsWatercolor(false);
      return;
    }

    setIsProcessingWatercolor(true);
    try {
      const watercolorPreview = await createWatercolorPreview(originalPhotoPreview);
      setPhotoPreview(watercolorPreview);
      setIsWatercolor(true);
    } finally {
      setIsProcessingWatercolor(false);
    }
  }

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#efe3ce] text-[#4b3024]">
      <div className="mx-auto w-full max-w-[430px] py-0 sm:py-3">
        <div className="relative aspect-[941/1672] w-full overflow-hidden sm:rounded-[28px]">
          <Image src="/student-personal-bg-clean.png?v=4" alt="Fotografia, dati personali e contatti dello studente" fill unoptimized priority sizes="(max-width: 430px) 100vw, 430px" className="select-none object-fill" />

          <button type="button" onClick={() => router.back()} aria-label="Indietro" className="antique-clickable absolute left-[3.1%] top-[1.2%] z-30 h-[5.2%] w-[24%] rounded-[12px] bg-transparent" />
          <Link href="/menu" aria-label="Torna al menù" className="antique-clickable absolute right-[0.8%] top-[0.8%] z-30 h-[4.4%] w-[14.5%] rounded-[12px] bg-transparent" />

          <div
            className="absolute left-[5.25%] top-[28.55%] z-20 h-[24.05%] w-[30.2%] overflow-hidden bg-[#f2e8d6]"
            style={{
              WebkitMaskImage: photoPreview
                ? "radial-gradient(ellipse at center, black 48%, rgba(0,0,0,0.9) 62%, rgba(0,0,0,0.42) 80%, transparent 100%)"
                : undefined,
              maskImage: photoPreview
                ? "radial-gradient(ellipse at center, black 48%, rgba(0,0,0,0.9) 62%, rgba(0,0,0,0.42) 80%, transparent 100%)"
                : undefined,
            }}
          >
            {photoPreview && (
              <Image
                src={photoPreview}
                alt="Anteprima"
                fill
                unoptimized
                className="object-cover transition-all duration-500"
                style={{
                  objectPosition: "50% 45%",
                  transform: isWatercolor ? "scale(1.025)" : "scale(1.01)",
                }}
              />
            )}
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Carica immagine"
            className="antique-clickable absolute left-[6.2%] top-[52.78%] z-30 h-[4.15%] w-[28.3%] rounded-[10px] bg-transparent"
          />

          <button
            type="button"
            onClick={handleWatercolorToggle}
            disabled={!photoPreview || isProcessingWatercolor}
            aria-label="Applica effetto acquerello"
            aria-pressed={isWatercolor}
            className="antique-clickable absolute left-[6.2%] top-[57.35%] z-30 h-[4.15%] w-[28.3%] rounded-[10px] bg-transparent disabled:opacity-45"
          />

          <Field label="Nome" left="41.4%" top="34.15%" width="52.7%" placeholder="Inserisci il nome…" value={firstName} onChange={setFirstName} />
          <Field label="Cognome" left="41.4%" top="40.35%" width="52.7%" placeholder="Inserisci il cognome…" value={lastName} onChange={setLastName} />
          <Field label="Data di nascita" left="41.4%" top="46.55%" width="25.5%" displayWidth="20.7%" type="date" variant="date" value={birthDate} onChange={setBirthDate} dateButtonLeft="62.1%" />
          <Field label="Mio studente da…" left="69.6%" top="46.55%" width="24.5%" displayWidth="19.5%" type="date" variant="date" value={studentSince} onChange={setStudentSince} dateButtonLeft="89.1%" />
          <Field label="Telefono" left="41.4%" top="61.35%" width="52.7%" type="tel" variant="contact" value={phone} onChange={setPhone} />
          <Field label="WhatsApp" left="41.4%" top="67.8%" width="52.7%" type="tel" variant="contact" value={whatsapp} onChange={setWhatsapp} />
          <Field label="Email" left="41.4%" top="74.5%" width="52.7%" type="email" variant="contact" value={email} onChange={setEmail} />

          <ContactAction
            href={phone.trim() ? `tel:${phone.replace(/[^\d+]/g, "")}` : null}
            label="Chiama lo studente"
            top="61.35%"
          />
          <ContactAction
            href={whatsapp.trim() ? `https://wa.me/${toWhatsAppNumber(whatsapp)}` : null}
            label="Apri WhatsApp"
            top="67.8%"
            external
          />
          <ContactAction
            href={email.trim() ? `mailto:${email.trim()}` : null}
            label="Scrivi una email"
            top="74.5%"
          />

          <button type="button" onClick={handleSave} aria-label="Salva dati personali" className="antique-clickable absolute bottom-[4.65%] left-[8.7%] z-30 h-[5.2%] w-[23.2%] rounded-[12px] bg-transparent" />
          <button type="button" onClick={handleNext} aria-label="Avanti" className="antique-clickable absolute bottom-[4.65%] right-[8.4%] z-30 h-[5.2%] w-[23.2%] rounded-[12px] bg-transparent" />
          {saveMessage && (
            <p role="status" className="absolute bottom-[0.35%] left-[8%] right-[8%] z-40 text-center font-field-label text-[10px] leading-none text-[#6f1723]">
              {saveMessage}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

function loadDraft(): PersonalDataDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const storedDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!storedDraft) return null;
    const draft = JSON.parse(storedDraft) as Partial<PersonalDataDraft>;

    return {
      firstName: typeof draft.firstName === "string" ? draft.firstName : "",
      lastName: typeof draft.lastName === "string" ? draft.lastName : "",
      birthDate: typeof draft.birthDate === "string" ? draft.birthDate : "",
      studentSince: typeof draft.studentSince === "string" ? draft.studentSince : "",
      phone: typeof draft.phone === "string" ? draft.phone : "",
      whatsapp: typeof draft.whatsapp === "string" ? draft.whatsapp : "",
      email: typeof draft.email === "string" ? draft.email : "",
      originalPhotoPreview: typeof draft.originalPhotoPreview === "string" ? draft.originalPhotoPreview : null,
      photoPreview: typeof draft.photoPreview === "string" ? draft.photoPreview : null,
      isWatercolor: draft.isWatercolor === true,
    };
  } catch {
    return null;
  }
}

function saveDraft(draft: PersonalDataDraft) {
  const serializedDraft = JSON.stringify(draft);

  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, serializedDraft);
    return true;
  } catch {
    try {
      window.sessionStorage.setItem(DRAFT_STORAGE_KEY, serializedDraft);
      return true;
    } catch {
      return false;
    }
  }
}

async function createStoredPhotoPreview(src: string) {
  const image = await loadImage(src);
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = Math.min(1, 1000 / longestSide);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return src;

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function clampColor(value: number) {
  return Math.max(0, Math.min(255, value));
}

function seededNoise(x: number, y: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

async function createWatercolorPreview(src: string) {
  const image = await loadImage(src);
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = Math.min(WATER_SCALE, 760 / longestSide);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) return src;

  sourceContext.drawImage(image, 0, 0, width, height);
  const original = sourceContext.getImageData(0, 0, width, height);
  const source = original.data;
  const painted = new ImageData(width, height);
  const output = painted.data;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      let red = 0;
      let green = 0;
      let blue = 0;
      let weightTotal = 0;

      for (let oy = -4; oy <= 4; oy += 1) {
        const sampleY = Math.max(0, Math.min(height - 1, y + oy));
        for (let ox = -4; ox <= 4; ox += 1) {
          const sampleX = Math.max(0, Math.min(width - 1, x + ox));
          const sampleIndex = (sampleY * width + sampleX) * 4;
          const distance = Math.hypot(ox, oy);
          const weight = Math.max(0.2, 5 - distance);
          red += source[sampleIndex] * weight;
          green += source[sampleIndex + 1] * weight;
          blue += source[sampleIndex + 2] * weight;
          weightTotal += weight;
        }
      }

      red /= weightTotal;
      green /= weightTotal;
      blue /= weightTotal;

      const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
      const broadWash = (seededNoise(Math.floor(x / 28), Math.floor(y / 28)) - 0.5) * 34;
      const pigment = (seededNoise(Math.floor(x / 8), Math.floor(y / 8)) - 0.5) * 26;
      const paperGrain = (seededNoise(x, y) - 0.5) * 16;
      const edge = Math.abs(source[index] - red) + Math.abs(source[index + 1] - green) + Math.abs(source[index + 2] - blue);
      const edgeFade = Math.min(32, edge * 0.12);

      red = Math.round((luminance + (red - luminance) * 0.52) / 24) * 24;
      green = Math.round((luminance + (green - luminance) * 0.52) / 24) * 24;
      blue = Math.round((luminance + (blue - luminance) * 0.52) / 24) * 24;

      output[index] = clampColor(red * 1.08 + 18 + broadWash + pigment + paperGrain - edgeFade);
      output[index + 1] = clampColor(green * 1.07 + 15 + broadWash * 0.85 + pigment * 0.72 + paperGrain - edgeFade);
      output[index + 2] = clampColor(blue * 1.04 + 10 + broadWash * 0.58 + pigment * 0.42 + paperGrain - edgeFade);
      output[index + 3] = 255;
    }
  }

  const paintCanvas = document.createElement("canvas");
  paintCanvas.width = width;
  paintCanvas.height = height;
  const paintContext = paintCanvas.getContext("2d");
  if (!paintContext) return src;
  paintContext.putImageData(painted, 0, 0);

  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = width;
  finalCanvas.height = height;
  const finalContext = finalCanvas.getContext("2d");
  if (!finalContext) return src;

  finalContext.fillStyle = "#efe3ce";
  finalContext.fillRect(0, 0, width, height);
  finalContext.filter = "blur(1.15px) saturate(0.88) contrast(0.88) brightness(1.06)";
  finalContext.drawImage(paintCanvas, 0, 0);
  finalContext.filter = "none";

  finalContext.globalAlpha = 0.32;
  finalContext.globalCompositeOperation = "multiply";
  finalContext.filter = "blur(3.2px)";
  finalContext.drawImage(paintCanvas, -5, -4, width + 10, height + 8);
  finalContext.filter = "none";

  const texture = finalContext.createPattern(createPaperTexture(180, 180), "repeat");
  if (texture) {
    finalContext.globalAlpha = 0.38;
    finalContext.globalCompositeOperation = "multiply";
    finalContext.fillStyle = texture;
    finalContext.fillRect(0, 0, width, height);
  }

  addPigmentBlooms(finalContext, width, height);

  finalContext.globalAlpha = 0.24;
  finalContext.globalCompositeOperation = "screen";
  finalContext.drawImage(paintCanvas, -2, -2, width + 4, height + 4);

  finalContext.globalAlpha = 1;
  finalContext.globalCompositeOperation = "destination-in";
  const mask = finalContext.createRadialGradient(width * 0.5, height * 0.46, width * 0.12, width * 0.5, height * 0.48, width * 0.64);
  mask.addColorStop(0, "rgba(0,0,0,1)");
  mask.addColorStop(0.54, "rgba(0,0,0,0.94)");
  mask.addColorStop(0.74, "rgba(0,0,0,0.48)");
  mask.addColorStop(1, "rgba(0,0,0,0)");
  finalContext.fillStyle = mask;
  finalContext.fillRect(0, 0, width, height);

  return finalCanvas.toDataURL("image/png");
}

function createPaperTexture(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  const imageData = context.createImageData(width, height);
  const data = imageData.data;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const fiber = 226 + seededNoise(x, y) * 24 + seededNoise(Math.floor(x / 5), Math.floor(y / 3)) * 18;
      data[index] = clampColor(fiber + 9);
      data[index + 1] = clampColor(fiber + 1);
      data[index + 2] = clampColor(fiber - 13);
      data[index + 3] = 255;
    }
  }

  context.putImageData(imageData, 0, 0);
  context.globalAlpha = 0.2;
  context.strokeStyle = "#8b765b";
  for (let y = 0; y < height; y += 7) {
    context.beginPath();
    context.moveTo(0, y + seededNoise(0, y) * 2);
    context.lineTo(width, y + seededNoise(width, y) * 2);
    context.stroke();
  }

  return canvas;
}

function addPigmentBlooms(context: CanvasRenderingContext2D, width: number, height: number) {
  context.save();
  context.globalCompositeOperation = "multiply";
  context.filter = "blur(5px)";

  for (let i = 0; i < 34; i += 1) {
    const centerX = seededNoise(i * 17, i * 31) * width;
    const centerY = seededNoise(i * 43, i * 11) * height;
    const radiusX = width * (0.045 + seededNoise(i * 7, i * 13) * 0.12);
    const radiusY = height * (0.035 + seededNoise(i * 19, i * 5) * 0.11);
    const warmth = seededNoise(i * 23, i * 29);
    const alpha = 0.055 + seededNoise(i * 37, i * 3) * 0.08;

    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(radiusX, radiusY));
    gradient.addColorStop(0, warmth > 0.5 ? `rgba(130, 88, 62, ${alpha})` : `rgba(92, 93, 76, ${alpha})`);
    gradient.addColorStop(0.52, warmth > 0.5 ? `rgba(156, 116, 82, ${alpha * 0.55})` : `rgba(106, 111, 92, ${alpha * 0.55})`);
    gradient.addColorStop(1, "rgba(255,255,255,0)");

    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(centerX, centerY, radiusX, radiusY, seededNoise(i, i + 2) * Math.PI, 0, Math.PI * 2);
    context.fill();
  }

  context.globalCompositeOperation = "screen";
  context.filter = "blur(7px)";
  for (let i = 0; i < 16; i += 1) {
    const centerX = seededNoise(i * 53, i * 47) * width;
    const centerY = seededNoise(i * 41, i * 59) * height;
    const radius = Math.min(width, height) * (0.08 + seededNoise(i * 61, i * 67) * 0.16);
    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, "rgba(255, 250, 232, 0.2)");
    gradient.addColorStop(0.68, "rgba(255, 250, 232, 0.08)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function Field({ label, left, top, width, displayWidth, type = "text", variant = "default", placeholder, value, onChange, dateButtonLeft }: { label: string; left: string; top: string; width: string; displayWidth?: string; type?: "text" | "date" | "tel" | "email"; variant?: "default" | "date" | "contact"; placeholder?: string; value: string; onChange: (value: string) => void; dateButtonLeft?: string; }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const textSize = variant === "date"
    ? "text-[clamp(11px,2.65vw,14px)] tracking-[-0.045em]"
    : variant === "contact"
      ? "text-[clamp(12px,2.9vw,15px)]"
      : "text-[clamp(13px,3.45vw,18px)]";

  function openDatePicker() {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    const dateInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof dateInput.showPicker === "function") {
      try { dateInput.showPicker(); return; } catch {}
    }
    input.click();
  }

  return (
    <>
      <input ref={inputRef} type={type} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} className={`absolute z-30 h-[3.55%] appearance-none !border-0 !bg-transparent px-[2.5%] py-0 text-center font-entry-elegant ${textSize} ${variant === "date" ? "text-transparent caret-transparent" : "text-[#5b3a2d]"} !shadow-none !outline-none !ring-0 placeholder:font-entry-elegant placeholder:font-normal placeholder:text-[#8f735d]/45 focus:!border-0 focus:!bg-transparent focus:!outline-none focus:!ring-0 [&::-webkit-calendar-picker-indicator]:opacity-0`} style={{ left, top, width }} />
      {variant === "date" && value && (
        <span className="pointer-events-none absolute z-40 flex h-[3.55%] items-center justify-center font-entry-elegant text-[clamp(10px,2.35vw,12px)] tracking-[-0.035em] text-[#5b3a2d]" style={{ left, top, width: displayWidth ?? width }}>
          {formatDate(value)}
        </span>
      )}
      {type === "date" && dateButtonLeft && <button type="button" onClick={openDatePicker} aria-label={`Apri calendario per ${label}`} className="antique-clickable absolute z-40 h-[3.55%] w-[5.2%] rounded-[6px] bg-transparent" style={{ left: dateButtonLeft, top }} />}
    </>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function toWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("39")) return digits;
  return `39${digits}`;
}

function ContactAction({ href, label, top, external = false }: { href: string | null; label: string; top: string; external?: boolean }) {
  if (!href) {
    return <span aria-hidden="true" className="pointer-events-none absolute left-[88.4%] z-40 h-[3.55%] w-[5.7%]" style={{ top }} />;
  }

  return (
    <a
      href={href}
      aria-label={label}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="antique-clickable absolute left-[88.4%] z-40 h-[3.55%] w-[5.7%] rounded-[6px] bg-transparent"
      style={{ top }}
    />
  );
}
