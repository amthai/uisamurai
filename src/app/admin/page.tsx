import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import styles from "@/components/trainer/trainer-shell.module.css";

export default async function AdminHomePage() {
  const { data: sections } = await supabaseServer
    .from("sections")
    .select("id, slug, title, sort_order, is_published, updated_at")
    .order("sort_order", { ascending: true });

  return (
    <div>
      <h1 className={styles.h1} style={{ marginBottom: "1rem" }}>
        Разделы
      </h1>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Порядок</th>
            <th>Slug</th>
            <th>Заголовок</th>
            <th>Статус</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(sections ?? []).map((s) => (
            <tr key={s.id}>
              <td>{s.sort_order}</td>
              <td>{s.slug}</td>
              <td>{s.title}</td>
              <td>{s.is_published ? "опубликован" : "черновик"}</td>
              <td>
                <Link href={`/admin/sections/${s.id}/edit`} className={styles.navLink}>
                  править
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {(!sections || sections.length === 0) && <p className={styles.muted}>Пока нет разделов — создай первый.</p>}
    </div>
  );
}
