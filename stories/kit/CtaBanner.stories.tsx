import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CtaBannerBlock, type CtaBannerProps } from "@/components/puck/blocks/cta/cta.block";
import { IMG } from "../_helpers/kit-images";
import { kit } from "../_helpers/kit-content";

const meta = {
  title: "Kit blocks/CTA Banner",
  parameters: {
    docs: {
      description: {
        component:
          "Conversion banner. A section: `--cc-section-y` above and below, the card sits on the page gutter. Box padding follows the 8pt scale (`--cc-space-5/6/7/8`).",
      },
    },
  },
  render: (args) => kit(CtaBannerBlock, args),
  args: {
    eyebrow: "",
    title: "Never miss an episode",
    subtitle: "New conversations every other week, in your podcast app and in your inbox.",
    buttonLabel: "Subscribe",
    buttonHref: "#",
    secondaryLabel: "",
    secondaryHref: "#",
    layout: "centered",
    align: "center",
    tone: "yellow",
    decoration: "none",
    corners: "round",
    padding: "regular",
    image: IMG.hero,
  },
  argTypes: {
    layout: { control: "inline-radio", options: ["centered", "split", "split image"] },
    align: { control: "inline-radio", options: ["left", "center"] },
    tone: { control: "select", options: ["yellow", "accent", "dark", "light", "gradient", "outline"] },
    decoration: { control: "inline-radio", options: ["none", "glow", "dots"] },
    corners: { control: "inline-radio", options: ["square", "soft", "round"] },
    padding: { control: "inline-radio", options: ["compact", "regular", "spacious"] },
  },
} satisfies Meta<CtaBannerProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithEyebrowAndSecondary: Story = {
  args: { eyebrow: "Stay in the loop", secondaryLabel: "Read the archive" },
};
export const LeftAligned: Story = { args: { align: "left" } };
export const Split: Story = { args: { layout: "split", secondaryLabel: "Read the archive" } };
export const SplitImage: Story = { args: { layout: "split image", align: "left", secondaryLabel: "Read the archive" } };

export const ToneAccent: Story = { args: { tone: "accent" } };
export const ToneDark: Story = { args: { tone: "dark" } };
export const ToneLight: Story = { args: { tone: "light" } };
export const ToneGradient: Story = { args: { tone: "gradient" } };
export const ToneOutline: Story = { args: { tone: "outline" } };

export const DecorationGlow: Story = { args: { tone: "dark", decoration: "glow" } };
export const DecorationDots: Story = { args: { tone: "dark", decoration: "dots" } };

export const CornersSquare: Story = { args: { corners: "square" } };
export const CornersSoft: Story = { args: { corners: "soft" } };
export const PaddingCompact: Story = { args: { padding: "compact" } };
export const PaddingSpacious: Story = { args: { padding: "spacious" } };
