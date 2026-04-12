import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { rateLimitComment } from "@/lib/rate-limit";
import { supabaseServer } from "@/lib/supabase/server";

const MAX_BODY = 8000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CommentRow = {
  id: string;
  section_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  user: {
    id: string;
    first_name: string;
    username: string | null;
  };
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ sectionId: string }> },
) {
  const { sectionId } = await context.params;
  if (!UUID_RE.test(sectionId)) {
    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: section, error: secErr } = await supabaseServer
    .from("sections")
    .select("id")
    .eq("id", sectionId)
    .eq("is_published", true)
    .maybeSingle();

  if (secErr || !section) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  const { data: rows, error } = await supabaseServer
    .from("comments")
    .select(
      "id, section_id, parent_id, body, created_at, user:users(id, first_name, username)",
    )
    .eq("section_id", sectionId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error || !rows) {
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }

  const normalized: CommentRow[] = (rows as unknown as Array<
    Omit<CommentRow, "user"> & {
      user: CommentRow["user"] | CommentRow["user"][];
    }
  >).map((row) => ({
    ...row,
    user: Array.isArray(row.user) ? row.user[0]! : row.user,
  }));

  const ids = normalized.map((c) => c.id);
  if (ids.length === 0) {
    return NextResponse.json({ comments: [] });
  }

  const { data: reactions } = await supabaseServer
    .from("comment_reactions")
    .select("comment_id, type, user_id")
    .in("comment_id", ids);

  const likes = new Map<string, number>();
  const dislikes = new Map<string, number>();
  const my = new Map<string, "like" | "dislike">();

  for (const r of reactions ?? []) {
    const id = r.comment_id as string;
    if (r.type === "like") {
      likes.set(id, (likes.get(id) ?? 0) + 1);
    } else {
      dislikes.set(id, (dislikes.get(id) ?? 0) + 1);
    }
    if (r.user_id === user.id) {
      my.set(id, r.type as "like" | "dislike");
    }
  }

  const comments = normalized.map((c) => ({
    id: c.id,
    section_id: c.section_id,
    parent_id: c.parent_id,
    body: c.body,
    created_at: c.created_at,
    user: c.user,
    likes: likes.get(c.id) ?? 0,
    dislikes: dislikes.get(c.id) ?? 0,
    my_reaction: my.get(c.id) ?? null,
  }));

  return NextResponse.json({ comments });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ sectionId: string }> },
) {
  const { sectionId } = await context.params;
  if (!UUID_RE.test(sectionId)) {
    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimitComment(user.id);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limit", retryAfterSec: limited.retryAfterSec }, { status: 429 });
  }

  const bodyJson = (await request.json()) as { body?: string; parent_id?: string | null };
  const text = typeof bodyJson.body === "string" ? bodyJson.body.trim() : "";
  if (!text || text.length > MAX_BODY) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parentId =
    bodyJson.parent_id === undefined || bodyJson.parent_id === null
      ? null
      : typeof bodyJson.parent_id === "string"
        ? bodyJson.parent_id
        : null;

  if (parentId && !UUID_RE.test(parentId)) {
    return NextResponse.json({ error: "Invalid parent" }, { status: 400 });
  }

  const { data: section, error: secErr } = await supabaseServer
    .from("sections")
    .select("id")
    .eq("id", sectionId)
    .eq("is_published", true)
    .maybeSingle();

  if (secErr || !section) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  if (parentId) {
    const { data: parent } = await supabaseServer
      .from("comments")
      .select("id, section_id, parent_id")
      .eq("id", parentId)
      .is("deleted_at", null)
      .maybeSingle<{ id: string; section_id: string; parent_id: string | null }>();

    if (!parent || parent.section_id !== sectionId || parent.parent_id !== null) {
      return NextResponse.json({ error: "Invalid parent comment" }, { status: 400 });
    }
  }

  const { data: inserted, error: insErr } = await supabaseServer
    .from("comments")
    .insert({
      section_id: sectionId,
      user_id: user.id,
      parent_id: parentId,
      body: text,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: inserted.id as string });
}
