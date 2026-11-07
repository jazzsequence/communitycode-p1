import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FaqBlock, type FaqProps } from "@/components/puck/blocks/faq/faq.block";
import { kit } from "../_helpers/kit-content";

const ITEMS = [
  { q: "How often do new episodes come out?", a: "Every other week, usually on a Tuesday.", category: "Show" },
  { q: "Can I be a guest?", a: "Yes. Fill in the guest form and we will be in touch about scheduling.", category: "Guests" },
  { q: "Are transcripts available?", a: "Every episode has a full, searchable transcript on its page.", category: "Show" },
  { q: "Where can I listen?", a: "Apple Podcasts, Spotify, or any app that takes an RSS feed.", category: "Listening" },
];

const meta = {
  title: "Kit blocks/FAQ",
  parameters: {
    docs: {
      description: {
        component:
          "Question and answer list. A section: `--cc-section-y` above and below; the heading and questions start on the page gutter and read at `--cc-narrow` width in the accordion layout.",
      },
    },
  },
  render: (args) => kit(FaqBlock, args),
  args: {
    heading: "Questions, answered",
    items: ITEMS,
    layout: "accordion",
    categories: "off",
    first: "off",
    contact: "off",
    contactTitle: "Still have questions?",
    contactText: "Send us a note and we will get back to you.",
    contactLabel: "Contact us",
    contactHref: "#",
  },
  argTypes: {
    layout: { control: "inline-radio", options: ["accordion", "2-col", "with search"] },
    categories: { control: "inline-radio", options: ["off", "on"] },
    first: { control: "inline-radio", options: ["off", "on"] },
    contact: { control: "inline-radio", options: ["off", "on"] },
  },
} satisfies Meta<FaqProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const FirstOpen: Story = { args: { first: "on" } };
export const TwoColumns: Story = { args: { layout: "2-col" } };
export const WithSearch: Story = { args: { layout: "with search" } };
export const WithCategories: Story = { args: { categories: "on" } };
export const WithContact: Story = { args: { contact: "on" } };
export const EverythingOn: Story = { args: { layout: "with search", categories: "on", first: "on", contact: "on" } };
