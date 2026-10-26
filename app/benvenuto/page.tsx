import Image from "next/image";
import Link from "next/link";
import styles from "./benvenuto.module.css";

// Cartigli misurati sull'originale CoverBenvenuto.png (941 × 1671 px).
function rectangle(x: number, y: number, width: number, height: number) {
  return {
    left: `${x / 941 * 100}%`,
    top: `${y / 1671 * 100}%`,
    width: `${width / 941 * 100}%`,
    height: `${height / 1671 * 100}%`,
  };
}

export default function BenvenutoPage() {
  return <main className={styles.page}>
    <div className={styles.sheet}>
      <Image src="/CoverBenvenuto.png" alt="" width={941} height={1671}
        preload unoptimized sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <h1 className="sr-only">Benvenuto nel Registro di Francesca</h1>
      <nav aria-label="Scegli la pagina del Registro">
        <Link href="/oggi" aria-label="Oggi" className={styles.hotspot}
          style={rectangle(72, 1076, 381, 176)} />
        <Link href="/menu" aria-label="Menu" className={styles.hotspot}
          style={rectangle(489, 1076, 381, 176)} />
      </nav>
    </div>
  </main>;
}
