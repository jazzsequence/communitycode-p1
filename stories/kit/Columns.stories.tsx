import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ColumnsBlock, type ColumnsProps } from "@/components/puck/blocks/columns/columns.block";
import { ImageBlock } from "@/components/puck/blocks/image/image.block";
import { CalloutBlock } from "@/components/puck/blocks/callout/callout.block";
import { Stack, button, heading, kit, list, paragraph } from "../_helpers/kit-content";
import { IMG } from "../_helpers/kit-images";
import { slot } from "../_helpers/render-block";

type Args = Omit<ColumnsProps, "col1" | "col2" | "col3" | "col4">;

const TITLES = ["Listen", "Read", "Watch", "Join"];

/** Fill the first `n` columns with a heading/paragraph/button stack. */
const stacks = (n: number) =>
  Object.fromEntries(
    TITLES.slice(0, n).map((title, i) => [
      `col${i + 1}`,
      slot(<Stack title={title} cta={i === 0 ? "Start here" : undefined} />),
    ]),
  );

const COUNT = { "1:1": 2, "2:1": 2, "1:2": 2, "1:1:1": 3, "1:1:1:1": 4 } as const;

const meta = {
  title: "Kit blocks/Columns",
  parameters: {
    docs: {
      description: {
        component:
          "A 2-4 column grid whose columns are slots. Blocks nested inside add **no gutter of their own**: the Columns block carries the page gutter, so nested text must sit on the same left edge as a top-level block. Stories nest real kit blocks.",
      },
    },
  },
  render: (args) => kit(ColumnsBlock, { ...args, ...stacks(COUNT[args.distribution ?? "1:1"]) }),
  args: { distribution: "1:1", gap: "regular", valign: "top", tone: "none" },
  argTypes: {
    distribution: { control: "select", options: ["1:1", "2:1", "1:2", "1:1:1", "1:1:1:1"] },
    gap: { control: "inline-radio", options: ["tight", "regular", "wide"] },
    valign: { control: "inline-radio", options: ["top", "center", "stretch"] },
    tone: { control: "inline-radio", options: ["none", "light"] },
  },
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const LeftWide: Story = { args: { distribution: "2:1" } };
export const RightWide: Story = { args: { distribution: "1:2" } };
export const Three: Story = { args: { distribution: "1:1:1" } };
export const Four: Story = { args: { distribution: "1:1:1:1" } };
export const GapTight: Story = { args: { gap: "tight" } };
export const GapWide: Story = { args: { gap: "wide" } };
export const ToneLight: Story = { args: { tone: "light" } };

/** Columns of unequal height, to show what `valign` does. */
const uneven = {
  col1: slot(<Stack title="Short" body="One short line." />),
  col2: slot(
    <Stack
      title="Tall"
      body={"Much more copy in this column so it is taller than its neighbour. It keeps going to make the height difference obvious, which is the whole point of the valign option. ".repeat(2)}
      cta="A button"
    />,
  ),
};
export const ValignTop: Story = { render: (args) => kit(ColumnsBlock, { ...args, ...uneven }) };
export const ValignCenter: Story = {
  args: { valign: "center" },
  render: (args) => kit(ColumnsBlock, { ...args, ...uneven }),
};
export const ValignStretch: Story = {
  args: { valign: "stretch", tone: "light" },
  render: (args) => kit(ColumnsBlock, { ...args, ...uneven }),
};

/** Empty slots show the editor placeholder. */
export const EmptyPlaceholders: Story = { render: (args) => kit(ColumnsBlock, args) };

/** Every kind of kit block nested in columns: none of them may add a second gutter. */
export const NestedKitBlocks: Story = {
  args: { distribution: "1:1:1", gap: "wide" },
  render: (args) =>
    kit(ColumnsBlock, {
      ...args,
      col1: slot(
        <>
          {heading("Text blocks")}
          {paragraph("A paragraph nested in a column: its left edge is the column's left edge.")}
          {list(["Bullet one", "Bullet two", "Bullet three"], "check")}
          {button("Primary action")}
        </>,
      ),
      col2: slot(
        <>
          {kit(ImageBlock, { src: IMG.card1, alt: "", ratio: "4 / 3" })}
          {paragraph("An image block nested above a caption-sized paragraph.", { size: "small" })}
        </>,
      ),
      col3: slot(
        <>
          {kit(CalloutBlock, { variant: "tip", title: "Nested callout", body: "A callout inside a column keeps its box but no extra page gutter." })}
          {button("Secondary", "secondary")}
        </>,
      ),
    }),
};
