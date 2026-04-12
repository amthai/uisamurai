import Link from "next/link";
import { redirect } from "next/navigation";
import { TrainerHeader } from "@/components/trainer/TrainerHeader";
import styles from "@/components/trainer/trainer-shell.module.css";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { supabaseServer } from "@/lib/supabase/server";

/** Иначе после деплоя страница могла остаться «пустой» из кэша билда, когда разделов ещё не было. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { data } = await supabaseServer
    .from("sections")
    .select("slug")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (data?.slug) {
    redirect(`/trainer/${data.slug}`);
  }

  const user = await getSessionUser();
  let draftHint = false;
  if (user?.is_admin) {
    const { count } = await supabaseServer
      .from("sections")
      .select("*", { count: "exact", head: true });
    draftHint = (count ?? 0) > 0;
  }

  return (
    <div className={styles.shell}>
      <TrainerHeader />
      <main className={styles.emptyState}>
        <p className={styles.heroLabel}>UISamurai</p>
        <h1 className={styles.h1}>Пока нет опубликованных разделов</h1>
        {draftHint ? (
          <p className={styles.muted}>
            У тебя есть разделы в статусе <strong>черновик</strong>. Открой{" "}
            <Link href="/admin" className={styles.navLink}>
              админку
            </Link>
            , выбери раздел и включи галочку <strong>«Опубликован»</strong>, затем сохрани.
          </p>
        ) : (
          <p className={styles.muted}>
            Добавь раздел в админке (нужна роль admin).{" "}
            <Link href="/admin" className={styles.navLink}>
              /admin
            </Link>
          </p>
        )}
      </main>
    </div>
  );
}
