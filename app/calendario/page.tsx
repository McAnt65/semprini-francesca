import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isLocalDate } from "../data/calendario/calendar-dates";
import styles from "./cover.module.css";

export default async function CalendarCoverPage({ searchParams }: {
  searchParams: Promise<{ data?: string | string[]; seleziona?: string | string[] }>;
}) {
  const query = await searchParams;
  if (typeof query.data === "string" && isLocalDate(query.data)) {
    const monthQuery = new URLSearchParams({ data: query.data });
    if (typeof query.seleziona === "string") monthQuery.set("seleziona", query.seleziona);
    redirect(`/calendario/mese?${monthQuery.toString()}`);
  }
  return <main className={styles.page}>
    <div className={styles.sheet}>
      <Image src="/CoverCalendario.png" alt="" fill priority unoptimized sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <h1 className="sr-only">Calendario</h1>
      <nav aria-label="Navigazione principale">
        <Link href="/oggi" aria-label="Oggi" className={`${styles.hotspot} ${styles.today}`} />
        <Link href="/menu" aria-label="Menu" className={`${styles.hotspot} ${styles.menu}`} />
      </nav>
      <nav aria-label="Viste del calendario">
        <Link href="/calendario/mese" aria-label="Mese" className={`${styles.hotspot} ${styles.month}`} />
        <Link href="/calendario/settimana" aria-label="Settimana" className={`${styles.hotspot} ${styles.week}`} />
        <Link href="/calendario/giorno" aria-label="Giorno" className={`${styles.hotspot} ${styles.day}`} />
      </nav>
    </div>
  </main>;
}
