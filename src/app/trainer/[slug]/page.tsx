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
  seo_title: string | null;
  body: JSONContent;
  assignment: JSONContent;
  meta_description: string | null;
};

type Props = { params: Promise<{ slug: string }> };

function isMissingColumnError(error: { message?: string } | null, column: "seo_title"): boolean {
  return Boolean(error?.message?.includes(`column sections.${column} does not exist`));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const preferred = await supabaseServer
    .from("sections")
    .select("title, seo_title, meta_description")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle<{ title: string; seo_title: string | null; meta_description: string | null }>();
  const fallback =
    preferred.error && isMissingColumnError(preferred.error, "seo_title")
      ? await supabaseServer
          .from("sections")
          .select("title, meta_description")
          .eq("slug", slug)
          .eq("is_published", true)
          .maybeSingle<{ title: string; meta_description: string | null }>()
      : null;
  const data = preferred.error && fallback ? fallback.data : preferred.data;

  if (!data) {
    return { title: "Раздел не найден" };
  }

  const seoTitle = "seo_title" in data ? (data.seo_title ?? "").trim() || data.title : data.title;

  return {
    title: `${seoTitle} · UISamurai`,
    description: data.meta_description ?? `Раздел «${seoTitle}» — UI-тренажёр UISamurai.`,
    openGraph: {
      title: seoTitle,
      description: data.meta_description ?? undefined,
    },
  };
}

export default async function TrainerSectionPage(props: Props) {
  const { slug } = await props.params;

  const preferred = await supabaseServer
    .from("sections")
    .select("id, title, seo_title, body, assignment, meta_description")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle<SectionRow>();
  const fallback =
    preferred.error && isMissingColumnError(preferred.error, "seo_title")
      ? await supabaseServer
          .from("sections")
          .select("id, title, body, assignment, meta_description")
          .eq("slug", slug)
          .eq("is_published", true)
          .maybeSingle<Omit<SectionRow, "seo_title">>()
      : null;
  const section = preferred.error && fallback ? fallback.data : preferred.data;
  const error = preferred.error && fallback ? fallback.error : preferred.error;

  if (error || !section) {
    notFound();
  }

  const user = await getSessionUser();
  const theoryHtml = tiptapJsonToHtml(section.body);
  const assignmentHtml = user ? tiptapJsonToHtml(section.assignment) : null;
  const h1Title = "seo_title" in section ? (section.seo_title ?? "").trim() || section.title : section.title;

  return (
    <article>
      <header className={styles.hero}>
        <h1 className={styles.h1}>{h1Title}</h1>
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
