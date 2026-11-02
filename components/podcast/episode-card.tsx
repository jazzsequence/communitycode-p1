import type { CSSProperties } from "react";
import type { EpisodeCard as EpisodeCardData } from "@/lib/episodes/dto";
import { DEFAULT_LINKS, expandTemplate, safeUrl } from "@/lib/block-config";
import { formatDate, formatDuration, formatEpisodeLabel } from "@/lib/format";

/**
 * Resolve an episode's link from a template (`{slug} {id} {season} {number}`).
 * Returns null when a placeholder has no value or the result isn't a safe URL,
 * so callers render plain content instead of a broken or hostile link.
 * Values are URL-encoded by `expandTemplate`.
 */
export function episodeHref(
  template: string | undefined,
  episode: Pick<EpisodeCardData, "slug" | "id" | "season" | "number">,
): string | null {
  const tpl = template?.trim() ? template : DEFAULT_LINKS.episode;
  const expanded = expandTemplate(tpl, { slug: episode.slug, id: episode.id, season: episode.season, number: episode.number });
  const safe = expanded === null ? "" : safeUrl(expanded, "");
  return safe || null;
}

const clamp2: CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  margin: 0,
};

const metaRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--cc-space-1) var(--cc-space-3)",
  fontSize: "var(--cc-text-xs)",
  margin: 0,
};

/**
 * One episode in the archive grid.
 *
 * The whole card is a single link (no nested links), named by the title via
 * aria-labelledby so a screen reader doesn't read the description as the link
 * text. Focus ring comes from the shared `a:focus-visible` rule in podcast.css.
 * Artwork is decorative (alt="") because the title sits right next to it.
 */
export function EpisodeCardView({
  episode,
  headingLevel = 3,
  linkTemplate,
}: {
  episode: EpisodeCardData;
  headingLevel?: 2 | 3 | 4;
  /** See `episodeHref`. Defaults to DEFAULT_LINKS.episode. */
  linkTemplate?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  const titleId = `ep-title-${episode.id}`;
  const label = formatEpisodeLabel(episode.season, episode.number);
  const date = formatDate(episode.publishedAt);
  const duration = formatDuration(episode.durationSeconds);
  const guests = episode.guests.map((g) => g.name).filter(Boolean);
  const href = episodeHref(linkTemplate, episode);
  const inner: CSSProperties = { display: "flex", flexDirection: "column", height: "100%", color: "inherit", textDecoration: "none" };

  // No resolvable href: same card, but plain content rather than a dead link.
  const content = (
    <>
        {episode.artworkUrl ? (

          <img
            src={episode.artworkUrl}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block", background: "var(--cc-surface-2)" }}
          />
        ) : (
          <div aria-hidden="true" style={{ width: "100%", aspectRatio: "1 / 1", background: "var(--cc-surface-2)" }} />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--cc-space-2)", padding: "var(--cc-space-4)", flex: 1 }}>
          <p className="cc-eyebrow" style={{ margin: 0 }}>
            {[label, episode.type !== "full" ? episode.type : ""].filter(Boolean).join(" · ")}
          </p>
          <Heading id={titleId} style={{ fontSize: "var(--cc-text-lg)" }}>
            {episode.title}
          </Heading>
          <p className="cc-muted" style={metaRow}>
            {date ? <time dateTime={episode.publishedAt}>{date}</time> : null}
            {duration ? <span>{duration}</span> : null}
            {episode.origin === "showfm" ? <span className="cc-pill">via show.fm</span> : null}
          </p>
          {guests.length > 0 ? (
            <p className="cc-muted" style={{ ...metaRow, fontSize: "var(--cc-text-sm)" }}>
              With {guests.join(", ")}
            </p>
          ) : null}
          {episode.description ? (
            <p className="cc-muted" style={{ ...clamp2, fontSize: "var(--cc-text-sm)" }}>
              {episode.description}
            </p>
          ) : null}
        </div>
    </>
  );

  return (
    <article className="cc-card" data-episode-card style={{ height: "100%" }}>
      {href ? (
        <a href={href} aria-labelledby={titleId} style={inner}>
          {content}
        </a>
      ) : (
        <div style={inner}>{content}</div>
      )}
    </article>
  );
}
