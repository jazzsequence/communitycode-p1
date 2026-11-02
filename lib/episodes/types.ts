/**
 * Source-agnostic episode model. Every block and route reads these types, never
 * a vendor payload, so show.fm and WordPress are interchangeable behind
 * `EpisodeSource`.
 */

export type EpisodeType = "full" | "trailer" | "bonus";

/** Which backend produced the episode. Surfaced in the UI so a demo can show
 *  where the data came from. */
export type EpisodeOrigin = "showfm" | "wordpress";

export interface Guest {
  name: string;
  /** "Guest", "Host", ... when the source provides one. */
  role: string | null;
  photoUrl: string | null;
}

export interface EpisodeAudio {
  url: string;
  contentType: string | null;
  sizeBytes: number | null;
}

export interface Episode {
  /** Stable id: a show.fm UUID, or `wp-<post id>`. */
  id: string;
  slug: string;
  /** Display title, HTML entities decoded. */
  title: string;
  /** Plain-text summary for cards and meta descriptions. */
  description: string;
  /**
   * Sanitised HTML show notes, or null when the source has none. Always run
   * through `sanitizeShowNotes`; safe for dangerouslySetInnerHTML.
   */
  showNotesHtml: string | null;
  /** ISO 8601, UTC. */
  publishedAt: string;
  season: number | null;
  number: number | null;
  type: EpisodeType;
  explicit: boolean;
  durationSeconds: number | null;
  audio: EpisodeAudio | null;
  artworkUrl: string | null;
  guests: Guest[];
  /** WebVTT (or other) transcript URL. Fetched server-side, see `transcript.ts`. */
  transcript: { url: string; type: string } | null;
  links: {
    /** show.fm listen page. Absent for externally hosted shows. */
    listen?: string;
    /** show.fm iframe embed URL. */
    embed?: string;
    /** Canonical page on the WordPress site. */
    site?: string;
    youtube?: string;
  };
  origin: EpisodeOrigin;
}

export interface ListParams {
  season?: number;
  type?: EpisodeType[];
  /** Opaque. Pass back `nextCursor` unchanged, with the same filters. */
  cursor?: string | null;
  /** 1-50. Defaults to 12. */
  limit?: number;
  /** Case-insensitive match on title, description and guest names. */
  query?: string;
}

export interface EpisodePage {
  episodes: Episode[];
  nextCursor: string | null;
  origin: EpisodeOrigin;
}

export interface EpisodeSource {
  readonly name: EpisodeOrigin;
  list(params?: ListParams): Promise<EpisodePage>;
  latest(): Promise<Episode | null>;
  bySlug(slug: string): Promise<Episode | null>;
  /** Distinct season numbers, newest first. */
  seasons(): Promise<number[]>;
  /** Every published episode, newest first. Backs merging and search. */
  all(): Promise<Episode[]>;
  /** Fill in fields the list payload lacks (show.fm show notes). Optional. */
  enrich?(episode: Episode): Promise<Episode>;
}

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;

export function clampLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(limit)));
}
