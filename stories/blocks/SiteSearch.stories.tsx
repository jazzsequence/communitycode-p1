import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { siteSearchBlock } from "@/components/puck/podcast/site-search";
import { withMockApi } from "../_helpers/mock-api";
import { renderBlock } from "../_helpers/render-block";
import { searchEpisodes } from "../_helpers/fixtures-show";

// Block props are an open record: each block validates its own, and the stories omit what they don't vary.
type Args = Record<string, unknown>;

const meta: Meta<Args> = {
  title: "Podcast blocks/Site Search",
  render: (args) => <>{renderBlock(siteSearchBlock, args)}</>,
  decorators: [withMockApi([["/api/episodes", searchEpisodes]])],
  parameters: {
    docs: {
      description: {
        component:
          "Search-as-you-type over episodes (`GET /api/episodes?q=&limit=`, debounced, minimum 2 characters). Results link to the episode page. Without JavaScript the form is a plain GET to the page set in `formAction`. The mocked endpoint filters the fixture episodes by title, description and guest.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<Args>;

const search = (term: string) => async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  const input = await within(canvasElement).findByRole("searchbox");
  await userEvent.type(input, term, { delay: 0 });
};

export const Default: Story = {};

export const WithResults: Story = { play: search("episode") };

export const NoResults: Story = { play: search("zzzz") };

/** More matches than `maxResults`: "Showing the first N". */
export const MoreThanMax: Story = { args: { maxResults: 3 }, play: search("episode") };

export const Searching: Story = {
  decorators: [withMockApi([["/api/episodes", () => ({ body: {}, delayMs: 600000 })]])],
  play: search("jacquie"),
};

export const ErrorState: Story = {
  decorators: [withMockApi([["/api/episodes", () => ({ status: 500, body: {} })]])],
  play: search("jacquie"),
};

export const NoHeading: Story = { args: { heading: "" } };
