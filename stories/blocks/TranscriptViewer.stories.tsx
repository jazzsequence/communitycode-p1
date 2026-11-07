import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { transcriptViewerBlock } from "@/components/puck/podcast/transcript-viewer";
import { withMockApi } from "../_helpers/mock-api";
import { renderBlock } from "../_helpers/render-block";
import { cues } from "../_helpers/fixtures";
import { latestRich, longCues, showfmEpisode } from "../_helpers/fixtures-episodes";

const ep = latestRich; // has a transcript url, so the native viewer is offered
const item = /^\/api\/episodes\/[^/]+$/;
const transcript = /^\/api\/episodes\/[^/]+\/transcript$/;

type Args = Record<string, unknown>;

const meta: Meta<Args> = {
  title: "Podcast blocks/Transcript Viewer",
  parameters: {
    docs: {
      description: {
        component:
          "Searchable, timestamped transcript for one episode; it seeks a paired Episode Player on click and highlights the current line when one is playing. `source` auto uses show.fm's follow-along transcript for show.fm-hosted episodes and the built-in viewer otherwise. " +
          "Reads `GET /api/episodes/{slug}` -> `{ episode }` (or the list endpoint for the latest) and, for the built-in viewer, `GET /api/episodes/{slug}/transcript` -> `{ cues: { start, end, text, speaker? }[] }` (seconds; 404 means no transcript). " +
          "The show.fm stories load the real vendor embed for a real public episode, so they need network access to api.show.fm.",
      },
    },
  },
  args: { episodeSlug: ep.slug },
  decorators: [withMockApi([[transcript, { cues: longCues }], [item, { episode: ep }]])],
  render: (args) => <>{renderBlock(transcriptViewerBlock, args)}</>,
};
export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

export const ShortTranscript: Story = {
  decorators: [withMockApi([[transcript, { cues }], [item, { episode: ep }]])],
};

export const WithoutSearch: Story = { args: { showSearch: false } };

export const Showfm: Story = {
  args: { episodeSlug: showfmEpisode.slug, source: "auto", theme: "dark", height: 320 },
  decorators: [withMockApi([[item, { episode: showfmEpisode }]])],
};

export const ShowfmTall: Story = {
  args: { episodeSlug: showfmEpisode.slug, source: "showfm", theme: "dark", height: 560, accent: "#f0a35e", headingLevel: "2" },
  decorators: [withMockApi([[item, { episode: showfmEpisode }]])],
};

export const Loading: Story = {
  decorators: [withMockApi([[transcript, () => ({ body: { cues }, delayMs: 600000 })], [item, { episode: ep }]])],
};

export const EpisodeLookupLoading: Story = {
  decorators: [withMockApi([[transcript, { cues }], [item, () => ({ body: { episode: ep }, delayMs: 600000 })]])],
};

export const NoTranscript: Story = {
  decorators: [withMockApi([[item, { episode: { ...ep, transcript: null } }]])],
};

export const EmptyCues: Story = {
  decorators: [withMockApi([[transcript, { cues: [] }], [item, { episode: ep }]])],
};

export const ErrorState: Story = {
  name: "Error",
  decorators: [withMockApi([[transcript, () => ({ status: 500, body: {} })], [item, { episode: ep }]])],
};

export const EpisodeLookupError: Story = {
  decorators: [withMockApi([[item, () => ({ status: 500, body: {} })]])],
};
