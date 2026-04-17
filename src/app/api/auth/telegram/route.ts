import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { TelegramAuthPayload, verifyTelegramPayload } from "@/lib/auth/telegram";
import { createSessionForUser, type TelegramUserRow, upsertTelegramUser } from "@/lib/auth/telegram-session";

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

  let user: TelegramUserRow;
  let token: string;
  let expiresAt: Date;
  try {
    user = await upsertTelegramUser(payload);
    const session = await createSessionForUser(user.id);
    token = session.token;
    expiresAt = session.expiresAt;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete Telegram auth";
    return NextResponse.json(
      {
        error: "Failed to complete Telegram auth",
        details: message,
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

  return NextResponse.json({
    ok: true,
    user,
  });
}
