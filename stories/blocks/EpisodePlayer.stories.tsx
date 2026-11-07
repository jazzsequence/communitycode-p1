import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { episodePlayerBlock } from "@/components/puck/podcast/episode-player";
import { withMockApi } from "../_helpers/mock-api";
import { renderBlock } from "../_helpers/render-block";
import { episodes } from "../_helpers/fixtures";
import { latestRich, listOf, showfmEpisode } from "../_helpers/fixtures-episodes";

const ep = latestRich;
const item = /^\/api\/episodes\/[^/]+$/;

type Args = Record<string, unknown>;

const meta: Meta<Args> = {
  title: "Podcast blocks/Episode Player",
  parameters: {
    docs: {
      description: {
        component:
          "Audio player for one episode (the slug field, or the latest full episode when empty). `playerMode` auto uses the show.fm embed for episodes show.fm hosts and the built-in `<audio>` player for the rest. " +
          "Reads `GET /api/episodes/{slug}` -> `{ episode }` (slug set) or `GET /api/episodes?limit=1&type=full` -> `{ episodes }` (slug empty); the player needs `episode.audio.url`. " +
          "The built-in player stories use five seconds of silence. The show.fm stories load the real vendor embed for a real public episode, so they need network access to api.show.fm (and show an empty box offline).",
      },
    },
  },
  decorators: [withMockApi([[item, { episode: ep }], ["/api/episodes", listOf(ep)]])],
  render: (args) => <>{renderBlock(episodePlayerBlock, args)}</>,
};
export default meta;
type Story = StoryObj<Args>;

export const Default: Story = { args: { episodeSlug: ep.slug } };

export const LatestEpisode: Story = { args: { episodeSlug: "" } };

export const BuiltInPlayer: Story = { args: { episodeSlug: ep.slug, playerMode: "native" } };

export const ShowfmStandard: Story = {
  args: { episodeSlug: showfmEpisode.slug, playerMode: "auto", theme: "dark" },
  decorators: [withMockApi([[item, { episode: showfmEpisode }]])],
};

export const ShowfmCompact: Story = {
  args: { episodeSlug: showfmEpisode.slug, size: "compact", theme: "dark" },
  decorators: [withMockApi([[item, { episode: showfmEpisode }]])],
};

export const ShowfmWithTranscript: Story = {
  args: { episodeSlug: showfmEpisode.slug, transcript: "open", theme: "dark", accent: "#f0a35e" },
  decorators: [withMockApi([[item, { episode: showfmEpisode }]])],
};

/** headingLevel only affects the show.fm embed: it wraps the episode title in a real heading for the page outline. */
export const ShowfmWithHeading: Story = {
  args: { episodeSlug: showfmEpisode.slug, headingLevel: "2", theme: "dark" },
  decorators: [withMockApi([[item, { episode: showfmEpisode }]])],
};

export const NoAudio: Story = {
  args: { episodeSlug: "episode-35-open-source-maintainers", playerMode: "showfm" },
  decorators: [withMockApi([[item, { episode: episodes[1] }]])],
};

export const Loading: Story = {
  args: { episodeSlug: ep.slug, playerMode: "showfm" },
  decorators: [withMockApi([[item, () => ({ body: { episode: ep }, delayMs: 600000 })]])],
};

export const Missing: Story = {
  args: { episodeSlug: "no-such-episode", playerMode: "showfm" },
  decorators: [withMockApi([[item, () => ({ status: 404, body: {} })]])],
};

export const ErrorState: Story = {
  name: "Error",
  args: { episodeSlug: ep.slug, playerMode: "showfm" },
  decorators: [withMockApi([[item, () => ({ status: 500, body: {} })]])],
};
