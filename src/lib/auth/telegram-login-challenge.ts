import crypto from "crypto";

export const TELEGRAM_LOGIN_CHALLENGE_COOKIE_NAME = "uisamurai_tg_login_challenge";
export const TELEGRAM_LOGIN_CHALLENGE_TTL_SECONDS = 60 * 5;

const TELEGRAM_LOGIN_NONCE_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;
const TELEGRAM_START_LOGIN_PATTERN = /^\/start(?:@\w+)?\s+login_([A-Za-z0-9_-]{32,128})$/i;

export function generateTelegramLoginNonce(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashTelegramLoginNonce(nonce: string): string {
  return crypto.createHash("sha256").update(nonce).digest("hex");
}

export function isValidTelegramLoginNonce(nonce: string): boolean {
  return TELEGRAM_LOGIN_NONCE_PATTERN.test(nonce);
}

export function parseTelegramStartLoginNonce(text: string): string | null {
  const normalized = text.trim();
  const match = TELEGRAM_START_LOGIN_PATTERN.exec(normalized);
  if (!match) {
    return null;
  }

  const nonce = match[1];
  return isValidTelegramLoginNonce(nonce) ? nonce : null;
}

export function getTelegramLoginChallengeExpiryDate(): Date {
  return new Date(Date.now() + TELEGRAM_LOGIN_CHALLENGE_TTL_SECONDS * 1000);
}

export function buildTelegramLoginStartUrl(botUsername: string, nonce: string): string {
  return `https://t.me/${botUsername}?start=login_${encodeURIComponent(nonce)}`;
}
