import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ParagraphBlock, type ParagraphProps } from "@/components/puck/blocks/paragraph/paragraph.block";
import { kit } from "../_helpers/kit-content";

const BODY =
  "<p>Every episode is a conversation with someone who builds, runs or teaches an open source project. We talk about the code, but mostly about the people who keep it going.</p><p>A second paragraph shows the space between paragraphs inside one rich-text value, with a <a href=\"#\">link</a> and some <strong>emphasis</strong>.</p>";

const meta = {
  title: "Kit blocks/Paragraph",
  parameters: {
    docs: {
      description: {
        component:
          "Rich-text body copy. The `text` value is stored as sanitised HTML. Reading width is capped by the block, but the left edge stays on the gutter.",
      },
    },
  },
  render: (args) => kit(ParagraphBlock, args),
  args: { text: BODY, style: "body", size: "regular", align: "left" },
  argTypes: {
    style: { control: "inline-radio", options: ["body", "lead"] },
    size: { control: "inline-radio", options: ["small", "regular", "large"] },
    align: { control: "inline-radio", options: ["left", "center"] },
  },
} satisfies Meta<ParagraphProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Lead: Story = { args: { style: "lead" } };
export const Small: Story = { args: { size: "small" } };
export const Large: Story = { args: { size: "large" } };
export const Centered: Story = { args: { align: "center" } };
export const LeadLargeCentered: Story = { args: { style: "lead", size: "large", align: "center" } };
