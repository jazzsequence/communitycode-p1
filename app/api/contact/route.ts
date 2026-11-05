import type { NextRequest } from "next/server";
import { isTimeout, readJsonObject, reply, UPSTREAM_TIMEOUT_MS, upstreamUrl, wordpressBypassHeaders } from "@/lib/forms/http";

/**
 * POST /api/contact   { name, email, message, website? }
 *
 * Validates, then forwards server-side to the endpoint the WordPress side
 * provides (CONTACT_ENDPOINT) with a shared secret, which sends the mail. The
 * contract is in docs/contact-wordpress.md. Same shape as /api/newsletter, and
 * the same rule: with no endpoint configured it answers 501, never success.
 * The only "silent success" is the honeypot, which is for bots.
 *
 * Privacy: the name, email and message are never logged, and never echoed
 * back. Logs carry status codes only.
 */

// 5000 chars is up to 15 KB as UTF-8 (3 bytes per BMP char), so 16 KB rather
// than a tighter cap that would 413 a long message written in, say, Japanese.
const MAX_BODY_BYTES = 16_384;
const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 5_000;
// Deliberately loose, same as the newsletter: WordPress is the real check.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const NOT_CONFIGURED = "Contact form isn't configured yet.";
const SEND_FAILED = "We couldn't send your message right now. Please try again later.";

export async function POST(req: NextRequest) {
  const parsed = await readJsonObject(req, { maxBytes: MAX_BODY_BYTES, rateLimitKey: "contact" });
  if ("response" in parsed) return parsed.response;
  const { name, email, message, website } = parsed.body;

  // Honeypot: humans never see the field. Look successful to the bot, do nothing.
  if (typeof website === "string" && website.trim() !== "") return reply({ ok: true }, 200);

  // The name can end up in a mail header or subject on the other side, so
  // collapse any whitespace (including line breaks) to single spaces.
  const cleanName = typeof name === "string" ? name.replace(/\s+/g, " ").trim() : "";
  if (!cleanName) return reply({ error: "Enter your name." }, 400);
  if (cleanName.length > MAX_NAME) {
    return reply({ error: `Name must be ${MAX_NAME} characters or fewer.` }, 400);
  }

  const cleanEmail = typeof email === "string" ? email.trim() : "";
  if (cleanEmail.length > MAX_EMAIL || !EMAIL_RE.test(cleanEmail)) {
    return reply({ error: "Enter a valid email address." }, 400);
  }

  const cleanMessage = typeof message === "string" ? message.trim() : "";
  if (!cleanMessage) return reply({ error: "Enter a message." }, 400);
  if (cleanMessage.length > MAX_MESSAGE) {
    return reply({ error: `Message must be ${MAX_MESSAGE} characters or fewer.` }, 400);
  }

  const endpoint = process.env.CONTACT_ENDPOINT;
  const secret = process.env.CONTACT_SECRET;
  // No endpoint or no secret means the WordPress side isn't wired up. The
  // upstream would reject an unauthenticated call anyway, so don't send one.
  if (!endpoint || !secret) return reply({ error: NOT_CONFIGURED }, 501);
  const url = upstreamUrl(endpoint);
  if (!url) {
    console.error("[api/contact] CONTACT_ENDPOINT is not a valid http(s) URL");
    return reply({ error: NOT_CONFIGURED }, 501);
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${secret}`,
        ...wordpressBypassHeaders(url),
      },
      body: JSON.stringify({ name: cleanName, email: cleanEmail, message: cleanMessage }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (res.ok) return reply({ ok: true }, 200);
    // Status only: never the body (could echo the message) or the URL. Every
    // upstream failure, including its 400, is ours to report generically: the
    // route already validated, so a 400 here is a contract mismatch, not
    // something the visitor can fix.
    console.error("[api/contact] upstream status", res.status);
    return reply({ error: SEND_FAILED }, 502);
  } catch (e) {
    console.error("[api/contact] upstream", isTimeout(e) ? "timeout" : "unreachable");
    return reply({ error: SEND_FAILED }, 502);
  }
}
