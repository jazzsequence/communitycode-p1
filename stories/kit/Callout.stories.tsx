import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CalloutBlock, type CalloutProps } from "@/components/puck/blocks/callout/callout.block";
import { kit } from "../_helpers/kit-content";

const meta = {
  title: "Kit blocks/Callout",
  parameters: {
    docs: {
      description: {
        component:
          "An inline note. Four variants: note, info, tip, warning. A small block: `--cc-block-y` above and below, box on the page gutter. Each variant's icon and accent must stay readable on the dark ground.",
      },
    },
  },
  render: (args) => kit(CalloutBlock, args),
  args: {
    variant: "tip",
    title: "Try this",
    body: "Start with the transcript if you are short on time: every episode has one, and it is searchable.",
  },
  argTypes: { variant: { control: "inline-radio", options: ["note", "info", "tip", "warning"] } },
} satisfies Meta<CalloutProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Note: Story = { args: { variant: "note", title: "A note", body: "Episodes before season 2 have no chapter markers." } };
export const Info: Story = { args: { variant: "info", title: "Good to know", body: "Audio is hosted on show.fm; the archive page links to every platform." } };
export const Tip: Story = { args: { variant: "tip" } };
export const Warning: Story = { args: { variant: "warning", title: "Heads up", body: "The old feed URL stops updating on the first of the month. Update your podcast app before then." } };
export const LongBody: Story = {
  args: { body: "A longer callout body that has to wrap across several lines on a narrow screen so we can see how the icon and the text column behave when the copy runs long. ".repeat(3) },
};
export const AllVariants: Story = {
  render: () => (
    <>
      {(["note", "info", "tip", "warning"] as const).map((variant) => (
        <div key={variant}>{kit(CalloutBlock, { variant, title: variant, body: `The ${variant} variant.` })}</div>
      ))}
    </>
  ),
};
