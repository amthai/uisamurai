import Link from "next/link";
import styles from "@/components/trainer/trainer-shell.module.css";

export default function TrainerNotFound() {
  return (
    <div className={styles.emptyState}>
      <h1 className={styles.h1}>Раздел не найден</h1>
      <p className={styles.muted}>
        <Link href="/" className={styles.navLink}>
          На главную
        </Link>
      </p>
    </div>
  );
}
