import { generateSessionToken, getSessionExpiryDate, hashSessionToken } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";

export type TelegramIdentity = {
  id: number;
  first_name: string;
  last_name?: string | null;
  username?: string | null;
  photo_url?: string | null;
};

export type TelegramUserRow = {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name: string | null;
  username: string | null;
  photo_url: string | null;
  is_admin: boolean;
};

export async function upsertTelegramUser(identity: TelegramIdentity): Promise<TelegramUserRow> {
  const userData = {
    telegram_id: identity.id,
    first_name: identity.first_name,
    last_name: identity.last_name ?? null,
    username: identity.username ?? null,
    photo_url: identity.photo_url ?? null,
  };

  const { data: user, error } = await supabaseServer
    .from("users")
    .upsert(userData, { onConflict: "telegram_id" })
    .select("id, telegram_id, first_name, last_name, username, photo_url, is_admin")
    .single<TelegramUserRow>();

  if (error || !user) {
    throw new Error(error?.message ?? "Failed to upsert user in users table");
  }

  return user;
}

export async function createSessionForUser(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = getSessionExpiryDate();

  const { error } = await supabaseServer.from("sessions").insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  return { token, expiresAt };
}
