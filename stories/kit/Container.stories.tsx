import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ColumnsBlock } from "@/components/puck/blocks/columns/columns.block";
import { ContainerBlock, type ContainerProps } from "@/components/puck/blocks/container/container.block";
import { Stack, heading, kit, paragraph } from "../_helpers/kit-content";
import { slot } from "../_helpers/render-block";

type Args = Omit<ContainerProps, "content">;

const content = slot(<Stack title="Grouped content" cta="A button" />);

const meta = {
  title: "Kit blocks/Container",
  parameters: {
    docs: {
      description: {
        component:
          "A constrained wrapper slot. The box sits on the page gutter like any block; `pad` is the box's inner padding, `maxWidth` narrows the content inside the box. Blocks nested inside add no gutter of their own.",
      },
    },
  },
  render: (args) => kit(ContainerBlock, { ...args, content }),
  args: { tone: "light", pad: "regular", maxWidth: "standard", align: "left", radius: "soft" },
  argTypes: {
    tone: { control: "inline-radio", options: ["none", "light", "white"] },
    pad: { control: "inline-radio", options: ["compact", "regular", "spacious"] },
    maxWidth: { control: "inline-radio", options: ["narrow", "standard", "wide", "full"] },
    align: { control: "inline-radio", options: ["left", "center"] },
    radius: { control: "inline-radio", options: ["none", "soft", "round"] },
  },
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ToneNone: Story = { args: { tone: "none" } };
export const ToneWhite: Story = { args: { tone: "white" } };
export const PadCompact: Story = { args: { pad: "compact" } };
export const PadSpacious: Story = { args: { pad: "spacious" } };
export const MaxWidthNarrow: Story = { args: { maxWidth: "narrow" } };
export const MaxWidthWide: Story = { args: { maxWidth: "wide" } };
export const MaxWidthFull: Story = { args: { maxWidth: "full" } };
export const NarrowCentered: Story = { args: { maxWidth: "narrow", align: "center" } };
export const RadiusNone: Story = { args: { radius: "none" } };
export const RadiusRound: Story = { args: { radius: "round" } };
export const Empty: Story = { render: (args) => kit(ContainerBlock, args) };

export const NestedColumns: Story = {
  args: { maxWidth: "full" },
  render: (args) =>
    kit(ContainerBlock, {
      ...args,
      content: slot(
        <>
          {heading("Columns inside a container", "H2")}
          {paragraph("Neither wrapper may add a gutter on top of the container's own padding.")}
          {kit(ColumnsBlock, {
            distribution: "1:1",
            col1: slot(<Stack title="One" />),
            col2: slot(<Stack title="Two" />),
          })}
        </>,
      ),
    }),
};
