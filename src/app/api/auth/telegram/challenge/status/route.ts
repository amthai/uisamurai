import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import {
  TELEGRAM_LOGIN_CHALLENGE_COOKIE_NAME,
  hashTelegramLoginNonce,
  isValidTelegramLoginNonce,
} from "@/lib/auth/telegram-login-challenge";
import { createSessionForUser, upsertTelegramUser } from "@/lib/auth/telegram-session";
import { supabaseServer } from "@/lib/supabase/server";

type LoginChallengeRow = {
  nonce_hash: string;
  telegram_id: number | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  photo_url: string | null;
  expires_at: string;
  consumed_at: string | null;
};

export async function GET() {
  const nonce = cookies().get(TELEGRAM_LOGIN_CHALLENGE_COOKIE_NAME)?.value;
  if (!nonce || !isValidTelegramLoginNonce(nonce)) {
    return NextResponse.json({ status: "idle" });
  }

  const nonceHash = hashTelegramLoginNonce(nonce);
  const { data: challenge, error: challengeError } = await supabaseServer
    .from("telegram_login_challenges")
    .select("nonce_hash, telegram_id, first_name, last_name, username, photo_url, expires_at, consumed_at")
    .eq("nonce_hash", nonceHash)
    .maybeSingle<LoginChallengeRow>();

  if (challengeError || !challenge) {
    cookies().set({
      name: TELEGRAM_LOGIN_CHALLENGE_COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });
    return NextResponse.json({ status: "idle" });
  }

  if (new Date(challenge.expires_at).getTime() <= Date.now()) {
    cookies().set({
      name: TELEGRAM_LOGIN_CHALLENGE_COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });
    return NextResponse.json({ status: "expired" });
  }

  if (!challenge.telegram_id) {
    return NextResponse.json({ status: "pending" });
  }

  if (challenge.consumed_at) {
    return NextResponse.json({ status: "consumed" });
  }

  const { data: consumedChallenge } = await supabaseServer
    .from("telegram_login_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("nonce_hash", challenge.nonce_hash)
    .is("consumed_at", null)
    .select("telegram_id, first_name, last_name, username, photo_url")
    .maybeSingle<Pick<LoginChallengeRow, "telegram_id" | "first_name" | "last_name" | "username" | "photo_url">>();

  if (!consumedChallenge?.telegram_id) {
    return NextResponse.json({ status: "pending" });
  }

  try {
    const user = await upsertTelegramUser({
      id: consumedChallenge.telegram_id,
      first_name: consumedChallenge.first_name ?? "Telegram User",
      last_name: consumedChallenge.last_name ?? null,
      username: consumedChallenge.username ?? null,
      photo_url: consumedChallenge.photo_url ?? null,
    });

    const session = await createSessionForUser(user.id);
    cookies().set({
      name: SESSION_COOKIE_NAME,
      value: session.token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: session.expiresAt,
    });

    cookies().set({
      name: TELEGRAM_LOGIN_CHALLENGE_COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });

    return NextResponse.json({
      status: "authenticated",
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        is_admin: user.is_admin,
      },
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Failed to finalize Telegram login";
    return NextResponse.json({ status: "error", error: "Failed to finalize Telegram login", details }, { status: 500 });
  }
}
