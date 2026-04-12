import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { supabaseServer } from "@/lib/supabase/server";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const type = file.type || "application/octet-stream";
  if (!ALLOWED.has(type)) {
    return NextResponse.json({ error: "Unsupported type" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const ext =
    type === "image/png"
      ? "png"
      : type === "image/jpeg"
        ? "jpg"
        : type === "image/gif"
          ? "gif"
          : "webp";

  const path = `sections/${randomUUID()}.${ext}`;

  const { error: upErr } = await supabaseServer.storage.from("content-images").upload(path, buf, {
    contentType: type,
    upsert: false,
  });

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data } = supabaseServer.storage.from("content-images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
