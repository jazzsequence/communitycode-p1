import { NextResponse, type NextRequest } from "next/server";
import { getConfig } from "@/lib/config";
import { checkRateLimit } from "./rate-limit";

/**
 * POST /api/newsletter   { email, firstName?, website? }
 *
 * The newsletter is MailPoet on the WordPress site, which has no public
 * subscribe endpoint. This route validates, then forwards server-side to a
 * small endpoint the WordPress side provides (NEWSLETTER_ENDPOINT) with a
 * shared secret. The contract is in docs/newsletter-mailpoet.md.
 *
 * It never pretends: with no endpoint configured it answers 501, not success.
 * The only "silent success" is the honeypot, which is for bots.
 */

const MAX_BODY_BYTES = 2_048;
const UPSTREAM_TIMEOUT_MS = 8_000;
const MAX_EMAIL = 254;
const MAX_FIRST_NAME = 80;
// Deliberately loose: the real check is MailPoet's confirmation email.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const NO_STORE = { "Cache-Control": "no-store" };

function reply(body: Record<string, unknown>, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

function clientIp(req: NextRequest): string {
  // Behind Pantheon's edge the first X-Forwarded-For hop is the client. It is
  // client-controllable if the edge doesn't overwrite it, which is one more
  // reason this limiter is only best-effort.
  const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return xff || req.headers.get("x-real-ip") || "unknown";
}

/** Read the body but stop at the cap, so a huge POST isn't buffered whole. */
async function readCapped(req: NextRequest, max: number): Promise<string | null> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) return null;
  if (!req.body) return "";
  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > max) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

function upstreamUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return reply({ error: "Send JSON." }, 415);
  }

  // Before parsing: rejected floods shouldn't cost anything.
  const limit = checkRateLimit(clientIp(req));
  if (!limit.allowed) {
    return reply({ error: "Too many attempts. Please try again in a minute." }, 429, {
      "Retry-After": String(limit.retryAfter),
    });
  }

  const text = await readCapped(req, MAX_BODY_BYTES);
  if (text === null) return reply({ error: "Request too large." }, 413);

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return reply({ error: "Invalid request." }, 400);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return reply({ error: "Invalid request." }, 400);
  }
  const { email, firstName, website } = body as Record<string, unknown>;

  // Honeypot: humans never see the field. Look successful to the bot, do nothing.
  if (typeof website === "string" && website.trim() !== "") return reply({ ok: true }, 200);

  if (typeof email !== "string") return reply({ error: "Enter a valid email address." }, 400);
  const cleanEmail = email.trim();
  if (cleanEmail.length > MAX_EMAIL || !EMAIL_RE.test(cleanEmail)) {
    return reply({ error: "Enter a valid email address." }, 400);
  }

  let cleanName: string | undefined;
  if (firstName !== undefined && firstName !== null) {
    if (typeof firstName !== "string") return reply({ error: "Invalid first name." }, 400);
    cleanName = firstName.trim() || undefined;
    if (cleanName && cleanName.length > MAX_FIRST_NAME) {
      return reply({ error: `First name must be ${MAX_FIRST_NAME} characters or fewer.` }, 400);
    }
  }

  const endpoint = process.env.NEWSLETTER_ENDPOINT;
  const secret = process.env.NEWSLETTER_SECRET;
  // No endpoint or no secret means the WordPress side isn't wired up. The
  // upstream would reject an unauthenticated call anyway, so don't send one.
  if (!endpoint || !secret) {
    return reply({ error: "Newsletter signup isn't configured yet." }, 501);
  }
  const url = upstreamUrl(endpoint);
  if (!url) {
    console.error("[api/newsletter] NEWSLETTER_ENDPOINT is not a valid http(s) URL");
    return reply({ error: "Newsletter signup isn't configured yet." }, 501);
  }

  // A WordPress host behind bot protection may challenge a server-to-server
  // POST. The bypass token goes only to the configured WordPress host, never to
  // an arbitrary endpoint. Invalid config just means no header.
  let wp: ReturnType<typeof getConfig>["wordpress"] = null;
  try {
    wp = getConfig().wordpress;
  } catch {
    // ConfigError: treated as "WordPress not configured".
  }
  const bypass =
    wp?.bypassToken && url.hostname === new URL(wp.baseUrl).hostname
      ? { "x-pantheon-bot-bypass": wp.bypassToken }
      : {};

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${secret}`,
        ...bypass,
      },
      body: JSON.stringify({ email: cleanEmail, first_name: cleanName }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (res.ok) {
      // "Already subscribed" is a success from the WordPress side too, so the
      // form can't be used to find out who is on the list.
      return reply({ ok: true }, 200);
    }
    // Status only: never the body (could echo the address) or the URL.
    console.error("[api/newsletter] upstream status", res.status);
    if (res.status === 400 || res.status === 422) {
      return reply({ error: "That email address wasn't accepted." }, 400);
    }
    if (res.status === 429) {
      return reply({ error: "Too many attempts. Please try again in a minute." }, 429);
    }
    return reply({ error: "We couldn't sign you up right now. Please try again later." }, 502);
  } catch (e) {
    const name = (e as { name?: string } | null)?.name;
    const timedOut = name === "TimeoutError" || name === "AbortError";
    console.error("[api/newsletter] upstream", timedOut ? "timeout" : "unreachable");
    return reply(
      { error: timedOut ? "The signup service took too long. Please try again." : "We couldn't sign you up right now. Please try again later." },
      timedOut ? 504 : 502,
    );
  }
}
