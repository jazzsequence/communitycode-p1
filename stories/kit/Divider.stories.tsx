import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DividerBlock, type DividerProps } from "@/components/puck/blocks/divider/divider.block";
import { heading, kit, paragraph } from "../_helpers/kit-content";

const meta = {
  title: "Kit blocks/Divider",
  parameters: {
    docs: {
      description: {
        component:
          "A horizontal rule with three styles and three spacings. The rule spans the content width (gutter to gutter). Stories sit it between two text blocks so the spacing is visible.",
      },
    },
  },
  render: (args) => (
    <>
      {heading("Above the divider", "H3")}
      {paragraph("A paragraph above, so the space the divider adds is visible.")}
      {kit(DividerBlock, args)}
      {heading("Below the divider", "H3")}
      {paragraph("And a paragraph below it.")}
    </>
  ),
  args: { style: "solid", spacing: "medium" },
  argTypes: {
    style: { control: "inline-radio", options: ["solid", "dashed", "dots"] },
    spacing: { control: "inline-radio", options: ["small", "medium", "large"] },
  },
} satisfies Meta<DividerProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Dashed: Story = { args: { style: "dashed" } };
export const Dots: Story = { args: { style: "dots" } };
export const SpacingSmall: Story = { args: { spacing: "small" } };
export const SpacingLarge: Story = { args: { spacing: "large" } };
