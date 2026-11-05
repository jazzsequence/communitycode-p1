"use client";

import { usePathname } from "next/navigation";
import { safeLinks, isExternalHref, type LabelledLink } from "@/lib/safe-link";
import { currentState } from "./chrome-nav";
import "./chrome-blocks.css";

/**
 * The link list shared by header and footer. A client island only because
 * `aria-current` needs the pathname; links are plain anchors and render on the
 * server. `usePathname` is null outside the App Router (e.g. some previews), in
 * which case nothing is marked current rather than crashing.
 */
export function ChromeNavList({
  links,
  onNavigate,
}: {
  links: readonly LabelledLink[] | undefined;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const safe = safeLinks(links);
  if (!safe.length) return null;
  return (
    <ul className="cc-chrome-list">
      {safe.map((l, i) => {
        const external = isExternalHref(l.href);
        return (
          <li key={`${i}-${l.href}`}>
            <a
              className="cc-chrome-link"
              href={l.href}
              aria-current={currentState(pathname, l.href)}
              {...(external ? { rel: "noopener noreferrer" } : {})}
              onClick={onNavigate}
            >
              {l.label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
