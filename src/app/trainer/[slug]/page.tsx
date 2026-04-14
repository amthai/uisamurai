import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
import type { JSONContent } from "@tiptap/core";
import { CommentsSection } from "@/components/trainer/CommentsSection";
import { RichHtml } from "@/components/trainer/RichHtml";
import styles from "@/components/trainer/trainer-shell.module.css";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { tiptapJsonToHtml } from "@/lib/content/rich-html";
import { supabaseServer } from "@/lib/supabase/server";

type SectionRow = {
  id: string;
  title: string;
  body: JSONContent;
  assignment: JSONContent;
  meta_description: string | null;
};

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const { data } = await supabaseServer
    .from("sections")
    .select("title, meta_description")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle<{ title: string; meta_description: string | null }>();

  if (!data) {
    return { title: "Раздел не найден" };
  }

  return {
    title: `${data.title} · UISamurai`,
    description: data.meta_description ?? `Раздел «${data.title}» — UI-тренажёр UISamurai.`,
    openGraph: {
      title: data.title,
      description: data.meta_description ?? undefined,
    },
  };
}

export default async function TrainerSectionPage(props: Props) {
  const { slug } = await props.params;

  const { data: section, error } = await supabaseServer
    .from("sections")
    .select("id, title, body, assignment, meta_description")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle<SectionRow>();

  if (error || !section) {
    notFound();
  }

  const user = await getSessionUser();
  const theoryHtml = tiptapJsonToHtml(section.body);
  const assignmentHtml = user ? tiptapJsonToHtml(section.assignment) : null;

  return (
    <article>
      <header className={styles.hero}>
        <p className={styles.heroLabel}>Раздел</p>
        <h1 className={styles.h1}>{section.title}</h1>
      </header>

      <section aria-label="Теория">
        <RichHtml html={theoryHtml} />
      </section>

      <section className={styles.block} aria-label="Задание">
        <h2 className={styles.h2}>Задание</h2>
        {user && assignmentHtml ? (
          <RichHtml html={assignmentHtml} />
        ) : (
          <p className={styles.muted}>
            Войди через Telegram в шапке, чтобы видеть задание и писать комментарии.
          </p>
        )}
      </section>

      <CommentsSection
        sectionId={section.id}
        isLoggedIn={!!user}
        currentUserId={user?.id ?? null}
      />
    </article>
  );
}
