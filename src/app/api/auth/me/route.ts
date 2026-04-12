import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, hashSessionToken } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";

type UserRow = {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name: string | null;
  username: string | null;
  photo_url: string | null;
  is_admin: boolean;
};

export async function GET() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ user: null });
  }

  const tokenHash = hashSessionToken(token);

  const { data: session, error } = await supabaseServer
    .from("sessions")
    .select(
      "id, expires_at, user:users(id, telegram_id, first_name, last_name, username, photo_url, is_admin)",
    )
    .eq("token_hash", tokenHash)
    .single<{ expires_at: string; user: UserRow }>();

  if (error || !session) {
    return NextResponse.json({ user: null });
  }

  const isExpired = new Date(session.expires_at).getTime() < Date.now();
  if (isExpired) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: session.user });
}
