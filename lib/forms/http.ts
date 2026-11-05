import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_WP_USER_AGENT, getConfig } from "@/lib/config";
import { checkRateLimit } from "./rate-limit";

/**
 * Helpers shared by the form routes (app/api/newsletter, app/api/contact):
 * the same preamble (content type, rate limit, capped body, JSON object), the
 * same response shape, and the same rules for what may be sent upstream.
 */

export const NO_STORE = { "Cache-Control": "no-store" };

export const UPSTREAM_TIMEOUT_MS = 8_000;

export function reply(body: Record<string, unknown>, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

export function clientIp(req: NextRequest): string {
  // Behind Pantheon's edge the first X-Forwarded-For hop is the client. It is
  // client-controllable if the edge doesn't overwrite it, which is one more
  // reason this limiter is only best-effort.
  const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return xff || req.headers.get("x-real-ip") || "unknown";
}

/** Read the body but stop at the cap, so a huge POST isn't buffered whole. */
export async function readCapped(req: NextRequest, max: number): Promise<string | null> {
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

/** An http(s) URL or null: a configured endpoint is never trusted to be sane. */
export function upstreamUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u : null;
  } catch {
    return null;
  }
}

/**
 * The route preamble: JSON content type, per-IP rate limit (before parsing, so
 * rejected floods cost nothing), size-capped body, JSON object. Returns the
 * parsed body, or the response to send.
 */
export async function readJsonObject(
  req: NextRequest,
  opts: { maxBytes: number; rateLimitKey: string },
): Promise<{ body: Record<string, unknown> } | { response: NextResponse }> {
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return { response: reply({ error: "Send JSON." }, 415) };
  }

  const limit = checkRateLimit(`${opts.rateLimitKey}:${clientIp(req)}`);
  if (!limit.allowed) {
    return {
      response: reply({ error: "Too many attempts. Please try again in a minute." }, 429, {
        "Retry-After": String(limit.retryAfter),
      }),
    };
  }

  const text = await readCapped(req, opts.maxBytes);
  if (text === null) return { response: reply({ error: "Request too large." }, 413) };

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { response: reply({ error: "Invalid request." }, 400) };
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { response: reply({ error: "Invalid request." }, 400) };
  }
  return { body: body as Record<string, unknown> };
}

/**
 * Extra headers for a WordPress host behind bot protection. The allowlisted
 * User-Agent and bypass token go only to the configured WordPress host, never
 * to an arbitrary endpoint. Invalid or absent WordPress config means no headers.
 */
export function wordpressBypassHeaders(url: URL): Record<string, string> {
  let wp: ReturnType<typeof getConfig>["wordpress"] = null;
  try {
    wp = getConfig().wordpress;
  } catch {
    // ConfigError: treated as "WordPress not configured".
  }
  if (!wp || url.hostname !== new URL(wp.baseUrl).hostname) return {};
  // Same identity as wpFetch: the allowlisted User-Agent, and the token if set.
  const headers: Record<string, string> = { "User-Agent": wp.userAgent || DEFAULT_WP_USER_AGENT };
  if (wp.bypassToken) headers["x-pantheon-bot-bypass"] = wp.bypassToken;
  return headers;
}

/** true when the error is a fetch timeout/abort (AbortSignal.timeout). */
export function isTimeout(e: unknown): boolean {
  const name = (e as { name?: string } | null)?.name;
  return name === "TimeoutError" || name === "AbortError";
}

/**
 * Did the WordPress endpoint really accept this? A 2xx alone is not proof: an
 * edge cache, a maintenance page or a rewrite can answer 200 with a normal HTML
 * page where the route should be, and the visitor would be told their message was
 * sent when nothing ran. The endpoints promise `{"ok":true}` as JSON, so require
 * exactly that. Never throws; reads the body only to check that flag.
 */
export async function upstreamConfirmed(res: Response): Promise<boolean> {
  if (!res.ok) return false;
  if (!(res.headers.get("content-type") ?? "").toLowerCase().includes("json")) return false;
  try {
    const body: unknown = await res.json();
    return typeof body === "object" && body !== null && (body as { ok?: unknown }).ok === true;
  } catch {
    return false;
  }
}
