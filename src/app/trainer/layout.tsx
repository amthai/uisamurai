import { TrainerHeader, type CurrentUser } from "@/components/trainer/TrainerHeader";
import { TrainerSidebar } from "@/components/trainer/TrainerSidebar";
import styles from "@/components/trainer/trainer-shell.module.css";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { getPublishedSectionsNav } from "@/lib/content/published-sections";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const [nav, sessionUser] = await Promise.all([getPublishedSectionsNav(), getSessionUser()]);
  const currentUser: CurrentUser | null = sessionUser
    ? {
        id: sessionUser.id,
        first_name: sessionUser.first_name,
        last_name: sessionUser.last_name,
        username: sessionUser.username,
        is_admin: sessionUser.is_admin,
      }
    : null;

  return (
    <div className={styles.shell}>
      <TrainerHeader initialUser={currentUser} />
      <section className={styles.cover} aria-label="Обложка тренажёра">
        <div className={styles.coverInner}>
          <h1 className={styles.coverTitle}>UI ТРЕНАЖЕР</h1>
          <p className={styles.coverSubtitle}>
            Прокачай свой визуал, чтобы делать эстетичные и интересные макеты: читай короткую теорию,
            выполняй задания, общайся в комментах и постепенно выходи на новый уровень.
          </p>
        </div>
      </section>
      <div className={styles.body}>
        <TrainerSidebar sections={nav} />
        <div className={styles.main}>{children}</div>
      </div>
    </div>
  );
}
