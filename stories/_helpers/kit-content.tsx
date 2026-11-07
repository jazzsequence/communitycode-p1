import type { ReactNode } from "react";
import { ButtonBlock } from "@/components/puck/blocks/button/button.block";
import { HeadingBlock } from "@/components/puck/blocks/heading/heading.block";
import { ListBlock } from "@/components/puck/blocks/list/list.block";
import { ParagraphBlock } from "@/components/puck/blocks/paragraph/paragraph.block";
import { renderBlock } from "./render-block";

/**
 * Nested content for Columns / Container stories. Everything is a real kit block
 * rendered through its config, so what a story shows is what the editor stores.
 */
export const heading = (text: string, level: "H1" | "H2" | "H3" | "H4" = "H3"): ReactNode =>
  renderBlock(HeadingBlock, { text, level });

export const paragraph = (text: string, extra: Record<string, unknown> = {}): ReactNode =>
  renderBlock(ParagraphBlock, { text: `<p>${text}</p>`, ...extra });

export const button = (label: string, variant = "primary"): ReactNode =>
  renderBlock(ButtonBlock, { label, variant, href: "#" });

export const list = (items: string[], style = "bullet"): ReactNode =>
  renderBlock(ListBlock, { items: items.map((text) => ({ text })), style });

export const LOREM =
  "Every episode is a conversation with someone who builds, runs or teaches an open source project. We talk about the code, but mostly about the people.";

/** A heading + paragraph + button stack: the usual column filler. */
export function Stack({ title, body = LOREM, cta }: { title: string; body?: string; cta?: string }) {
  return (
    <>
      {heading(title)}
      {paragraph(body)}
      {cta ? button(cta) : null}
    </>
  );
}

/**
 * `renderBlock` for stories: takes any props object (interfaces have no index
 * signature, so they do not fit `Record<string, unknown>`) and returns an Element,
 * which is what a story's `render` must return.
 */
export function kit(config: Parameters<typeof renderBlock>[0], props: object = {}): React.JSX.Element {
  return <>{renderBlock(config, props as Record<string, unknown>)}</>;
}
