import { createSessionForUser } from "@/lib/auth/telegram-session";
import { buildYandexAvatarUrl, type YandexUserProfile } from "@/lib/auth/yandex";
import { supabaseServer } from "@/lib/supabase/server";

export type YandexUserRow = {
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

export async function upsertYandexUser(profile: YandexUserProfile): Promise<YandexUserRow> {
  const firstName = profile.first_name?.trim() || profile.display_name?.trim() || profile.login?.trim() || "Yandex";
  const userData = {
    yandex_id: profile.id,
    yandex_login: profile.login ?? null,
    yandex_email: profile.default_email ?? null,
    first_name: firstName,
    last_name: profile.last_name ?? null,
    username: profile.login ?? null,
    photo_url: buildYandexAvatarUrl(profile.default_avatar_id),
    auth_provider: "yandex" as const,
  };

  const { data: user, error } = await supabaseServer
    .from("users")
    .upsert(userData, { onConflict: "yandex_id" })
    .select("id, telegram_id, yandex_id, first_name, last_name, username, photo_url, is_admin, auth_provider")
    .single<YandexUserRow>();

  if (error || !user) {
    throw new Error(error?.message ?? "Failed to upsert Yandex user in users table");
  }

  return user;
}

export { createSessionForUser };

