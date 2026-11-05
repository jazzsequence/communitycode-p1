import type { ComponentConfig } from "@puckeditor/core";
import { defineMeta } from '@/lib/define-meta';
import { P1_ASSETS } from '@/lib/assets';
import { HeroRender, type HeroProps } from "./hero";
export type { HeroProps };

export const HeroBlock: ComponentConfig<HeroProps> = {
  fields: {
    eyebrow: {
      type: "text" as const,
      contentEditable: true,
      visible: false,
      ai: { instructions: "Short badge label above the headline. 2–5 words. E.g. Now available. Leave blank to omit." },
    },
    title: {
      type: "text" as const,
      contentEditable: true,
      visible: false,
      ai: { instructions: "Main headline. Bold claim, under 8 words." },
    },
    description: {
      type: "text" as const,
      contentEditable: true,
      visible: false,
      ai: { instructions: "1–2 sentence supporting text below the headline." },
    },
    primaryLabel: {
      type: "text" as const,
      contentEditable: true,
      visible: false,
      ai: { instructions: "Primary CTA label. 2–5 words." },
    },
    secondaryLabel: {
      label: "Secondary label (not in with form)",
      type: "text" as const,
      contentEditable: true,
      visible: false,
      ai: { instructions: "Secondary link label. E.g. Book a demo →. Leave blank to omit." },
    },
    primaryHref: {
      type: "text" as const,
      ai: { exclude: true },
    },
    actionHref: {
      type: "text" as const,
      label: "Form action URL (set this to send)",
      ai: { exclude: true },
    },
    primaryTarget: {
      type: "radio" as const,
      options: [
        { label: "Same tab", value: "_self" },
        { label: "New tab", value: "_blank" },
      ],
      ai: { exclude: true },
    },
    secondaryHref: {
      type: "text" as const,
      ai: { exclude: true },
    },
    secondaryTarget: {
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
    tone: {
      type: "select" as const,
      options: [
        { label: "Accent", value: "accent" },
        { label: "Dark", value: "dark" },
        { label: "Light", value: "light" },
      ],
    },
    layout: {
      type: "select" as const,
      options: [
        { label: "Split", value: "split" },
        { label: "Full image", value: "full image" },
        { label: "Text only", value: "text only" },
        { label: "With form", value: "with form" },
        { label: "Video background", value: "video background" },
      ],
      ai: { instructions: "With form shows a sign-up card beside the copy (the primary button becomes the submit). Video background is a dark full-width layout over the image, used as a poster." },
    },
    imageSide: {
      type: "radio" as const,
      options: [
        { label: "Right", value: "right" },
        { label: "Left", value: "left" },
      ],
    },
    imageFill: {
      type: "radio" as const,
      options: [
        { label: "Card", value: "card" },
        { label: "Flush", value: "flush" },
      ],
    },
    splitRatio: {
      type: "select" as const,
      options: [
        { label: "Even", value: "even" },
        { label: "Copy-wide", value: "copy-wide" },
        { label: "Image-wide", value: "image-wide" },
      ],
    },
    align: {
      type: "select" as const,
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    overlay: {
      type: "select" as const,
      options: [
        { label: "None", value: "none" },
        { label: "Scrim", value: "scrim" },
        { label: "Gradient ↓", value: "gradient down" },
        { label: "Gradient →", value: "gradient right" },
      ],
    },
    overlayStrength: {
      type: "select" as const,
      options: [
        { label: "Light", value: "light" },
        { label: "Medium", value: "medium" },
        { label: "Heavy", value: "heavy" },
      ],
    },
    knockout: {
      type: "radio" as const,
      options: [
        { label: "Off", value: "off" },
        { label: "On", value: "on" },
      ],
    },
    frame: {
      type: "radio" as const,
      options: [
        { label: "None", value: "none" },
        { label: "Rounded", value: "rounded" },
        { label: "Browser", value: "browser" },
      ],
      ai: { instructions: "Frame around the image in the split layout. Browser adds a window bar." },
    },
    badges: {
      type: "radio" as const,
      options: [
        { label: "Off", value: "off" },
        { label: "On", value: "on" },
      ],
      ai: { instructions: "Show a row of trust badges under the buttons." },
    },
    badgeItems: {
      type: "array" as const,
      arrayFields: {
        text: {
          type: "text" as const,
          contentEditable: true,
          visible: false,
          ai: { instructions: "Short trust badge. 2–4 words. E.g. SOC 2 Type II." },
        },
      },
      defaultItemProps: { text: "Trusted by teams" },
      getItemSummary: (item: { text: string }) => item.text || "Badge",
      ai: { instructions: "Trust badges shown when Badges is on. 2–4 items." },
    },
    height: {
      type: "select" as const,
      options: [
        { label: "Compact", value: "compact" },
        { label: "Regular", value: "regular" },
        { label: "Tall", value: "tall" },
      ],
      ai: { instructions: "Vertical padding of the hero." },
    },
  },
  defaultProps: {
    eyebrow: "New — now available",
    title: "Your big idea, beautifully online.",
    description:
      "A flexible starting point for your next page. Swap in your own headline, story, and imagery — this layout adapts to whatever you publish.",
    primaryLabel: "Start free trial",
    secondaryLabel: "Book a demo →",
    primaryHref: "",
    primaryTarget: "_self",
    secondaryHref: "",
    actionHref: "",
    secondaryTarget: "_self",
    tone: "accent",
    layout: "split",
    imageSrc: P1_ASSETS.HERO,
    imageSide: "right",
    imageFill: "card",
    splitRatio: "even",
    align: "left",
    overlay: "gradient right",
    overlayStrength: "medium",
    knockout: "off",
    frame: "rounded",
    badges: "off",
    badgeItems: [{ text: "SOC 2 Type II" }, { text: "99.99% uptime" }, { text: "Trusted by 200k+ sites" }],
    height: "regular",
  },
  render: HeroRender,
};

export const meta = defineMeta({
  title: 'Hero',
  description: 'Large page hero with eyebrow, title, description, two CTA buttons, and an image in split, full-image, text-only, with-form and video-background layouts, with optional trust badges; the with-form layout posts to the Form action URL when one is set.',
  categories: ["attention"],
  published: true,
  registryDependencies: ["@p1/tokens","@p1/internal-btn","@p1/internal-img","@p1/internal-icons","@p1/internal-safe-url"],
});
