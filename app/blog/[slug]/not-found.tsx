import type { Metadata } from "next";
import { SiteFooterView, SiteHeaderView } from "@/components/podcast/chrome";
import { BLOG_INDEX_PATH } from "@/components/podcast/post-detail";

export const metadata: Metadata = {
  title: "Post not found",
  robots: { index: false },
};

export default function PostNotFound() {
  return (
    <div className="cc-root">
      <SiteHeaderView />
      <main id="main" className="cc-container cc-section">
        <div className="cc-stack">
          <p className="cc-eyebrow">404</p>
          <h1 style={{ fontSize: "var(--cc-text-2xl)" }}>We couldn&apos;t find that post</h1>
          <p className="cc-muted" style={{ maxWidth: "var(--cc-measure)" }}>
            It may have moved, or the link might be mistyped. The blog has every post.
          </p>
          <p>
            <a className="cc-btn cc-btn--primary" href={BLOG_INDEX_PATH}>
              Browse the blog
            </a>
          </p>
        </div>
      </main>
      <SiteFooterView />
    </div>
  );
}
