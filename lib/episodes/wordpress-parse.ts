import { XMLParser } from "fast-xml-parser";
import { episodeNumberFromTitle, parseGuestsFromTitle } from "./guest";
import { cleanDescription, sanitizeShowNotes, toPlainText } from "./sanitize";
import type { Episode, EpisodeType } from "./types";

/**
 * Pure parsing for the WordPress side. No network, so it is tested against
 * real snapshots in `fixtures/`.
 *
 * Two payloads are needed because neither is complete:
 *  - the PowerPress RSS feed has audio, season, number, duration, transcript;
 *  - the REST `episodes` endpoint has show notes, slug, featured image, YouTube.
 * They are joined on the episode permalink.
 */

type Str = string | undefined;

interface FeedItem {
  title?: Str;
  link?: Str;
  pubDate?: Str;
  guid?: { "#text"?: Str } | Str;
  description?: Str;
  enclosure?: { "@_url"?: Str; "@_type"?: Str; "@_length"?: Str }[];
  "itunes:season"?: Str;
  "itunes:episode"?: Str;
  "itunes:episodeType"?: Str;
  "itunes:explicit"?: Str;
  "itunes:duration"?: Str;
  "itunes:image"?: { "@_href"?: Str };
  "podcast:transcript"?: { "@_url"?: Str; "@_type"?: Str }[];
}

export interface ParsedFeed {
  channelArtworkUrl: string | null;
  items: FeedItem[];
}

export interface RestEpisode {
  id: number;
  slug: string;
  link: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  content?: { rendered?: string };
  meta?: { youtube_url?: string };
  _embedded?: { "wp:featuredmedia"?: { source_url?: string }[] };
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Keep every scalar a string: "2" stays "2", and we convert deliberately.
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: true,
  htmlEntities: true,
  isArray: (name) => name === "item" || name === "enclosure" || name === "podcast:transcript",
});

export function parseFeed(xml: string): ParsedFeed {
  const doc = parser.parse(xml) as {
    rss?: { channel?: { item?: FeedItem[]; "itunes:image"?: { "@_href"?: Str } } };
  };
  const channel = doc.rss?.channel;
  if (!channel) throw new Error("Not an RSS feed: no <rss><channel>");
  return {
    channelArtworkUrl: channel["itunes:image"]?.["@_href"] ?? null,
    items: channel.item ?? [],
  };
}

/** "43:28" -> 2608, "1:02:03" -> 3723, "62" -> 62. */
export function parseDuration(value: Str): number | null {
  if (!value) return null;
  const parts = value.split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n))) return null;
  return parts.reduce((total, n) => total * 60 + n, 0);
}

function toInt(value: Str): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function episodeType(value: Str): EpisodeType {
  return value === "trailer" || value === "bonus" ? value : "full";
}

function slugFromLink(link: string): string {
  return link.replace(/\/+$/, "").split("/").pop() ?? link;
}

/** `?post_type=episodes&p=1238` -> 1238. */
function postIdFromGuid(guid: FeedItem["guid"]): string | null {
  const text = typeof guid === "string" ? guid : guid?.["#text"];
  const m = text ? /[?&]p=(\d+)/.exec(text) : null;
  return m ? m[1] : null;
}

export function mapFeedItem(
  item: FeedItem,
  rest: RestEpisode | undefined,
  channelArtworkUrl: string | null,
): Episode | null {
  const link = item.link?.trim();
  const title = (rest?.title?.rendered ? toPlainText(rest.title.rendered) : item.title)?.trim();
  if (!link || !title) return null;

  const enclosure = item.enclosure?.[0];
  const transcript = item["podcast:transcript"]?.[0];
  const postId = rest?.id ? String(rest.id) : postIdFromGuid(item.guid);
  const showNotesSource = rest?.content?.rendered || item.description || null;
  const youtube = rest?.meta?.youtube_url?.trim() || undefined;
  const publishedAt = item.pubDate ? new Date(item.pubDate) : null;

  return {
    id: postId ? `wp-${postId}` : `wp-${slugFromLink(link)}`,
    slug: rest?.slug ?? slugFromLink(link),
    title,
    description: toPlainText(rest?.excerpt?.rendered) || cleanDescription(toPlainText(item.description)).slice(0, 280),
    showNotesHtml: sanitizeShowNotes(showNotesSource),
    publishedAt:
      publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt.toISOString() : new Date(0).toISOString(),
    season: toInt(item["itunes:season"]),
    number: toInt(item["itunes:episode"]) ?? episodeNumberFromTitle(title),
    type: episodeType(item["itunes:episodeType"]),
    explicit: item["itunes:explicit"] === "true" || item["itunes:explicit"] === "yes",
    durationSeconds: parseDuration(item["itunes:duration"]),
    audio: enclosure?.["@_url"]
      ? {
          url: enclosure["@_url"],
          contentType: enclosure["@_type"] ?? null,
          sizeBytes: toInt(enclosure["@_length"]),
        }
      : null,
    artworkUrl:
      rest?._embedded?.["wp:featuredmedia"]?.[0]?.source_url ??
      item["itunes:image"]?.["@_href"] ??
      channelArtworkUrl,
    guests: parseGuestsFromTitle(title),
    transcript: transcript?.["@_url"]
      ? { url: transcript["@_url"], type: transcript["@_type"] ?? "text/vtt" }
      : null,
    links: { site: link, youtube },
    origin: "wordpress",
  };
}

/** Join feed items to REST episodes on permalink and map to `Episode`. */
export function buildEpisodes(feed: ParsedFeed, rest: RestEpisode[]): Episode[] {
  const byLink = new Map(rest.map((r) => [r.link.replace(/\/+$/, ""), r]));
  return feed.items
    .map((item) =>
      mapFeedItem(item, byLink.get(item.link?.replace(/\/+$/, "") ?? ""), feed.channelArtworkUrl),
    )
    .filter((e): e is Episode => e !== null)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
