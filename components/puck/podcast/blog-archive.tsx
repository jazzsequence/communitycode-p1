"use client";

import { useEffect, useId, useRef } from "react";
import { PostCard, type PostLayout } from "@/components/podcast/post-card";
import { usePosts } from "@/components/podcast/use-posts";
import { DEFAULT_ENDPOINTS, safeUrl } from "@/lib/block-config";

/**
 * Blog archive: posts from WordPress via /api/posts, with "Load more".
 *
 * Why Load more rather than numbered pages: a Puck block has no URL of its own
 * to hold `?page=N` (the page route belongs to P1), so numbered pagination
 * would be state the back button and shared links can't honour. Load more
 * keeps the reader's place, needs one control, and the archive is small
 * (tens of posts, not thousands). New items get focus so keyboard and screen
 * reader users land on what was just added.
 *
 * Cards link to each post's own `link`; there is no in-app post route.
 *
 * Endpoint contract (the `endpoint` field; default DEFAULT_ENDPOINTS.posts):
 *   GET <endpoint>?page=N&per_page=N  (appended with `&` if it already has `?`)
 *   200 { posts: Post[], page: number, totalPages: number }
 *     Post = { id: number, slug, title, excerpt (plain text), publishedAt (ISO),
 *              link (http/https URL), imageUrl: string|null, authorName: string|null }
 *   501 means "not configured": the block shows a message instead of an error.
 *   Anything else non-2xx shows the error state with Retry.
 */

export interface BlogArchiveProps {
  heading: string;
  endpoint: string;
  postsPerPage: number;
  layout: PostLayout;
  showImages: boolean;
  showExcerpts: boolean;
}

const MIN_PER_PAGE = 3;
const MAX_PER_PAGE = 24;

function clampPerPage(n: unknown): number {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(MAX_PER_PAGE, Math.max(MIN_PER_PAGE, v)) : 9;
}

const placeholder = { padding: "var(--cc-space-6)", textAlign: "center" as const };

export function BlogArchiveView({ heading, endpoint, postsPerPage, layout, showImages, showExcerpts }: BlogArchiveProps) {
  const { posts, status, loadingMore, moreError, hasMore, firstNewId, loadMore, retry } = usePosts(
    safeUrl(endpoint, DEFAULT_ENDPOINTS.posts),
    clampPerPage(postsPerPage),
  );
  const listRef = useRef<HTMLDivElement>(null);
  const headingId = useId();

  // Move focus to the first newly loaded card's link.
  useEffect(() => {
    if (firstNewId === null) return;
    listRef.current?.querySelector<HTMLAnchorElement>(`[data-post-id="${firstNewId}"] h3 a`)?.focus();
  }, [firstNewId]);

  const isList = layout === "list";

  return (
    <section className="cc-container cc-section" aria-labelledby={heading ? headingId : undefined} aria-busy={status === "loading"}>
      {heading ? (
        <h2 id={headingId} style={{ fontSize: "var(--cc-text-xl)", marginBottom: "var(--cc-space-5)" }}>
          {heading}
        </h2>
      ) : null}

      {/* Announces results without moving focus. Always mounted so the change is heard. */}
      <p className="cc-sr-only" role="status" aria-live="polite">
        {status === "loading" ? "Loading posts." : null}
        {status === "unconfigured" ? "The blog isn't set up yet." : null}
        {status === "ready" && posts.length === 0 ? "No posts yet." : null}
        {status === "ready" && posts.length > 0 ? `Showing ${posts.length} posts.` : null}
        {loadingMore ? " Loading more posts." : null}
      </p>

      {status === "loading" ? (
        <p className="cc-muted" style={placeholder}>
          Loading posts…
        </p>
      ) : null}

      {status === "error" ? (
        <div className="cc-card" role="alert" style={placeholder}>
          <p style={{ margin: 0 }}>We couldn&apos;t load the posts.</p>
          <p className="cc-muted" style={{ margin: "var(--cc-space-2) 0 var(--cc-space-4)" }}>
            It&apos;s probably temporary.
          </p>
          <button type="button" className="cc-btn cc-btn--primary" onClick={retry}>
            Retry
          </button>
        </div>
      ) : null}

      {status === "unconfigured" ? (
        <p className="cc-muted" style={placeholder}>
          The blog isn&apos;t set up yet. Check back soon.
        </p>
      ) : null}

      {status === "ready" && posts.length === 0 ? (
        <p className="cc-muted" style={placeholder}>
          No posts yet. Check back soon.
        </p>
      ) : null}

      {posts.length > 0 ? (
        <div
          ref={listRef}
          className={isList ? "cc-stack" : "cc-grid"}
        >
          {posts.map((post) => (
            <PostCard key={post.id} post={post} layout={layout} showImage={showImages} showExcerpt={showExcerpts} />
          ))}
        </div>
      ) : null}

      {moreError ? (
        <p role="alert" style={{ color: "var(--cc-danger)", textAlign: "center", marginTop: "var(--cc-space-5)" }}>
          We couldn&apos;t load more posts. Try again.
        </p>
      ) : null}

      {hasMore ? (
        <div style={{ textAlign: "center", marginTop: "var(--cc-space-6)" }}>
          {/* aria-disabled, not disabled: a disabled button drops keyboard focus mid-load. */}
          <button
            type="button"
            className="cc-btn"
            onClick={loadMore}
            aria-disabled={loadingMore}
            aria-busy={loadingMore}
          >
            {loadingMore ? "Loading…" : "Load more posts"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

const DEFAULTS: BlogArchiveProps = {
  heading: "From the blog",
  endpoint: DEFAULT_ENDPOINTS.posts,
  postsPerPage: 9,
  layout: "grid",
  showImages: true,
  showExcerpts: true,
};

function withDefaults(props: Partial<BlogArchiveProps>): BlogArchiveProps {
  const defined = Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined && v !== null));
  return { ...DEFAULTS, ...defined };
}

export const blogArchiveBlock = {
  label: "Blog Archive",
  fields: {
    heading: { type: "text" as const, label: "Heading" },
    endpoint: {
      type: "text" as const,
      label: "Posts endpoint (GET ?page=&per_page= returning { posts, page, totalPages })",
    },
    postsPerPage: { type: "number" as const, label: "Posts per page (3-24)", min: MIN_PER_PAGE, max: MAX_PER_PAGE },
    layout: {
      type: "radio" as const,
      label: "Layout",
      options: [
        { label: "Grid", value: "grid" },
        { label: "List", value: "list" },
      ],
    },
    showImages: {
      type: "radio" as const,
      label: "Show images",
      options: [
        { label: "Yes", value: true },
        { label: "No", value: false },
      ],
    },
    showExcerpts: {
      type: "radio" as const,
      label: "Show excerpts",
      options: [
        { label: "Yes", value: true },
        { label: "No", value: false },
      ],
    },
  },
  defaultProps: DEFAULTS,
  // Partial: Puck's render props are an index-signature type, which is only
  // assignable to a props type whose members are all optional. It is also the
  // honest type: content saved before a field existed won't have it.
  render: (props: Partial<BlogArchiveProps> & { id?: string }) => <BlogArchiveView {...withDefaults(props)} />,
};
