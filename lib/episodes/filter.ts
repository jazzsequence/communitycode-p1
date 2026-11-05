import { clampLimit, type Episode, type EpisodePage, type EpisodeOrigin, type ListParams } from "./types";

/**
 * Client-side filter + offset pagination over a full episode list. Used where
 * the backend can't filter (WordPress) or can't search (show.fm's public API has
 * no text search and no season index).
 */

export function encodeOffsetCursor(offset: number): string {
  return Buffer.from(`o:${offset}`).toString("base64url");
}

export function decodeOffsetCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  const m = /^o:(\d+)$/.exec(Buffer.from(cursor, "base64url").toString("utf8"));
  return m ? Number(m[1]) : 0;
}

function matchesQuery(e: Episode, q: string): boolean {
  const haystack = [e.title, e.description, ...e.guests.map((g) => g.name)].join(" ").toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export function filterEpisodes(all: Episode[], params: ListParams = {}): Episode[] {
  return all.filter((e) => {
    if (params.season !== undefined && e.season !== params.season) return false;
    if (params.type?.length && !params.type.includes(e.type)) return false;
    if (params.query?.trim() && !matchesQuery(e, params.query)) return false;
    return true;
  });
}

export function pageOf(all: Episode[], params: ListParams, origin: EpisodeOrigin): EpisodePage {
  const filtered = filterEpisodes(all, params);
  const limit = clampLimit(params.limit);
  const offset = decodeOffsetCursor(params.cursor);
  const slice = filtered.slice(offset, offset + limit);
  const next = offset + limit;
  return {
    episodes: slice,
    nextCursor: next < filtered.length ? encodeOffsetCursor(next) : null,
    origin,
  };
}

export function seasonsOf(all: Episode[]): number[] {
  return [...new Set(all.map((e) => e.season).filter((s): s is number => s !== null))].sort((a, b) => b - a);
}
