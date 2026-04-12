import styles from "./trainer-shell.module.css";

type Props = {
  html: string;
  className?: string;
};

export function RichHtml({ html, className }: Props) {
  return (
    <div
      className={[styles.tiptapHtml, className ?? ""].join(" ")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
