"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { LessonMode } from "../data/calendario/calendar-types";
import {
  createTariff,
  loadTariffs,
  saveTariffs,
  updateTariff,
} from "../data/tariffario/tariff-storage";
import type { LessonFormat, Tariff, TariffDraft } from "../data/tariffario/tariff-types";

const MODE_LABELS: Record<LessonMode, string> = {
  casa: "A casa",
  domicilio: "A domicilio",
  online: "Online",
};

const FORMAT_LABELS: Record<LessonFormat, string> = {
  singola: "Singola",
  gruppo: "Di gruppo",
};

const EMPTY_DRAFT: TariffDraft = {
  subject: "",
  schoolBand: "",
  mode: "casa",
  format: "singola",
  hourlyRateCents: 0,
  active: true,
};

export default function TariffarioPage() {
  const router = useRouter();
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [editing, setEditing] = useState<Tariff | null>(null);
  const [draft, setDraft] = useState<TariffDraft>(EMPTY_DRAFT);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setTariffs(loadTariffs()));
  }, []);

  const visibleTariffs = useMemo(() => tariffs.slice(0, 8), [tariffs]);

  function persist(next: Tariff[]) {
    setTariffs(next);
    saveTariffs(next);
  }

  function openNew() {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setEditorOpen(true);
  }

  function openEdit(tariff: Tariff) {
    setEditing(tariff);
    setDraft({
      subject: tariff.subject,
      schoolBand: tariff.schoolBand,
      mode: tariff.mode,
      format: tariff.format,
      hourlyRateCents: tariff.hourlyRateCents,
      active: tariff.active,
    });
    setEditorOpen(true);
  }

  function submitTariff() {
    if (!draft.subject.trim() || !draft.schoolBand.trim() || draft.hourlyRateCents <= 0) {
      return;
    }

    if (editing) {
      persist(
        tariffs.map((tariff) =>
          tariff.id === editing.id ? updateTariff(tariff, draft) : tariff
        )
      );
    } else {
      persist([...tariffs, createTariff(draft, tariffs)]);
    }

    setEditorOpen(false);
  }

  function removeTariff(tariff: Tariff) {
    if (!window.confirm(`Eliminare la tariffa ${tariff.code}?`)) return;
    persist(tariffs.filter((item) => item.id !== tariff.id));
  }

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#efe3ce] text-[#4b3024]">
      <div className="mx-auto w-full max-w-[430px] sm:py-3">
        <div className="relative aspect-[941/1672] w-full min-h-dvh sm:min-h-0 overflow-hidden bg-[#f4e7cf] sm:rounded-[28px]">
          <Image
            src="/tariffario-bg-clean.png"
            alt="Tariffario illustrato"
            fill
            priority
            unoptimized
            sizes="(max-width: 430px) 100vw, 430px"
            className="pointer-events-none select-none object-fill"
          />

          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Indietro"
            className="antique-clickable absolute left-[4.8%] top-[0.7%] z-30 h-[4.3%] w-[20%] rounded-[12px] bg-transparent"
          />
          <Link
            href="/menu"
            aria-label="Torna al menù"
            className="antique-clickable absolute right-[4.5%] top-[0.7%] z-30 h-[4.3%] w-[18.5%] rounded-[12px] bg-transparent"
          />

          <button
            type="button"
            onClick={openNew}
            aria-label="Nuova tariffa"
            className="antique-clickable absolute right-[6%] top-[21.4%] z-30 h-[4.6%] w-[32%] rounded-[12px] bg-transparent"
          />

          <section
            aria-label="Le mie tariffe"
            className="absolute left-[3.6%] top-[29.7%] z-20 h-[39.4%] w-[92.4%]"
          >
            {visibleTariffs.map((tariff, index) => {
              const row = index + 1;
              const rowTop = row * (100 / 9);

              return (
                <div
                  key={tariff.id}
                  className="absolute left-0 w-full"
                  style={{
                    top: `${rowTop}%`,
                    height: `${100 / 9}%`,
                  }}
                >
                  <div className="absolute inset-y-0 left-[0.5%] right-[13.5%] grid grid-cols-[9%_22%_16%_19%_16%_14%] items-center font-entry-elegant text-[#523325]">
                    <span className="text-center text-[clamp(10px,2.7vw,13px)] font-semibold text-[#7a2739]">
                      {tariff.code}
                    </span>
                    <span className="truncate px-[3%] text-[clamp(9px,2.45vw,12px)]">
                      {tariff.subject}
                    </span>
                    <span className="truncate px-[4%] text-[clamp(8px,2.25vw,11px)]">
                      {tariff.schoolBand}
                    </span>
                    <span className="truncate px-[4%] text-[clamp(8px,2.2vw,10.5px)]">
                      {MODE_LABELS[tariff.mode]}
                    </span>
                    <span className="truncate px-[4%] text-[clamp(8px,2.15vw,10.5px)]">
                      {FORMAT_LABELS[tariff.format]}
                    </span>
                    <span className="text-center text-[clamp(9px,2.45vw,12px)] font-semibold">
                      {formatEuro(tariff.hourlyRateCents)}/h
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEdit(tariff)}
                    aria-label={`Modifica ${tariff.code}`}
                    className="antique-clickable absolute inset-y-[8%] right-[7.1%] w-[6%] rounded-[8px] bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => removeTariff(tariff)}
                    aria-label={`Elimina ${tariff.code}`}
                    className="antique-clickable absolute inset-y-[8%] right-[0.5%] w-[6%] rounded-[8px] bg-transparent"
                  />
                </div>
              );
            })}
          </section>

          <nav aria-label="Sezioni tariffario">
            <Link
              href="/tariffario/contatori"
              aria-label="Contatori mensili"
              className="antique-clickable absolute left-[2.2%] top-[72.1%] z-30 h-[12.2%] w-[31.7%] rounded-[12px] bg-transparent"
            />
            <Link
              href="/tariffario/studenti"
              aria-label="Tariffe per studente"
              className="antique-clickable absolute left-[34.1%] top-[72.1%] z-30 h-[12.2%] w-[31.7%] rounded-[12px] bg-transparent"
            />
            <Link
              href="/tariffario/pagamenti"
              aria-label="Pagamenti"
              className="antique-clickable absolute right-[2.2%] top-[72.1%] z-30 h-[12.2%] w-[31.7%] rounded-[12px] bg-transparent"
            />
          </nav>

          <nav
            aria-label="Navigazione principale"
            className="absolute inset-x-[1.8%] bottom-[0.55%] z-30 h-[9.1%]"
          >
            <Link href="/studenti" aria-label="Studenti" className="antique-clickable absolute inset-y-0 left-0 w-[20%] bg-transparent" />
            <Link href="/calendario" aria-label="Calendario" className="antique-clickable absolute inset-y-0 left-[20%] w-[20%] bg-transparent" />
            <Link href="/tariffario" aria-label="Tariffe" aria-current="page" className="antique-clickable absolute inset-y-0 left-[40%] w-[20%] bg-transparent" />
            <Link href="/libri" aria-label="Libri" className="antique-clickable absolute inset-y-0 left-[60%] w-[20%] bg-transparent" />
            <Link href="/menu" aria-label="Menu" className="antique-clickable absolute inset-y-0 left-[80%] w-[20%] bg-transparent" />
          </nav>

          {editorOpen && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#4c3324]/25 px-[7%]">
              <div className="w-full rounded-[18px] border border-[#8b6648]/35 bg-[#f4e4c8]/95 p-[6%] shadow-xl backdrop-blur-[1px]">
                <h2 className="mb-4 text-center font-entry-elegant text-xl font-semibold text-[#7a2739]">
                  {editing ? `Modifica ${editing.code}` : "Nuova tariffa"}
                </h2>

                <div className="space-y-3 font-entry-elegant">
                  <label className="block">
                    <span className="mb-1 block text-sm">Materia</span>
                    <input
                      value={draft.subject}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, subject: event.target.value }))
                      }
                      className="w-full rounded-lg border border-[#9b7754]/35 bg-[#fff8e8]/70 px-3 py-2 text-base outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm">Fascia scolastica</span>
                    <input
                      value={draft.schoolBand}
                      placeholder="es. Biennio, Triennio, 3° anno..."
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, schoolBand: event.target.value }))
                      }
                      className="w-full rounded-lg border border-[#9b7754]/35 bg-[#fff8e8]/70 px-3 py-2 text-base outline-none"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm">Modalità</span>
                    <select
                      value={draft.mode}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          mode: event.target.value as LessonMode,
                        }))
                      }
                      className="w-full rounded-lg border border-[#9b7754]/35 bg-[#fff8e8]/70 px-3 py-2 text-base outline-none"
                    >
                      <option value="casa">A casa</option>
                      <option value="domicilio">A domicilio</option>
                      <option value="online">Online</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm">Tipo di lezione</span>
                    <select
                      value={draft.format}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          format: event.target.value as LessonFormat,
                        }))
                      }
                      className="w-full rounded-lg border border-[#9b7754]/35 bg-[#fff8e8]/70 px-3 py-2 text-base outline-none"
                    >
                      <option value="singola">Singola</option>
                      <option value="gruppo">Di gruppo</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm">Tariffa oraria (€)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.50"
                      value={draft.hourlyRateCents ? draft.hourlyRateCents / 100 : ""}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          hourlyRateCents: Math.max(
                            0,
                            Math.round(Number(event.target.value || 0) * 100)
                          ),
                        }))
                      }
                      className="w-full rounded-lg border border-[#9b7754]/35 bg-[#fff8e8]/70 px-3 py-2 text-base outline-none"
                    />
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.active}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, active: event.target.checked }))
                      }
                    />
                    Tariffa attiva
                  </label>
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditorOpen(false)}
                    className="rounded-lg border border-[#8b6648]/35 px-4 py-2 font-entry-elegant"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={submitTariff}
                    className="rounded-lg bg-[#7a2739] px-4 py-2 font-entry-elegant text-[#fff7e8]"
                  >
                    Salva
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function formatEuro(cents: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
