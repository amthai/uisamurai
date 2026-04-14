"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

function patchCommentReactions(
  list: CommentItem[],
  commentId: string,
  type: "like" | "dislike",
): CommentItem[] {
  return list.map((c) => {
    if (c.id !== commentId) return c;
    const prev = c.my_reaction;
    let likes = c.likes;
    let dislikes = c.dislikes;
    let my: "like" | "dislike" | null = prev;

    if (prev === type) {
      if (type === "like") likes = Math.max(0, likes - 1);
      else dislikes = Math.max(0, dislikes - 1);
      my = null;
    } else if (prev === "like" || prev === "dislike") {
      if (type === "like") {
        likes += 1;
        if (prev === "dislike") dislikes = Math.max(0, dislikes - 1);
      } else {
        dislikes += 1;
        if (prev === "like") likes = Math.max(0, likes - 1);
      }
      my = type;
    } else {
      if (type === "like") likes += 1;
      else dislikes += 1;
      my = type;
    }
    return { ...c, likes, dislikes, my_reaction: my };
  });
}

function scrollToCommentNode(id: string) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.getElementById(`comment-${id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  });
}

export function CommentsSection({ sectionId, isLoggedIn, currentUserId }: Props) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(isLoggedIn);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reactionPending = useRef(new Set<string>());

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!isLoggedIn) return;
      const silent = opts?.silent ?? false;
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await fetch(`/api/sections/${sectionId}/comments`, { credentials: "include" });
        if (!res.ok) {
          if (!silent) setError("Не удалось загрузить комментарии");
          return;
        }
        const data = (await res.json()) as { comments: CommentItem[] };
        setComments(data.comments);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [isLoggedIn, sectionId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
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
      const created = (await res.json()) as { id?: string };
      setText("");
      setReplyTo(null);
      await load({ silent: true });
      if (created.id) scrollToCommentNode(created.id);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) return;
    await load({ silent: true });
  };

  const react = async (commentId: string, type: "like" | "dislike") => {
    if (reactionPending.current.has(commentId)) return;
    const snapshot = comments.map((c) => ({
      ...c,
      user: { ...c.user },
    }));
    setComments((list) => patchCommentReactions(list, commentId, type));
    reactionPending.current.add(commentId);
    try {
      const res = await fetch(`/api/comments/${commentId}/reactions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) {
        setComments(snapshot);
      }
    } catch {
      setComments(snapshot);
    } finally {
      reactionPending.current.delete(commentId);
    }
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
          <button
            type="button"
            className={styles.buttonPrimary}
            disabled={submitting || !text.trim()}
            onClick={() => void submit()}
          >
            {submitting ? "Отправка…" : "Отправить"}
          </button>
        </div>
      </div>
      {loading ? (
        <div className={styles.commentSkeletonList} aria-busy="true" aria-label="Загрузка комментариев">
          <div className={styles.commentSkeleton} />
          <div className={styles.commentSkeleton} />
          <div className={styles.commentSkeleton} />
        </div>
      ) : (
        <ul className={styles.commentList}>
          {roots.length === 0 ? (
            <li className={styles.commentEmpty}>Пока нет комментариев — будь первым.</li>
          ) : null}
          {roots.map((c) => (
            <li key={c.id} id={`comment-${c.id}`} className={styles.commentItem}>
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
                    <li key={r.id} id={`comment-${r.id}`} className={styles.replyItem}>
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
