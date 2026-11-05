/**
 * Shared, CLIENT-SAFE defaults for block fields. Blocks never embed an endpoint
 * or link in their render logic: each one is a Puck field whose default comes
 * from here (so the defaults live in exactly one file), and render uses the
 * *prop*. Point a block at a different API or URL scheme in the editor and it
 * works without a code change, provided the endpoint returns the documented
 * response shape (see lib/episodes/dto.ts and the block's own comment).
 *
 * No `server-only` import: this is bundled into client components.
 */

export const DEFAULT_ENDPOINTS = {
  /** GET ?season=&type=&cursor=&limit=&q= -> EpisodeListResponse */
  episodes: "/api/episodes",
  /** GET, `{slug}` expanded -> { episode } */
  episode: "/api/episodes/{slug}",
  /** GET, `{slug}` expanded -> { cues } */
  transcript: "/api/episodes/{slug}/transcript",
  /** GET ?page=&per_page=&q= -> { posts, page, totalPages } */
  posts: "/api/posts",
  /** GET -> { guests } */
  guests: "/api/guests",
  /** POST { email, firstName?, website? } */
  newsletter: "/api/newsletter",
  /** POST { name, email, message, website? } */
  contact: "/api/contact",
} as const;

export const DEFAULT_LINKS = {
  /** Where an episode card/hero links. Placeholders: {slug} {id} {season} {number} */
  episode: "/episodes/{slug}",
} as const;

/**
 * Accept only what a browser should be told to fetch or navigate to: a
 * same-origin absolute path ("/api/x") or an http(s) URL. Rejects
 * protocol-relative ("//evil"), `javascript:`, `data:`, backslash tricks and
 * control characters. Returns `fallback` for anything else (including empty).
 */
export function safeUrl(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  if (!v) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(v)) return fallback;
  if (v.startsWith("//")) return fallback;
  if (v.startsWith("/")) return v;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? v : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Expand `{name}` placeholders, URL-encoding each value so a slug can't break
 * out of its path segment. An unknown or null/undefined value makes the whole
 * template unusable (returns null) rather than emitting "/episodes/undefined".
 */
export function expandTemplate(
  template: string,
  values: Record<string, string | number | null | undefined>,
): string | null {
  let missing = false;
  const out = template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = values[key];
    if (v === null || v === undefined || v === "") {
      missing = true;
      return "";
    }
    return encodeURIComponent(String(v));
  });
  return missing ? null : out;
}

/** Append query params to an endpoint that may or may not already have a query. */
export function withQuery(url: string, params: Record<string, string | number | undefined | null>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (!entries.length) return url;
  const qs = new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
  return url + (url.includes("?") ? "&" : "?") + qs;
}
