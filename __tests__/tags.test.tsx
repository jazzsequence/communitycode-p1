// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/components/podcast/chrome", () => ({ SiteHeaderView: () => null, SiteFooterView: () => null }));
vi.mock("@/components/podcast/audio-player", () => ({ AudioPlayer: () => null }));
vi.mock("@/components/podcast/showfm-player", () => ({ ShowfmPlayer: () => null }));
vi.mock("@/components/podcast/transcript-view", () => ({ TranscriptViewer: () => null }));

import { EpisodeCardView } from "@/components/podcast/episode-card";
import { EpisodeDetail, buildEpisodeJsonLd } from "@/components/podcast/episode-detail";
import { PostCard } from "@/components/podcast/post-card";
import { PostDetailView, buildPostJsonLd } from "@/components/podcast/post-detail";
import { TagList } from "@/components/podcast/tag-list";
import { toCard } from "@/lib/episodes/dto";
import { mergeEpisode } from "@/lib/episodes";
import { mapFeedItem } from "@/lib/episodes/wordpress-parse";
import { mapPost, mapPostDetail } from "@/lib/posts";
import { mapTags } from "@/lib/tags";
import { showfmEpisode, wordpressEpisode } from "./helpers/showfm-episode";

afterEach(cleanup);

const term = (name: string, slug: string, taxonomy = "post_tag") => ({ id: 1, name, slug, taxonomy });
const tags = [
  { name: "open source", slug: "open-source" },
  { name: "AI", slug: "ai" },
];

describe("mapTags", () => {
  it("keeps only post_tag terms from every embedded group, in order, once each", () => {
    const embedded = [
      [term("News", "news", "category")],
      [term("open source", "open-source"), term("AI", "ai"), term("open source", "open-source")],
    ];
    expect(mapTags(embedded)).toEqual(tags);
  });

  it("decodes entities and survives malformed input", () => {
    expect(mapTags([[term("R&amp;D", "r-d")]])).toEqual([{ name: "R&D", slug: "r-d" }]);
    expect(mapTags(undefined)).toEqual([]);
    expect(mapTags("x")).toEqual([]);
    expect(mapTags([null, [null, { taxonomy: "post_tag" }, term("", "no-name")]])).toEqual([{ name: "no-name", slug: "no-name" }]);
  });
});

describe("data layer", () => {
  const rest = { id: 5, slug: "e", link: "https://wp.example/e/", _embedded: { "wp:term": [[term("AI", "ai")]] } };
  const item = { title: "Episode 1: A Guest", link: "https://wp.example/e/" };

  it("episodes get their WordPress tags, and none when WordPress sent no terms", () => {
    expect(mapFeedItem(item, rest)!.tags).toEqual([{ name: "AI", slug: "ai" }]);
    expect(mapFeedItem(item, { ...rest, _embedded: {} })!.tags).toEqual([]);
    expect(mapFeedItem(item, undefined)!.tags).toEqual([]);
  });

  it("a merged episode keeps WordPress's tags even though show.fm's [] is spread over them", () => {
    const merged = mergeEpisode({ ...showfmEpisode, tags: [] }, { ...wordpressEpisode, tags });
    expect(merged.tags).toEqual(tags);
    expect(mergeEpisode({ ...showfmEpisode, tags: [] }, { ...wordpressEpisode, tags: [] }).tags).toEqual([]);
  });

  it("posts get tags from the same embed, and the post page body too", () => {
    const raw = { id: 1, slug: "p", link: "https://wp.example/p/", _embedded: { "wp:term": [[term("News", "news", "category")], [term("AI", "ai")]] } };
    expect(mapPost(raw)!.tags).toEqual([{ name: "AI", slug: "ai" }]);
    expect(mapPostDetail(raw)!.tags).toEqual([{ name: "AI", slug: "ai" }]);
    expect(mapPost({ ...raw, _embedded: {} })!.tags).toEqual([]);
  });
});

describe("TagList", () => {
  it("renders a labelled list of plain-text pills, and nothing without tags", () => {
    const { container, rerender } = render(<TagList tags={tags} />);
    const list = screen.getByRole("list", { name: "Tags" });
    expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["open source", "AI"]);
    expect(container.querySelector("a")).toBeNull();
    rerender(<TagList tags={[]} />);
    expect(container.innerHTML).toBe("");
    rerender(<TagList tags={undefined} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("tags show in listings and on single pages", () => {
  it("episode card (inside its one link, so no nested links)", () => {
    const { container } = render(<EpisodeCardView episode={toCard({ ...wordpressEpisode, tags })} />);
    expect(screen.getByRole("list", { name: "Tags" }).textContent).toBe("open sourceAI");
    expect(container.querySelectorAll("a")).toHaveLength(1);
  });

  it("episode page, and its structured data keywords", () => {
    const ep = { ...wordpressEpisode, tags };
    render(<EpisodeDetail episode={ep} />);
    expect(screen.getByRole("list", { name: "Tags" }).textContent).toBe("open sourceAI");
    expect(buildEpisodeJsonLd(ep)).toMatchObject({ keywords: "open source, AI" });
    expect(buildEpisodeJsonLd({ ...ep, tags: [] }).keywords).toBeUndefined();
  });

  it("post card", () => {
    const post = { id: 1, slug: "p", title: "P", excerpt: "", publishedAt: "", link: "https://wp.example/p/", imageUrl: null, authorName: null, tags };
    render(<PostCard post={post} layout="grid" showImage={false} showExcerpt={false} />);
    expect(screen.getByRole("list", { name: "Tags" }).textContent).toBe("open sourceAI");
  });

  it("post page, and its structured data keywords", () => {
    const post = { id: 1, slug: "p", title: "P", excerpt: "", publishedAt: "", link: "https://wp.example/p/", imageUrl: null, authorName: null, tags, contentHtml: "<p>x</p>" };
    render(<PostDetailView post={post} />);
    expect(screen.getByRole("list", { name: "Tags" }).textContent).toBe("open sourceAI");
    expect(buildPostJsonLd(post)).toMatchObject({ keywords: "open source, AI" });
  });
});
