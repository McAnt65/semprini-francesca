"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const DRAFT_STORAGE_KEY = "semprini:new-student:home-family";

type HomeFamilyDraft = {
  address: string;
  postalCode: string;
  city: string;
  province: string;
  usefulReferences: string;

  referenceName: string;
  referenceContact: string;
  referenceEmail: string;

  otherName: string;
  otherContact: string;
  otherEmail: string;

  familyNotes: string;
};

const EMPTY_DRAFT: HomeFamilyDraft = {
  address: "",
  postalCode: "",
  city: "",
  province: "",
  usefulReferences: "",

  referenceName: "",
  referenceContact: "",
  referenceEmail: "",

  otherName: "",
  otherContact: "",
  otherEmail: "",

  familyNotes: "",
};

export default function NewStudentHomeFamilyPage() {
  const router = useRouter();

  const [draft, setDraft] =
    useState<HomeFamilyDraft>(EMPTY_DRAFT);

  const [saveMessage, setSaveMessage] =
    useState("");

  useEffect(() => {
    const saved = loadDraft();

    if (saved) {
      queueMicrotask(() => setDraft(saved));
    }
  }, []);

  function updateField(
    field: keyof HomeFamilyDraft,
    value: string
  ) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));

    setSaveMessage("");
  }

  function saveCurrentDraft() {
    const saved = saveDraft(draft);

    setSaveMessage(
      saved
        ? "Dati salvati"
        : "Impossibile salvare i dati"
    );

    return saved;
  }

  function goBack() {
    saveCurrentDraft();
    router.back();
  }

  function goToMenu() {
    saveCurrentDraft();
    router.push("/menu");
  }

  function goNext() {
    if (!saveCurrentDraft()) return;

    router.push("/studenti/nuovo/note-personali");
  }

  function callPhone(phone: string) {
    const cleaned = cleanPhoneForCall(phone);

    if (!cleaned) return;

    window.location.href = `tel:${cleaned}`;
  }

  function openWhatsApp(phone: string) {
    const cleaned = cleanPhoneForWhatsApp(phone);

    if (!cleaned) return;

    window.open(
      `https://wa.me/${cleaned}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#efe3ce] text-[#4b3024]">

      <div className="mx-auto w-full max-w-[430px] py-0 sm:py-3">

        <div className="relative aspect-[941/1672] w-full min-h-dvh sm:min-h-0 overflow-hidden sm:rounded-[28px]">

          <Image
            src="/student-home-family-bg.png"
            alt="Dove abita e riferimenti familiari dello studente"
            fill
            unoptimized
            priority
            sizes="(max-width: 430px) 100vw, 430px"
            className="select-none object-fill"
          />

          <button
            type="button"
            onClick={goBack}
            aria-label="Indietro"
            className="antique-clickable absolute left-[2%] top-[0.8%] z-30 h-[5.8%] w-[19.5%] rounded-[12px] bg-transparent"
          />

          <button
            type="button"
            onClick={goToMenu}
            aria-label="Torna al menù"
            className="antique-clickable absolute right-[1.7%] top-[0.8%] z-30 h-[5.8%] w-[18.5%] rounded-[12px] bg-transparent"
          />

          <Field
            label="Indirizzo"
            value={draft.address}
            onChange={(value) =>
              updateField("address", value)
            }
            left="63.0%"
            top="16.45%"
            width="30.4%"
          />

          <Field
            label="CAP"
            value={draft.postalCode}
            onChange={(value) =>
              updateField("postalCode", value)
            }
            left="63.0%"
            top="20.4%"
            width="17%"
            inputMode="numeric"
            maxLength={5}
          />

          <Field
            label="Città"
            value={draft.city}
            onChange={(value) =>
              updateField("city", value)
            }
            left="63.0%"
            top="24.35%"
            width="30.4%"
          />

          <Field
            label="Provincia"
            value={draft.province}
            onChange={(value) =>
              updateField(
                "province",
                value.toUpperCase()
              )
            }
            left="63.0%"
            top="28.3%"
            width="17%"
            maxLength={2}
          />

          <AreaField
            label="Riferimenti utili"
            value={draft.usefulReferences}
            onChange={(value) =>
              updateField(
                "usefulReferences",
                value
              )
            }
            left="51.6%"
            top="34.55%"
            width="41.8%"
            height="6%"
          />

          {/* GENITORE DI RIFERIMENTO */}

          <Field
            label="Nome del genitore di riferimento"
            value={draft.referenceName}
            onChange={(value) =>
              updateField(
                "referenceName",
                value
              )
            }
            left="21.2%"
            top="48.35%"
            width="43.3%"
          />

          <Field
            label="Telefono o WhatsApp del genitore di riferimento"
            value={draft.referenceContact}
            onChange={(value) =>
              updateField(
                "referenceContact",
                value
              )
            }
            left="21.2%"
            top="52.10%"
            width="29.2%"
            type="tel"
            inputMode="tel"
          />

          <button
            type="button"
            aria-label="Chiama il genitore di riferimento"
            disabled={!draft.referenceContact.trim()}
            onClick={() =>
              callPhone(
                draft.referenceContact
              )
            }
            className="antique-clickable absolute left-[52.1%] top-[51.55%] z-40 h-[3.4%] w-[5.8%] rounded-full bg-transparent disabled:pointer-events-none"
          />

          <button
            type="button"
            aria-label="Apri WhatsApp del genitore di riferimento"
            disabled={!draft.referenceContact.trim()}
            onClick={() =>
              openWhatsApp(
                draft.referenceContact
              )
            }
            className="antique-clickable absolute left-[58.4%] top-[51.55%] z-40 h-[3.4%] w-[5.8%] rounded-full bg-transparent disabled:pointer-events-none"
          />

          <Field
            label="Email del genitore di riferimento"
            value={draft.referenceEmail}
            onChange={(value) =>
              updateField(
                "referenceEmail",
                value
              )
            }
            left="21.2%"
            top="55.60%"
            width="43.3%"
            type="email"
            inputMode="email"
          />

          {/* ALTRO GENITORE */}

          <Field
            label="Nome dell'altro genitore"
            value={draft.otherName}
            onChange={(value) =>
              updateField(
                "otherName",
                value
              )
            }
            left="21.2%"
            top="65.20%"
            width="43.3%"
          />

          <Field
            label="Telefono o WhatsApp dell'altro genitore"
            value={draft.otherContact}
            onChange={(value) =>
              updateField(
                "otherContact",
                value
              )
            }
            left="21.2%"
            top="68.65%"
            width="29.2%"
            type="tel"
            inputMode="tel"
          />

          <button
            type="button"
            aria-label="Chiama l'altro genitore"
            disabled={!draft.otherContact.trim()}
            onClick={() =>
              callPhone(
                draft.otherContact
              )
            }
            className="antique-clickable absolute left-[52.1%] top-[68.35%] z-40 h-[3.4%] w-[5.8%] rounded-full bg-transparent disabled:pointer-events-none"
          />

          <button
            type="button"
            aria-label="Apri WhatsApp dell'altro genitore"
            disabled={!draft.otherContact.trim()}
            onClick={() =>
              openWhatsApp(
                draft.otherContact
              )
            }
            className="antique-clickable absolute left-[58.4%] top-[68.35%] z-40 h-[3.4%] w-[5.8%] rounded-full bg-transparent disabled:pointer-events-none"
          />

          <Field
            label="Email dell'altro genitore"
            value={draft.otherEmail}
            onChange={(value) =>
              updateField(
                "otherEmail",
                value
              )
            }
            left="21.2%"
            top="72.15%"
            width="43.3%"
            type="email"
            inputMode="email"
          />

          <AreaField
            label="Note familiari"
            value={draft.familyNotes}
            onChange={(value) =>
              updateField(
                "familyNotes",
                value
              )
            }
            left="15.1%"
            top="81.25%"
            width="77.8%"
            height="5.9%"
          />

          <button
            type="button"
            onClick={saveCurrentDraft}
            aria-label="Salva dove abita e famiglia"
            className="antique-clickable absolute bottom-[1.65%] left-[25.2%] z-30 h-[5.2%] w-[18.8%] rounded-[12px] bg-transparent"
          />

          <button
            type="button"
            onClick={goNext}
            aria-label="Avanti"
            className="antique-clickable absolute bottom-[1.65%] left-[58.5%] z-30 h-[5.2%] w-[19.2%] rounded-[12px] bg-transparent"
          />

          {saveMessage && (
            <p
              role="status"
              className="absolute bottom-[0.35%] left-[27%] right-[27%] z-40 text-center font-field-label text-[10px] leading-none text-[#6f2638]"
            >
              {saveMessage}
            </p>
          )}

        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  left,
  top,
  width,
  type = "text",
  inputMode,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  left: string;
  top: string;
  width: string;
  type?: "text" | "tel" | "email";
  inputMode?:
    | "text"
    | "numeric"
    | "tel"
    | "email";
  maxLength?: number;
}) {
  return (
    <input
      aria-label={label}
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
      type={type}
      inputMode={inputMode}
      maxLength={maxLength}
      autoComplete="off"
      className="absolute z-30 h-[3.05%] border-0 bg-transparent px-[1.4%] py-0 text-center font-entry-elegant text-[clamp(11px,3vw,15px)] leading-none text-[#5b3a2d] outline-none selection:bg-[#dcc8a8]"
      style={{
        left,
        top,
        width,
      }}
    />
  );
}

function AreaField({
  label,
  value,
  onChange,
  left,
  top,
  width,
  height,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  left: string;
  top: string;
  width: string;
  height: string;
}) {
  return (
    <textarea
      aria-label={label}
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
      className="absolute z-30 resize-none border-0 bg-transparent px-[1.5%] py-[1%] font-entry-elegant text-[clamp(10px,2.75vw,14px)] leading-snug text-[#5b3a2d] outline-none selection:bg-[#dcc8a8]"
      style={{
        left,
        top,
        width,
        height,
      }}
    />
  );
}

function cleanPhoneForCall(value: string) {
  return value
    .trim()
    .replace(/[^\d+]/g, "");
}

function cleanPhoneForWhatsApp(
  value: string
) {
  let cleaned = value.replace(/\D/g, "");

  if (
    cleaned &&
    !cleaned.startsWith("39")
  ) {
    cleaned = `39${cleaned}`;
  }

  return cleaned;
}

function loadDraft():
  | HomeFamilyDraft
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored =
      window.localStorage.getItem(
        DRAFT_STORAGE_KEY
      ) ??
      window.sessionStorage.getItem(
        DRAFT_STORAGE_KEY
      );

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(
      stored
    ) as Record<string, unknown>;

    return {
      address:
        stringValue(parsed.address),

      postalCode:
        stringValue(parsed.postalCode),

      city:
        stringValue(parsed.city),

      province:
        stringValue(parsed.province),

      usefulReferences:
        stringValue(
          parsed.usefulReferences
        ),

      referenceName:
        stringValue(
          parsed.referenceName
        ),

      referenceContact:
        stringValue(
          parsed.referenceContact
        ) ||
        stringValue(
          parsed.referencePhone
        ) ||
        stringValue(
          parsed.referenceWhatsapp
        ),

      referenceEmail:
        stringValue(
          parsed.referenceEmail
        ),

      otherName:
        stringValue(
          parsed.otherName
        ),

      otherContact:
        stringValue(
          parsed.otherContact
        ) ||
        stringValue(
          parsed.otherPhone
        ) ||
        stringValue(
          parsed.otherWhatsapp
        ),

      otherEmail:
        stringValue(
          parsed.otherEmail
        ),

      familyNotes:
        stringValue(
          parsed.familyNotes
        ),
    };
  } catch {
    return null;
  }
}

function stringValue(
  value: unknown
) {
  return typeof value === "string"
    ? value
    : "";
}

function saveDraft(
  draft: HomeFamilyDraft
) {
  const serialized =
    JSON.stringify(draft);

  try {
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      serialized
    );

    return true;
  } catch {
    try {
      window.sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        serialized
      );

      return true;
    } catch {
      return false;
    }
  }
}