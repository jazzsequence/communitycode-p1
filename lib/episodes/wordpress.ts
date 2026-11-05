import "server-only";
import { ConfigError, DEFAULT_WP_USER_AGENT, getConfig } from "../config";
import { pageOf, seasonsOf } from "./filter";
import { buildEpisodes, parseFeed, type RestEpisode } from "./wordpress-parse";
import type { Episode, EpisodeSource, ListParams } from "./types";

/**
 * WordPress as the episode source: the PowerPress feed joined to the REST
 * `episodes` endpoint. Audio, season, number and duration only exist in the
 * feed; show notes and the slug only in REST.
 *
 * communitycode.dev sits behind Pantheon's next-gen GCDN bot protection, which
 * challenges unrecognised clients with a 403. Server-side requests get past it
 * one of two ways:
 *  - a User-Agent allowlisted with `terminus gcdn:ua-bypass:add` (WP_USER_AGENT;
 *    exact match, nothing to rotate), or
 *  - the site's bot-bypass token (`terminus gcdn:bot-bypass <site>`) in
 *    `x-pantheon-bot-bypass`. It rotates, and is a secret: env only, never logged.
 */

const REVALIDATE_SECONDS = 300;
export const EPISODES_TAG = "episodes";

export interface WordPressConfig {
  baseUrl: string;
  feedPath: string;
  /** Must equal the `gcdn:ua-bypass` entry exactly. Defaults to DEFAULT_WP_USER_AGENT. */
  userAgent?: string;
  bypassToken?: string;
}

/** WordPress settings from env. Throws ConfigError when WP_BASE_URL is unset. */
export function wordPressConfigFromEnv(): WordPressConfig {
  const wp = getConfig().wordpress;
  if (!wp) throw new ConfigError("WordPress is not configured: set WP_BASE_URL");
  return wp;
}

/**
 * The CDN caches the feed for a week, long after PowerPress changes it. A
 * query param that rolls over every revalidate window forces a fresh origin read
 * without defeating caching in between.
 */
function cacheBust(): string {
  return String(Math.floor(Date.now() / (REVALIDATE_SECONDS * 1000)));
}

export function wpHeaders(cfg: WordPressConfig, accept: string): HeadersInit {
  return {
    Accept: accept,
    "User-Agent": cfg.userAgent || DEFAULT_WP_USER_AGENT,
    ...(cfg.bypassToken ? { "x-pantheon-bot-bypass": cfg.bypassToken } : {}),
  };
}

export async function wpFetch(cfg: WordPressConfig, url: string, accept: string): Promise<Response> {
  const res = await fetch(url, {
    headers: wpHeaders(cfg, accept),
    next: { revalidate: REVALIDATE_SECONDS, tags: [EPISODES_TAG] },
  });
  // Pantheon's challenge is a 403 with `cf-mitigated: challenge`. Say so: the
  // fix (a bypass token) is not obvious from "403 Forbidden".
  if (res.status === 403 && res.headers.get("cf-mitigated") === "challenge") {
    throw new Error(
      `WordPress request blocked by Pantheon bot protection (${new URL(url).pathname}). ` +
        `Allowlist the User-Agent "${cfg.userAgent || DEFAULT_WP_USER_AGENT}" ` +
        `(terminus gcdn:ua-bypass:add <site>.<env> <host> "<user agent>"), or set a current ` +
        `PANTHEON_BOT_BYPASS_TOKEN (terminus gcdn:bot-bypass <site>); bypass tokens expire.`,
    );
  }
  if (!res.ok) throw new Error(`WordPress request failed: ${res.status} ${new URL(url).pathname}`);
  return res;
}

export async function loadWordPressEpisodes(cfg = wordPressConfigFromEnv()): Promise<Episode[]> {
  const bust = cacheBust();
  // `_links` must be listed: WordPress only embeds when it is in `_fields`.
  const restFields = "id,slug,link,title,excerpt,content,meta,_links,_embedded";
  const [feedRes, restRes] = await Promise.all([
    wpFetch(cfg, `${cfg.baseUrl}${cfg.feedPath}?cb=${bust}`, "application/rss+xml, application/xml"),
    wpFetch(
      cfg,
      `${cfg.baseUrl}/wp-json/wp/v2/episodes?per_page=100&_embed=wp:featuredmedia&_fields=${restFields}&cb=${bust}`,
      "application/json",
    ),
  ]);
  const feed = parseFeed(await feedRes.text());
  const rest = (await restRes.json()) as RestEpisode[];
  return buildEpisodes(feed, rest);
}

export function createWordPressSource(
  load: () => Promise<Episode[]> = loadWordPressEpisodes,
): EpisodeSource {
  return {
    name: "wordpress",
    async list(params: ListParams = {}) {
      return pageOf(await load(), params, "wordpress");
    },
    async latest() {
      const all = await load();
      return all.find((e) => e.type === "full") ?? all[0] ?? null;
    },
    async bySlug(slug) {
      return (await load()).find((e) => e.slug === slug) ?? null;
    },
    async seasons() {
      return seasonsOf(await load());
    },
    all: () => load(),
  };
}
