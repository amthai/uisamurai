const WINDOW_MS = 60_000;
const MAX_IN_WINDOW = 10;

const buckets = new Map<string, number[]>();

export function rateLimitComment(userId: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const prev = buckets.get(userId) ?? [];
  const recent = prev.filter((t) => t > windowStart);
  if (recent.length >= MAX_IN_WINDOW) {
    const oldest = recent[0];
    const retryAfterMs = oldest + WINDOW_MS - now;
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }
  recent.push(now);
  buckets.set(userId, recent);
  return { ok: true };
}
