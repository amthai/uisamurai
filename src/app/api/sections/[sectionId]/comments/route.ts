import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { rateLimitComment } from "@/lib/rate-limit";
import { supabaseServer } from "@/lib/supabase/server";

const MAX_BODY = 8000;
const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const ATTACHMENTS_BUCKET = "content-images";
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CommentAttachment = {
  url: string;
};

type CommentRow = {
  id: string;
  section_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  attachments: CommentAttachment[];
  user: {
    id: string;
    first_name: string;
    username: string | null;
  };
};

type CommentAttachmentRow = {
  comment_id: string;
  public_url: string;
  sort_order: number;
};

function getImageExt(mimeType: string): string | null {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/gif") return "gif";
  if (mimeType === "image/webp") return "webp";
  return null;
}

async function cleanupUploaded(paths: string[]) {
  if (paths.length === 0) return;
  await supabaseServer.storage.from(ATTACHMENTS_BUCKET).remove(paths);
}

type ParsedInput = {
  text: string;
  parentIdRaw: string | null;
  attachments: File[];
};

async function parseRequestInput(request: Request): Promise<ParsedInput> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const bodyRaw = formData.get("body");
    const parentRaw = formData.get("parent_id");
    const attachments = formData.getAll("attachments").filter((entry): entry is File => entry instanceof File);
    return {
      text: typeof bodyRaw === "string" ? bodyRaw.trim() : "",
      parentIdRaw: typeof parentRaw === "string" ? parentRaw : null,
      attachments,
    };
  }

  const bodyJson = (await request.json()) as {
    body?: string;
    parent_id?: string | null;
  };

  return {
    text: typeof bodyJson.body === "string" ? bodyJson.body.trim() : "",
    parentIdRaw: typeof bodyJson.parent_id === "string" ? bodyJson.parent_id : null,
    attachments: [],
  };
}

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

  const { data: attachmentRows } = await supabaseServer
    .from("comment_attachments")
    .select("comment_id, public_url, sort_order")
    .in("comment_id", ids)
    .order("sort_order", { ascending: true });

  const attachmentsByComment = new Map<string, CommentAttachment[]>();
  for (const row of (attachmentRows as CommentAttachmentRow[] | null) ?? []) {
    const existing = attachmentsByComment.get(row.comment_id) ?? [];
    existing.push({ url: row.public_url });
    attachmentsByComment.set(row.comment_id, existing);
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
    attachments: attachmentsByComment.get(c.id) ?? [],
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

  const { text, parentIdRaw, attachments } = await parseRequestInput(request);
  if (text.length > MAX_BODY) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!text && attachments.length === 0) {
    return NextResponse.json({ error: "Empty comment" }, { status: 400 });
  }
  if (attachments.length > MAX_ATTACHMENTS) {
    return NextResponse.json({ error: "Too many attachments" }, { status: 400 });
  }
  for (const attachment of attachments) {
    if (!ALLOWED_IMAGE_TYPES.has(attachment.type)) {
      return NextResponse.json({ error: "Unsupported attachment type" }, { status: 400 });
    }
    if (attachment.size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json({ error: "Attachment too large" }, { status: 400 });
    }
  }

  const parentId =
    parentIdRaw === undefined || parentIdRaw === null || parentIdRaw === "" ? null : parentIdRaw;

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

  const uploadedPaths: string[] = [];
  if (attachments.length > 0) {
    const rowsToInsert: Array<{
      comment_id: string;
      storage_bucket: string;
      storage_path: string;
      public_url: string;
      mime_type: string;
      size_bytes: number;
      sort_order: number;
    }> = [];

    for (let index = 0; index < attachments.length; index += 1) {
      const attachment = attachments[index]!;
      const ext = getImageExt(attachment.type);
      if (!ext) {
        await cleanupUploaded(uploadedPaths);
        await supabaseServer.from("comments").delete().eq("id", inserted.id);
        return NextResponse.json({ error: "Unsupported attachment type" }, { status: 400 });
      }

      const bytes = Buffer.from(await attachment.arrayBuffer());
      const storagePath = `comments/${inserted.id}/${randomUUID()}.${ext}`;
      const { error: uploadError } = await supabaseServer.storage.from(ATTACHMENTS_BUCKET).upload(storagePath, bytes, {
        contentType: attachment.type,
        upsert: false,
      });
      if (uploadError) {
        await cleanupUploaded(uploadedPaths);
        await supabaseServer.from("comments").delete().eq("id", inserted.id);
        return NextResponse.json({ error: "Failed to upload attachments" }, { status: 500 });
      }

      uploadedPaths.push(storagePath);
      const { data: urlData } = supabaseServer.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(storagePath);
      rowsToInsert.push({
        comment_id: inserted.id as string,
        storage_bucket: ATTACHMENTS_BUCKET,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        mime_type: attachment.type,
        size_bytes: bytes.length,
        sort_order: index,
      });
    }

    const { error: attachErr } = await supabaseServer.from("comment_attachments").insert(rowsToInsert);
    if (attachErr) {
      await cleanupUploaded(uploadedPaths);
      await supabaseServer.from("comments").delete().eq("id", inserted.id);
      return NextResponse.json({ error: "Failed to save attachments" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, id: inserted.id as string });
}
