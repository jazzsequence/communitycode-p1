import { SiteFooterView, SiteHeaderView } from "@/components/podcast/chrome";
import { AudioPlayer } from "@/components/podcast/audio-player";
import { TranscriptViewer } from "@/components/podcast/transcript-view";
import { site } from "@/content/site";
import { DEFAULT_LINKS, expandTemplate } from "@/lib/block-config";
import type { Episode } from "@/lib/episodes/types";
import { formatDate, formatDuration, formatEpisodeLabel } from "@/lib/format";

/** Path of an episode page: the shared link pattern (lib/block-config.ts), which is also this route's own path. */
export function episodePath(episode: Pick<Episode, "slug">): string {
  return expandTemplate(DEFAULT_LINKS.episode, { slug: episode.slug }) ?? "/";
}

/** The archive page: the episode pattern minus its `{slug}` segment. */
export const EPISODES_INDEX_PATH = DEFAULT_LINKS.episode.replace(/\/\{\w+\}$/, "") || "/";

/**
 * Canonical URL on this site (NEXT_PUBLIC_SITE_URL). The WordPress permalink is
 * not canonical here. Without a site URL it is the bare path, which Next resolves
 * against `metadataBase` when one is set.
 */
export function episodeCanonicalUrl(episode: Pick<Episode, "slug">): string {
  return `${site.url.replace(/\/+$/, "")}${episodePath(episode)}`;
}

export function episodeMetaDescription(episode: Pick<Episode, "description" | "title">): string {
  const text = (episode.description || episode.title).replace(/\s+/g, " ").trim();
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}...` : text;
}

/** ISO 8601 duration, "PT43M28S". */
function isoDuration(seconds: number): string {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts = `${h ? `${h}H` : ""}${m ? `${m}M` : ""}${s % 60 ? `${s % 60}S` : ""}`;
  return `PT${parts || "0S"}`;
}

/** schema.org PodcastEpisode with its PodcastSeries. */
export function buildEpisodeJsonLd(episode: Episode): Record<string, unknown> {
  const url = episodeCanonicalUrl(episode);
  return {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    name: episode.title,
    url: site.url ? url : undefined,
    description: episode.description || undefined,
    datePublished: episode.publishedAt,
    episodeNumber: episode.number ?? undefined,
    partOfSeason: episode.season !== null ? { "@type": "PodcastSeason", seasonNumber: episode.season } : undefined,
    timeRequired: episode.durationSeconds ? isoDuration(episode.durationSeconds) : undefined,
    image: episode.artworkUrl ?? undefined,
    associatedMedia: episode.audio
      ? { "@type": "AudioObject", contentUrl: episode.audio.url, encodingFormat: episode.audio.contentType ?? "audio/mpeg" }
      : undefined,
    actor: episode.guests.length ? episode.guests.map((g) => ({ "@type": "Person", name: g.name })) : undefined,
    partOfSeries: { "@type": "PodcastSeries", name: site.name, url: site.url || undefined },
  };
}

/**
 * JSON for a <script type="application/ld+json">. JSON.stringify does not
 * escape "<", so a title containing "</script>" would end the script element:
 * escape it (and the two line separators that break some parsers).
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export function EpisodeDetail({ episode }: { episode: Episode }) {
  const label = formatEpisodeLabel(episode.season, episode.number);
  const duration = formatDuration(episode.durationSeconds);
  const date = formatDate(episode.publishedAt);

  return (
    <div className="cc-root">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(buildEpisodeJsonLd(episode)) }} />
      <SiteHeaderView />
      <main id="main">
        <article className="cc-container cc-section">
          <div className="cc-stack">
            <nav aria-label="Breadcrumb">
              <ol
                style={{ display: "flex", flexWrap: "wrap", gap: "var(--cc-space-2)", listStyle: "none", margin: 0, padding: 0 }}
                className="cc-muted"
              >
                <li>
                  <a href={EPISODES_INDEX_PATH}>Episodes</a>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page">{label || episode.title}</li>
              </ol>
            </nav>

            <header
              style={{ display: "flex", flexWrap: "wrap", gap: "var(--cc-space-6)", alignItems: "flex-start" }}
            >
              <div className="cc-stack" style={{ flex: "1 1 22rem" }}>
                {label ? <p className="cc-eyebrow">{label}</p> : null}
                <h1 style={{ fontSize: "var(--cc-text-2xl)" }}>{episode.title}</h1>
                <p className="cc-muted" style={{ display: "flex", flexWrap: "wrap", gap: "var(--cc-space-2)", margin: 0 }}>
                  {date ? <time dateTime={episode.publishedAt}>{date}</time> : null}
                  {date && duration ? <span aria-hidden="true">·</span> : null}
                  {duration ? <span>{duration}</span> : null}
                  {episode.type !== "full" ? <span className="cc-pill">{episode.type}</span> : null}
                  {episode.explicit ? <span className="cc-pill">Explicit</span> : null}
                </p>
                {episode.guests.length > 0 ? (
                  <p style={{ margin: 0 }}>
                    <span className="cc-muted">With </span>
                    {episode.guests.map((g) => g.name).join(", ")}
                  </p>
                ) : null}
                {episode.description ? (
                  <p className="cc-muted" style={{ maxWidth: "var(--cc-measure)" }}>
                    {episode.description}
                  </p>
                ) : null}
              </div>
              {episode.artworkUrl ? (
                // Decorative: the title is the adjacent heading. A plain <img> keeps
                // the WordPress URL as-is (no next/image remotePatterns to maintain).
                <img
                  src={episode.artworkUrl}
                  alt=""
                  style={{
                    flex: "0 1 22rem",
                    width: "100%",
                    maxWidth: "22rem",
                    aspectRatio: "16 / 9",
                    objectFit: "cover",
                    borderRadius: "var(--cc-radius)",
                    border: "1px solid var(--cc-border)",
                  }}
                />
              ) : null}
            </header>

            <section aria-label="Listen" style={{ marginTop: "var(--cc-space-6)" }}>
              {episode.audio ? (
                <AudioPlayer
                  src={episode.audio.url}
                  title={episode.title}
                  channelKey={episode.slug}
                  durationHint={episode.durationSeconds}
                  youtubeUrl={episode.links.youtube}
                />
              ) : (
                <p className="cc-muted">There is no audio for this episode yet.</p>
              )}
            </section>

            {episode.showNotesHtml ? (
              <section aria-labelledby="notes-heading" style={{ marginTop: "var(--cc-space-6)" }}>
                <h2 id="notes-heading" style={{ fontSize: "var(--cc-text-xl)", marginBottom: "var(--cc-space-4)" }}>
                  Show notes
                </h2>
                {/* Sanitised server-side by sanitizeShowNotes (lib/episodes/sanitize.ts). */}
                <div className="cc-prose" dangerouslySetInnerHTML={{ __html: episode.showNotesHtml }} />
              </section>
            ) : null}

            {episode.transcript ? (
              <section aria-labelledby="transcript-heading" style={{ marginTop: "var(--cc-space-6)" }}>
                <h2 id="transcript-heading" style={{ fontSize: "var(--cc-text-xl)", marginBottom: "var(--cc-space-4)" }}>
                  Transcript
                </h2>
                <TranscriptViewer slug={episode.slug} />
              </section>
            ) : null}
          </div>
        </article>
      </main>
      <SiteFooterView />
    </div>
  );
}
