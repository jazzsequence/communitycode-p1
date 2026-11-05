"use client";

// Registers <showfm-transcript> in the browser; a no-op during SSR (see showfm-player.tsx).
import "@showfm/embed";
import type { CSSProperties } from "react";
import { safeUrl } from "@/lib/block-config";
import type { Episode } from "@/lib/episodes/types";
import { TRANSCRIPT_DEFAULT_HEIGHT, clampTranscriptHeight, headingAttr, pick, safeAccent, transcriptMinHeight } from "@/lib/showfm-embed";

export interface ShowfmTranscriptProps {
  episode: Pick<Episode, "id" | "title" | "transcript">;
  /** Height of the text area in px (120 to 2000). Default 320. */
  height?: number | string;
  theme?: string;
  accent?: string;
  headingLevel?: string | number;
}

/**
 * The show.fm follow-along transcript. With `episode` it follows whenever that
 * episode plays anywhere on the page, so no id wiring to a player is needed.
 * The reserved min-height is the text area plus the search row and border
 * (`--showfm-height`), so the element upgrading does not move the page. The
 * fallback link is shown until it does, and when JavaScript is off.
 */
export function ShowfmTranscript({ episode, height, theme, accent, headingLevel }: ShowfmTranscriptProps) {
  const textHeight = clampTranscriptHeight(height);
  const reserved = `${transcriptMinHeight(height)}px`;
  const file = episode.transcript ? safeUrl(episode.transcript.url, "") : "";
  const attrs = {
    // 320 is the element's own default, so only a different height is written.
    height: textHeight === TRANSCRIPT_DEFAULT_HEIGHT ? undefined : textHeight,
    theme: pick(theme, ["auto", "light", "dark"] as const),
    accent: safeAccent(accent),
    "heading-level": headingAttr(headingLevel),
  };
  const defined = Object.fromEntries(Object.entries(attrs).filter(([, v]) => v !== undefined));

  return (
    <showfm-transcript
      episode={episode.id}
      // The documented form: --showfm-height also bounds the fallback text until the element upgrades.
      style={{ display: "block", "--showfm-height": reserved, minHeight: "var(--showfm-height)" } as CSSProperties}
      {...defined}
    >
      {file ? <a href={file}>{`Read the transcript of ${episode.title}`}</a> : null}
    </showfm-transcript>
  );
}
