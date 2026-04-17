import { NextResponse } from "next/server";
import { hashTelegramLoginNonce, parseTelegramStartLoginNonce } from "@/lib/auth/telegram-login-challenge";
import { supabaseServer } from "@/lib/supabase/server";

type TelegramWebhookUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type TelegramWebhookMessage = {
  text?: string;
  chat?: {
    id: number;
    type?: string;
  };
  from?: TelegramWebhookUser;
};

type TelegramWebhookUpdate = {
  message?: TelegramWebhookMessage;
};

async function sendLoginAcknowledgement(botToken: string, chatId: number) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "Вход подтвержден. Вернитесь на сайт UISamurai, авторизация завершится автоматически.",
      }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Failed to send Telegram login acknowledgement", error);
  }
}

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: "TELEGRAM_WEBHOOK_SECRET is not configured" }, { status: 500 });
  }

  const providedSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized webhook request" }, { status: 401 });
  }

  const update = (await request.json()) as TelegramWebhookUpdate;
  const message = update.message;
  const text = message?.text;
  if (!text) {
    return NextResponse.json({ ok: true });
  }

  const nonce = parseTelegramStartLoginNonce(text);
  const from = message.from;
  if (!nonce || !from?.id) {
    return NextResponse.json({ ok: true });
  }

  const nonceHash = hashTelegramLoginNonce(nonce);
  await supabaseServer
    .from("telegram_login_challenges")
    .update({
      telegram_id: from.id,
      first_name: from.first_name ?? null,
      last_name: from.last_name ?? null,
      username: from.username ?? null,
      confirmed_at: new Date().toISOString(),
    })
    .eq("nonce_hash", nonceHash)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString());

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = message.chat?.id;
  if (botToken && typeof chatId === "number") {
    await sendLoginAcknowledgement(botToken, chatId);
  }

  return NextResponse.json({ ok: true });
}
