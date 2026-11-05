/**
 * Best-effort sliding-window rate limit, in memory.
 *
 * Per container, not global: each Pantheon/Next instance counts on its own and
 * a restart resets it, so N instances allow up to N x the limit. That is enough
 * to blunt a naive script hammering the signup form; it is not a security
 * boundary. The WordPress endpoint must rate-limit too (see
 * docs/newsletter-mailpoet.md and docs/contact-wordpress.md).
 *
 * Shared by every form route. Callers namespace the key (`newsletter:<ip>`,
 * `contact:<ip>`) so one form's traffic doesn't use up another's allowance.
 */

const hits = new Map<string, number[]>();
// Bound memory: an attacker rotating X-Forwarded-For values must not grow this forever.
const MAX_KEYS = 5_000;

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the oldest hit leaves the window (for Retry-After). */
  retryAfter: number;
}

export function checkRateLimit(
  key: string,
  now: number = Date.now(),
  limit = 5,
  windowMs = 60_000,
): RateLimitResult {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) };
  }
  recent.push(now);
  hits.set(key, recent);

  if (hits.size > MAX_KEYS) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= windowMs)) hits.delete(k);
    }
    // Still full of live keys: drop the oldest-inserted rather than grow.
    while (hits.size > MAX_KEYS) {
      const first = hits.keys().next().value;
      if (first === undefined) break;
      hits.delete(first);
    }
  }
  return { allowed: true, retryAfter: 0 };
}

export function resetRateLimit(): void {
  hits.clear();
}
