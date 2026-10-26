import Image from "next/image";
import Link from "next/link";
import styles from "./cover.module.css";

// Rectangles measured on CoverMaterie.png (941 x 1672).
const destinations = [
  { label: "Oggi", href: "/oggi", x: 31, y: 56, width: 196, height: 88 },
  { label: "Menu", href: "/menu", x: 713, y: 56, width: 197, height: 88 },
  { label: "Le mie materie", href: "/materie/elenco", x: 42, y: 1175, width: 421, height: 199 },
  { label: "Programmi", href: "/materie/programmi", x: 478, y: 1175, width: 423, height: 199 },
  { label: "Argomenti", href: "/materie/argomenti", x: 42, y: 1389, width: 421, height: 209 },
  { label: "Studenti per materia", href: "/materie/studenti", x: 478, y: 1389, width: 423, height: 209 },
];

function rectangle(x: number, y: number, width: number, height: number) {
  return {
    left: `${x / 941 * 100}%`,
    top: `${y / 1672 * 100}%`,
    width: `${width / 941 * 100}%`,
    height: `${height / 1672 * 100}%`,
  };
}

export default function MateriePage() {
  return <main className={styles.page}>
    <div className={styles.sheet}>
      <Image src="/CoverMaterie.png" alt="" fill preload unoptimized
        sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <h1 className="sr-only">Materie del Registro di Francesca</h1>
      <nav aria-label="Navigazione Materie">
        {destinations.map((entry) => <Link key={entry.href} href={entry.href} aria-label={entry.label}
          className={styles.hotspot} style={rectangle(entry.x, entry.y, entry.width, entry.height)} />)}
      </nav>
    </div>
  </main>;
}
