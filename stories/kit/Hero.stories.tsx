import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HeroBlock, type HeroProps } from "@/components/puck/blocks/hero/hero.block";
import { IMG } from "../_helpers/kit-images";
import { kit } from "../_helpers/kit-content";

const meta = {
  title: "Kit blocks/Hero",
  parameters: {
    docs: {
      description: {
        component:
          "Page hero in five layouts. A section: `--cc-section-y` above and below (compact and tall scale that), `--cc-gutter` on the sides. The image is an inline gradient so stories stay offline. The `video background` layout shows the still frame and pause control only (no video source in the kit).",
      },
    },
  },
  render: (args) => kit(HeroBlock, args),
  args: {
    eyebrow: "New episode every other week",
    title: "Conversations with the people behind open source.",
    description:
      "Community + Code is a podcast about the code, the communities that grow around it, and the humans who keep both going.",
    primaryLabel: "Listen now",
    secondaryLabel: "Browse the archive →",
    primaryHref: "#",
    secondaryHref: "#",
    imageSrc: IMG.hero,
    tone: "accent",
    layout: "split",
    imageSide: "right",
    imageFill: "card",
    splitRatio: "even",
    align: "left",
    overlay: "gradient right",
    overlayStrength: "medium",
    knockout: "off",
    frame: "rounded",
    badges: "off",
    badgeItems: [{ text: "38 episodes" }, { text: "36 guests" }, { text: "Transcripts for all" }],
    height: "regular",
  },
  argTypes: {
    layout: { control: "select", options: ["split", "full image", "text only", "with form", "video background"] },
    tone: { control: "inline-radio", options: ["accent", "dark", "light"] },
    height: { control: "inline-radio", options: ["compact", "regular", "tall"] },
    align: { control: "inline-radio", options: ["left", "center", "right"] },
    imageSide: { control: "inline-radio", options: ["right", "left"] },
    imageFill: { control: "inline-radio", options: ["card", "flush"] },
    splitRatio: { control: "inline-radio", options: ["even", "copy-wide", "image-wide"] },
    frame: { control: "inline-radio", options: ["none", "rounded", "browser"] },
    overlay: { control: "select", options: ["none", "scrim", "gradient down", "gradient right"] },
    overlayStrength: { control: "inline-radio", options: ["light", "medium", "heavy"] },
  },
} satisfies Meta<HeroProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Split: Story = { args: { layout: "split" } };
export const SplitImageLeft: Story = { args: { imageSide: "left" } };
export const SplitCopyWide: Story = { args: { splitRatio: "copy-wide" } };
export const SplitImageWide: Story = { args: { splitRatio: "image-wide" } };
export const SplitFlushImage: Story = { args: { imageFill: "flush" } };
export const SplitBrowserFrame: Story = { args: { frame: "browser" } };
export const SplitNoFrame: Story = { args: { frame: "none" } };
export const SplitWithBadges: Story = {
  args: {
    badges: "on",
  },
};

export const TextOnly: Story = { args: { layout: "text only" } };
export const TextOnlyCentered: Story = { args: { layout: "text only", align: "center" } };
export const TextOnlyRight: Story = { args: { layout: "text only", align: "right" } };

export const FullImage: Story = { args: { layout: "full image" } };
export const FullImageCentered: Story = { args: { layout: "full image", align: "center", overlay: "scrim" } };
export const FullImageOverlayDown: Story = {
  args: { layout: "full image", overlay: "gradient down", overlayStrength: "heavy" },
};
export const FullImageNoOverlay: Story = { args: { layout: "full image", overlay: "none" } };

export const WithForm: Story = { args: { layout: "with form", primaryLabel: "Subscribe" } };
export const VideoBackground: Story = { args: { layout: "video background" } };

export const ToneDark: Story = { args: { tone: "dark" } };
export const ToneLight: Story = { args: { tone: "light" } };
export const TextOnlyToneDark: Story = { args: { layout: "text only", tone: "dark" } };
export const TextOnlyToneLight: Story = { args: { layout: "text only", tone: "light" } };
export const WithFormToneLight: Story = { args: { layout: "with form", tone: "light" } };

export const HeightCompact: Story = { args: { height: "compact" } };
export const HeightTall: Story = { args: { height: "tall" } };
export const TextOnlyCompact: Story = { args: { layout: "text only", height: "compact" } };
export const TextOnlyTall: Story = { args: { layout: "text only", height: "tall" } };
export const FullImageTall: Story = { args: { layout: "full image", height: "tall" } };

export const KnockoutTitle: Story = { args: { layout: "text only", knockout: "on" } };
export const LongCopy: Story = {
  args: {
    title: "A deliberately long headline that must wrap across several lines on a phone without clipping",
    description:
      "A long description paragraph to prove that the copy column wraps cleanly, keeps its left edge, and does not push the actions off the page. ".repeat(3),
  },
};
