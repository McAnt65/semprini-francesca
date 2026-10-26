import Image from "next/image";
import Link from "next/link";
import styles from "./copertina.module.css";

// Coordinates refer to the approved CoverStudenti.png (941 x 1672).
const destinations = [
  { label: "Oggi", href: "/oggi", x: 30, y: 60, w: 194, h: 82 },
  { label: "Menu", href: "/menu", x: 716, y: 60, w: 194, h: 82 },
  { label: "I miei studenti", href: "/studenti/elenco", x: 49, y: 1085, w: 412, h: 239 },
  { label: "Nuovo studente", href: "/studenti/nuovo", x: 480, y: 1085, w: 412, h: 239 },
  { label: "Diario studenti", href: "/studenti/diario", x: 49, y: 1340, w: 412, h: 245 },
  { label: "Archivio studenti", href: "/studenti/archivio", x: 480, y: 1340, w: 412, h: 245 },
];

export default function StudentsCoverPage() {
  return (
    <main className={styles.page}>
      <div className={styles.canvas}>
        <Image src="/images/copertine/studenti.png" alt="" width={941} height={1672} preload unoptimized sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
        <h1 className="sr-only">Studenti del Registro di Francesca</h1>
        <nav aria-label="Navigazione Studenti">
          {destinations.map((entry) => (
            <Link key={entry.href} href={entry.href} aria-label={entry.label} className={styles.hotspot} style={{ left: `${entry.x / 941 * 100}%`, top: `${entry.y / 1672 * 100}%`, width: `${entry.w / 941 * 100}%`, height: `${entry.h / 1672 * 100}%` }} />
          ))}
        </nav>
      </div>
    </main>
  );
}
