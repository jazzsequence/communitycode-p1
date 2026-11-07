import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HeadingBlock, type HeadingProps } from "@/components/puck/blocks/heading/heading.block";
import { kit } from "../_helpers/kit-content";

const meta = {
  title: "Kit blocks/Heading",
  parameters: {
    docs: {
      description: {
        component:
          "A single H1-H4. A small block: `--cc-block-y` above and below, `--cc-gutter` on the sides. Level changes the element and the size; it does not change spacing.",
      },
    },
  },
  render: (args) => kit(HeadingBlock, args),
  args: { text: "A heading to anchor the section", level: "H2", align: "left" },
  argTypes: {
    level: { control: "inline-radio", options: ["H1", "H2", "H3", "H4"] },
    align: { control: "inline-radio", options: ["left", "center"] },
  },
} satisfies Meta<HeadingProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const H1: Story = { args: { level: "H1", text: "Community + Code" } };
export const H3: Story = { args: { level: "H3" } };
export const H4: Story = { args: { level: "H4" } };
export const Centered: Story = { args: { align: "center" } };
export const LongWraps: Story = {
  args: {
    level: "H2",
    text: "A much longer heading that has to wrap onto a second line on narrow screens without losing its left edge",
  },
};
