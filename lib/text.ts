import { createElement, Fragment, type ReactNode } from "react";

/**
 * The text of an inline-editable value. A published page passes a string; the editor passes a
 * wrapper element that carries the text in props.resolved or props.editable.props.value.
 */
export function textOf(v: unknown): string {
  if (typeof v === "string") return v;
  const p = (v as { props?: { resolved?: unknown; editable?: { props?: { value?: unknown } }; value?: unknown } } | null)?.props;
  return String(p?.resolved ?? p?.editable?.props?.value ?? p?.value ?? "");
}

/**
 * Pieces of a line joined with a dot. Empty parts are skipped; an editor element is kept as is,
 * so the text stays editable. An emptied editor field is still an element, so the editor can
 * show a trailing dot that the published page does not.
 */
export function dotJoin(parts: ReactNode[]): ReactNode {
  return parts
    .filter((p) => p != null && p !== false && p !== "")
    .map((p, i) => createElement(Fragment, { key: i }, i > 0 ? " · " : null, p));
}

/** The distinct non-empty texts of a list of inline-editable values, in first-seen order. */
export const distinct = (values: unknown[]): string[] => [...new Set(values.map((v) => textOf(v).trim()).filter(Boolean))];
