import * as React from "react";
import "./btn.css";

/**
 * Shared pill button used across blocks (Hero, CTA, Pricing, Lead capture,
 * Feature+Media, Button…). Renders an <a> when `href` is set, else a <span>
 * — matching the static, non-interactive style of the prototype's CanvasButton.
 * `target="_blank"` opens the link in a new tab and adds
 * `rel="noopener noreferrer"`.
 * Shared utility — not a Puck block.
 */
export type BtnVariant = "primary" | "secondary" | "yellow" | "purple" | "dark";

export interface BtnProps {
  variant?: BtnVariant;
  href?: string;
  target?: "_self" | "_blank";
  children: React.ReactNode;
  className?: string;
  /** Renders a <button type="submit"> for use inside a <form>; `href` is ignored. */
  submit?: boolean;
}

export function safeHref(h: unknown): string {
  // Browsers drop tabs and newlines inside a URL, so "/\t/host" becomes "//host"; test the cleaned value.
  // A leading "//" or "/\\" is a protocol-relative URL to another host, so only a single "/" counts as local.
  // In the editor an inline-editable href arrives as an element, which has no replace.
  const url = (typeof h === "string" ? h : "").replace(/[\t\n\r]/g, "");
  return /^(https?:\/\/|\/(?![/\\])|#)/.test(url) ? url : "#";
}

/** Anchor attributes for a link that may open in a new tab. */
export function linkTargetProps(target?: "_self" | "_blank") {
  return target === "_blank"
    ? ({ target: "_blank", rel: "noopener noreferrer" } as const)
    : {};
}

export function Btn({ variant = "primary", href, target, children, className = "", submit }: BtnProps) {
  const cls = ["p1-btn", className].filter(Boolean).join(" ");
  if (submit) {
    return (
      <button type="submit" className={cls} data-variant={variant}>
        {children}
      </button>
    );
  }
  if (href) {
    return (
      <a href={safeHref(href)} className={cls} data-variant={variant} {...linkTargetProps(target)}>
        {children}
      </a>
    );
  }
  return (
    <span className={cls} data-variant={variant}>
      {children}
    </span>
  );
}

export interface TextLinkProps {
  href?: string;
  target?: "_self" | "_blank";
  className?: string;
  "aria-current"?: "page" | "true";
  children: React.ReactNode;
  [dataAttr: `data-${string}`]: string | undefined;
}

/**
 * Text-style link used where a block shows a secondary action or inline link.
 * Renders an <a> when `href` is set, else a <span>, so content saved without a
 * link renders as before. The `p1-textlink` class marks both forms so a
 * stylesheet or a preview can tell a text link from plain text.
 */
export function TextLink({ href, target, className, children, ...rest }: TextLinkProps) {
  const cls = ["p1-textlink", className].filter(Boolean).join(" ");
  if (href) {
    return (
      <a href={safeHref(href)} className={cls} {...rest} {...linkTargetProps(target)}>
        {children}
      </a>
    );
  }
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}
