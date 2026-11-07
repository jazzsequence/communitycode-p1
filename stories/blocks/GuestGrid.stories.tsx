import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { guestGridBlock } from "@/components/puck/podcast/guest-grid";
import { withMockApi } from "../_helpers/mock-api";
import { renderBlock } from "../_helpers/render-block";
import { manyGuestsResponse } from "../_helpers/fixtures-episodes";

type Args = Record<string, unknown>;

const meta: Meta<Args> = {
  title: "Podcast blocks/Guest Grid",
  parameters: {
    docs: {
      description: {
        component:
          "A grid of everyone who has appeared on the show: portrait (or an initials tile), name, episode count and links to their episodes. Hosts are hidden by the `excludeRoles` regex. " +
          "Reads `GET /api/guests` -> `GuestsResponse`: `{ guests: [{ name, photoUrl: string|null, role: string|null, episodes: [{ slug, title, season, number }] }] }`, newest appearance first.",
      },
    },
  },
  decorators: [withMockApi([["/api/guests", manyGuestsResponse]])],
  render: (args) => <>{renderBlock(guestGridBlock, args)}</>,
};
export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

export const TwoColumns: Story = { args: { columns: 2 } };

export const FourColumns: Story = { args: { columns: 4 } };

export const WithoutEpisodeCount: Story = { args: { showEpisodeCount: false } };

export const Limited: Story = { args: { limit: 3, heading: "Recent guests" } };

export const ShowEveryone: Story = { args: { excludeRoles: "" } };

export const NoHeading: Story = { args: { heading: "" } };

export const Loading: Story = {
  decorators: [withMockApi([["/api/guests", () => ({ body: manyGuestsResponse, delayMs: 600000 })]])],
};

export const Empty: Story = {
  decorators: [withMockApi([["/api/guests", { guests: [] }]])],
};

export const ErrorState: Story = {
  name: "Error",
  decorators: [withMockApi([["/api/guests", () => ({ status: 500, body: {} })]])],
};
