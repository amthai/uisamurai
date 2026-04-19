import { redirect } from "next/navigation";
import { TrainerHeader, type CurrentUser } from "@/components/trainer/TrainerHeader";
import styles from "@/components/trainer/trainer-shell.module.css";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { supabaseServer } from "@/lib/supabase/server";

/** Иначе после деплоя страница могла остаться «пустой» из кэша билда, когда разделов ещё не было. */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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
  const currentUser: CurrentUser | null = user
    ? {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        is_admin: user.is_admin,
      }
    : null;
  return (
    <div className={styles.shell}>
      <TrainerHeader initialUser={currentUser} />
      <main className={styles.emptyState}>
        <h1 className={styles.h1}>Пока нет опубликованных разделов</h1>
      </main>
    </div>
  );
}
