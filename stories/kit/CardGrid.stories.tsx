import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CardGridBlock, type CardGridProps } from "@/components/puck/blocks/card-grid/card-grid.block";
import { IMG } from "../_helpers/kit-images";
import { kit } from "../_helpers/kit-content";

const ITEMS = [
  { title: "Episode 36: Jacquie Capur", subtitle: "Season 2 - Community", imageUrl: IMG.card1, href: "#" },
  { title: "Episode 35: A maintainer's year", subtitle: "Season 2 - Open source", imageUrl: IMG.card2, href: "#" },
  { title: "Episode 34: Tools that last", subtitle: "Season 2 - Tooling", imageUrl: IMG.card3, href: "#" },
  { title: "Episode 33: Teaching WordPress", subtitle: "Season 2 - Education", imageUrl: IMG.card4, href: "#" },
];

const meta = {
  title: "Kit blocks/Card Grid",
  parameters: {
    docs: {
      description: {
        component:
          "A heading and a grid of image cards. A section: `--cc-section-y` above and below; heading and the first card column start on the page gutter.",
      },
    },
  },
  render: (args) => kit(CardGridBlock, args),
  args: { heading: "Recent conversations", columns: "3", items: ITEMS.slice(0, 3) },
  argTypes: { columns: { control: "inline-radio", options: ["2", "3", "4"] } },
} satisfies Meta<CardGridProps>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const TwoColumns: Story = { args: { columns: "2", items: ITEMS.slice(0, 2) } };
export const FourColumns: Story = { args: { columns: "4", items: ITEMS } };
export const ManyCardsWrap: Story = { args: { columns: "3", items: [...ITEMS, ...ITEMS.slice(0, 2)] } };
export const NoHeading: Story = { args: { heading: "" } };
export const NoImages: Story = { args: { items: ITEMS.slice(0, 3).map((i) => ({ ...i, imageUrl: "" })) } };
export const LongTitles: Story = {
  args: {
    items: ITEMS.slice(0, 3).map((i) => ({
      ...i,
      title: `${i.title} and a title long enough to wrap onto several lines`,
      subtitle: "A subtitle that is also long enough to wrap when the card is narrow",
    })),
  },
};
