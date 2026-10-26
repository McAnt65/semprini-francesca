"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DEFAULT_LESSON_LOCATION, DEFAULT_TRAVEL_MARGIN_MINUTES, loadLessonLocation,
  loadTravelMarginMinutes, saveLessonPreferences,
  type LessonLocation,
} from "../data/lesson-location";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const [location, setLocation] = useState<LessonLocation>(DEFAULT_LESSON_LOCATION);
  const [travelMargin, setTravelMargin] = useState(String(DEFAULT_TRAVEL_MARGIN_MINUTES));
  const [message, setMessage] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      setLocation(loadLessonLocation());
      setTravelMargin(String(loadTravelMarginMinutes()));
    });
  }, []);

  function update(field: keyof LessonLocation, value: string) {
    setLocation((current) => ({ ...current, [field]: value }));
    setMessage("");
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const minutes = Number(travelMargin);
    if (travelMargin.trim() === "" || !Number.isSafeInteger(minutes) || minutes < 0) {
      setMessage("Inserisci un margine di minuti intero e non negativo.");
      return;
    }
    if (!saveLessonPreferences(location, minutes)) {
      setMessage("Impossibile salvare le impostazioni. Controlla i campi e lo spazio disponibile nel browser.");
      return;
    }
    setLocation(loadLessonLocation());
    setTravelMargin(String(loadTravelMarginMinutes()));
    setMessage("Sede delle lezioni e margine salvati.");
  }

  return (
    <main className={styles.page}>
      <div className={styles.sheet}>
        <nav className={styles.navigation} aria-label="Navigazione impostazioni">
          <Link href="/oggi">OGGI</Link>
          <Link href="/menu">MENU</Link>
        </nav>
        <h1>IMPOSTAZIONI</h1>
        <section aria-labelledby="lesson-location-title">
          <h2 id="lesson-location-title">SEDE DELLE LEZIONI</h2>
          <p>Indirizzo abituale di Francesca</p>
          <form onSubmit={save} className={styles.form}>
            <label>Via
              <input name="street" autoComplete="address-line1" required value={location.street} onChange={(event) => update("street", event.target.value)} />
            </label>
            <label>Numero civico
              <input name="streetNumber" required value={location.streetNumber} onChange={(event) => update("streetNumber", event.target.value)} />
            </label>
            <label>Comune
              <input name="city" autoComplete="address-level2" required value={location.city} onChange={(event) => update("city", event.target.value)} />
            </label>
            <label>Provincia
              <input name="province" autoComplete="address-level1" required maxLength={2} value={location.province} onChange={(event) => update("province", event.target.value)} />
            </label>
            <p className={styles.country}>Paese: {location.country}</p>
            <label className={styles.travelMargin}>Margine per gli spostamenti (minuti)
              <input name="travelMarginMinutes" type="number" min="0" step="1" required value={travelMargin} onChange={(event) => { setTravelMargin(event.target.value); setMessage(""); }} />
            </label>
            <button type="submit">SALVA</button>
          </form>
          <p className={styles.message} role="status" aria-live="polite">{message}</p>
        </section>
      </div>
    </main>
  );
}
