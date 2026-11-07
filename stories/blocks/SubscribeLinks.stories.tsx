import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { subscribeLinksBlock } from "@/components/puck/podcast/subscribe-links";
import { renderBlock } from "../_helpers/render-block";

// Block props are an open record: each block validates its own, and the stories omit what they don't vary.
type Args = Record<string, unknown>;

const meta: Meta<Args> = {
  title: "Podcast blocks/Subscribe Links",
  render: (args) => <>{renderBlock(subscribeLinksBlock, args)}</>,
  parameters: {
    docs: {
      description: {
        component:
          "A row of buttons to subscribe in a podcast app, plus an optional \"Copy RSS feed URL\" button. Entries without a usable URL are dropped (no dead buttons). The defaults come from `site.config.ts`: only Apple Podcasts and RSS are known, the rest start empty.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<Args>;

const u = (p: string) => `https://example.invalid/${p}`;

export const Default: Story = {};

export const AllPlatforms: Story = {
  args: {
    links: [
      { platform: "apple", url: u("apple") },
      { platform: "spotify", url: u("spotify") },
      { platform: "youtube", url: u("youtube") },
      { platform: "overcast", url: u("overcast") },
      { platform: "pocketcasts", url: u("pocketcasts") },
      { platform: "amazon", url: u("amazon") },
      { platform: "rss", url: u("feed.xml") },
    ],
  },
};

export const CustomLabels: Story = {
  args: {
    links: [
      { platform: "apple", url: u("apple"), label: "Listen on Apple" },
      { platform: "spotify", url: u("spotify"), label: "Listen on Spotify" },
      { platform: "rss", url: u("feed.xml"), label: "Use any app (RSS)" },
    ],
  },
};

export const NoCopyButton: Story = { args: { showCopyFeed: false } };

export const NoHeading: Story = { args: { heading: "" } };

/** Every entry lacks a URL: the empty message, and no copy button without a feed. */
export const Empty: Story = {
  args: { links: [{ platform: "spotify", url: "" }, { platform: "apple", url: "" }], showCopyFeed: true },
};

/** Click "Copy RSS feed URL": shows the confirmation (or the manual-copy fallback where the clipboard is blocked). */
export const CopyFeedback: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: /copy rss feed url/i }));
  },
};
