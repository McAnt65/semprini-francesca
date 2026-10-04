import Image from "next/image";
import Link from "next/link";
import cover from "../../../design-reference/studenti-v2/00-studenti-home-cover-approved.png";
import styles from "./home.module.css";

const sections = [
  { label: "I miei studenti", href: "/studenti" },
  { label: "Nuovo studente", href: "/studenti/nuovo" },
  { label: "Diario studenti", href: "/studenti/diario" },
  { label: "Archivio", href: "/studenti/archivio" },
];

export default function StudentsHomePage() {
  return <main className={styles.page}>
    <div className={styles.viewport}>
      <div className={styles.cover}>
        <Image
          src={cover}
          alt=""
          priority
          sizes="(max-width: 430px) 100vw, 430px"
          className={styles.image}
        />
        <h1 className="sr-only">I miei studenti</h1>
        <p className="sr-only">Copertina della sezione studenti con accessi a elenco, nuovo studente, diario e archivio.</p>
        <Link href="/oggi" aria-label="Oggi" className="absolute left-[4.8%] top-[3%] h-[6.5%] w-[18.5%] rounded-xl focus-visible:outline-2 focus-visible:outline-[#813247]" />
        <Link href="/menu" aria-label="Menu" className="absolute right-[4.8%] top-[3%] h-[6.5%] w-[18.5%] rounded-xl focus-visible:outline-2 focus-visible:outline-[#813247]" />
        <nav aria-label="Sezione Studenti">
          {sections.map((section, index) => {
            const style = { left: `${index % 2 ? 51.4 : 5.4}%`, top: `${29.7 + Math.floor(index / 2) * 27.1}%`, width: "43.5%", height: "25.4%" };
            const className = "absolute rounded-xl focus-visible:outline-2 focus-visible:outline-[#813247]";
            return <Link key={section.label} href={section.href} aria-label={section.label} className={className} style={style} />;
          })}
        </nav>
        <nav aria-label="Navigazione Studenti">
          {sections.map((section, index) => {
            const style = { left: `${4.7 + index * 22.65}%`, top: "89.5%", width: "22%", height: "8.6%" };
            return (
              <Link
                key={`bottom-${section.label}`}
                href={section.href}
                aria-label={section.label === "Diario studenti" ? "Diario" : section.label}
                className="absolute rounded-xl focus-visible:outline-2 focus-visible:outline-[#813247]"
                style={style}
              />
            );
          })}
        </nav>
      </div>
    </div>
  </main>;
}
