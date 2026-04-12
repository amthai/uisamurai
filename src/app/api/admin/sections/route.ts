import { NextResponse } from "next/server";
import type { JSONContent } from "@tiptap/core";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { EMPTY_TIPTAP_DOC } from "@/lib/content/empty-doc";
import { isValidSectionSlug } from "@/lib/slug";
import { supabaseServer } from "@/lib/supabase/server";

function parseDoc(raw: unknown): JSONContent {
  if (raw && typeof raw === "object" && (raw as JSONContent).type === "doc") {
    return raw as JSONContent;
  }
  return EMPTY_TIPTAP_DOC;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseServer
    .from("sections")
    .select("id, slug, title, sort_order, is_published, created_at, updated_at")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sections: data ?? [] });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = (await request.json()) as {
    slug?: string;
    title?: string;
    sort_order?: number;
    is_published?: boolean;
    body?: unknown;
    assignment?: unknown;
    meta_description?: string | null;
  };

  const slug = typeof json.slug === "string" ? json.slug.trim() : "";
  const title = typeof json.title === "string" ? json.title.trim() : "";
  if (!isValidSectionSlug(slug) || !title) {
    return NextResponse.json({ error: "Invalid slug or title" }, { status: 400 });
  }

  const sort_order = typeof json.sort_order === "number" && Number.isFinite(json.sort_order) ? json.sort_order : 0;
  const is_published = Boolean(json.is_published);
  const body = parseDoc(json.body);
  const assignment = parseDoc(json.assignment);
  const meta_description =
    typeof json.meta_description === "string" ? json.meta_description.slice(0, 500) : null;

  const { data, error } = await supabaseServer
    .from("sections")
    .insert({
      slug,
      title,
      sort_order,
      is_published,
      body,
      assignment,
      meta_description,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.id as string });
}
