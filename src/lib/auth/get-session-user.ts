import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, hashSessionToken } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  telegram_id: number | null;
  yandex_id: string | null;
  first_name: string;
  last_name: string | null;
  username: string | null;
  photo_url: string | null;
  is_admin: boolean;
  auth_provider: "telegram" | "yandex";
};

type UserRow = SessionUser;

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);

  const { data: session, error } = await supabaseServer
    .from("sessions")
    .select(
      "id, expires_at, user:users(id, telegram_id, yandex_id, first_name, last_name, username, photo_url, is_admin, auth_provider)",
    )
    .eq("token_hash", tokenHash)
    .single<{ expires_at: string; user: UserRow }>();

  if (error || !session) {
    return null;
  }

  if (new Date(session.expires_at).getTime() < Date.now()) {
    return null;
  }

  return session.user;
}
