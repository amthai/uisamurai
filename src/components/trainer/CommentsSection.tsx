"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AuthModalLink } from "@/components/trainer/AuthModalLink";
import styles from "./trainer-shell.module.css";

const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

type CommentUser = {
  id: string;
  first_name: string;
  username: string | null;
};

type CommentAttachment = {
  url: string;
};

export type CommentItem = {
  id: string;
  section_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  attachments: CommentAttachment[];
  user: CommentUser;
  likes: number;
  dislikes: number;
  my_reaction: "like" | "dislike" | null;
};

type DraftAttachment = {
  id: string;
  file: File;
  previewUrl: string;
};

type Props = {
  sectionId: string;
  isLoggedIn: boolean;
  currentUserId: string | null;
};

const commentDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatCommentDate(dateIso: string): string {
  const date = new Date(dateIso);
  const parts = commentDateFormatter.formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = (parts.find((part) => part.type === "month")?.value ?? "").replace(".", "");
  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "";
  return `${day} ${month} ${hour}:${minute}`.trim();
}

const URL_RE = /((?:https?:\/\/|www\.)[^\s<]+)/gi;

function normalizeCommentUrl(rawUrl: string): string | null {
  const withProtocol = rawUrl.startsWith("www.") ? `https://${rawUrl}` : rawUrl;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function renderCommentBody(body: string): ReactNode {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  for (const match of body.matchAll(URL_RE)) {
    const full = match[0];
    const start = match.index ?? 0;
    const end = start + full.length;
    if (start > lastIndex) {
      nodes.push(body.slice(lastIndex, start));
    }
    const href = normalizeCommentUrl(full);
    if (href) {
      nodes.push(
        <a
          key={`${start}-${href}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className={styles.commentBodyLink}
        >
          {full}
        </a>,
      );
    } else {
      nodes.push(full);
    }
    lastIndex = end;
  }
  if (lastIndex < body.length) {
    nodes.push(body.slice(lastIndex));
  }
  return nodes;
}

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
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [galleryItems, setGalleryItems] = useState<string[] | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentsRef = useRef<DraftAttachment[]>([]);
  const reactionRequestIdRef = useRef(new Map<string, number>());

  const autoResizeTextarea = useCallback((node: HTMLTextAreaElement | null) => {
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
  }, []);

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

  useEffect(() => {
    autoResizeTextarea(textareaRef.current);
  }, [autoResizeTextarea, text]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(
    () => () => {
      for (const attachment of attachmentsRef.current) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    },
    [],
  );

  useEffect(() => {
    if (!galleryItems) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setGalleryItems(null);
        return;
      }
      if (event.key === "ArrowRight" && galleryItems.length > 1) {
        setGalleryIndex((prev) => (prev + 1) % galleryItems.length);
      }
      if (event.key === "ArrowLeft" && galleryItems.length > 1) {
        setGalleryIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [galleryItems]);

  const openGallery = (urls: string[], index = 0) => {
    setGalleryItems(urls);
    setGalleryIndex(index);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((attachment) => attachment.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((attachment) => attachment.id !== id);
    });
  };

  const onPickAttachments = (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files);
    if (selected.length === 0) return;

    const currentCount = attachmentsRef.current.length;
    const freeSlots = Math.max(0, MAX_ATTACHMENTS - currentCount);
    if (freeSlots === 0) {
      setError(`Можно прикрепить максимум ${MAX_ATTACHMENTS} картинок.`);
      return;
    }

    const accepted = selected.slice(0, freeSlots);
    const next: DraftAttachment[] = [];
    let nextError: string | null = null;

    for (const file of accepted) {
      if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
        nextError = "Можно прикреплять только PNG, JPG, GIF или WEBP.";
        continue;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        nextError = "Каждая картинка должна быть не больше 3 МБ.";
        continue;
      }
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (next.length > 0) {
      setAttachments((prev) => [...prev, ...next]);
    }

    if (selected.length > freeSlots) {
      setError(`Можно прикрепить максимум ${MAX_ATTACHMENTS} картинок.`);
    } else if (nextError) {
      setError(nextError);
    } else {
      setError(null);
    }
  };

  const submit = async () => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("body", trimmed);
      if (replyTo) {
        formData.set("parent_id", replyTo);
      }
      for (const attachment of attachments) {
        formData.append("attachments", attachment.file, attachment.file.name);
      }

      const res = await fetch(`/api/sections/${sectionId}/comments`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (res.status === 429) {
        const data = (await res.json()) as { retryAfterSec?: number };
        setError(`Слишком часто. Попробуй через ${data.retryAfterSec ?? 60} с.`);
        return;
      }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        if (data.error === "Invalid body") {
          setError("Текс коммента должен быть не более 8000 символов");
        } else {
          setError(data.error ?? "Ошибка отправки");
        }
        return;
      }
      const created = (await res.json()) as { id?: string };
      setText("");
      for (const attachment of attachmentsRef.current) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
      setAttachments([]);
      setReplyTo(null);
      await load({ silent: true });
      if (created.id) scrollToCommentNode(created.id);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Точно хотите удалить комментарий?")) return;
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) return;
    await load({ silent: true });
  };

  const react = async (commentId: string, type: "like" | "dislike") => {
    setComments((list) => patchCommentReactions(list, commentId, type));
    const requestId = (reactionRequestIdRef.current.get(commentId) ?? 0) + 1;
    reactionRequestIdRef.current.set(commentId, requestId);
    try {
      const res = await fetch(`/api/comments/${commentId}/reactions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok && reactionRequestIdRef.current.get(commentId) === requestId) {
        await load({ silent: true });
      }
    } catch {
      if (reactionRequestIdRef.current.get(commentId) === requestId) {
        await load({ silent: true });
      }
    }
  };

  const roots = comments.filter((c) => !c.parent_id);
  const replies = comments.filter((c) => c.parent_id);
  const replyTarget = replyTo ? comments.find((comment) => comment.id === replyTo) ?? null : null;

  if (!isLoggedIn) {
    return (
      <section className={styles.comments}>
        <h2 className={styles.h2}>Комменты</h2>
        <p className={styles.muted}>
          <AuthModalLink className={styles.inlineAuthLink}>Войдите</AuthModalLink>, чтобы видеть и писать комментарии
        </p>
      </section>
    );
  }

  return (
    <section className={styles.comments}>
      <h2 className={styles.h2}>Комменты</h2>
      {error && <p className={styles.authError}>{error}</p>}
      <div className={styles.commentForm}>
        <div className={styles.textareaWrap}>
          {replyTarget && (
            <div className={styles.replyBadge}>
              <span className={styles.replyBadgeText}>Ответ {replyTarget.user.first_name}</span>
              <button
                type="button"
                className={styles.replyBadgeClose}
                aria-label="Отменить ответ"
                onClick={() => setReplyTo(null)}
              >
                ×
              </button>
            </div>
          )}
          <textarea
            ref={textareaRef}
            className={`${styles.textarea} ${replyTarget ? styles.textareaWithReply : ""} ${styles.textareaWithTools}`}
            rows={3}
            placeholder="Напишите коммент..."
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              autoResizeTextarea(e.currentTarget);
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            multiple
            className={styles.attachInput}
            onChange={(e) => {
              onPickAttachments(e.currentTarget.files);
              e.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            className={styles.attachBtn}
            aria-label="Прикрепить изображение"
            onClick={() => fileInputRef.current?.click()}
          >
            <img src="/icons/comment-attach.svg" alt="" aria-hidden="true" className={styles.attachIcon} />
          </button>
          <button
            type="button"
            className={`${styles.buttonPrimary} ${styles.textareaSendBtn}`}
            disabled={submitting || (!text.trim() && attachments.length === 0)}
            onClick={() => void submit()}
          >
            {submitting ? "Отправка…" : "Отправить"}
          </button>
        </div>
        {attachments.length > 0 && (
          <ul className={styles.attachPreviewList}>
            {attachments.map((attachment) => (
              <li key={attachment.id} className={styles.attachPreviewItem}>
                <img
                  src={attachment.previewUrl}
                  alt="Предпросмотр вложения"
                  className={styles.attachPreviewImg}
                  loading="lazy"
                />
                <button
                  type="button"
                  className={styles.attachPreviewRemove}
                  aria-label="Убрать картинку"
                  onClick={() => removeAttachment(attachment.id)}
                >
                  <img src="/icons/comment-close.svg" alt="" aria-hidden="true" className={styles.attachPreviewRemoveIcon} />
                </button>
              </li>
            ))}
          </ul>
        )}
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
                <span className={styles.muted}> · {formatCommentDate(c.created_at)}</span>
              </div>
              {c.body ? <p className={styles.commentBody}>{renderCommentBody(c.body)}</p> : null}
              {c.attachments.length > 0 && (
                <button
                  type="button"
                  className={styles.commentAttachmentOne}
                  aria-label="Открыть вложение"
                  onClick={() => openGallery(c.attachments.map((attachment) => attachment.url))}
                >
                  <img
                    src={c.attachments[0]!.url}
                    alt="Вложение комментария"
                    className={styles.commentAttachmentImg}
                    loading="lazy"
                  />
                  {c.attachments.length > 1 && (
                    <span className={styles.commentAttachmentCounter}>+{c.attachments.length - 1}</span>
                  )}
                </button>
              )}
              <div className={styles.commentActions}>
                <button
                  type="button"
                  className={`${c.my_reaction === "like" ? styles.reactionOn : styles.linkBtn} ${styles.reactionBtn}`}
                  onClick={() => void react(c.id, "like")}
                  aria-label={c.my_reaction === "like" ? "Убрать лайк" : "Поставить лайк"}
                >
                  <span className={styles.reactionContent}>
                    <img
                      src={c.my_reaction === "like" ? "/heart-fill.svg" : "/heart-line.svg"}
                      alt=""
                      aria-hidden="true"
                      className={styles.reactionIcon}
                    />
                    {c.likes}
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.replyActionBtn}
                  onClick={() => {
                    setReplyTo(c.id);
                    textareaRef.current?.focus();
                  }}
                >
                  Ответить
                </button>
                {currentUserId === c.user.id && (
                  <button type="button" className={styles.replyActionBtn} onClick={() => void remove(c.id)}>
                    Удалить
                  </button>
                )}
              </div>
              <ul className={styles.replyList}>
                {replies
                  .filter((r) => r.parent_id === c.id)
                  .map((r) => (
                    <li key={r.id} id={`comment-${r.id}`} className={styles.replyItem}>
                      <div className={styles.commentHead}>
                        <strong>{r.user.first_name}</strong>
                        {r.user.username ? <span className={styles.muted}> @{r.user.username}</span> : null}
                        <span className={styles.muted}> · {formatCommentDate(r.created_at)}</span>
                      </div>
                      {r.body ? <p className={styles.commentBody}>{renderCommentBody(r.body)}</p> : null}
                      {r.attachments.length > 0 && (
                        <button
                          type="button"
                          className={styles.commentAttachmentOne}
                          aria-label="Открыть вложение"
                          onClick={() => openGallery(r.attachments.map((attachment) => attachment.url))}
                        >
                          <img
                            src={r.attachments[0]!.url}
                            alt="Вложение комментария"
                            className={styles.commentAttachmentImg}
                            loading="lazy"
                          />
                          {r.attachments.length > 1 && (
                            <span className={styles.commentAttachmentCounter}>+{r.attachments.length - 1}</span>
                          )}
                        </button>
                      )}
                      <div className={styles.commentActions}>
                        <button
                          type="button"
                          className={`${r.my_reaction === "like" ? styles.reactionOn : styles.linkBtn} ${styles.reactionBtn}`}
                          onClick={() => void react(r.id, "like")}
                          aria-label={r.my_reaction === "like" ? "Убрать лайк" : "Поставить лайк"}
                        >
                          <span className={styles.reactionContent}>
                            <img
                              src={r.my_reaction === "like" ? "/heart-fill.svg" : "/heart-line.svg"}
                              alt=""
                              aria-hidden="true"
                              className={styles.reactionIcon}
                            />
                            {r.likes}
                          </span>
                        </button>
                        {currentUserId === r.user.id && (
                          <button type="button" className={styles.replyActionBtn} onClick={() => void remove(r.id)}>
                            Удалить
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      {galleryItems && (
        <div className={styles.galleryOverlay} role="dialog" aria-modal="true" aria-label="Просмотр изображений">
          <button
            type="button"
            className={styles.galleryBackdrop}
            aria-label="Закрыть галерею"
            onClick={() => setGalleryItems(null)}
          />
          <div className={styles.galleryDialog}>
            <img
              src={galleryItems[galleryIndex] ?? ""}
              alt="Изображение комментария"
              className={styles.galleryImage}
            />
            <button
              type="button"
              className={styles.galleryClose}
              aria-label="Закрыть"
              onClick={() => setGalleryItems(null)}
            >
              <img src="/icons/comment-close.svg" alt="" aria-hidden="true" className={styles.galleryCloseIcon} />
            </button>
            {galleryItems.length > 1 && (
              <>
                <button
                  type="button"
                  className={`${styles.galleryNav} ${styles.galleryNavPrev}`}
                  aria-label="Предыдущее изображение"
                  onClick={() =>
                    setGalleryIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length)
                  }
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={`${styles.galleryNav} ${styles.galleryNavNext}`}
                  aria-label="Следующее изображение"
                  onClick={() => setGalleryIndex((prev) => (prev + 1) % galleryItems.length)}
                >
                  ›
                </button>
                <div className={styles.galleryCounter}>
                  {galleryIndex + 1}/{galleryItems.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
