import { TrainerHeader } from "@/components/trainer/TrainerHeader";
import { TrainerSidebar } from "@/components/trainer/TrainerSidebar";
import { supabaseServer } from "@/lib/supabase/server";
import styles from "@/components/trainer/trainer-shell.module.css";

export const dynamic = "force-dynamic";

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const { data: sections } = await supabaseServer
    .from("sections")
    .select("slug, title, sort_order")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  const nav =
    sections?.map((s) => ({
      slug: s.slug,
      title: s.title,
    })) ?? [];

  return (
    <div className={styles.shell}>
      <TrainerHeader />
      <div className={styles.body}>
        <TrainerSidebar sections={nav} />
        <div className={styles.main}>{children}</div>
      </div>
    </div>
  );
}
