import "server-only";
import { ConfigError, DEFAULT_SHOWFM_API_BASE, getConfig } from "../config";
import { pageOf, seasonsOf } from "./filter";
import { sanitizeShowNotes } from "./sanitize";
import { clampLimit, type Episode, type EpisodePage, type EpisodeSource, type EpisodeType, type ListParams } from "./types";

/**
 * show.fm as the episode source.
 *
 * - Public endpoints (no key, CORS-open): podcast, episode list, latest, by ref.
 *   These carry guests (`people`), audio, artwork and a transcript link.
 * - Keyed endpoints (`/v1/me/*`, server-side only, no CORS): add what the public
 *   payload lacks, chiefly `show_notes_html`. The key never reaches the browser.
 *
 * The public API only lists *published* episodes of an *active* show. For an
 * externally hosted show that is empty until episodes exist in show.fm, which
 * the composite source treats as "fall back to WordPress".
 */

const REVALIDATE_SECONDS = 60; // matches show.fm's own s-maxage guidance
const MAX_PAGES = 20; // 20 x 50 = 1000 episodes; a runaway-cursor backstop

export interface ShowFmConfig {
  podcastSlug: string;
  apiKey?: string;
  /** Defaults to show.fm's production API. */
  apiBase?: string;
}

/** show.fm settings from env. Throws ConfigError when SHOWFM_PODCAST_SLUG is unset. */
export function showFmConfigFromEnv(): ShowFmConfig {
  const sf = getConfig().showfm;
  if (!sf) throw new ConfigError("show.fm is not configured: set SHOWFM_PODCAST_SLUG");
  return sf;
}

// --- wire types (only the fields we read; see show.fm OpenAPI) ---------------

interface WirePerson {
  name: string;
  role: string | null;
  photo_url?: string | null;
}

interface WireEpisode {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  season_number: number | null;
  episode_number: number | null;
  episode_type: string | null;
  explicit: boolean;
  published_at: string;
  audio: {
    url: string | null;
    content_type: string | null;
    duration_seconds: number | null;
    size_bytes: number | null;
  };
  artwork: { url: string | null; own?: boolean };
  links: { listen: string; embed: string };
  people: WirePerson[];
  transcript: { url: string; type: string } | null;
}

interface WireList {
  data: WireEpisode[];
  pagination: { next_cursor: string | null };
}

export class ShowFmError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function mapEpisode(w: WireEpisode, showNotesHtml: string | null = null): Episode {
  const type: EpisodeType = w.episode_type === "trailer" || w.episode_type === "bonus" ? w.episode_type : "full";
  return {
    id: w.id,
    slug: w.slug,
    title: w.title,
    description: w.description ?? "",
    showNotesHtml: sanitizeShowNotes(showNotesHtml),
    publishedAt: w.published_at,
    season: w.season_number,
    number: w.episode_number,
    type,
    explicit: w.explicit,
    durationSeconds: w.audio?.duration_seconds ?? null,
    audio: w.audio?.url
      ? { url: w.audio.url, contentType: w.audio.content_type, sizeBytes: w.audio.size_bytes }
      : null,
    artworkUrl: w.artwork?.url ?? null,
    guests: (w.people ?? []).map((p) => ({ name: p.name, role: p.role, photoUrl: p.photo_url ?? null })),
    transcript: w.transcript,
    links: { listen: w.links?.listen, embed: w.links?.embed },
    origin: "showfm",
  };
}

async function get<T>(cfg: ShowFmConfig, path: string, keyed = false): Promise<T> {
  const res = await fetch(`${cfg.apiBase ?? DEFAULT_SHOWFM_API_BASE}${path}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "communitycode-p1/0.1",
      ...(keyed && cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
    },
    next: { revalidate: REVALIDATE_SECONDS, tags: ["episodes"] },
  });
  if (!res.ok) {
    let code = "unknown";
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string } };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      /* non-JSON error body */
    }
    throw new ShowFmError(res.status, code, message);
  }
  return (await res.json()) as T;
}

/** 404 on the podcast or an episode means "nothing there", not a failure. */
async function orNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof ShowFmError && e.status === 404) return null;
    throw e;
  }
}

async function fetchShowNotes(cfg: ShowFmConfig, id: string): Promise<string | null> {
  if (!cfg.apiKey) return null;
  try {
    const { data } = await get<{ data: { show_notes_html: string | null } }>(
      cfg,
      `/me/episodes/${encodeURIComponent(id)}`,
      true,
    );
    return data.show_notes_html ?? null;
  } catch {
    // The page still renders without show notes; a bad or under-scoped key
    // should not take the episode down.
    return null;
  }
}

export function createShowFmSource(cfg: ShowFmConfig = showFmConfigFromEnv()): EpisodeSource {
  const slug = encodeURIComponent(cfg.podcastSlug);

  /** Every published episode, following cursors. Backs search and seasons. */
  async function all(): Promise<Episode[]> {
    const out: Episode[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const qs: string = new URLSearchParams({ limit: "50", ...(cursor ? { cursor } : {}) }).toString();
      const res: WireList | null = await orNull(get<WireList>(cfg, `/podcasts/${slug}/episodes?${qs}`));
      if (!res) return out;
      out.push(...res.data.map((w) => mapEpisode(w)));
      cursor = res.pagination.next_cursor;
      if (!cursor) break;
    }
    return out;
  }

  return {
    name: "showfm",

    async list(params: ListParams = {}): Promise<EpisodePage> {
      // Text search has no API support: filter the full list instead.
      if (params.query?.trim()) return pageOf(await all(), params, "showfm");

      const qs = new URLSearchParams({ limit: String(clampLimit(params.limit)) });
      if (params.cursor) qs.set("cursor", params.cursor);
      if (params.season !== undefined) qs.set("season", String(params.season));
      if (params.type?.length) qs.set("type", params.type.join(","));
      const res = await orNull(get<WireList>(cfg, `/podcasts/${slug}/episodes?${qs}`));
      return {
        episodes: res?.data.map((w) => mapEpisode(w)) ?? [],
        nextCursor: res?.pagination.next_cursor ?? null,
        origin: "showfm",
      };
    },

    async latest() {
      const res = await orNull(get<{ data: WireEpisode }>(cfg, `/podcasts/${slug}/episodes/latest`));
      return res ? mapEpisode(res.data, await fetchShowNotes(cfg, res.data.id)) : null;
    },

    async bySlug(ref) {
      const res = await orNull(
        get<{ data: WireEpisode }>(cfg, `/podcasts/${slug}/episodes/${encodeURIComponent(ref)}`),
      );
      return res ? mapEpisode(res.data, await fetchShowNotes(cfg, res.data.id)) : null;
    },

    async seasons() {
      return seasonsOf(await all());
    },

    all,

    async enrich(episode) {
      if (episode.origin !== "showfm" || episode.showNotesHtml) return episode;
      return { ...episode, showNotesHtml: sanitizeShowNotes(await fetchShowNotes(cfg, episode.id)) };
    },
  };
}
