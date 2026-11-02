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

/** Same episode in both systems? Season+number is the stable key; slug the fallback. */
function sameEpisode(a: Episode, b: Episode): boolean {
  if (a.season !== null && a.number !== null && b.season !== null && b.number !== null) {
    return a.season === b.season && a.number === b.number;
  }
  return a.slug === b.slug;
}

/** show.fm record wins; WordPress supplies what show.fm lacks. The URL slug stays
 *  WordPress's so existing /episodes/{slug} links keep working. */
export function mergeEpisode(showfm: Episode, wp: Episode): Episode {
  return {
    ...wp,
    ...showfm,
    slug: wp.slug,
    description: showfm.description || wp.description,
    showNotesHtml: showfm.showNotesHtml ?? wp.showNotesHtml,
    durationSeconds: showfm.durationSeconds ?? wp.durationSeconds,
    audio: showfm.audio ?? wp.audio,
    artworkUrl: showfm.artworkUrl ?? wp.artworkUrl,
    transcript: showfm.transcript ?? wp.transcript,
    guests: showfm.guests.length ? showfm.guests : wp.guests,
    links: { ...wp.links, ...showfm.links },
    origin: "showfm",
  };
}

export function mergeEpisodes(showfm: Episode[], wp: Episode[]): Episode[] {
  const unmatched = [...wp];
  const merged = showfm.map((s) => {
    const i = unmatched.findIndex((w) => sameEpisode(s, w));
    if (i === -1) return s;
    const [w] = unmatched.splice(i, 1);
    return mergeEpisode(s, w);
  });
  return [...merged, ...unmatched].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
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
