import { TrainerHeader, type CurrentUser } from "@/components/trainer/TrainerHeader";
import { TrainerSidebar } from "@/components/trainer/TrainerSidebar";
import styles from "@/components/trainer/trainer-shell.module.css";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { getPublishedSectionsNav } from "@/lib/content/published-sections";

export const dynamic = "force-dynamic";

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
      <div className={styles.body}>
        <TrainerSidebar sections={nav} />
        <div className={styles.main}>{children}</div>
      </div>
    </div>
  );
}
