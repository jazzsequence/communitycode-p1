import "server-only";
import { toPlainText } from "@/lib/episodes/sanitize";
import { wordPressConfigFromEnv, wpFetch, type WordPressConfig } from "@/lib/episodes/wordpress";

/**
 * Blog posts from WordPress (`/wp-json/wp/v2/posts`). WordPress stays the CMS
 * for the blog; this module is the only place that knows its payload shape.
 * Network access goes through `wpFetch` so the Pantheon bot-bypass header, the
 * readable challenge error and Next fetch caching all apply.
 */

/** What /api/posts sends to the browser. */
export interface Post {
  id: number;
  slug: string;
  /** Entity-decoded plain text. */
  title: string;
  /** Plain text. Empty when the post has no excerpt. */
  excerpt: string;
  /** ISO 8601 UTC, or "" if WordPress sent an unparseable date. */
  publishedAt: string;
  /** The post's own permalink, as WordPress reports it (http or https). */
  link: string;
  imageUrl: string | null;
  authorName: string | null;
}

export interface PostsResponse {
  posts: Post[];
  page: number;
  totalPages: number;
}

export interface PostsQuery {
  page: number;
  perPage: number;
  search?: string;
  /** WordPress category ids. */
  categories?: number[];
}

export const MAX_PER_PAGE = 24;
export const DEFAULT_PER_PAGE = 9;

// --- mapping (pure) -------------------------------------------------------

interface RawSize {
  source_url?: string;
}
interface RawMedia {
  source_url?: string;
  media_details?: { sizes?: Record<string, RawSize | undefined> };
}
interface RawAuthor {
  name?: string;
}
/** The slice of a WP REST post this module reads. Everything may be missing. */
export interface RawPost {
  id?: number;
  slug?: string;
  link?: string;
  date_gmt?: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  _embedded?: {
    "wp:featuredmedia"?: (RawMedia | undefined)[];
    author?: (RawAuthor | undefined)[];
  };
}

function httpUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/**
 * `date_gmt` is UTC but carries no offset ("2026-10-16T17:00:00"), which JS
 * would parse as local time. Add the Z unless an offset is already there.
 */
export function toIsoUtc(dateGmt: string | undefined): string {
  if (!dateGmt) return "";
  const withZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(dateGmt) ? dateGmt : `${dateGmt}Z`;
  const d = new Date(withZone);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/**
 * Trust the permalink WordPress reports when it is http(s); anything else
 * (missing, `javascript:`, malformed) yields null so the post is dropped
 * rather than rendered with a broken or dangerous href.
 */
export function safeLink(link: string | undefined): string | null {
  return httpUrl(link);
}

/** A card is ~400px wide, so the 768px rendition beats the 1920px original. */
function pickImage(media: RawMedia | undefined): string | null {
  // An embed that failed is an error object (`{code, message}`), not media.
  if (!media) return null;
  const sizes = media.media_details?.sizes;
  return (
    httpUrl(sizes?.medium_large?.source_url) ??
    httpUrl(sizes?.large?.source_url) ??
    httpUrl(media.source_url)
  );
}

/** Returns null for an item too malformed to link to (no id, slug or usable link). */
export function mapPost(raw: RawPost): Post | null {
  if (typeof raw.id !== "number" || !raw.slug) return null;
  const link = safeLink(raw.link);
  if (!link) return null;
  const author = toPlainText(raw._embedded?.author?.[0]?.name);
  return {
    id: raw.id,
    slug: raw.slug,
    title: toPlainText(raw.title?.rendered) || raw.slug,
    // WordPress's automatic excerpts end with "[&hellip;]".
    excerpt: toPlainText(raw.excerpt?.rendered).replace(/\s*\[…\]$/, "…"),
    publishedAt: toIsoUtc(raw.date_gmt),
    link,
    imageUrl: pickImage(raw._embedded?.["wp:featuredmedia"]?.[0]),
    authorName: author || null,
  };
}

export function mapPosts(raw: unknown): Post[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => mapPost(r as RawPost)).filter((p): p is Post => p !== null);
}

// --- query validation (pure) ----------------------------------------------

export type ParsedPostsParams = { ok: true; query: PostsQuery } | { ok: false; error: string };

/** Validate the query string of /api/posts. Strict: reject, don't clamp. */
export function parsePostsParams(sp: URLSearchParams): ParsedPostsParams {
  const query: PostsQuery = { page: 1, perPage: DEFAULT_PER_PAGE };

  const page = sp.get("page");
  if (page !== null && page !== "") {
    if (!/^\d{1,4}$/.test(page) || Number(page) < 1) {
      return { ok: false, error: "page must be an integer >= 1" };
    }
    query.page = Number(page);
  }

  const perPage = sp.get("per_page");
  if (perPage !== null && perPage !== "") {
    if (!/^\d{1,2}$/.test(perPage) || Number(perPage) < 1 || Number(perPage) > MAX_PER_PAGE) {
      return { ok: false, error: `per_page must be an integer 1-${MAX_PER_PAGE}` };
    }
    query.perPage = Number(perPage);
  }

  const q = sp.get("q")?.trim();
  if (q) {
    if (q.length > 100) return { ok: false, error: "q must be 100 characters or fewer" };
    query.search = q;
  }

  return { ok: true, query };
}

// --- network --------------------------------------------------------------

// `_embed` only works when `_links` is listed in `_fields`.
const FIELDS = "id,slug,link,date_gmt,title,excerpt,author,_links,_embedded";

export function buildPostsUrl(cfg: WordPressConfig, q: PostsQuery): string {
  const params = new URLSearchParams({
    per_page: String(q.perPage),
    page: String(q.page),
    _embed: "author,wp:featuredmedia",
    _fields: FIELDS,
  });
  if (q.search) params.set("search", q.search);
  if (q.categories?.length) params.set("categories", q.categories.join(","));
  return `${cfg.baseUrl}/wp-json/wp/v2/posts?${params.toString()}`;
}

function headerInt(res: Response, name: string): number {
  const n = Number.parseInt(res.headers.get(name) ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Throws ConfigError when WordPress isn't configured (WP_BASE_URL unset). */
export async function loadPosts(
  q: PostsQuery,
  cfg: WordPressConfig = wordPressConfigFromEnv(),
): Promise<PostsResponse> {
  let res: Response;
  try {
    res = await wpFetch(cfg, buildPostsUrl(cfg, q), "application/json");
  } catch (e) {
    // WordPress answers a page past the end with 400 rest_post_invalid_page_number.
    // That is "no more posts", not an outage. (Params are validated upstream, so
    // a 400 here is not a malformed request.)
    if (q.page > 1 && /failed: 400 /.test((e as Error).message)) {
      return { posts: [], page: q.page, totalPages: q.page - 1 };
    }
    throw e;
  }
  const body: unknown = await res.json();
  if (!Array.isArray(body)) throw new Error("WordPress posts response was not a list");
  return {
    posts: mapPosts(body),
    page: q.page,
    totalPages: headerInt(res, "X-WP-TotalPages"),
  };
}
