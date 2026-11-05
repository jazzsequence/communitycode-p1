/**
 * Pure helpers for the show.fm embed (`@showfm/embed`). Client-safe and free of
 * side effects: it imports the package's `/server` entry, which registers no
 * custom elements and touches no DOM. The vendor owns the rules (which hosts
 * serve show.fm media, the reserved heights); this file only applies them to
 * our source-agnostic `Episode`.
 */
import { PLAYER_MIN_HEIGHTS, canOfferTranscript, isShowfmMediaUrl } from "@showfm/embed/server";
import type { ShowfmPlayerAttributes } from "@showfm/embed";
import type { Episode } from "@/lib/episodes/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

type EpisodeLike = Pick<Episode, "id" | "origin" | "audio">;

/**
 * True when the show.fm player can play this episode: it came from show.fm, its
 * id is the show.fm UUID the element needs, and show.fm serves the audio.
 * Audio hosted elsewhere still plays in the embed, but with no download or
 * transcript, so those episodes keep the native player.
 */
export function isShowfmHosted(episode: EpisodeLike | null | undefined): boolean {
  if (!episode || episode.origin !== "showfm") return false;
  return isUuid(episode.id) && isShowfmMediaUrl(episode.audio?.url);
}

/**
 * The show.fm follow-along transcript is only offered when both the audio and
 * the WebVTT are on show.fm's media hosts (the package's own rule).
 */
export function canOfferShowfmTranscript(episode: (EpisodeLike & Pick<Episode, "transcript">) | null | undefined): boolean {
  if (!episode || episode.origin !== "showfm" || !isUuid(episode.id)) return false;
  return canOfferTranscript(episode.audio?.url, episode.transcript?.url);
}

export type PlayerSize = keyof typeof PLAYER_MIN_HEIGHTS;

/** Reserved player height in px (the vendor's height contract, branded row included). */
export function playerMinHeight(size: PlayerSize): number {
  return PLAYER_MIN_HEIGHTS[size].branded;
}

/** Search row (55px) plus the 1px border top and bottom around the text area. */
export const TRANSCRIPT_CHROME_PX = 57;
export const TRANSCRIPT_DEFAULT_HEIGHT = 320;
export const TRANSCRIPT_MIN_HEIGHT = 120;
export const TRANSCRIPT_MAX_HEIGHT = 2000;

/** The text-area height the element accepts (120 to 2000); anything else is the default. */
export function clampTranscriptHeight(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return TRANSCRIPT_DEFAULT_HEIGHT;
  return Math.min(TRANSCRIPT_MAX_HEIGHT, Math.max(TRANSCRIPT_MIN_HEIGHT, Math.round(n)));
}

/** Reserved height of the whole transcript element for a text area of `height`. */
export function transcriptMinHeight(height: unknown): number {
  return clampTranscriptHeight(height) + TRANSCRIPT_CHROME_PX;
}

/** `#abc` or `#aabbcc` (the leading # is optional on input); anything else is rejected. */
export function safeAccent(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  return /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? (v.startsWith("#") ? v : `#${v}`) : undefined;
}

export function pick<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export const PLAYER_SIZES = ["standard", "compact"] as const;
export const PLAYER_TRANSCRIPTS = ["none", "on", "open", "reader"] as const;
export const PLAYER_THEMES = ["follow-show", "auto", "light", "dark"] as const;
export const MINI_PLAYER_MODES = ["on", "off"] as const;
export const HEADING_LEVELS = ["none", "2", "3", "4", "5", "6"] as const;
export const CREDIT_MODES = ["auto", "on", "off"] as const;

/** Heading level as the element's attribute value, or undefined for "none"/invalid. */
export function headingAttr(value: unknown): "2" | "3" | "4" | "5" | "6" | undefined {
  const v = typeof value === "number" ? String(value) : value;
  return pick(v, ["2", "3", "4", "5", "6"] as const);
}

export interface PlayerOptions {
  size?: string;
  transcript?: string;
  theme?: string;
  accent?: string;
  wave?: boolean | string;
  miniPlayer?: string;
  headingLevel?: string | number;
  credit?: string;
}

export type PlayerAttributes = Pick<
  ShowfmPlayerAttributes,
  "size" | "transcript" | "theme" | "accent" | "wave" | "mini-player" | "heading-level" | "credit"
>;

/**
 * Map editor/props values to the element's attributes. An attribute is omitted
 * whenever the value means "follow the show" (empty, "none", "follow-show",
 * unknown or invalid), so the show's own settings stay in charge. Nothing
 * unvalidated reaches an attribute: enums are allow-listed, accent must be hex.
 */
export function playerAttributes(o: PlayerOptions): PlayerAttributes {
  const size = pick(o.size, PLAYER_SIZES);
  // The compact player has no transcript button (vendor rule), so don't ask for one.
  const transcript = size === "compact" ? undefined : pick(o.transcript, ["on", "open", "reader"] as const);
  const theme = pick(o.theme, ["auto", "light", "dark"] as const);
  const wave = o.wave === true || o.wave === "true" || o.wave === "on" ? "true" : o.wave === false || o.wave === "false" || o.wave === "off" ? "false" : undefined;
  const attrs: PlayerAttributes = {
    size: size === "compact" ? "compact" : undefined,
    transcript,
    theme,
    accent: safeAccent(o.accent),
    wave,
    "mini-player": pick(o.miniPlayer, MINI_PLAYER_MODES),
    "heading-level": headingAttr(o.headingLevel),
    // "auto" is the element's default, so only an explicit on/off is written.
    credit: pick(o.credit, ["on", "off"] as const),
  };
  // Drop undefined keys so they never render as attributes.
  return Object.fromEntries(Object.entries(attrs).filter(([, v]) => v !== undefined)) as PlayerAttributes;
}

export const PLAYER_MODES = ["auto", "showfm", "native"] as const;
export type EmbedMode = (typeof PLAYER_MODES)[number];

/** Anything that is not a known mode is "auto", so stale or hand-edited content never breaks a block. */
export function embedMode(value: unknown): EmbedMode {
  return pick(value, PLAYER_MODES) ?? "auto";
}

/**
 * Which player a block renders. `auto` uses show.fm only for episodes it
 * actually hosts; `showfm` forces it, but still needs an id the element can use
 * and audio to play, so it never renders a dead element; `native` never does.
 */
export function shouldUseShowfmPlayer(episode: EpisodeLike | null | undefined, mode: unknown): boolean {
  const m = embedMode(mode);
  if (!episode || m === "native") return false;
  if (m === "showfm") return isUuid(episode.id) && !!episode.audio;
  return isShowfmHosted(episode);
}

/** The transcript counterpart: `showfm` forces the element but needs a UUID and a transcript to follow. */
export function shouldUseShowfmTranscript(
  episode: (EpisodeLike & Pick<Episode, "transcript">) | null | undefined,
  source: unknown,
): boolean {
  const m = embedMode(source);
  if (!episode || m === "native") return false;
  if (m === "showfm") return isUuid(episode.id) && !!episode.transcript;
  return canOfferShowfmTranscript(episode);
}
