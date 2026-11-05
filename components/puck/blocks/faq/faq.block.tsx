import type { ComponentConfig } from "@puckeditor/core";
import { defineMeta } from '@/lib/define-meta';
import { FaqRender, type FaqProps, type FaqItem } from "./faq";
export type { FaqProps, FaqItem };

export const FaqBlock: ComponentConfig<FaqProps> = {
  fields: {
    heading: {
      type: "text" as const,
      contentEditable: true,
      visible: false,
      ai: { instructions: "Section heading for the FAQ. E.g. Frequently asked questions." },
    },
    items: {
      type: "array" as const,
      arrayFields: {
        q: {
          type: "text" as const,
          contentEditable: true,
          visible: false,
          ai: { instructions: "A common customer question. End with a question mark." },
        },
        a: {
          type: "text" as const,
          contentEditable: true,
          visible: false,
          ai: { instructions: "Clear, helpful answer. 1–3 sentences." },
        },
        category: {
          type: "text" as const,
          ai: { instructions: "Optional group label shown as a filter chip. 1–2 words. E.g. Billing." },
        },
      },
      defaultItemProps: { q: "Question?", a: "Answer.", category: "" },
      getItemSummary: (item: FaqItem) => item.q || "Question",
    },
    layout: {
      type: "select" as const,
      options: [
        { label: "Accordion", value: "accordion" },
        { label: "2 col", value: "2-col" },
        { label: "With search (display only)", value: "with search" },
      ],
    },
    categories: {
      label: "Category chips (display only)",
      type: "radio" as const,
      options: [
        { label: "Off", value: "off" },
        { label: "On", value: "on" },
      ],
    },
    first: {
      label: "Open first item only (not in 2 col)",
      type: "radio" as const,
      options: [
        { label: "Off", value: "off" },
        { label: "On", value: "on" },
      ],
    },
    contact: {
      type: "radio" as const,
      options: [
        { label: "Off", value: "off" },
        { label: "On", value: "on" },
      ],
    },
    contactTitle: { label: "Contact title (contact on)", type: "text" as const, ai: { instructions: "Heading of the contact card. E.g. Still have questions?" } },
    contactText: { label: "Contact text (contact on)", type: "text" as const, ai: { instructions: "One short line under the contact heading. Leave blank to omit." } },
    contactLabel: { label: "Contact button label (contact on)", type: "text" as const, ai: { instructions: "Contact button label. 1-3 words. E.g. Contact us." } },
    contactHref: { label: "Contact button link (contact on; no link, no button)", type: "text" as const, ai: { instructions: "Link for the contact button. E.g. /contact or https://example.com/support. Leave blank to hide the button." } },
  },
  defaultProps: {
    heading: "Frequently asked questions",
    items: [
      { q: "Do I need a developer to make changes?", a: "No. Anyone on your team can edit pages visually with ready-made blocks — no code required." },
      { q: "Can I use my own components?", a: "Yes. Developers can add custom blocks once, and the whole team can reuse them." },
      { q: "How do previews work?", a: "Every change gets a shareable preview link, so you can review before publishing." },
    ],
    layout: "accordion",
    categories: "off",
    first: "off",
    contact: "off",
    contactTitle: "Still have questions?",
    contactText: "",
    contactLabel: "Contact us",
    contactHref: "",
  },
  render: FaqRender,
};

export const meta = defineMeta({
  title: 'FAQ',
  description: 'Collapsible question-and-answer list in an accordion, two columns or with a search field, with optional category chips and a contact card; use for support or product FAQ sections.',
  categories: ["convert"],
  published: true,
  registryDependencies: ["@p1/tokens","@p1/internal-btn","@p1/internal-icons"],
});
