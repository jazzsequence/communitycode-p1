import "server-only";
import { ConfigError, getConfig } from "../config";
import { pageOf, seasonsOf } from "./filter";
import { createShowFmSource } from "./showfm";
import { createWordPressSource } from "./wordpress";
import type { Episode, EpisodeSource, ListParams } from "./types";

export type { Episode, EpisodePage, EpisodeSource, ListParams, Guest, EpisodeType } from "./types";

/**
 * Which backend serves episodes.
 *
 *   EPISODE_SOURCE=auto       show.fm merged with WordPress (default)
 *   EPISODE_SOURCE=showfm     show.fm only
 *   EPISODE_SOURCE=wordpress  WordPress only
 *
 * Why a merge: the show is externally hosted, so show.fm only holds episodes
 * created in show.fm while the existing archive lives in WordPress. The site
 * shows one list. Where an episode exists in both, show.fm's record wins and
 * WordPress fills any gaps (audio, transcript, show notes).
 */

const normTitle = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** show.fm suffixes imported slugs with 6 random characters ("episode-36-x-a98avk"). */
const stripSlugSuffix = (slug: string) => slug.replace(/-[a-z0-9]{6}$/, "");

/**
 * Pair show.fm episodes with WordPress episodes. Real data forced three passes:
 *  1. Exact normalised title. Titles carry the episode number and guest, so they
 *     are the strongest key, and season+number alone is NOT unique: the WordPress
 *     archive has two episodes numbered S1 E7.
 *  2. Season+number, only when exactly one candidate remains (survives a retitle).
 *  3. Slug with show.fm's random suffix stripped.
 * Each WordPress episode is used at most once.
 */
function pairEpisodes(showfm: Episode[], wp: Episode[]): Map<Episode, Episode> {
  const pairs = new Map<Episode, Episode>();
  const free = new Set(wp);

  const pass = (key: (e: Episode) => string | null) => {
    const byKey = new Map<string, Episode[]>();
    for (const w of free) {
      const k = key(w);
      if (k !== null) byKey.set(k, [...(byKey.get(k) ?? []), w]);
    }
    for (const s of showfm) {
      if (pairs.has(s)) continue;
      const k = key(s);
      const candidates = k === null ? undefined : byKey.get(k);
      if (candidates?.length === 1) {
        pairs.set(s, candidates[0]);
        free.delete(candidates[0]);
      }
    }
  };

  pass((e) => normTitle(e.title) || null);
  pass((e) => (e.season !== null && e.number !== null ? `${e.season}:${e.number}` : null));
  pass((e) => stripSlugSuffix(e.slug));
  return pairs;
}

/**
 * show.fm wins on identity and media (id, audio, transcript, artwork). WordPress
 * wins on editorial text: show.fm's imported description is the flattened show
 * notes, and the CMS the host actually edits is WordPress. The WP slug is kept so
 * existing /episodes/{slug} URLs hold.
 */
export function mergeEpisode(showfm: Episode, wp: Episode): Episode {
  return {
    ...wp,
    ...showfm,
    slug: wp.slug,
    title: wp.title || showfm.title,
    description: wp.description || showfm.description,
    showNotesHtml: wp.showNotesHtml ?? showfm.showNotesHtml,
    durationSeconds: showfm.durationSeconds ?? wp.durationSeconds,
    audio: showfm.audio ?? wp.audio,
    artworkUrl: showfm.artworkUrl ?? wp.artworkUrl,
    transcript: showfm.transcript ?? wp.transcript,
    season: showfm.season ?? wp.season,
    number: showfm.number ?? wp.number,
    guests: showfm.guests.length ? showfm.guests : wp.guests,
    links: { ...wp.links, ...showfm.links },
    origin: "showfm",
  };
}

export function mergeEpisodes(showfm: Episode[], wp: Episode[]): Episode[] {
  const pairs = pairEpisodes(showfm, wp);
  const paired = new Set(pairs.values());
  const merged = showfm.map((s) => {
    const w = pairs.get(s);
    return w ? mergeEpisode(s, w) : s;
  });
  return [...merged, ...wp.filter((w) => !paired.has(w))].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function composite(primary: EpisodeSource, fallback: EpisodeSource): EpisodeSource {
  /** One source being down must not take the archive down. */
  async function safeAll(s: EpisodeSource): Promise<Episode[]> {
    try {
      return await s.all();
    } catch (e) {
      console.warn(`[episodes] ${s.name} unavailable:`, (e as Error).message);
      return [];
    }
  }

  async function merged(): Promise<Episode[]> {
    const [a, b] = await Promise.all([safeAll(primary), safeAll(fallback)]);
    return mergeEpisodes(a, b);
  }

  return {
    name: primary.name,
    all: merged,
    async list(params: ListParams = {}) {
      const all = await merged();
      // Report show.fm as the origin only if it actually contributed.
      const page = pageOf(all, params, "wordpress");
      return { ...page, origin: page.episodes.some((e) => e.origin === "showfm") ? "showfm" : "wordpress" };
    },
    async latest() {
      const all = await merged();
      return all.find((e) => e.type === "full") ?? all[0] ?? null;
    },
    async bySlug(slug) {
      const found = (await merged()).find((e) => e.slug === slug) ?? null;
      return found && primary.enrich ? primary.enrich(found) : found;
    },
    async seasons() {
      return seasonsOf(await merged());
    },
  };
}

let cached: EpisodeSource | undefined;

/**
 * Builds the source from env. A backend with no config is left out, so a
 * WordPress-only or show.fm-only deployment needs nothing but its own variables.
 */
export function getEpisodeSource(): EpisodeSource {
  if (cached) return cached;
  const mode = process.env.EPISODE_SOURCE ?? "auto";
  const cfg = getConfig();
  const showfm = cfg.showfm ? createShowFmSource() : null;
  const wordpress = cfg.wordpress ? createWordPressSource() : null;

  let source: EpisodeSource | null;
  if (mode === "showfm") source = showfm;
  else if (mode === "wordpress") source = wordpress;
  else source = showfm && wordpress ? composite(showfm, wordpress) : (showfm ?? wordpress);

  if (!source) {
    throw new ConfigError(
      `No episode source configured for EPISODE_SOURCE=${mode}: set SHOWFM_PODCAST_SLUG and/or WP_BASE_URL`,
    );
  }
  return (cached = source);
}
