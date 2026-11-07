import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EmbedBlock, type EmbedProps } from "@/components/puck/blocks/embed/embed.block";
import { kit } from "../_helpers/kit-content";

/**
 * No story sets a real `url`: that would load a third-party iframe. With no
 * address the block renders its placeholder, which is what an editor sees until
 * a provider URL is pasted. The frame, sizing and caption are what matter here.
 */
const meta = {
  title: "Kit blocks/Embed",
  parameters: {
    docs: {
      description: {
        component:
          "A framed third-party embed (video, social, map). Stories leave `url` empty so the placeholder shows and nothing loads offline. `contained` and `wide` both sit on the page gutter.",
      },
    },
  },
  render: (args) => kit(EmbedBlock, args),
  args: { kind: "video", url: "", title: "Season 2 trailer", ratio: "16 / 9", caption: "", width: "wide" },
  argTypes: {
    kind: { control: "inline-radio", options: ["video", "social", "map", "generic"] },
    ratio: { control: "inline-radio", options: ["16 / 9", "4 / 3", "1 / 1"] },
    width: { control: "inline-radio", options: ["contained", "wide"] },
  },
} satisfies Meta<EmbedProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithCaption: Story = { args: { caption: "Watch the full season trailer." } };
export const Contained: Story = { args: { width: "contained" } };
export const Social: Story = { args: { kind: "social", title: "A post worth embedding" } };
export const Map: Story = { args: { kind: "map", title: "Where we recorded", ratio: "4 / 3" } };
export const Generic: Story = { args: { kind: "generic", title: "Embedded content", ratio: "1 / 1", width: "contained" } };
