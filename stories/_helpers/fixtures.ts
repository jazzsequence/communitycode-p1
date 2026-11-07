/**
 * Sample data for stories. Shapes match the real API responses (lib/episodes/dto.ts,
 * lib/guests.ts, lib/posts.ts, lib/transcript.ts); content is representative of
 * Community + Code, not live. No remote images: artwork is null so the cards show
 * their placeholder, which keeps stories offline and deterministic.
 */
import type { EpisodeCard, EpisodeListResponse } from "@/lib/episodes/dto";
import type { AggregatedGuest, GuestsResponse } from "@/lib/guests";
import type { Post, PostsResponse } from "@/lib/posts";
import type { Cue } from "@/lib/transcript";

const base = {
  explicit: false,
  type: "full" as const,
  audio: null,
  artworkUrl: null,
  transcript: null,
  links: {},
  origin: "wordpress" as const,
};

export const episodes: EpisodeCard[] = [
  {
    ...base,
    id: "wp-1243",
    slug: "episode-36-jacquie-capur",
    title: "Episode 36: Jacquie Capur",
    description:
      "Jacquie Capur on beating stage fright, a live-coding show, why DevRel is so hard to measure, and how AI brought the joy back to building things.",
    publishedAt: "2026-10-16T17:00:00Z",
    season: 2,
    number: 36,
    durationSeconds: 3425,
    guests: [{ name: "Jacquie Capur", role: "Guest", photoUrl: null }],
    audio: { url: "https://example.invalid/ep36.mp3", contentType: "audio/mpeg", sizeBytes: null },
  },
  {
    ...base,
    id: "wp-1201",
    slug: "episode-35-open-source-maintainers",
    title: "Episode 35: Keeping an open source project alive",
    description: "What maintainers wish contributors knew, and what contributors wish maintainers said out loud.",
    publishedAt: "2026-09-18T17:00:00Z",
    season: 2,
    number: 35,
    durationSeconds: 3010,
    guests: [{ name: "Ada Moreno", role: "Guest", photoUrl: null }],
  },
  {
    ...base,
    id: "wp-1160",
    slug: "episode-34-docs-as-community",
    title: "Episode 34: Docs are a community, too",
    description: "Treating documentation as a shared space instead of a deliverable.",
    publishedAt: "2026-08-21T17:00:00Z",
    season: 2,
    number: 34,
    durationSeconds: 2780,
    guests: [
      { name: "Priya Nair", role: "Guest", photoUrl: null },
      { name: "Sam Okafor", role: "Guest", photoUrl: null },
    ],
  },
  {
    ...base,
    id: "wp-1122",
    slug: "bonus-conference-hallway",
    title: "Bonus: Hallway track highlights",
    description: "Short clips from conversations that never made it onto a stage.",
    publishedAt: "2026-07-30T17:00:00Z",
    season: null,
    number: null,
    type: "bonus",
    durationSeconds: 960,
    guests: [],
  },
  {
    ...base,
    id: "wp-1090",
    slug: "episode-33-first-contribution",
    title: "Episode 33: The first contribution",
    description: "Everyone remembers their first pull request. Three guests tell theirs.",
    publishedAt: "2026-07-17T17:00:00Z",
    season: 2,
    number: 33,
    durationSeconds: 3190,
    guests: [{ name: "Lena Fischer", role: "Guest", photoUrl: null }],
  },
  {
    ...base,
    id: "wp-1050",
    slug: "trailer-season-two",
    title: "Season 2 trailer",
    description: "What is coming this season.",
    publishedAt: "2026-06-01T17:00:00Z",
    season: 2,
    number: null,
    type: "trailer",
    durationSeconds: 94,
    guests: [],
  },
];

export const episodeList: EpisodeListResponse = {
  episodes,
  nextCursor: null,
  origin: "wordpress",
  seasons: [1, 2],
};

export const guests: AggregatedGuest[] = [
  { name: "Jacquie Capur", photoUrl: null, role: "Guest", episodes: [{ slug: "episode-36-jacquie-capur", title: "Episode 36: Jacquie Capur", season: 2, number: 36 }] },
  { name: "Ada Moreno", photoUrl: null, role: "Guest", episodes: [{ slug: "episode-35-open-source-maintainers", title: "Episode 35", season: 2, number: 35 }] },
  { name: "Priya Nair", photoUrl: null, role: "Guest", episodes: [{ slug: "episode-34-docs-as-community", title: "Episode 34", season: 2, number: 34 }] },
  { name: "Sam Okafor", photoUrl: null, role: "Guest", episodes: [{ slug: "episode-34-docs-as-community", title: "Episode 34", season: 2, number: 34 }] },
  { name: "Lena Fischer", photoUrl: null, role: "Guest", episodes: [{ slug: "episode-33-first-contribution", title: "Episode 33", season: 2, number: 33 }] },
  { name: "Chris Reynolds", photoUrl: null, role: "Host", episodes: [] },
];
export const guestsResponse: GuestsResponse = { guests };

export const posts: Post[] = [
  { id: 1, slug: "why-we-moved-hosting", title: "Why the show moved hosting", excerpt: "A look at what changed behind the scenes, and what stayed the same.", publishedAt: "2026-10-02T12:00:00Z", link: "https://example.invalid/why-we-moved-hosting", imageUrl: null, authorName: "Chris Reynolds" },
  { id: 2, slug: "season-two-notes", title: "Season two, in notes", excerpt: "Things I learned recording a second season.", publishedAt: "2026-08-12T12:00:00Z", link: "https://example.invalid/season-two-notes", imageUrl: null, authorName: "Chris Reynolds" },
  { id: 3, slug: "community-is-a-practice", title: "Community is a practice", excerpt: "Notes on showing up consistently.", publishedAt: "2026-06-20T12:00:00Z", link: "https://example.invalid/community-is-a-practice", imageUrl: null, authorName: "Chris Reynolds" },
];
export const postsResponse: PostsResponse = { posts, page: 1, totalPages: 1 };

export const cues: Cue[] = [
  { start: 0, end: 6, speaker: "Chris", text: "Welcome back to Community and Code. Today I am talking with Jacquie Capur." },
  { start: 6, end: 14, speaker: "Jacquie", text: "Thanks for having me. I have been looking forward to this one." },
  { start: 14, end: 27, speaker: "Chris", text: "You started out afraid of public speaking. How did that turn into a career built around it?" },
  { start: 27, end: 44, speaker: "Jacquie", text: "Slowly, and with a lot of bad first attempts. The turning point was treating a talk like a conversation instead of a performance." },
];
