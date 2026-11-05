import type { NextRequest } from "next/server";
import { isTimeout, readJsonObject, reply, UPSTREAM_TIMEOUT_MS, upstreamUrl, wordpressBypassHeaders } from "@/lib/forms/http";

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
const MAX_EMAIL = 254;
const MAX_FIRST_NAME = 80;
// Deliberately loose: the real check is MailPoet's confirmation email.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export async function POST(req: NextRequest) {
  const parsed = await readJsonObject(req, { maxBytes: MAX_BODY_BYTES, rateLimitKey: "newsletter" });
  if ("response" in parsed) return parsed.response;
  const { email, firstName, website } = parsed.body;

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

  const bypass = wordpressBypassHeaders(url);

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
    const timedOut = isTimeout(e);
    console.error("[api/newsletter] upstream", timedOut ? "timeout" : "unreachable");
    return reply(
      { error: timedOut ? "The signup service took too long. Please try again." : "We couldn't sign you up right now. Please try again later." },
      timedOut ? 504 : 502,
    );
  }
}
