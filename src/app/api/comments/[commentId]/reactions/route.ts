import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { supabaseServer } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  context: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await context.params;
  if (!UUID_RE.test(commentId)) {
    return NextResponse.json({ error: "Invalid comment" }, { status: 400 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { type?: string };
  const type = body.type === "like" || body.type === "dislike" ? body.type : null;
  if (!type) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const { data: comment, error: cErr } = await supabaseServer
    .from("comments")
    .select("id, section_id, deleted_at")
    .eq("id", commentId)
    .maybeSingle<{ id: string; section_id: string; deleted_at: string | null }>();

  if (cErr || !comment || comment.deleted_at) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: section } = await supabaseServer
    .from("sections")
    .select("id")
    .eq("id", comment.section_id)
    .eq("is_published", true)
    .maybeSingle();

  if (!section) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: existing } = await supabaseServer
    .from("comment_reactions")
    .select("type")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .maybeSingle<{ type: string }>();

  if (existing?.type === type) {
    const { error: delErr } = await supabaseServer
      .from("comment_reactions")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", user.id);

    if (delErr) {
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, state: "removed" });
  }

  if (existing) {
    const { error: updErr } = await supabaseServer
      .from("comment_reactions")
      .update({ type })
      .eq("comment_id", commentId)
      .eq("user_id", user.id);

    if (updErr) {
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, state: "updated" });
  }

  const { error: insErr } = await supabaseServer.from("comment_reactions").insert({
    comment_id: commentId,
    user_id: user.id,
    type,
  });

  if (insErr) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, state: "set" });
}
