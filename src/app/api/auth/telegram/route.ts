import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { TelegramAuthPayload, verifyTelegramPayload } from "@/lib/auth/telegram";
import { createSessionForUser, type TelegramUserRow, upsertTelegramUser } from "@/lib/auth/telegram-session";

type TelegramSendMessageResponse = {
  ok: boolean;
  description?: string;
};

type TelegramConfirmationResult = {
  sent: boolean;
  error?: string;
};

async function sendTelegramLoginConfirmation(botToken: string, telegramId: number): Promise<TelegramConfirmationResult> {
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
    if (!response.ok || !data.ok) {
      return {
        sent: false,
        error: data.description ?? `Telegram API request failed with status ${response.status}`,
      };
    }

    return { sent: true };
  } catch (error) {
    console.error("Failed to send Telegram login confirmation", error);
    return { sent: false, error: "Network error while sending Telegram confirmation" };
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

  const telegramConfirmation = await sendTelegramLoginConfirmation(botToken, payload.id);

  return NextResponse.json({
    ok: true,
    user,
    telegramConfirmationSent: telegramConfirmation.sent,
    telegramConfirmationError: telegramConfirmation.error ?? null,
  });
}
