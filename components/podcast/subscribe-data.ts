import { site } from "@/content/site";
import { safeHref } from "@/lib/safe-link";

export const PLATFORMS = [
  { value: "apple", label: "Apple Podcasts" },
  { value: "spotify", label: "Spotify" },
  { value: "youtube", label: "YouTube" },
  { value: "overcast", label: "Overcast" },
  { value: "pocketcasts", label: "Pocket Casts" },
  { value: "amazon", label: "Amazon Music" },
  { value: "rss", label: "RSS" },
  { value: "other", label: "Other" },
] as const;

export type Platform = (typeof PLATFORMS)[number]["value"];

export interface SubscribeEntry {
  platform: string;
  url: string;
  label?: string;
}

/** Only what is actually known; every other platform is selectable but starts empty. */
export const DEFAULT_SUBSCRIBE_ENTRIES: SubscribeEntry[] = [
  { platform: "apple", url: site.appleUrl, label: "" },
  { platform: "rss", url: site.feedUrl, label: "" },
];

export interface ResolvedSubscribe {
  platform: string;
  platformName: string;
  url: string;
  /** Visible text. */
  text: string;
  /** True when the visible text is the editor's own label (not the platform name). */
  custom: boolean;
}

export function platformName(platform: string): string {
  return PLATFORMS.find((p) => p.value === platform)?.label ?? "your podcast app";
}

/** Entries with an empty or unsafe URL are dropped: no dead buttons. */
export function resolveEntries(entries: readonly SubscribeEntry[] | undefined): ResolvedSubscribe[] {
  if (!Array.isArray(entries)) return [];
  const out: ResolvedSubscribe[] = [];
  for (const e of entries) {
    if (!e || typeof e !== "object") continue;
    const url = safeHref(e.url);
    // mailto makes no sense for a subscribe target.
    if (!url || url.toLowerCase().startsWith("mailto:")) continue;
    const name = platformName(e.platform);
    const label = typeof e.label === "string" ? e.label.trim() : "";
    out.push({ platform: e.platform, platformName: name, url, text: label || name, custom: Boolean(label) });
  }
  return out;
}

/** The feed URL to copy: the editor's RSS entry if it is safe, else the site feed. */
export function feedUrlFor(entries: readonly SubscribeEntry[] | undefined): string {
  const rss = resolveEntries(entries).find((e) => e.platform === "rss");
  // May be "" when NEXT_PUBLIC_FEED_URL is unset: callers hide the copy button then.
  return rss?.url ?? safeHref(site.feedUrl) ?? "";
}
