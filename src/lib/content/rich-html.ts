import { generateHTML } from "@tiptap/html/server";
import type { JSONContent } from "@tiptap/core";
import sanitizeHtml from "sanitize-html";
import { getTiptapExtensions } from "@/lib/content/tiptap-extensions";

const extensions = getTiptapExtensions();

export function tiptapJsonToHtml(doc: JSONContent | null | undefined): string {
  const safeDoc: JSONContent =
    doc && typeof doc === "object" && doc.type === "doc"
      ? doc
      : { type: "doc", content: [{ type: "paragraph" }] };
  const raw = generateHTML(safeDoc, extensions);
  return sanitizeHtml(raw, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "h1",
      "h2",
      "h3",
      "img",
      "span",
      "del",
      "ins",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      p: ["class", "data-type"],
      img: ["src", "alt", "title", "class", "width", "height", "data-type"],
      a: ["href", "name", "target", "rel", "class"],
      code: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
  });
}
