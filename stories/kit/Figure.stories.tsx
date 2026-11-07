import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FigureBlock, type FigureProps } from "@/components/puck/blocks/figure/figure.block";
import { IMG } from "../_helpers/kit-images";
import { kit } from "../_helpers/kit-content";

const meta = {
  title: "Kit blocks/Figure",
  parameters: {
    docs: {
      description: {
        component:
          "An image with caption and credit. `contained` and `wide` sit within the content width on the page gutter; `full bleed` runs edge to edge by design (the one deliberate exception to the gutter).",
      },
    },
  },
  render: (args) => kit(FigureBlock, args),
  args: {
    src: IMG.hero,
    alt: "Placeholder",
    caption: "Recording the season finale, with the whole team on the call.",
    credit: "Photo: Community + Code",
    ratio: "3 / 2",
    width: "wide",
    radius: "soft",
    treatment: "color",
  },
  argTypes: {
    ratio: { control: "select", options: ["16 / 9", "3 / 2", "4 / 3", "1 / 1", "21 / 9"] },
    width: { control: "inline-radio", options: ["contained", "wide", "full bleed"] },
    radius: { control: "inline-radio", options: ["none", "soft", "round"] },
    treatment: { control: "inline-radio", options: ["color", "b&w"] },
  },
} satisfies Meta<FigureProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Contained: Story = { args: { width: "contained" } };
export const FullBleed: Story = { args: { width: "full bleed" } };
export const Cinematic: Story = { args: { ratio: "21 / 9" } };
export const Square: Story = { args: { ratio: "1 / 1", width: "contained" } };
export const SixteenNine: Story = { args: { ratio: "16 / 9" } };
export const RadiusNone: Story = { args: { radius: "none" } };
export const RadiusRound: Story = { args: { radius: "round" } };
export const BlackAndWhite: Story = { args: { treatment: "b&w" } };
export const NoCaption: Story = { args: { caption: "", credit: "" } };
