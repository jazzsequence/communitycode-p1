import { SiteFooterView, SiteHeaderView } from "@/components/podcast/chrome";
import { safeJsonLd } from "@/components/podcast/episode-detail";
import { site } from "@/content/site";
import { DEFAULT_LINKS, expandTemplate } from "@/lib/block-config";
import { formatDate } from "@/lib/format";
import type { PostDetail } from "@/lib/posts";

/** The blog index: the post pattern minus its `{slug}` segment. */
export const BLOG_INDEX_PATH = DEFAULT_LINKS.post.replace(/\/\{\w+\}$/, "") || "/";

export function postPath(post: Pick<PostDetail, "slug">): string {
  return expandTemplate(DEFAULT_LINKS.post, { slug: post.slug }) ?? BLOG_INDEX_PATH;
}

/** Canonical URL on this site, not the WordPress permalink (the content is served from here). */
export function postCanonicalUrl(post: Pick<PostDetail, "slug">): string {
  return `${site.url.replace(/\/+$/, "")}${postPath(post)}`;
}

export function postMetaDescription(post: Pick<PostDetail, "excerpt" | "title">): string {
  const text = (post.excerpt || post.title).replace(/\s+/g, " ").trim();
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}...` : text;
}

/** schema.org BlogPosting. */
export function buildPostJsonLd(post: PostDetail): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    url: site.url ? postCanonicalUrl(post) : undefined,
    description: post.excerpt || undefined,
    datePublished: post.publishedAt || undefined,
    image: post.imageUrl ?? undefined,
    author: post.authorName ? { "@type": "Person", name: post.authorName } : undefined,
    publisher: { "@type": "Organization", name: site.name, url: site.url || undefined },
  };
}

export function PostDetailView({ post }: { post: PostDetail }) {
  const date = post.publishedAt ? formatDate(post.publishedAt) : "";
  return (
    <div className="cc-root">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(buildPostJsonLd(post)) }} />
      <SiteHeaderView />
      <main id="main">
        <article className="cc-container cc-container--narrow cc-section">
          <div className="cc-stack">
            <nav aria-label="Breadcrumb">
              <ol
                style={{ display: "flex", flexWrap: "wrap", gap: "var(--cc-space-2)", listStyle: "none", margin: 0, padding: 0 }}
                className="cc-muted"
              >
                <li>
                  <a href={BLOG_INDEX_PATH}>Blog</a>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page">{post.title}</li>
              </ol>
            </nav>

            <header className="cc-stack">
              <h1 style={{ fontSize: "var(--cc-text-2xl)" }}>{post.title}</h1>
              <p className="cc-muted" style={{ display: "flex", flexWrap: "wrap", gap: "var(--cc-space-2)", margin: 0 }}>
                {date ? <time dateTime={post.publishedAt}>{date}</time> : null}
                {date && post.authorName ? <span aria-hidden="true">·</span> : null}
                {post.authorName ? <span>By {post.authorName}</span> : null}
              </p>
            </header>

            {post.imageUrl ? (
              // Decorative: the title is the adjacent heading. A plain <img> keeps the WordPress URL as-is.
              <img
                className="cc-episode-img"
                src={post.imageUrl}
                alt=""
                style={{ borderRadius: "var(--cc-radius)", border: "1px solid var(--cc-border)" }}
              />
            ) : null}

            {post.contentHtml ? (
              // Sanitised server-side by sanitizeShowNotes (lib/episodes/sanitize.ts).
              <div className="cc-prose" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
            ) : (
              <p className="cc-muted">This post has no content yet.</p>
            )}

            <p>
              <a className="cc-btn" href={BLOG_INDEX_PATH}>
                All posts
              </a>
            </p>
          </div>
        </article>
      </main>
      <SiteFooterView />
    </div>
  );
}
