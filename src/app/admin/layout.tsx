import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import styles from "@/components/trainer/trainer-shell.module.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className={styles.adminShell}>
      <header className={styles.adminBar}>
        <span style={{ fontWeight: 600 }}>Админка контента</span>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link href="/" className={styles.navLink}>
            На сайт
          </Link>
          <Link href="/admin" className={styles.navLink}>
            Список
          </Link>
          <Link href="/admin/sections/new" className={styles.navLink}>
            Новый раздел
          </Link>
        </div>
      </header>
      <div className={styles.adminMain}>{children}</div>
    </div>
  );
}
