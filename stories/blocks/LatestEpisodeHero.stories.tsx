import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { latestEpisodeHeroBlock } from "@/components/puck/podcast/latest-episode-hero";
import { withMockApi } from "../_helpers/mock-api";
import { renderBlock } from "../_helpers/render-block";
import { latestLong, latestRich, listOf } from "../_helpers/fixtures-episodes";

type Args = Record<string, unknown>;

const meta: Meta<Args> = {
  title: "Podcast blocks/Latest Episode Hero",
  parameters: {
    docs: {
      description: {
        component:
          "The newest full episode as a page-opening hero: artwork, eyebrow with season and episode, title, date and duration, guests, a clamped description and a Listen button (plus Watch on YouTube when the episode has a link). " +
          "Reads `GET /api/episodes?limit=1&type=full`, which returns `EpisodeListResponse` (`{ episodes, nextCursor, origin, seasons? }`, newest first); only the first episode is used.",
      },
    },
  },
  decorators: [withMockApi([["/api/episodes", listOf(latestRich)]])],
  render: (args) => <>{renderBlock(latestEpisodeHeroBlock, args)}</>,
};
export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

export const WithoutArtwork: Story = { args: { showArtwork: false } };

export const WithoutDescription: Story = { args: { showDescription: false } };

export const CustomLabels: Story = { args: { eyebrow: "Out now", buttonLabel: "Play the episode" } };

export const NoYouTubeNoGuests: Story = {
  decorators: [withMockApi([["/api/episodes", listOf({ ...latestRich, links: {}, guests: [], artworkUrl: null })]])],
};

export const LongContent: Story = {
  decorators: [withMockApi([["/api/episodes", listOf(latestLong)]])],
};

export const Loading: Story = {
  decorators: [withMockApi([["/api/episodes", () => ({ body: listOf(latestRich), delayMs: 600000 })]])],
};

export const Empty: Story = {
  decorators: [withMockApi([["/api/episodes", listOf()]])],
};

export const ErrorState: Story = {
  name: "Error",
  decorators: [withMockApi([["/api/episodes", () => ({ status: 500, body: { error: "upstream" } })]])],
};
