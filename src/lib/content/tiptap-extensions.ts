import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { StarterKit } from "@tiptap/starter-kit";
import GlobalDragHandle from "tiptap-extension-global-drag-handle";

const baseExtensions = () => [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    bulletList: { HTMLAttributes: { class: "tiptap-bullet-list" } },
    orderedList: { HTMLAttributes: { class: "tiptap-ordered-list" } },
    blockquote: { HTMLAttributes: { class: "tiptap-blockquote" } },
  }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
  }),
  Image.configure({
    allowBase64: false,
    HTMLAttributes: { class: "tiptap-image" },
  }),
];

/** Серверный HTML и паритет с редактором (без Placeholder). */
export function getTiptapExtensions() {
  return baseExtensions();
}

/** Редактор в админке. */
export function getEditorExtensions(placeholder?: string) {
  const ph = placeholder
    ? Placeholder.configure({
        placeholder,
      })
    : null;
  const dragHandle = GlobalDragHandle.configure({
    dragHandleWidth: 20,
  });
  return ph ? [...baseExtensions(), ph, dragHandle] : [...baseExtensions(), dragHandle];
}
