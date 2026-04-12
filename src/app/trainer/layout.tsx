import { TrainerHeader } from "@/components/trainer/TrainerHeader";
import { TrainerSidebar } from "@/components/trainer/TrainerSidebar";
import styles from "@/components/trainer/trainer-shell.module.css";
import { getPublishedSectionsNav } from "@/lib/content/published-sections";

export const dynamic = "force-dynamic";

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const nav = await getPublishedSectionsNav();

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
