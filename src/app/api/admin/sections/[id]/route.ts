import { NextResponse } from "next/server";
import type { JSONContent } from "@tiptap/core";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { EMPTY_TIPTAP_DOC } from "@/lib/content/empty-doc";
import { isValidSectionSlug } from "@/lib/slug";
import { supabaseServer } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseDoc(raw: unknown): JSONContent {
  if (raw && typeof raw === "object" && (raw as JSONContent).type === "doc") {
    return raw as JSONContent;
  }
  return EMPTY_TIPTAP_DOC;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { data, error } = await supabaseServer.from("sections").select("*").eq("id", id).maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ section: data });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const json = (await request.json()) as {
    slug?: string;
    title?: string;
    nav_title?: string | null;
    seo_title?: string | null;
    sort_order?: number;
    is_published?: boolean;
    body?: unknown;
    assignment?: unknown;
    meta_description?: string | null;
  };

  const patch: Record<string, unknown> = {};

  if (json.slug !== undefined) {
    const slug = typeof json.slug === "string" ? json.slug.trim() : "";
    if (!isValidSectionSlug(slug)) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }
    patch.slug = slug;
  }
  if (json.title !== undefined) {
    const title = typeof json.title === "string" ? json.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "Invalid title" }, { status: 400 });
    }
    patch.title = title;
  }
  if (json.nav_title !== undefined) {
    patch.nav_title = typeof json.nav_title === "string" ? json.nav_title.trim() || null : null;
  }
  if (json.seo_title !== undefined) {
    patch.seo_title = typeof json.seo_title === "string" ? json.seo_title.trim() || null : null;
  }
  if (json.sort_order !== undefined) {
    if (typeof json.sort_order !== "number" || !Number.isFinite(json.sort_order)) {
      return NextResponse.json({ error: "Invalid sort_order" }, { status: 400 });
    }
    patch.sort_order = json.sort_order;
  }
  if (json.is_published !== undefined) {
    patch.is_published = Boolean(json.is_published);
  }
  if (json.body !== undefined) {
    patch.body = parseDoc(json.body);
  }
  if (json.assignment !== undefined) {
    patch.assignment = parseDoc(json.assignment);
  }
  if (json.meta_description !== undefined) {
    patch.meta_description =
      typeof json.meta_description === "string" ? json.meta_description.slice(0, 500) : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Empty patch" }, { status: 400 });
  }

  const { error } = await supabaseServer.from("sections").update(patch).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { error } = await supabaseServer.from("sections").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
