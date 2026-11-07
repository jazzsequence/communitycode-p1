import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ListBlock, type ListProps } from "@/components/puck/blocks/list/list.block";
import { kit } from "../_helpers/kit-content";

const meta = {
  title: "Kit blocks/List",
  parameters: {
    docs: {
      description: { component: "Bullet, numbered or check list. Markers use the accent colour." },
    },
  },
  render: (args) => kit(ListBlock, args),
  args: {
    items: [
      { text: "First item that gets the reader's attention" },
      { text: "Second item with supporting detail" },
      { text: "Third item that rounds out the set" },
    ],
    style: "bullet",
  },
  argTypes: { style: { control: "inline-radio", options: ["bullet", "numbered", "check"] } },
} satisfies Meta<ListProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Numbered: Story = { args: { style: "numbered" } };
export const Check: Story = { args: { style: "check" } };
export const LongItemsWrap: Story = {
  args: {
    style: "check",
    items: [
      { text: "An item long enough that it must wrap onto a second line on a phone, so the hanging indent and marker alignment are visible" },
      { text: "A short one" },
      { text: "Another long item that goes on for a while to prove wrapped lines stay aligned with the first line of text, not the marker" },
    ],
  },
};
