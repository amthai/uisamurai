import { notFound } from "next/navigation";
import type { JSONContent } from "@tiptap/core";
import { SectionForm, type SectionInitial } from "@/components/admin/SectionForm";
import styles from "@/components/trainer/trainer-shell.module.css";
import { EMPTY_TIPTAP_DOC } from "@/lib/content/empty-doc";
import { supabaseServer } from "@/lib/supabase/server";

function parseDoc(raw: unknown): JSONContent {
  if (raw && typeof raw === "object" && (raw as JSONContent).type === "doc") {
    return raw as JSONContent;
  }
  return EMPTY_TIPTAP_DOC;
}

type Props = { params: Promise<{ id: string }> };

export default async function EditSectionPage(props: Props) {
  const { id } = await props.params;

  const { data: row, error } = await supabaseServer.from("sections").select("*").eq("id", id).maybeSingle();

  if (error || !row) {
    notFound();
  }

  const initial: SectionInitial = {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    sort_order: row.sort_order as number,
    is_published: row.is_published as boolean,
    body: parseDoc(row.body),
    assignment: parseDoc(row.assignment),
    meta_description: (row.meta_description as string | null) ?? null,
  };

  return (
    <div>
      <h1 className={styles.h1} style={{ marginBottom: "1rem" }}>
        Редактировать: {initial.title}
      </h1>
      <p className={styles.muted} style={{ marginBottom: "1rem" }}>
        Публичный URL: <code>/trainer/{initial.slug}</code>
      </p>
      <SectionForm mode="edit" initial={initial} />
    </div>
  );
}
