import { site } from "@/content/site";
import { safeHref, isExternalHref, safeLinks, type LabelledLink } from "@/lib/safe-link";
import { ChromeNavList } from "./chrome-nav-list";
import { copyrightYear } from "./chrome-nav";
import "./chrome-blocks.css";

export interface SiteFooterProps {
  tagline?: string;
  links?: readonly LabelledLink[];
  extraLinks?: readonly LabelledLink[];
  copyrightText?: string;
}

export function SiteFooterView({
  tagline = site.tagline,
  links = site.nav as readonly LabelledLink[],
  extraLinks = [],
  copyrightText = site.name,
}: SiteFooterProps) {
  // Both come from env and may be unset (a show not on Apple, or not configured yet): no dead links.
  const listen = [
    { label: "Apple Podcasts", href: safeHref(site.appleUrl) },
    { label: "RSS feed", href: safeHref(site.feedUrl) },
  ].filter((l): l is { label: string; href: string } => l.href !== null);
  const extra = safeLinks(extraLinks);
  const owner = copyrightText.trim();

  return (
    <footer className="cc-chrome-footer">
      <div className="cc-container">
        <div className="cc-chrome-footer-grid">
          <div>
            <p style={{ margin: 0, fontFamily: "var(--cc-font-display)", fontSize: "var(--cc-text-lg)", fontWeight: 650 }}>
              {site.name}
            </p>
            {tagline.trim() ? (
              <p className="cc-muted" style={{ margin: "var(--cc-space-2) 0 0" }}>
                {tagline}
              </p>
            ) : null}
          </div>
          <nav aria-label="Footer">
            <h2 className="cc-chrome-footer-title">Explore</h2>
            <ChromeNavList links={links} />
          </nav>
          {listen.length ? (
            <nav aria-label="Listen">
              <h2 className="cc-chrome-footer-title">Listen</h2>
              <ul className="cc-chrome-list">
                {listen.map((l) => (
                  <li key={l.label}>
                    <a className="cc-chrome-link" href={l.href} rel="noopener noreferrer">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          {extra.length ? (
            <nav aria-label="More links">
              <h2 className="cc-chrome-footer-title">More</h2>
              <ul className="cc-chrome-list">
                {extra.map((l, i) => (
                  <li key={`${i}-${l.href}`}>
                    <a
                      className="cc-chrome-link"
                      href={safeHref(l.href) ?? "#"}
                      {...(isExternalHref(l.href) ? { rel: "noopener noreferrer" } : {})}
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
        <p className="cc-chrome-copy cc-muted">
          {/* suppressHydrationWarning: a page prerendered on Dec 31 and hydrated on Jan 1 UTC would
              otherwise log a text mismatch. */}
          &copy; <span suppressHydrationWarning>{copyrightYear()}</span>
          {owner ? ` ${owner}` : ""}
        </p>
      </div>
    </footer>
  );
}
