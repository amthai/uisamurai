"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { getEditorExtensions } from "@/lib/content/tiptap-extensions";
import { canMoveBlockDown, canMoveBlockUp, moveBlockDown, moveBlockUp } from "@/lib/content/move-block";
import styles from "./admin-editor.module.css";

type Props = {
  label: string;
  value: JSONContent;
  onChange: (json: JSONContent) => void;
  placeholder?: string;
};

export function TiptapField({ label, value, onChange, placeholder }: Props) {
  const mounted = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [, toolbarTick] = useState(0);

  const editor = useEditor({
    extensions: getEditorExtensions(placeholder),
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getJSON());
    },
    onTransaction: () => {
      toolbarTick((n) => n + 1);
    },
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!editor || !mounted.current) return;
    const a = JSON.stringify(editor.getJSON());
    const b = JSON.stringify(value);
    if (a !== b) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  const onUploadPick = useCallback(async () => {
    fileRef.current?.click();
  }, []);

  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !editor) return;
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        editor.chain().focus().setImage({ src: data.url }).run();
      }
    },
    [editor],
  );

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = typeof window !== "undefined" ? window.prompt("URL ссылки", prev ?? "https://") : null;
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div>
        <label className={styles.label}>{label}</label>
        <div className={styles.editorOuter}>
          <p className={styles.editorInner}>Загрузка редактора…</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className={styles.label}>{label}</label>
      <div className={styles.editorOuter}>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={(e) => void onFile(e)} />
        <div className={styles.toolbar}>
          <button
            type="button"
            className={editor.isActive("bold") ? styles.toolbarBtnActive : styles.toolbarBtn}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            B
          </button>
          <button
            type="button"
            className={editor.isActive("italic") ? styles.toolbarBtnActive : styles.toolbarBtn}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            I
          </button>
          <button
            type="button"
            className={editor.isActive("heading", { level: 2 }) ? styles.toolbarBtnActive : styles.toolbarBtn}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            H2
          </button>
          <button
            type="button"
            className={editor.isActive("heading", { level: 3 }) ? styles.toolbarBtnActive : styles.toolbarBtn}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            H3
          </button>
          <button
            type="button"
            className={editor.isActive("bulletList") ? styles.toolbarBtnActive : styles.toolbarBtn}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            •
          </button>
          <button
            type="button"
            className={editor.isActive("orderedList") ? styles.toolbarBtnActive : styles.toolbarBtn}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1.
          </button>
          <button type="button" className={styles.toolbarBtn} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            «»
          </button>
          <button type="button" className={styles.toolbarBtn} onClick={() => setLink()}>
            Link
          </button>
          <button type="button" className={styles.toolbarBtn} onClick={() => void onUploadPick()}>
            Картинка
          </button>
          <span className={styles.toolbarSep} aria-hidden />
          <button
            type="button"
            className={styles.toolbarBtn}
            title="Переместить блок вверх"
            disabled={!canMoveBlockUp(editor)}
            onClick={() => moveBlockUp(editor)}
          >
            ↑
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            title="Переместить блок вниз"
            disabled={!canMoveBlockDown(editor)}
            onClick={() => moveBlockDown(editor)}
          >
            ↓
          </button>
        </div>
        <p className={styles.dragHint}>
          Маркер ⋮⋮ слева или кнопки ↑↓ — меняй порядок блоков (текст, заголовки, картинки).
        </p>
        <EditorContent editor={editor} className={styles.editorInner} />
      </div>
    </div>
  );
}
