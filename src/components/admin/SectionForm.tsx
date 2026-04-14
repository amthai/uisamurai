"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import type { JSONContent } from "@tiptap/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "@/components/trainer/trainer-shell.module.css";
import { EMPTY_TIPTAP_DOC } from "@/lib/content/empty-doc";
import { TiptapField } from "./TiptapField";

export type SectionInitial = {
  id: string;
  slug: string;
  title: string;
  nav_title: string | null;
  seo_title: string | null;
  sort_order: number;
  is_published: boolean;
  body: JSONContent;
  assignment: JSONContent;
  meta_description: string | null;
};

type Props =
  | { mode: "create"; initial?: undefined }
  | { mode: "edit"; initial: SectionInitial };

export function SectionForm(props: Props) {
  const router = useRouter();
  const initial = props.mode === "edit" ? props.initial : null;

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [navTitle, setNavTitle] = useState(initial?.nav_title ?? "");
  const [seoTitle, setSeoTitle] = useState(initial?.seo_title ?? "");
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [isPublished, setIsPublished] = useState(props.mode === "edit" ? props.initial.is_published : true);
  const [metaDescription, setMetaDescription] = useState(initial?.meta_description ?? "");
  const [body, setBody] = useState<JSONContent>(initial?.body ?? EMPTY_TIPTAP_DOC);
  const [assignment, setAssignment] = useState<JSONContent>(initial?.assignment ?? EMPTY_TIPTAP_DOC);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (props.mode === "create") {
        const res = await fetch("/api/admin/sections", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            title,
            nav_title: navTitle.trim() || null,
            seo_title: seoTitle.trim() || null,
            sort_order: sortOrder,
            is_published: isPublished,
            body,
            assignment,
            meta_description: metaDescription.trim() || null,
          }),
        });
        const data = (await res.json()) as { error?: string; id?: string };
        if (!res.ok) {
          setError(data.error ?? "Ошибка");
          return;
        }
        if (data.id) {
          router.refresh();
          router.push(`/admin/sections/${data.id}/edit`);
        }
        return;
      }

      const section = props.initial;
      const res = await fetch(`/api/admin/sections/${section.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title,
          nav_title: navTitle.trim() || null,
          seo_title: seoTitle.trim() || null,
          sort_order: sortOrder,
          is_published: isPublished,
          body,
          assignment,
          meta_description: metaDescription.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Ошибка");
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (props.mode !== "edit") return;
    if (!window.confirm("Удалить раздел и связанные комментарии?")) return;
    setError(null);
    const res = await fetch(`/api/admin/sections/${props.initial.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Не удалось удалить раздел");
      return;
    }
    router.push("/admin");
    router.refresh();
  };

  return (
    <form onSubmit={(e) => void submit(e)}>
      {error && <p className={styles.authError}>{error}</p>}

      <div className={styles.formField}>
        <label htmlFor="slug">Slug (латиница, дефисы)</label>
        <input
          id="slug"
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          autoComplete="off"
        />
      </div>

      <div className={styles.formField}>
        <label htmlFor="title">Заголовок</label>
        <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className={styles.formField}>
        <label htmlFor="nav_title">Заголовок в меню (nav_title)</label>
        <input
          id="nav_title"
          type="text"
          value={navTitle}
          onChange={(e) => setNavTitle(e.target.value)}
          placeholder="Короткий заголовок для бокового меню"
        />
      </div>

      <div className={styles.formField}>
        <label htmlFor="seo_title">SEO/H1 заголовок (seo_title)</label>
        <input
          id="seo_title"
          type="text"
          value={seoTitle}
          onChange={(e) => setSeoTitle(e.target.value)}
          placeholder="Подробный заголовок страницы для SEO"
        />
      </div>

      <div className={styles.formField}>
        <label htmlFor="sort_order">Порядок (sort_order)</label>
        <input
          id="sort_order"
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
        />
      </div>

      <div className={styles.checkboxRow}>
        <input
          id="is_published"
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
        />
        <label htmlFor="is_published">Опубликован</label>
      </div>

      <div className={styles.formField}>
        <label htmlFor="meta">Meta description (SEO)</label>
        <input
          id="meta"
          type="text"
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          placeholder="Кратко для поиска и соцсетей"
        />
      </div>

      <TiptapField label="Теория (видна всем)" value={body} onChange={setBody} placeholder="Текст раздела…" />
      <TiptapField
        label="Задание (только после входа Telegram)"
        value={assignment}
        onChange={setAssignment}
        placeholder="Формулировка задания…"
      />

      <div className={styles.formRow} style={{ justifyContent: "flex-start", marginTop: "1rem" }}>
        <button type="submit" className={styles.buttonPrimary} disabled={saving}>
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
        <Link href="/admin" className={styles.buttonGhost} style={{ display: "inline-block", lineHeight: 1.5 }}>
          Назад
        </Link>
        {props.mode === "edit" && (
          <button type="button" className={styles.buttonGhost} onClick={() => void remove()}>
            Удалить
          </button>
        )}
      </div>
    </form>
  );
}
