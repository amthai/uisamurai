"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./trainer-shell.module.css";

export type SidebarSection = {
  slug: string;
  title: string;
};

type Props = {
  sections: SidebarSection[];
};

export function TrainerSidebar({ sections }: Props) {
  const pathname = usePathname();
  const currentSlug = pathname?.startsWith("/trainer/") ? pathname.replace("/trainer/", "") : "";

  return (
    <nav className={styles.sidebar} aria-label="Разделы тренажёра">
      <p className={styles.sidebarTitle}>Разделы</p>
      <ul className={styles.navList}>
        {sections.map((s) => (
          <li key={s.slug}>
            <Link
              href={`/trainer/${s.slug}`}
              className={s.slug === currentSlug ? styles.navLinkActive : styles.navLink}
            >
              {s.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
