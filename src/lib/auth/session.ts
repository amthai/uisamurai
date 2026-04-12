import crypto from "crypto";

export const SESSION_COOKIE_NAME = "uisamurai_session";
const SESSION_TTL_DAYS = 30;

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getSessionExpiryDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + SESSION_TTL_DAYS);
  return date;
}
