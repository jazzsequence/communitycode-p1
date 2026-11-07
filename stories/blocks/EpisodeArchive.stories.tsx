import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { episodeArchiveBlock } from "@/components/puck/podcast/episode-archive";
import { withMockApi } from "../_helpers/mock-api";
import { renderBlock } from "../_helpers/render-block";
import { episodesHandler, listOf, manyEpisodes } from "../_helpers/fixtures-episodes";

type Args = Record<string, unknown>;

const meta: Meta<Args> = {
  title: "Podcast blocks/Episode Archive",
  parameters: {
    docs: {
      description: {
        component:
          "A filterable, paginated grid of episode cards with a season select, an optional type select and a Load more button. " +
          "Reads `GET /api/episodes?limit=&season=&type=a,b&cursor=`, which returns `EpisodeListResponse` (`{ episodes, nextCursor, origin, seasons? }`); `seasons` comes on the first page only and `nextCursor` is an opaque string passed back unchanged. " +
          "In these stories the mock honours limit, season, type and cursor, so the filters and Load more work.",
      },
    },
  },
  decorators: [withMockApi([["/api/episodes", episodesHandler()]])],
  render: (args) => <>{renderBlock(episodeArchiveBlock, args)}</>,
};
export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

export const WithTypeFilter: Story = { args: { showTypeFilter: true, defaultType: "all" } };

export const BonusOnly: Story = { args: { defaultType: "bonus", showTypeFilter: true, heading: "Bonus episodes" } };

export const SmallPage: Story = { args: { pageSize: 6, heading: "Recent episodes" } };

export const NoHeading: Story = { args: { heading: "" } };

export const SinglePage: Story = {
  decorators: [withMockApi([["/api/episodes", listOf(...manyEpisodes.slice(0, 5))]])],
};

export const Loading: Story = {
  decorators: [withMockApi([["/api/episodes", () => ({ body: listOf(), delayMs: 600000 })]])],
};

export const Empty: Story = {
  decorators: [withMockApi([["/api/episodes", { episodes: [], nextCursor: null, origin: "wordpress", seasons: [] }]])],
};

export const ErrorState: Story = {
  name: "Error",
  decorators: [withMockApi([["/api/episodes", () => ({ status: 500, body: { error: "upstream" } })]])],
};

/** First page loads, "Load more" fails: the grid stays and a Retry appears under it. */
export const LoadMoreError: Story = {
  decorators: [
    withMockApi([
      [
        "/api/episodes",
        (url) => {
          const first = !url.searchParams.get("cursor");
          return first
            ? { body: { episodes: manyEpisodes.slice(0, 12), nextCursor: "12", origin: "wordpress", seasons: [1, 2] } }
            : { status: 500, body: { error: "upstream" } };
        },
      ],
    ]),
  ],
};
