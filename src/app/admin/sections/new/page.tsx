import { SectionForm } from "@/components/admin/SectionForm";
import styles from "@/components/trainer/trainer-shell.module.css";

export default function NewSectionPage() {
  return (
    <div>
      <h1 className={styles.h1} style={{ marginBottom: "1rem" }}>
        Новый раздел
      </h1>
      <SectionForm mode="create" />
    </div>
  );
}
