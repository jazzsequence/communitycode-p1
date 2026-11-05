"use client";

// Importing the package registers <showfm-player> & co. where `customElements`
// exists and is a no-op during SSR (documented as safe). Kept as a bare import
// because the package lists ./dist/index.js in `sideEffects`.
import "@showfm/embed";
import { safeUrl } from "@/lib/block-config";
import type { Episode } from "@/lib/episodes/types";
import { playerAttributes, playerMinHeight, pick, PLAYER_SIZES, type PlayerOptions } from "@/lib/showfm-embed";

export type ShowfmPlayerEpisode = Pick<Episode, "id" | "title" | "audio" | "links">;

export interface ShowfmPlayerProps extends PlayerOptions {
  episode: ShowfmPlayerEpisode;
}

/**
 * The show.fm player for one episode. The children are the vendor's documented
 * fallback: they show before the script loads, without JavaScript, to crawlers
 * and when the episode cannot be played, then the element upgrades them.
 * The inline min-height reserves the player's space so the page does not jump.
 */
export function ShowfmPlayer({ episode, ...options }: ShowfmPlayerProps) {
  const attrs = playerAttributes(options);
  const size = pick(options.size, PLAYER_SIZES) ?? "standard";
  const listen = episode.links.listen ? safeUrl(episode.links.listen, "") : "";
  const audioUrl = episode.audio ? safeUrl(episode.audio.url, "") : "";

  return (
    <showfm-player
      episode={episode.id}
      style={{ display: "block", minHeight: `${playerMinHeight(size)}px` }}
      {...attrs}
    >
      {listen ? <a href={listen}>{`Listen to ${episode.title} on show.fm`}</a> : null}
      {audioUrl ? <audio controls preload="none" src={audioUrl} /> : null}
    </showfm-player>
  );
}
