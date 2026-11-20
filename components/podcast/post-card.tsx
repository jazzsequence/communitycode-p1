import type { CSSProperties } from "react";
import { DEFAULT_LINKS, expandTemplate } from "@/lib/block-config";
import { formatDate } from "@/lib/format";
import type { Post } from "@/lib/posts";

/**
 * One blog post. The card links to the in-app post page (`DEFAULT_LINKS.post`, app/blog/[slug]), which
 * renders the post here. `post.link` (the WordPress permalink) is only the fallback for a post with no
 * usable slug.
 *
 * Styling is `cc-*` classes plus token-based inline styles, because
 * app/podcast.css has no post-card rules. Focus rings come from the global
 * `.cc-root :where(a):focus-visible` rule.
 */

export type PostLayout = "grid" | "list";

interface Props {
  post: Post;
  layout: PostLayout;
  showImage: boolean;
  showExcerpt: boolean;
}

const imageStyle: CSSProperties = {
  display: "block",
  width: "100%",
  aspectRatio: "16 / 9",
  objectFit: "cover",
  background: "var(--cc-surface-2)",
};

export function PostCard({ post, layout, showImage, showExcerpt }: Props) {
  const isList = layout === "list";
  const image = showImage && post.imageUrl;
  const href = expandTemplate(DEFAULT_LINKS.post, { slug: post.slug }) ?? post.link;
  const date = post.publishedAt ? formatDate(post.publishedAt) : "";

  return (
    <article
      className="cc-card"
      data-post-id={post.id}
      style={isList ? { display: "flex", flexWrap: "wrap" } : { display: "flex", flexDirection: "column", height: "100%" }}
    >
      {image ? (
        // A second link to the same place is noise for keyboard and screen
        // reader users, so the image link is skipped by both.
        <a
          href={href}
          tabIndex={-1}
          aria-hidden="true"
          style={isList ? { flex: "0 1 16rem", minWidth: "min(100%, 12rem)" } : undefined}
        >
          {/* Decorative: the title next to it carries the meaning. A plain <img>
              because the host is an external CMS, not a configured next/image domain. */}
          <img src={post.imageUrl ?? ""} alt="" loading="lazy" decoding="async" style={imageStyle} />
        </a>
      ) : null}
      <div
        style={{ padding: "var(--cc-space-5)", flex: isList ? "1 1 16rem" : "1 1 auto", display: "flex", flexDirection: "column", gap: "var(--cc-space-3)" }}
      >
        {date ? (
          <p className="cc-eyebrow" style={{ margin: 0 }}>
            <time dateTime={post.publishedAt}>{date}</time>
          </p>
        ) : null}
        <h3 style={{ fontSize: "var(--cc-text-lg)" }}>
          <a href={href} style={{ color: "var(--cc-text)" }}>
            {post.title}
          </a>
        </h3>
        {showExcerpt && post.excerpt ? (
          <p className="cc-muted" style={{ margin: 0 }}>
            {post.excerpt}
          </p>
        ) : null}
      </div>
    </article>
  );
}
