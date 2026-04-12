"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./trainer-shell.module.css";

export type SidebarSection = {
  slug: string;
  title: string;
};

type Props = {
  sections: SidebarSection[];
};

export function TrainerSidebar({ sections: initialSections }: Props) {
  const pathname = usePathname();
  const [sections, setSections] = useState(initialSections);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/trainer/nav")
      .then((r) => r.json() as Promise<{ sections?: SidebarSection[] }>)
      .then((d) => {
        if (!cancelled && Array.isArray(d.sections)) {
          setSections(d.sections);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const currentSlug = pathname?.startsWith("/trainer/") ? pathname.replace("/trainer/", "").split("/")[0] ?? "" : "";

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
