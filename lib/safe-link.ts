/**
 * Link validation for anything an editor can type into a Puck field.
 *
 * Allowed: relative paths ("/episodes", "about", "#top", "?q=x"), http(s) and
 * mailto. Everything else (javascript:, data:, vbscript:, file:, protocol-relative
 * "//host", backslash tricks) returns null so callers render no link at all.
 *
 * Browsers strip tabs/newlines from inside a URL and ignore case in the scheme,
 * which is how "java\tscript:" and "JaVaScRiPt:" get past naive prefix checks.
 * Rather than normalise-and-hope, any whitespace or control character inside the
 * value rejects it outright.
 */

// ASCII/C1 controls, all Unicode whitespace, zero-width and BOM characters.
// eslint-disable-next-line no-control-regex
const FORBIDDEN = /[\u0000-\u001f\u007f-\u009f\s\u200b-\u200f\u2028\u2029\u2060\ufeff]/;
const SCHEME = /^([a-z][a-z0-9+.-]*):/i;

type Allowed = "relative" | "web" | "mailto";

function classify(input: unknown): { href: string; kind: Allowed } | null {
  if (typeof input !== "string") return null;
  const href = input.trim();
  if (!href || href.length > 2048 || FORBIDDEN.test(href) || href.includes("\\")) return null;

  const scheme = SCHEME.exec(href);
  if (scheme) {
    const name = scheme[1].toLowerCase();
    if (name === "mailto") return href.length > "mailto:".length ? { href, kind: "mailto" } : null;
    if (name !== "http" && name !== "https") return null;
    try {
      const u = new URL(href);
      if (!u.hostname || u.username || u.password) return null;
    } catch {
      return null;
    }
    return { href, kind: "web" };
  }

  // Protocol-relative: "//evil.example" inherits the scheme and leaves the site.
  if (href.startsWith("//")) return null;
  return { href, kind: "relative" };
}

/** The href if it is safe to put in an <a>, else null. */
export function safeHref(input: unknown): string | null {
  return classify(input)?.href ?? null;
}

/** Like `safeHref` but only relative or http(s): for <img src>, where mailto is meaningless. */
export function safeImageUrl(input: unknown): string | null {
  const c = classify(input);
  return c && c.kind !== "mailto" ? c.href : null;
}

/** True for links that leave the site (http(s) or mailto). */
export function isExternalHref(href: string): boolean {
  const c = classify(href);
  return c !== null && c.kind !== "relative";
}

export interface LabelledLink {
  label: string;
  href: string;
}

/** Drop editor-entered rows that have no label or an unsafe/empty href. */
export function safeLinks(input: unknown): LabelledLink[] {
  if (!Array.isArray(input)) return [];
  const out: LabelledLink[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const { label, href } = item as { label?: unknown; href?: unknown };
    const safe = safeHref(href);
    const text = typeof label === "string" ? label.trim() : "";
    if (safe && text) out.push({ label: text, href: safe });
  }
  return out;
}
