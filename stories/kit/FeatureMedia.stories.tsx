import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FeatureMediaBlock, type FeatureMediaProps } from "@/components/puck/blocks/feature-media/feature-media.block";
import { IMG } from "../_helpers/kit-images";
import { kit } from "../_helpers/kit-content";

const meta = {
  title: "Kit blocks/Feature Media",
  parameters: {
    docs: {
      description: {
        component:
          "Copy beside (or above) an image. A section: `--cc-section-y` above and below, page gutter on the sides. Layout picks the side; tone picks the background.",
      },
    },
  },
  render: (args) => kit(FeatureMediaBlock, args),
  args: {
    eyebrow: "About the show",
    title: "Built around real conversations.",
    body: "No scripts and no sales pitch: just people who build and look after open source talking about how it actually goes.",
    bullets: [{ text: "Recorded live with guests" }, { text: "Full transcripts for every episode" }, { text: "Show notes with every link" }],
    buttonLabel: "Meet the guests",
    buttonHref: "#",
    imageSrc: IMG.wide,
    mediaSide: "right",
    tone: "white",
    layout: "image right",
    tabs: [
      { label: "Record", text: "Guests join a live session and we talk." },
      { label: "Edit", text: "Light editing, transcript generated." },
      { label: "Publish", text: "Show notes and audio go out together." },
    ],
    padding: "regular",
  },
  argTypes: {
    layout: { control: "select", options: ["image right", "image left", "tabs", "centered + below"] },
    tone: { control: "inline-radio", options: ["white", "light", "dark"] },
    padding: { control: "inline-radio", options: ["compact", "regular", "spacious"] },
  },
} satisfies Meta<FeatureMediaProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ImageLeft: Story = { args: { layout: "image left" } };
export const Tabs: Story = { args: { layout: "tabs" } };
export const CenteredBelow: Story = { args: { layout: "centered + below" } };
export const ToneLight: Story = { args: { tone: "light" } };
export const ToneDark: Story = { args: { tone: "dark" } };
export const PaddingCompact: Story = { args: { padding: "compact" } };
export const PaddingSpacious: Story = { args: { padding: "spacious" } };
export const NoBulletsNoButton: Story = { args: { bullets: [], buttonLabel: "" } };
