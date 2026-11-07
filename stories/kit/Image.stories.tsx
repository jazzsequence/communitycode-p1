import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ImageBlock, type ImageProps } from "@/components/puck/blocks/image/image.block";
import { IMG } from "../_helpers/kit-images";
import { kit } from "../_helpers/kit-content";

const meta = {
  title: "Kit blocks/Image",
  parameters: {
    docs: {
      description: {
        component:
          "A bare image. `contained` follows the page gutter and content width; `full bleed` runs edge to edge by design.",
      },
    },
  },
  render: (args) => kit(ImageBlock, args),
  args: { src: IMG.hero, alt: "Placeholder", width: "contained", ratio: "16 / 9", fit: "cover", position: "center", radius: "soft", treatment: "color" },
  argTypes: {
    width: { control: "inline-radio", options: ["contained", "full bleed"] },
    ratio: { control: "select", options: ["16 / 9", "4 / 3", "1 / 1", "3 / 2", "21 / 9"] },
    fit: { control: "inline-radio", options: ["cover", "contain", "fill"] },
    position: { control: "select", options: ["center", "top", "bottom", "left", "right"] },
    radius: { control: "inline-radio", options: ["none", "soft", "round"] },
    treatment: { control: "inline-radio", options: ["color", "b&w"] },
  },
} satisfies Meta<ImageProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const FullBleed: Story = { args: { width: "full bleed" } };
export const Square: Story = { args: { ratio: "1 / 1" } };
export const Cinematic: Story = { args: { ratio: "21 / 9" } };
export const FitContain: Story = { args: { fit: "contain", ratio: "1 / 1" } };
export const RadiusNone: Story = { args: { radius: "none" } };
export const RadiusRound: Story = { args: { radius: "round" } };
export const BlackAndWhite: Story = { args: { treatment: "b&w" } };
