import type { ComponentConfig } from "@puckeditor/core";
import { defineMeta } from '@/lib/define-meta';
import { P1_ASSETS } from '@/lib/assets';
import { CardGridRender, type CardGridProps, type CardGridItem } from "./card-grid";
export type { CardGridProps, CardGridItem };

export const CardGridBlock: ComponentConfig<CardGridProps> = {
  fields: {
    heading: {
      type: "text" as const,
      contentEditable: true,
      visible: false,
      ai: { instructions: "A short section heading of 2–5 words. Plain text, sentence case." },
    },
    columns: {
      type: "select" as const,
      options: [
        { label: "2", value: "2" },
        { label: "3", value: "3" },
        { label: "4", value: "4" },
      ],
    },
    items: {
      type: "array" as const,
      arrayFields: {
        title: { type: "text" as const, contentEditable: true, visible: false },
        subtitle: { type: "text" as const, contentEditable: true, visible: false },
        imageUrl: { type: "text" as const },
        href: { type: "text" as const, label: "Card link", ai: { exclude: true } },
      },
      defaultItemProps: {
        title: "Company",
        subtitle: "Industry · Result",
        imageUrl: P1_ASSETS.LANDSCAPE,
        href: "",
      },
      getItemSummary: (item: CardGridItem) => item.title || "Card",
    },
  },
  defaultProps: {
    heading: "Customer stories",
    columns: "3",
    items: [
      { title: "Northwind", subtitle: "Retail · 38% faster launches", imageUrl: P1_ASSETS.CARD_1 },
      { title: "Atlas Media", subtitle: "Publishing · 2M monthly reads", imageUrl: P1_ASSETS.CARD_2 },
      { title: "Brightline", subtitle: "SaaS · 4.9/5 satisfaction", imageUrl: P1_ASSETS.CARD_3 },
    ],
  },
  render: CardGridRender,
};

export const meta = defineMeta({
  title: 'Card Grid',
  description: 'Responsive 2–4 column grid of image+title+subtitle cards with an optional section heading; use for feature or product showcases.',
  categories: ["showcase"],
  published: true,
  registryDependencies: ["@p1/tokens","@p1/internal-btn","@p1/internal-img"],
});
