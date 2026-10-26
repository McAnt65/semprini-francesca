import Image from "next/image";
import Link from "next/link";
import styles from "./menu.module.css";

// Rectangles measured on the original 941 x 1672 artwork.
const entries = [
  { label: "Studenti", href: "/studenti", x: 26, y: 758, width: 438, height: 212 },
  { label: "Lezioni", href: "/lezioni", x: 478, y: 758, width: 438, height: 212 },
  { label: "Materie", href: "/materie", x: 26, y: 983, width: 438, height: 206 },
  { label: "Calendario", href: "/calendario", x: 478, y: 983, width: 438, height: 206 },
  { label: "Pagamenti", href: "/pagamenti", x: 26, y: 1201, width: 438, height: 207 },
  { label: "Libri di testo", href: null, x: 478, y: 1201, width: 438, height: 207 },
  { label: "Archivio generale", href: null, x: 26, y: 1421, width: 438, height: 214 },
  { label: "Impostazioni", href: "/impostazioni", x: 478, y: 1421, width: 438, height: 214 },
];

function rectangle(x: number, y: number, width: number, height: number) {
  return { left: `${x / 941 * 100}%`, top: `${y / 1672 * 100}%`, width: `${width / 941 * 100}%`, height: `${height / 1672 * 100}%` };
}

export default function MenuPage() {
  return (
    <main className={styles.page}>
      <div className={styles.sheet}>
        <Image src="/images/copertine/menu.png" alt="" width={941} height={1672} preload unoptimized sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
        <h1 className="sr-only">Menu del Registro</h1>
        <nav aria-label="Navigazione del Registro">
          <Link href="/oggi" aria-label="Oggi" className={styles.hotspot} style={rectangle(30, 60, 194, 84)} />
          <Link href="/" aria-label="Chiudi il menu e torna alla pagina d'ingresso" className={styles.hotspot} style={rectangle(720, 60, 190, 84)} />
          {entries.map((entry) => entry.href ? (
            <Link key={entry.label} href={entry.href} aria-label={entry.label} className={styles.hotspot} style={rectangle(entry.x, entry.y, entry.width, entry.height)} />
          ) : (
            <button key={entry.label} type="button" aria-disabled="true" aria-label={`${entry.label}: pagina ancora da implementare`} className={`${styles.hotspot} ${styles.unavailable}`} style={rectangle(entry.x, entry.y, entry.width, entry.height)}>
              <span className={styles.notice}>Pagina ancora da implementare</span>
            </button>
          ))}
          <Link href="/calendario/nuova" className={styles.newLesson}>Nuova lezione</Link>
        </nav>
      </div>
    </main>
  );
}
