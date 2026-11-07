/**
 * Extra sample data for the podcast chrome/content block stories (blog archive,
 * search, host). Shapes match the real API responses; content is representative
 * of Community + Code, not live.
 *
 * Images: block image fields only accept relative or http(s) URLs (`data:` is
 * rejected by lib/safe-link.ts) and stories stay offline, so a bundled SVG served
 * by Storybook's own dev server stands in for photography.
 */
import type { EpisodeListResponse } from "@/lib/episodes/dto";
import type { Post, PostsResponse } from "@/lib/posts";
import { episodes, posts } from "./fixtures";
import photo from "./placeholder-photo.svg";

/** Absolute http URL of a bundled placeholder, so it passes the blocks' URL validation. */
// Next-style image imports are StaticImageData objects ({ src }), not strings.
export const PLACEHOLDER_IMAGE: string = typeof photo === "string" ? photo : photo.src;

const extraPosts: Post[] = [
  { id: 4, slug: "recording-remote", title: "Recording a podcast remotely without losing your mind", excerpt: "Mics, latency, local recording, and why I stopped trusting the call's built-in recorder.", publishedAt: "2026-05-14T12:00:00Z", link: "https://example.invalid/recording-remote", imageUrl: null, authorName: "Chris Reynolds" },
  { id: 5, slug: "guest-prep", title: "How we prep guests (and how we don't)", excerpt: "A short brief, no scripts, and one question we always ask first.", publishedAt: "2026-04-02T12:00:00Z", link: "https://example.invalid/guest-prep", imageUrl: null, authorName: null },
  { id: 6, slug: "transcripts-matter", title: "Why every episode gets a transcript", excerpt: "Accessibility first, search second, and a surprising number of people who just prefer to read.", publishedAt: "2026-02-19T12:00:00Z", link: "https://example.invalid/transcripts-matter", imageUrl: null, authorName: "Chris Reynolds" },
];

export const allPosts: Post[] = [...posts, ...extraPosts];

/** Same posts with an image on every card. */
export const postsWithImages: Post[] = allPosts.map((p) => ({ ...p, imageUrl: PLACEHOLDER_IMAGE }));

/** Serve `list` in pages of `per_page` from `?page=&per_page=`, like /api/posts. */
export function paginatedPosts(list: Post[]) {
  return (url: URL) => {
    const per = Number(url.searchParams.get("per_page")) || 9;
    const page = Number(url.searchParams.get("page")) || 1;
    return {
      body: {
        posts: list.slice((page - 1) * per, page * per),
        page,
        totalPages: Math.max(1, Math.ceil(list.length / per)),
      } satisfies PostsResponse,
    };
  };
}

/** A one-post-too-long title and excerpt, to see how cards wrap. */
export const longPost: Post = {
  id: 99,
  slug: "long",
  title: "An unreasonably long post title that keeps going to see how a card copes with wrapping across several lines",
  excerpt:
    "An excerpt that also runs long: it goes on about community, code, the people between the two, the meetings that should have been emails, and the emails that should have been conversations, until the card has to decide what to do with it.",
  publishedAt: "2026-01-05T12:00:00Z",
  link: "https://example.invalid/long",
  imageUrl: null,
  authorName: "Chris Reynolds",
};

/** `/api/episodes?q=` : filter the fixture episodes by title/description/guest, like the real route. */
export function searchEpisodes(url: URL): { body: EpisodeListResponse } {
  const q = (url.searchParams.get("q") ?? "").toLowerCase();
  const limit = Number(url.searchParams.get("limit")) || 8;
  const hits = episodes.filter((e) =>
    [e.title, e.description, ...e.guests.map((g) => g.name)].join(" ").toLowerCase().includes(q),
  );
  return {
    body: {
      episodes: hits.slice(0, limit),
      nextCursor: hits.length > limit ? "more" : null,
      origin: "wordpress",
      seasons: [1, 2],
    },
  };
}
