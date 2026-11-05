import { EpisodePlayerBlockView } from "@/components/podcast/showfm-blocks";
import { DEFAULT_ENDPOINTS } from "@/lib/block-config";

/**
 * Audio player for one episode. The block body lives in a client component
 * (`components/podcast/audio-player.tsx`); this file stays a plain module so the
 * Puck config can be imported on the server to render published pages.
 *
 * Endpoint contract (defaults in lib/block-config.ts; unsafe values fall back):
 *  - episodeEndpoint: GET, `{slug}` expanded -> `{ episode: Episode }` where the
 *    episode has `slug`, `title`, `audio?.url`, `durationSeconds`, `links.youtube`.
 *  - episodesEndpoint: GET `?limit=1&type=full` -> `{ episodes: Episode[] }`
 *    (newest first); used when the slug is empty ("latest").
 *
 * Player: `playerMode` picks the show.fm embed (@showfm/embed) or the native
 * <audio> player. `auto` uses show.fm for episodes it hosts (origin "showfm",
 * UUID id, audio on show.fm's media host) and the native player otherwise;
 * `showfm` forces the embed when the episode has a UUID and audio (else native);
 * `native` never uses it. The show.fm options below only apply to the embed;
 * "follow the show" values (empty accent, theme "follow-show", heading "none")
 * leave the show's own settings in charge. The embed's `transcript` option
 * adds show.fm's built-in transcript panel under the player; it has no effect
 * on the compact size.
 */

type Props = {
  episodeSlug: string;
  episodeEndpoint: string;
  episodesEndpoint: string;
  playerMode: "auto" | "showfm" | "native";
  size: "standard" | "compact";
  transcript: "none" | "on" | "open" | "reader";
  theme: "follow-show" | "auto" | "light" | "dark";
  accent: string;
  miniPlayer: "on" | "off";
  headingLevel: "none" | "2" | "3" | "4" | "5" | "6";
};

export const episodePlayerBlock = {
  label: "Episode Player",
  fields: {
    episodeSlug: {
      type: "text" as const,
      label: "Episode slug (leave empty for the latest episode)",
    },
    episodeEndpoint: {
      type: "text" as const,
      label: "Episode API URL, with {slug} where the slug goes (returns { episode })",
    },
    episodesEndpoint: {
      type: "text" as const,
      label: "Episode list API URL, used for the latest episode (returns { episodes })",
    },
    playerMode: {
      type: "select" as const,
      label: "Player (auto = show.fm when it hosts the episode, otherwise the built-in player)",
      options: [
        { label: "Auto", value: "auto" },
        { label: "show.fm player", value: "showfm" },
        { label: "Built-in player", value: "native" },
      ],
    },
    size: {
      type: "select" as const,
      label: "show.fm player size",
      options: [
        { label: "Standard", value: "standard" },
        { label: "Compact", value: "compact" },
      ],
    },
    transcript: {
      type: "select" as const,
      label: "show.fm player transcript (standard size only)",
      options: [
        { label: "None", value: "none" },
        { label: "Button", value: "on" },
        { label: "Open", value: "open" },
        { label: "Full-screen reader", value: "reader" },
      ],
    },
    theme: {
      type: "select" as const,
      label: "show.fm player theme",
      options: [
        { label: "Follow the show", value: "follow-show" },
        { label: "Follow the visitor", value: "auto" },
        { label: "Light", value: "light" },
        { label: "Dark", value: "dark" },
      ],
    },
    accent: {
      type: "text" as const,
      label: "show.fm player accent colour, hex like #0ea5e9 (empty follows the show)",
    },
    miniPlayer: {
      type: "radio" as const,
      label: "Mini-player when scrolled out of view",
      options: [
        { label: "Off", value: "off" },
        { label: "On", value: "on" },
      ],
    },
    headingLevel: {
      type: "select" as const,
      label: "Wrap the episode title in a heading",
      options: [
        { label: "No heading", value: "none" },
        { label: "H2", value: "2" },
        { label: "H3", value: "3" },
        { label: "H4", value: "4" },
        { label: "H5", value: "5" },
        { label: "H6", value: "6" },
      ],
    },
  },
  defaultProps: {
    episodeSlug: "",
    episodeEndpoint: DEFAULT_ENDPOINTS.episode,
    episodesEndpoint: DEFAULT_ENDPOINTS.episodes,
    playerMode: "auto" as const,
    size: "standard" as const,
    transcript: "none" as const,
    theme: "follow-show" as const,
    accent: "",
    miniPlayer: "off" as const,
    headingLevel: "none" as const,
  },
  render: (props: Partial<Props> & { id?: string }) => (
    <EpisodePlayerBlockView
      episodeSlug={props.episodeSlug}
      episodeEndpoint={props.episodeEndpoint}
      episodesEndpoint={props.episodesEndpoint}
      playerMode={props.playerMode}
      size={props.size}
      transcript={props.transcript}
      theme={props.theme}
      accent={props.accent}
      miniPlayer={props.miniPlayer}
      headingLevel={props.headingLevel}
    />
  ),
};
