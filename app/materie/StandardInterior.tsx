import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./standard-interior.module.css";

export default function StandardInterior({ title, backHref, backLabel, backgroundSrc = "/SfondoStandard.png", illustratedTitle = false, children }: {
  title: string;
  backHref: string;
  backLabel: string;
  backgroundSrc?: string;
  illustratedTitle?: boolean;
  children: ReactNode;
}) {
  return <main className={styles.page}>
    <div className={`${styles.sheet} ${illustratedTitle ? styles.illustrated : ""}`}>
      <Image src={backgroundSrc} alt="" fill preload unoptimized
        sizes="(max-width: 560px) 100vw, 560px" className={styles.artwork} />
      <header className={styles.header}>
        <nav className={styles.navigation} aria-label={`Navigazione ${title}`}>
          <Link href="/oggi">OGGI</Link>
          <Link href={backHref}>← {backLabel}</Link>
          <Link href="/menu">MENU</Link>
        </nav>
        <h1 className={illustratedTitle ? styles.visuallyHidden : styles.title}>{title}</h1>
      </header>
      <div className={styles.workspace} role="region" tabIndex={0} aria-label={`Contenuti di ${title}`}>
        {children}
      </div>
    </div>
  </main>;
}

export function StandardSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className={styles.section}>
    <div className={styles.sectionHeading}><h2 className={styles.sectionTitle}>{title}</h2>{action}</div>
    {children}
  </section>;
}

export function StandardLinkRow({ href, children, detail }: { href: string; children: ReactNode; detail?: string }) {
  return <li className={styles.row}>
    <Link href={href} className={styles.rowLink}>
      <span className={styles.rowText}>{children}</span>
      {detail && <span className={styles.rowDetail}>{detail}</span>}
      <span className={styles.rowArrow} aria-hidden="true">→</span>
    </Link>
  </li>;
}

export function StandardEmptyState({ children }: { children: ReactNode }) {
  return <p className={styles.empty} role="status">{children}</p>;
}

export { styles as standardInteriorStyles };
