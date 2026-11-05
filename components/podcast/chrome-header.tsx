"use client";

import { useId, useRef, useState, useSyncExternalStore, type KeyboardEvent, type MouseEvent } from "react";
import { site } from "@/content/site";
import { safeHref, safeImageUrl, type LabelledLink } from "@/lib/safe-link";
import { ChromeNavList } from "./chrome-nav-list";
import "./chrome-blocks.css";

const noopSubscribe = () => () => {};

export interface SiteHeaderProps {
  links?: readonly LabelledLink[];
  siteName?: string;
  /** Optional logo image URL; the site name stays as the link's text. */
  logo?: string;
  /** Where the brand link goes. */
  homeHref?: string;
}

/** Where "Skip to content" lands: an explicit anchor, a <main>, else the next block. */
function skipTarget(header: HTMLElement | null): HTMLElement | null {
  return (
    document.getElementById("main-content") ??
    document.querySelector<HTMLElement>("main") ??
    (header?.parentElement?.nextElementSibling as HTMLElement | null) ??
    null
  );
}

export function SiteHeaderView({
  links = site.nav as readonly LabelledLink[],
  siteName = site.name,
  logo,
  homeHref = "/",
}: SiteHeaderProps) {
  const navId = useId();
  const [open, setOpen] = useState(false);
  // false on the server and during hydration, true after: the collapse CSS and the
  // toggle button only apply once JS is running, so no-JS mobile keeps a full nav.
  const enhanced = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
      toggleRef.current?.focus();
    }
  };

  const onSkip = (e: MouseEvent<HTMLAnchorElement>) => {
    const target = skipTarget(headerRef.current);
    if (!target) return; // fall back to the #main-content hash
    e.preventDefault();
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus();
    target.scrollIntoView?.();
  };

  const logoSrc = safeImageUrl(logo);
  const name = siteName.trim() || site.name;

  return (
    <header
      ref={headerRef}
      className={`cc-chrome-header${enhanced ? " is-enhanced" : ""}${open ? " is-open" : ""}`}
      onKeyDown={onKeyDown}
    >
      <a className="cc-chrome-skip" href="#main-content" onClick={onSkip}>
        Skip to content
      </a>
      <div className="cc-container cc-chrome-bar">
        <a className="cc-chrome-brand" href={safeHref(homeHref) ?? "/"}>
          {logoSrc ? (
            // Editor-supplied logo on an arbitrary host; next/image would need every host allow-listed.
            <img className="cc-chrome-logo" src={logoSrc} alt="" />
          ) : null}
          <span>{name}</span>
        </a>
        <button
          ref={toggleRef}
          type="button"
          className="cc-btn cc-chrome-toggle"
          aria-expanded={open}
          aria-controls={navId}
          onClick={() => setOpen((o) => !o)}
        >
          Menu
        </button>
        <nav id={navId} className="cc-chrome-nav" aria-label="Primary">
          <ChromeNavList links={links} onNavigate={() => setOpen(false)} />
        </nav>
      </div>
    </header>
  );
}
