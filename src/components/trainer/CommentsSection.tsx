"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./trainer-shell.module.css";

type CommentUser = {
  id: string;
  first_name: string;
  username: string | null;
};

export type CommentItem = {
  id: string;
  section_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  user: CommentUser;
  likes: number;
  dislikes: number;
  my_reaction: "like" | "dislike" | null;
};

type Props = {
  sectionId: string;
  isLoggedIn: boolean;
  currentUserId: string | null;
};

export function CommentsSection({ sectionId, isLoggedIn, currentUserId }: Props) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(isLoggedIn);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/sections/${sectionId}/comments`, { credentials: "include" });
    if (!res.ok) {
      setError("Не удалось загрузить комментарии");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { comments: CommentItem[] };
    setComments(data.comments);
    setLoading(false);
  }, [isLoggedIn, sectionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);
    const res = await fetch(`/api/sections/${sectionId}/comments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: trimmed, parent_id: replyTo }),
    });
    if (res.status === 429) {
      const data = (await res.json()) as { retryAfterSec?: number };
      setError(`Слишком часто. Попробуй через ${data.retryAfterSec ?? 60} с.`);
      return;
    }
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Ошибка отправки");
      return;
    }
    setText("");
    setReplyTo(null);
    await load();
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) return;
    await load();
  };

  const react = async (commentId: string, type: "like" | "dislike") => {
    const res = await fetch(`/api/comments/${commentId}/reactions`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    if (!res.ok) return;
    await load();
  };

  const roots = comments.filter((c) => !c.parent_id);
  const replies = comments.filter((c) => c.parent_id);

  if (!isLoggedIn) {
    return (
      <section className={styles.comments}>
        <h2 className={styles.h2}>Комментарии</h2>
        <p className={styles.muted}>Войди через Telegram, чтобы обсуждать материал.</p>
      </section>
    );
  }

  return (
    <section className={styles.comments}>
      <h2 className={styles.h2}>Комментарии</h2>
      {error && <p className={styles.authError}>{error}</p>}
      <div className={styles.commentForm}>
        <textarea
          className={styles.textarea}
          rows={3}
          placeholder={replyTo ? "Ответ…" : "Комментарий…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className={styles.formRow}>
          {replyTo && (
            <button type="button" className={styles.buttonGhost} onClick={() => setReplyTo(null)}>
              Отменить ответ
            </button>
          )}
          <button type="button" className={styles.buttonPrimary} onClick={() => void submit()}>
            Отправить
          </button>
        </div>
      </div>
      {loading ? (
        <p className={styles.muted}>Загрузка…</p>
      ) : (
        <ul className={styles.commentList}>
          {roots.map((c) => (
            <li key={c.id} className={styles.commentItem}>
              <div className={styles.commentHead}>
                <strong>{c.user.first_name}</strong>
                {c.user.username ? <span className={styles.muted}> @{c.user.username}</span> : null}
                <span className={styles.muted}> · {new Date(c.created_at).toLocaleString()}</span>
              </div>
              <p className={styles.commentBody}>{c.body}</p>
              <div className={styles.commentActions}>
                <button type="button" className={styles.linkBtn} onClick={() => setReplyTo(c.id)}>
                  Ответить
                </button>
                {currentUserId === c.user.id && (
                  <button type="button" className={styles.linkBtn} onClick={() => void remove(c.id)}>
                    Удалить
                  </button>
                )}
                <button
                  type="button"
                  className={c.my_reaction === "like" ? styles.reactionOn : styles.linkBtn}
                  onClick={() => void react(c.id, "like")}
                >
                  👍 {c.likes}
                </button>
                <button
                  type="button"
                  className={c.my_reaction === "dislike" ? styles.reactionOn : styles.linkBtn}
                  onClick={() => void react(c.id, "dislike")}
                >
                  👎 {c.dislikes}
                </button>
              </div>
              <ul className={styles.replyList}>
                {replies
                  .filter((r) => r.parent_id === c.id)
                  .map((r) => (
                    <li key={r.id} className={styles.replyItem}>
                      <div className={styles.commentHead}>
                        <strong>{r.user.first_name}</strong>
                        {r.user.username ? <span className={styles.muted}> @{r.user.username}</span> : null}
                        <span className={styles.muted}> · {new Date(r.created_at).toLocaleString()}</span>
                      </div>
                      <p className={styles.commentBody}>{r.body}</p>
                      <div className={styles.commentActions}>
                        {currentUserId === r.user.id && (
                          <button type="button" className={styles.linkBtn} onClick={() => void remove(r.id)}>
                            Удалить
                          </button>
                        )}
                        <button
                          type="button"
                          className={r.my_reaction === "like" ? styles.reactionOn : styles.linkBtn}
                          onClick={() => void react(r.id, "like")}
                        >
                          👍 {r.likes}
                        </button>
                        <button
                          type="button"
                          className={r.my_reaction === "dislike" ? styles.reactionOn : styles.linkBtn}
                          onClick={() => void react(r.id, "dislike")}
                        >
                          👎 {r.dislikes}
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
