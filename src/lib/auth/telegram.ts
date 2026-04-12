import crypto from "crypto";

export type TelegramAuthPayload = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

const MAX_AUTH_AGE_SECONDS = 60 * 10;

function buildDataCheckString(payload: TelegramAuthPayload): string {
  const entries = Object.entries(payload)
    .filter(([key, value]) => key !== "hash" && value !== undefined && value !== null)
    .map(([key, value]) => [key, String(value)] as const)
    .sort(([a], [b]) => a.localeCompare(b));

  return entries.map(([key, value]) => `${key}=${value}`).join("\n");
}

export function verifyTelegramPayload(payload: TelegramAuthPayload, botToken: string): boolean {
  const secret = crypto.createHash("sha256").update(botToken).digest();
  const dataCheckString = buildDataCheckString(payload);
  const calculatedHash = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  if (calculatedHash !== payload.hash) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  const age = now - payload.auth_date;
  return age >= 0 && age <= MAX_AUTH_AGE_SECONDS;
}
