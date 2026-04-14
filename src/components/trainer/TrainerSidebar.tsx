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
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [pinnedLeft, setPinnedLeft] = useState(0);
  const [pinnedWidth, setPinnedWidth] = useState(0);
  const [anchorHeight, setAnchorHeight] = useState(0);

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

  useEffect(() => {
    const updatePinnedState = () => {
      const anchor = anchorRef.current;
      const nav = navRef.current;
      if (!anchor || !nav) return;

      const desktop = window.matchMedia("(min-width: 1001px)").matches;
      if (!desktop) {
        setIsPinned(false);
        setAnchorHeight(0);
        return;
      }

      const rect = anchor.getBoundingClientRect();
      const shouldPin = rect.top <= 16;

      if (!shouldPin) {
        setIsPinned(false);
        setAnchorHeight(0);
        return;
      }

      setPinnedLeft(rect.left);
      setPinnedWidth(rect.width);
      setAnchorHeight(nav.offsetHeight);
      setIsPinned(true);
    };

    updatePinnedState();
    window.addEventListener("scroll", updatePinnedState, { passive: true });
    window.addEventListener("resize", updatePinnedState);
    return () => {
      window.removeEventListener("scroll", updatePinnedState);
      window.removeEventListener("resize", updatePinnedState);
    };
  }, [pathname, sections.length]);

  const currentSlug = pathname?.startsWith("/trainer/") ? pathname.replace("/trainer/", "").split("/")[0] ?? "" : "";

  return (
    <div ref={anchorRef} className={styles.sidebarAnchor} style={isPinned ? { height: anchorHeight } : undefined}>
      <nav
        ref={navRef}
        className={`${styles.sidebar} ${isPinned ? styles.sidebarPinned : ""}`.trim()}
        style={isPinned ? { left: `${pinnedLeft}px`, width: `${pinnedWidth}px` } : undefined}
        aria-label="Разделы тренажёра"
      >
        <p className={styles.sidebarTitle}>Разделы</p>
        <ul className={styles.navList}>
          {sections.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/trainer/${s.slug}`}
                prefetch={false}
                className={s.slug === currentSlug ? styles.navLinkActive : styles.navLink}
              >
                {s.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
