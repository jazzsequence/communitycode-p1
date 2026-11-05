import { EpisodePlayerView } from "@/components/podcast/audio-player";
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
 */

type Props = {
  episodeSlug: string;
  episodeEndpoint: string;
  episodesEndpoint: string;
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
  },
  defaultProps: {
    episodeSlug: "",
    episodeEndpoint: DEFAULT_ENDPOINTS.episode,
    episodesEndpoint: DEFAULT_ENDPOINTS.episodes,
  },
  render: (props: Partial<Props> & { id?: string }) => (
    <EpisodePlayerView
      episodeSlug={props.episodeSlug}
      episodeEndpoint={props.episodeEndpoint}
      episodesEndpoint={props.episodesEndpoint}
    />
  ),
};
