import Image from "next/image";
import Link from "next/link";
import styles from "./cover.module.css";

export default function LessonsPage() {
  return <main className={styles.page}>
    <div className={styles.sheet}>
      <Image src="/CoverLezioni.png" alt="" fill priority unoptimized sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <h1 className="sr-only">Lezioni</h1>
      <nav aria-label="Navigazione principale">
        <Link href="/oggi" aria-label="Oggi" className={`${styles.hotspot} ${styles.today}`} />
        <Link href="/menu" aria-label="Menu" className={`${styles.hotspot} ${styles.menu}`} />
      </nav>
      <nav aria-label="Sezioni Lezioni">
        <Link href="/lezioni/in-programma" aria-label="Lezioni in programma" className={`${styles.hotspot} ${styles.upcoming}`} />
        <Link href="/calendario/nuova" aria-label="Nuova lezione" className={`${styles.hotspot} ${styles.newLesson}`} />
        <Link href="/lezioni/storico" aria-label="Storico lezioni" className={`${styles.hotspot} ${styles.history}`} />
        <Link href="/lezioni/diario" aria-label="Diario lezioni" className={`${styles.hotspot} ${styles.diary}`} />
      </nav>
    </div>
  </main>;
}
