import styles from "@/components/trainer/trainer-shell.module.css";

export function AdminNeedLogin() {
  return (
    <div className={styles.emptyState}>
      <h1 className={styles.h1}>Авторизуйся как админ</h1>
    </div>
  );
}

export function AdminNeedRole() {
  return (
    <div className={styles.emptyState}>
      <h1 className={styles.h1}>Ты не админ</h1>
    </div>
  );
}
