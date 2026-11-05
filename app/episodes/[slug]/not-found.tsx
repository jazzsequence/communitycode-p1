import type { Metadata } from "next";
import { SiteFooterView, SiteHeaderView } from "@/components/podcast/chrome";
import { EPISODES_INDEX_PATH } from "@/components/podcast/episode-detail";

export const metadata: Metadata = {
  title: "Episode not found",
  robots: { index: false },
};

export default function EpisodeNotFound() {
  return (
    <div className="cc-root">
      <SiteHeaderView />
      <main id="main" className="cc-container cc-section">
        <div className="cc-stack">
          <p className="cc-eyebrow">404</p>
          <h1 style={{ fontSize: "var(--cc-text-2xl)" }}>We couldn&apos;t find that episode</h1>
          <p className="cc-muted" style={{ maxWidth: "var(--cc-measure)" }}>
            It may have moved, or the link might be mistyped. The full archive has every episode.
          </p>
          <p>
            <a className="cc-btn cc-btn--primary" href={EPISODES_INDEX_PATH}>
              Browse all episodes
            </a>
          </p>
        </div>
      </main>
      <SiteFooterView />
    </div>
  );
}
