import { TranscriptBlockView } from "@/components/podcast/transcript-view";
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
 */

type Props = {
  episodeSlug: string;
  showSearch: boolean;
  transcriptEndpoint: string;
  episodeEndpoint: string;
  episodesEndpoint: string;
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
  },
  defaultProps: {
    episodeSlug: "",
    showSearch: true,
    transcriptEndpoint: DEFAULT_ENDPOINTS.transcript,
    episodeEndpoint: DEFAULT_ENDPOINTS.episode,
    episodesEndpoint: DEFAULT_ENDPOINTS.episodes,
  },
  render: (props: Partial<Props> & { id?: string }) => (
    <TranscriptBlockView
      episodeSlug={props.episodeSlug}
      showSearch={props.showSearch !== false}
      transcriptEndpoint={props.transcriptEndpoint}
      episodeEndpoint={props.episodeEndpoint}
      episodesEndpoint={props.episodesEndpoint}
    />
  ),
};
