import Link from "next/link";
import styles from "./students.module.css";

const items = [
  { label: "I miei studenti", href: "/studenti", key: "list" },
  { label: "Nuovo studente", href: "/studenti/nuovo", key: "new" },
  { label: "Diario", href: "/studenti/diario", key: "diary" },
  { label: "Archivio", href: "/studenti/archivio", key: "archive" },
] as const;

export type StudentsNavKey = (typeof items)[number]["key"];

export default function StudentsNavigation({ current = "list" }: { current?: StudentsNavKey }) {
  return (
    <nav aria-label="Navigazione Studenti" className={styles.navigation}>
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-label={item.label}
          aria-current={current === item.key ? "page" : undefined}
          data-current={current === item.key ? "true" : undefined}
        />
      ))}
    </nav>
  );
}
