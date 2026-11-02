import type { Episode, EpisodeOrigin } from "./types";

/**
 * What list endpoints send to the browser. Show notes are the heavy field and
 * only the detail view needs them, so cards leave them out.
 */
export type EpisodeCard = Omit<Episode, "showNotesHtml">;

export function toCard(e: Episode): EpisodeCard {
  const { showNotesHtml: _omit, ...card } = e;
  return card;
}

export interface EpisodeListResponse {
  episodes: EpisodeCard[];
  nextCursor: string | null;
  origin: EpisodeOrigin;
  /** Only on a first page, so "load more" doesn't refetch it. */
  seasons?: number[];
}
