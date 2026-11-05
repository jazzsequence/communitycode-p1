import { TranscriptSourceBlockView } from "@/components/podcast/showfm-blocks";
import { DEFAULT_ENDPOINTS } from "@/lib/block-config";

/**
 * Searchable transcript for one episode. It pairs with an EpisodePlayer for the
 * same episode (click a timestamp to seek, optional follow-along) and works
 * without one. The body is a client component; this file stays a plain module so
 * the Puck config can be imported on the server.
 *
 * Endpoint contract (defaults in lib/block-config.ts; unsafe values fall back):
 *  - transcriptEndpoint: GET, `{slug}` expanded -> `{ cues: {start, end, text,
 *    speaker?}[] }` (seconds, plain text, ordered by start). 404 = no transcript.
 *  - episodeEndpoint / episodesEndpoint: as for the EpisodePlayer block; used to
 *    resolve the slug (or the latest episode) and whether it has a transcript.
 *
 * Source: `auto` uses show.fm's follow-along transcript (@showfm/embed) when it
 * can be offered (show.fm episode whose audio and transcript are both on
 * show.fm's media host), otherwise the native viewer, which keeps its search and
 * the transcriptEndpoint contract above. `showfm` forces the embed when the
 * episode has a UUID and a transcript; `native` never uses it. The show.fm
 * options (height, theme, accent, heading) apply only to the embed; "follow the
 * show" values leave the show's settings in charge, and the embed follows
 * whatever player of that episode is playing on the page.
 */

type Props = {
  episodeSlug: string;
  showSearch: boolean;
  transcriptEndpoint: string;
  episodeEndpoint: string;
  episodesEndpoint: string;
  source: "auto" | "showfm" | "native";
  height: number;
  theme: "follow-show" | "auto" | "light" | "dark";
  accent: string;
  headingLevel: "none" | "2" | "3" | "4" | "5" | "6";
};

export const transcriptViewerBlock = {
  label: "Transcript Viewer",
  fields: {
    episodeSlug: {
      type: "text" as const,
      label: "Episode slug (leave empty for the latest episode)",
    },
    showSearch: {
      type: "radio" as const,
      label: "Search box",
      options: [
        { label: "Show", value: true },
        { label: "Hide", value: false },
      ],
    },
    transcriptEndpoint: {
      type: "text" as const,
      label: "Transcript API URL, with {slug} where the slug goes (returns { cues })",
    },
    episodeEndpoint: {
      type: "text" as const,
      label: "Episode API URL, with {slug} where the slug goes (returns { episode })",
    },
    episodesEndpoint: {
      type: "text" as const,
      label: "Episode list API URL, used for the latest episode (returns { episodes })",
    },
    source: {
      type: "select" as const,
      label: "Transcript (auto = show.fm follow-along when available, otherwise the built-in viewer)",
      options: [
        { label: "Auto", value: "auto" },
        { label: "show.fm transcript", value: "showfm" },
        { label: "Built-in viewer", value: "native" },
      ],
    },
    height: {
      type: "number" as const,
      label: "show.fm transcript text height in px (120 to 2000)",
      min: 120,
      max: 2000,
    },
    theme: {
      type: "select" as const,
      label: "show.fm transcript theme",
      options: [
        { label: "Follow the show", value: "follow-show" },
        { label: "Follow the visitor", value: "auto" },
        { label: "Light", value: "light" },
        { label: "Dark", value: "dark" },
      ],
    },
    accent: {
      type: "text" as const,
      label: "show.fm transcript accent colour, hex like #0ea5e9 (empty follows the show)",
    },
    headingLevel: {
      type: "select" as const,
      label: "Make the name \"Transcript\" a heading (show.fm transcript)",
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
    showSearch: true,
    transcriptEndpoint: DEFAULT_ENDPOINTS.transcript,
    episodeEndpoint: DEFAULT_ENDPOINTS.episode,
    episodesEndpoint: DEFAULT_ENDPOINTS.episodes,
    source: "auto" as const,
    height: 320,
    theme: "follow-show" as const,
    accent: "",
    headingLevel: "none" as const,
  },
  render: (props: Partial<Props> & { id?: string }) => (
    <TranscriptSourceBlockView
      source={props.source}
      height={props.height}
      theme={props.theme}
      accent={props.accent}
      headingLevel={props.headingLevel}
      episodeSlug={props.episodeSlug}
      showSearch={props.showSearch !== false}
      transcriptEndpoint={props.transcriptEndpoint}
      episodeEndpoint={props.episodeEndpoint}
      episodesEndpoint={props.episodesEndpoint}
    />
  ),
};
