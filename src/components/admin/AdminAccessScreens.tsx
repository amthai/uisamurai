import Link from "next/link";
import styles from "@/components/trainer/trainer-shell.module.css";

export function AdminNeedLogin() {
  return (
    <div className={styles.emptyState}>
      <h1 className={styles.h1}>Админка</h1>
      <p className={styles.muted}>
        Сначала войди через Telegram на главной: нажми кнопку входа Telegram в шапке, затем снова зайди на{" "}
        <strong>/admin</strong>.
      </p>
      <p>
        <Link href="/" className={styles.navLink}>
          На главную
        </Link>
      </p>
    </div>
  );
}

export function AdminNeedRole() {
  return (
    <div className={styles.emptyState}>
      <h1 className={styles.h1}>Нет доступа</h1>
      <p className={styles.muted}>
        У этого Telegram-аккаунта нет роли администратора. Нужно выставить <code>is_admin = true</code> в таблице{" "}
        <code>users</code> (по твоему <code>telegram_id</code>).
      </p>
      <p>
        <Link href="/" className={styles.navLink}>
          На главную
        </Link>
      </p>
    </div>
  );
}
