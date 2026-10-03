import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import StudentsNavigation, { type StudentsNavKey } from "./StudentsNavigation";
import styles from "./students.module.css";

export default function StudentSurface({
  artwork,
  children,
  current = "list",
  className = "",
}: {
  artwork: StaticImageData;
  children: ReactNode;
  current?: StudentsNavKey;
  className?: string;
}) {
  return (
    <main className={styles.page}>
      <div className={`${styles.surface} ${className}`}>
        <Image src={artwork} alt="" fill priority sizes="(max-width: 430px) 100vw, 430px" className={styles.artwork} />
        <Link href="/studenti/nuovo" aria-label="Nuovo studente" className={styles.newStudent} />
        <Link href="/menu" aria-label="Menu" className={styles.menu} />
        {children}
        <StudentsNavigation current={current} />
      </div>
    </main>
  );
}
