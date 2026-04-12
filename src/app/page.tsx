import Link from "next/link";
import { redirect } from "next/navigation";
import { TrainerHeader } from "@/components/trainer/TrainerHeader";
import styles from "@/components/trainer/trainer-shell.module.css";
import { supabaseServer } from "@/lib/supabase/server";

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

  return (
    <div className={styles.shell}>
      <TrainerHeader />
      <main className={styles.emptyState}>
        <p className={styles.heroLabel}>UISamurai</p>
        <h1 className={styles.h1}>Пока нет опубликованных разделов</h1>
        <p className={styles.muted}>
          Добавь раздел в админке (нужна роль admin).{" "}
          <Link href="/admin" className={styles.navLink}>
            /admin
          </Link>
        </p>
      </main>
    </div>
  );
}
