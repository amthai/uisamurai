"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const hasMountedRef = useRef(false);

  useEffect(() => {
    setSections(initialSections);
  }, [initialSections]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    let cancelled = false;
    void fetch("/api/trainer/nav", { cache: "no-store", credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok) {
          throw new Error("Failed to refresh navigation");
        }
        return (await r.json()) as { sections?: SidebarSection[] };
      })
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
