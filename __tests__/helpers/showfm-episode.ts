import type { Episode } from "@/lib/episodes/types";

export const SHOWFM_UUID = "11111111-2222-4333-8444-555555555555";

/** A merged episode as the site serves it: show.fm identity and media, WordPress slug. */
export const showfmEpisode: Episode = {
  id: SHOWFM_UUID,
  slug: "episode-36-jacquie-capur",
  title: "Episode 36: Jacquie Capur",
  description: "A chat about DevRel.",
  showNotesHtml: "<p>Notes</p>",
  publishedAt: "2026-10-14T16:57:00.000Z",
  season: 2,
  number: 36,
  type: "full",
  explicit: false,
  durationSeconds: 2608,
  audio: { url: "https://m.cdn.media/ep/36.mp3", contentType: "audio/mpeg", sizeBytes: 1 },
  artworkUrl: null,
  guests: [],
  transcript: { url: "https://m.cdn.media/ep/36.vtt", type: "text/vtt" },
  links: { listen: "https://show.fm/community-code/e/episode-36", youtube: "https://youtu.be/x" },
  origin: "showfm",
};

/** The WordPress-only shape: `wp-` id, audio on the WordPress host. */
export const wordpressEpisode: Episode = {
  ...showfmEpisode,
  id: "wp-123",
  audio: { url: "https://wp.example.test/a.mp3", contentType: "audio/mpeg", sizeBytes: 1 },
  transcript: { url: "https://wp.example.test/t.vtt", type: "text/vtt" },
  links: { youtube: "https://youtu.be/x" },
  origin: "wordpress",
};
