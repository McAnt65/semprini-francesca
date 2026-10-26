"use client";

import Link from "next/link";
import styles from "./students-navigation.module.css";

type StudentSection = "elenco" | "nuovo" | "diario" | "archivio" | "profilo";
export type StudentsNavKey = StudentSection | "list" | "new" | "diary" | "archive";

type StudentsNavigationProps = {
  active?: StudentSection;
  current?: StudentsNavKey;
  placement?: "cover" | "fixed";
  appearance?: "icons" | "text";
};

const entries: Array<{
  key: StudentSection;
  label: string;
  href?: string;
}> = [
  { key: "elenco", label: "I miei studenti", href: "/studenti/elenco" },
  { key: "nuovo", label: "Nuovo studente", href: "/studenti/nuovo" },
  { key: "diario", label: "Diario" },
  { key: "archivio", label: "Archivio" },
];

export default function StudentsNavigation({
  active,
  current,
  placement = "fixed",
  appearance = "icons",
}: StudentsNavigationProps) {
  const selected = active ?? (
    current === "list" ? "elenco" :
    current === "new" ? "nuovo" :
    current === "diary" ? "diario" :
    current === "archive" ? "archivio" :
    current
  );
  return (
    <nav
      aria-label="Navigazione Studenti"
      className={`${styles.bar} ${placement === "cover" ? styles.coverPlacement : ""} ${appearance === "text" ? styles.textOnly : ""}`}
    >
      {entries.map((entry) => {
        const isActive = selected === entry.key;
        const className = `${styles.item} ${isActive ? styles.active : ""} ${!entry.href ? styles.unavailable : ""}`;
        const content = (
          <>
            {appearance === "icons" && <SectionIcon name={entry.key} active={isActive} />}
            <span className={styles.label}>{entry.label}</span>
            {isActive && <span className={styles.activeRule} aria-hidden="true" />}
          </>
        );

        return entry.href ? (
          <Link
            key={entry.key}
            href={entry.href}
            aria-current={selected === entry.key ? "page" : undefined}
            className={className}
          >
            {content}
          </Link>
        ) : (
          <span
            key={entry.key}
            aria-disabled="true"
            aria-label={`${entry.label}, destinazione non ancora operativa`}
            className={className}
          >
            {content}
          </span>
        );
      })}
    </nav>
  );
}

function SectionIcon({ name, active }: { name: StudentSection; active: boolean }) {
  const className = `${styles.icon} ${active ? styles.activeIcon : ""}`;

  if (name === "elenco") {
    return (
      <svg aria-hidden="true" viewBox="0 0 40 34" className={className}>
        <circle cx="20" cy="8" r="5.2" fill="currentColor" />
        <circle cx="7.8" cy="12" r="4.1" fill="currentColor" opacity=".9" />
        <circle cx="32.2" cy="12" r="4.1" fill="currentColor" opacity=".9" />
        <path d="M10.5 30c.5-7 4-10.2 9.5-10.2S29 23 29.5 30c0 1.2-.8 1.8-2 1.8h-15c-1.2 0-2-.6-2-1.8Z" fill="currentColor" />
        <path d="M1.5 29c.2-5 2.5-7.7 6.3-7.7 1.5 0 2.7.4 3.7 1.3-1.7 1.9-2.7 4.4-2.9 7.4H3.1c-1 0-1.6-.3-1.6-1Z" fill="currentColor" opacity=".9" />
        <path d="M38.5 29c-.2-5-2.5-7.7-6.3-7.7-1.5 0-2.7.4-3.7 1.3 1.7 1.9 2.7 4.4 2.9 7.4h5.5c1 0 1.6-.3 1.6-1Z" fill="currentColor" opacity=".9" />
      </svg>
    );
  }

  if (name === "nuovo") {
    return (
      <svg aria-hidden="true" viewBox="0 0 40 34" className={className}>
        <circle cx="15" cy="9" r="5.2" fill="currentColor" />
        <path d="M5.5 29c.4-7 3.9-10.2 9.5-10.2s9.1 3.2 9.5 10.2c0 1.2-.8 1.8-2 1.8h-15c-1.2 0-2-.6-2-1.8Z" fill="currentColor" />
        <path d="M31 8v12m-6-6h12" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "diario") {
    return (
      <svg aria-hidden="true" viewBox="0 0 40 34" className={className} fill="none">
        <path d="M4 5.5c5.6-1.1 10.5.4 16 3.6v21c-5.4-3.2-10.4-4.5-16-3.5v-21Z" fill="#fbf4e7" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M36 5.5c-5.6-1.1-10.5.4-16 3.6v21c5.4-3.2 10.4-4.5 16-3.5v-21Z" fill="#fbf4e7" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M9 11c3.3.1 6.2 1 8.7 2.5M9 15c3.3.1 6.2 1 8.7 2.5m4.6-4c2.5-1.5 5.4-2.4 8.7-2.5m-8.7 6.5c2.5-1.5 5.4-2.4 8.7-2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity=".75" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 40 34" className={className} fill="none">
      <path d="M5 11.5h30v18H5v-18Z" fill="#f8ead6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7 5h26l3 6.5H4L7 5Z" fill="#e7c39b" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M15.5 17.5h9v4h-9v-4Z" fill="#fbf4e7" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
