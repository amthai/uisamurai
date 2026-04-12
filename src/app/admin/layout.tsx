import Link from "next/link";
import { AdminNeedLogin, AdminNeedRole } from "@/components/admin/AdminAccessScreens";
import styles from "@/components/trainer/trainer-shell.module.css";
import { getSessionUser } from "@/lib/auth/get-session-user";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className={styles.adminShell}>
        <header className={styles.adminBar}>
          <span style={{ fontWeight: 600 }}>Админка</span>
          <Link href="/" className={styles.navLink}>
            На сайт
          </Link>
        </header>
        <div className={styles.adminMain}>
          <AdminNeedLogin />
        </div>
      </div>
    );
  }

  if (!user.is_admin) {
    return (
      <div className={styles.adminShell}>
        <header className={styles.adminBar}>
          <span style={{ fontWeight: 600 }}>Админка</span>
          <Link href="/" className={styles.navLink}>
            На сайт
          </Link>
        </header>
        <div className={styles.adminMain}>
          <AdminNeedRole />
        </div>
      </div>
    );
  }

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
