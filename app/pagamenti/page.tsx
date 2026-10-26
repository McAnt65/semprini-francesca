import Image from "next/image";
import Link from "next/link";
import styles from "./cover.module.css";

export default function PaymentsCoverPage() {
  return <main className={styles.page}>
    <div className={styles.sheet}>
      <Image src="/CoverPagamenti.png" alt="" fill priority unoptimized sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <h1 className="sr-only">Pagamenti</h1>
      <nav aria-label="Navigazione principale">
        <Link href="/oggi" aria-label="Oggi" className={`${styles.hotspot} ${styles.today}`} />
        <Link href="/menu" aria-label="Menu" className={`${styles.hotspot} ${styles.menu}`} />
      </nav>
      <nav aria-label="Sezioni Pagamenti">
        <Link href="/pagamenti/riepilogo" aria-label="Riepilogo" className={`${styles.hotspot} ${styles.summary}`} />
        <Link href="/pagamenti/previsioni" aria-label="Previsioni" className={`${styles.hotspot} ${styles.forecast}`} />
        <Link href="/pagamenti/tariffario" aria-label="Tariffario" className={`${styles.hotspot} ${styles.rates}`} />
        <Link href="/pagamenti/statistiche" aria-label="Statistiche" className={`${styles.hotspot} ${styles.statistics}`} />
      </nav>
    </div>
  </main>;
}
