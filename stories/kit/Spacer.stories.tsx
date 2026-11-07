import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SpacerBlock, type SpacerProps } from "@/components/puck/blocks/spacer/spacer.block";
import { heading, kit, paragraph } from "../_helpers/kit-content";

const meta = {
  title: "Kit blocks/Spacer",
  parameters: {
    docs: {
      description: {
        component:
          "Empty vertical space. Invisible on its own, so stories place it between two text blocks (the gap is the space between them, over and above their own block-y padding).",
      },
    },
  },
  render: (args) => (
    <>
      {heading("Above the spacer", "H3")}
      {paragraph("The gap below this paragraph is the spacer.")}
      {kit(SpacerBlock, args)}
      {heading("Below the spacer", "H3")}
    </>
  ),
  args: { size: "md" },
  argTypes: { size: { control: "inline-radio", options: ["xs", "sm", "md", "lg", "xl"] } },
} satisfies Meta<SpacerProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ExtraSmall: Story = { args: { size: "xs" } };
export const Small: Story = { args: { size: "sm" } };
export const Large: Story = { args: { size: "lg" } };
export const ExtraLarge: Story = { args: { size: "xl" } };
