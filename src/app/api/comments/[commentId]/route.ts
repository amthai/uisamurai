import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { supabaseServer } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(
  _request: Request,
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

  const { data: row, error: fetchErr } = await supabaseServer
    .from("comments")
    .select("id, user_id")
    .eq("id", commentId)
    .is("deleted_at", null)
    .maybeSingle<{ id: string; user_id: string }>();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (row.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: delErr } = await supabaseServer
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId);

  if (delErr) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
