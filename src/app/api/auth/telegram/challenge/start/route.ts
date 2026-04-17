import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  TELEGRAM_LOGIN_CHALLENGE_COOKIE_NAME,
  buildTelegramLoginStartUrl,
  generateTelegramLoginNonce,
  getTelegramLoginChallengeExpiryDate,
  hashTelegramLoginNonce,
} from "@/lib/auth/telegram-login-challenge";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST() {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  if (!botUsername) {
    return NextResponse.json({ error: "NEXT_PUBLIC_TELEGRAM_BOT_USERNAME is not configured" }, { status: 500 });
  }

  const nonce = generateTelegramLoginNonce();
  const nonceHash = hashTelegramLoginNonce(nonce);
  const expiresAt = getTelegramLoginChallengeExpiryDate();

  const { error } = await supabaseServer.from("telegram_login_challenges").insert({
    nonce_hash: nonceHash,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return NextResponse.json(
      {
        error: "Failed to create Telegram login challenge",
        details: error.message,
      },
      { status: 500 },
    );
  }

  cookies().set({
    name: TELEGRAM_LOGIN_CHALLENGE_COOKIE_NAME,
    value: nonce,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return NextResponse.json({ ok: true, authUrl: buildTelegramLoginStartUrl(botUsername, nonce), expiresAt: expiresAt.toISOString() });
}
