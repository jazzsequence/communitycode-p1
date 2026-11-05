import type { ComponentConfig } from "@puckeditor/core";
import { defineMeta } from '@/lib/define-meta';
import { P1_ASSETS } from '@/lib/assets';
import { FeatureMediaRender, type FeatureMediaProps, type FeatureMediaBullet, type FeatureMediaTab } from "./feature-media";
export type { FeatureMediaProps, FeatureMediaBullet, FeatureMediaTab };

export const FeatureMediaBlock: ComponentConfig<FeatureMediaProps> = {
  fields: {
    eyebrow: {
      type: "text" as const,
      contentEditable: true,
      visible: false,
      ai: { instructions: "Short label above the heading. 2–4 words. E.g. How it works." },
    },
    title: {
      type: "text" as const,
      contentEditable: true,
      visible: false,
      ai: { instructions: "Section heading. Punchy claim, under 10 words." },
    },
    body: {
      type: "text" as const,
      contentEditable: true,
      visible: false,
      ai: { instructions: "1–2 sentence description supporting the heading." },
    },
    bullets: {
      label: "Bullets (not in tabs)",
      type: "array" as const,
      arrayFields: {
        text: {
          type: "text" as const,
          contentEditable: true,
          visible: false,
          ai: { instructions: "One benefit, 4–8 words." },
        },
      },
      defaultItemProps: { text: "Benefit" },
      getItemSummary: (item: FeatureMediaBullet) => item.text || "Bullet",
    },
    buttonLabel: {
      type: "text" as const,
      contentEditable: true,
      visible: false,
      ai: { instructions: "CTA label. 3–6 words. E.g. See how it works →" },
    },
    buttonHref: {
      type: "text" as const,
      ai: { exclude: true },
    },
    buttonTarget: {
      type: "radio" as const,
      options: [
        { label: "Same tab", value: "_self" },
        { label: "New tab", value: "_blank" },
      ],
      ai: { exclude: true },
    },
    imageSrc: {
      type: "text" as const,
      ai: { exclude: true },
    },
    mediaSide: {
      label: "Image side (when layout is unset)",
      type: "radio" as const,
      options: [
        { label: "Right", value: "right" },
        { label: "Left", value: "left" },
      ],
    },
    tone: {
      type: "select" as const,
      options: [
        { label: "White", value: "white" },
        { label: "Light", value: "light" },
        { label: "Dark", value: "dark" },
      ],
    },
    layout: {
      type: "select" as const,
      options: [
        { label: "Image right", value: "image right" },
        { label: "Image left", value: "image left" },
        { label: "Tabs", value: "tabs" },
        { label: "Centered + below", value: "centered + below" },
      ],
    },
    tabs: {
      label: "Tabs (tabs only)",
      type: "array" as const,
      arrayFields: {
        label: {
          type: "text" as const,
          contentEditable: true,
          ai: { instructions: "Tab label, one word. E.g. Detect." },
        },
        text: {
          type: "text" as const,
          contentEditable: true,
          ai: { instructions: "One sentence shown when the tab is selected." },
        },
      },
      defaultItemProps: { label: "Tab", text: "Describe this step." },
      getItemSummary: (item: FeatureMediaTab) => item.label || "Tab",
    },
    padding: {
      type: "select" as const,
      options: [
        { label: "Compact", value: "compact" },
        { label: "Regular", value: "regular" },
        { label: "Spacious", value: "spacious" },
      ],
    },
  },
  defaultProps: {
    eyebrow: "How it works",
    title: "Designed around the way you work.",
    body: "Move from idea to published in a few clicks. Preview every change, then make it live whenever you're ready.",
    bullets: [
      { text: "Visual, on-brand editing" },
      { text: "Preview before you publish" },
      { text: "Publish in one click" },
    ],
    buttonLabel: "See how it works →",
    buttonHref: "",
    buttonTarget: "_self",
    imageSrc: P1_ASSETS.FEATURE_MEDIA,
    mediaSide: "right",
    tone: "white",
    layout: "image right",
    tabs: [
      { label: "Detect", text: "Find every pending update." },
      { label: "Test", text: "Run visual regression in isolation." },
      { label: "Deploy", text: "Promote when it passes." },
    ],
    padding: "regular",
  },
  // An unset layout reads as no option in the editor's select, so fill it from the side the block used to store.
  resolveData: ({ props }) => ({
    props: props.layout ? props : { ...props, layout: props.mediaSide === "left" ? "image left" : "image right" },
  }),
  render: FeatureMediaRender,
};

export const meta = defineMeta({
  title: 'Feature Media',
  description: 'Text and image block with eyebrow, title, body, bullet points and a CTA button, with the image left or right, switchable tabs, or centered with the image below; use for product feature highlights.',
  categories: ["value"],
  published: true,
  registryDependencies: ["@p1/tokens","@p1/internal-btn","@p1/internal-icons","@p1/internal-img"],
});
