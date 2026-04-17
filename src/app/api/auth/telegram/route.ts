import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, generateSessionToken, getSessionExpiryDate, hashSessionToken } from "@/lib/auth/session";
import { TelegramAuthPayload, verifyTelegramPayload } from "@/lib/auth/telegram";
import { supabaseServer } from "@/lib/supabase/server";

type UserRow = {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name: string | null;
  username: string | null;
  photo_url: string | null;
};

type TelegramSendMessageResponse = {
  ok: boolean;
  description?: string;
};

async function sendTelegramLoginConfirmation(botToken: string, telegramId: number): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramId,
        text: "Вход в UISamurai подтвержден. Если это были не вы, смените пароль в Telegram и отзовите доступ бота.",
      }),
      cache: "no-store",
    });

    const data = (await response.json()) as TelegramSendMessageResponse;
    return response.ok && data.ok;
  } catch (error) {
    console.error("Failed to send Telegram login confirmation", error);
    return false;
  }
}

export async function POST(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN is not configured" }, { status: 500 });
  }

  const payload = (await request.json()) as TelegramAuthPayload;
  if (!payload?.id || !payload?.first_name || !payload?.auth_date || !payload?.hash) {
    return NextResponse.json({ error: "Invalid Telegram auth payload" }, { status: 400 });
  }

  const isValid = verifyTelegramPayload(payload, botToken);
  if (!isValid) {
    return NextResponse.json({ error: "Telegram auth verification failed" }, { status: 401 });
  }

  const userData = {
    telegram_id: payload.id,
    first_name: payload.first_name,
    last_name: payload.last_name ?? null,
    username: payload.username ?? null,
    photo_url: payload.photo_url ?? null,
  };

  const { data: user, error: userError } = await supabaseServer
    .from("users")
    .upsert(userData, { onConflict: "telegram_id" })
    .select("id, telegram_id, first_name, last_name, username, photo_url")
    .single<UserRow>();

  if (userError || !user) {
    return NextResponse.json(
      {
        error: "Failed to upsert user in users table",
        details: userError?.message,
      },
      { status: 500 },
    );
  }

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = getSessionExpiryDate();

  const { error: sessionError } = await supabaseServer.from("sessions").insert({
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });

  if (sessionError) {
    return NextResponse.json(
      {
        error: "Failed to create session in sessions table",
        details: sessionError.message,
      },
      { status: 500 },
    );
  }

  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  const telegramConfirmationSent = await sendTelegramLoginConfirmation(botToken, payload.id);

  return NextResponse.json({ ok: true, user, telegramConfirmationSent });
}
