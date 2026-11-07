"use client";

import { useMemo, type CSSProperties } from "react";
import { episodeHref } from "@/components/podcast/episode-card";
import { useEpisodes } from "@/components/podcast/use-episodes";
import { DEFAULT_ENDPOINTS, DEFAULT_LINKS, safeUrl } from "@/lib/block-config";
import type { EpisodeCard } from "@/lib/episodes/dto";
import { formatDate, formatDuration, formatEpisodeLabel } from "@/lib/format";

export interface LatestEpisodeHeroProps {
  eyebrow: string;
  buttonLabel: string;
  showArtwork: boolean;
  showDescription: boolean;
  /**
   * Episodes list endpoint. Contract: GET `?limit=1&type=full` returns
   * `EpisodeListResponse` (lib/episodes/dto.ts), newest first.
   */
  endpoint: string;
  /** Link pattern for the Listen button. Placeholders: {slug} {id} {season} {number}. */
  episodeLinkTemplate: string;
}

// Module-level so the filters object identity is stable for the hook's effect.
const HERO_TYPES = ["full"] as const;

/** Drop undefined/null props so they don't override defaults when spread. */
function definedOnly<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null)) as Partial<T>;
}

const frame: CSSProperties = {
  display: "grid",
  gap: "var(--cc-space-6)",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
  alignItems: "center",
};

function Artwork({ episode }: { episode: EpisodeCard }) {
  return episode.artworkUrl ? (

    <img
      src={episode.artworkUrl}
      alt="" // decorative: the title is the adjacent heading
      decoding="async"
      style={{ width: "100%", maxWidth: "26rem", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: "var(--cc-radius)", background: "var(--cc-surface-2)" }}
    />
  ) : null;
}

function HeroSkeleton({ showArtwork }: { showArtwork: boolean }) {
  const bar = (w: string, h = "1rem"): CSSProperties => ({ width: w, height: h, background: "var(--cc-surface-2)", borderRadius: "var(--cc-radius-sm)" });
  return (
    <div style={frame} aria-hidden="true">
      {showArtwork ? <div style={{ ...bar("100%"), maxWidth: "26rem", aspectRatio: "1 / 1", height: "auto" }} /> : null}
      <div className="cc-stack">
        <div style={bar("8rem", "0.8rem")} />
        <div style={bar("90%", "2.5rem")} />
        <div style={bar("12rem")} />
        <div style={bar("100%", "4rem")} />
      </div>
    </div>
  );
}

const DEFAULTS: LatestEpisodeHeroProps = {
  eyebrow: "Latest episode",
  buttonLabel: "Listen",
  showArtwork: true,
  showDescription: true,
  endpoint: DEFAULT_ENDPOINTS.episodes,
  episodeLinkTemplate: DEFAULT_LINKS.episode,
};

/** Props may predate a field (content saved before it existed), so merge defaults at render. */
export function LatestEpisodeHeroRender(props: Partial<LatestEpisodeHeroProps> & { id?: string }) {
  const { eyebrow, buttonLabel, showArtwork, showDescription, episodeLinkTemplate } = { ...DEFAULTS, ...definedOnly(props) };
  const endpoint = safeUrl(props.endpoint, DEFAULTS.endpoint);
  const filters = useMemo(() => ({ endpoint, limit: 1, types: HERO_TYPES }), [endpoint]);
  const { status, episodes, retry } = useEpisodes(filters);
  const episode = episodes[0];

  let body;
  if (status === "error") {
    body = (
      <div role="alert" className="cc-stack">
        <p style={{ margin: 0, color: "var(--cc-danger)" }}>The latest episode could not be loaded.</p>
        <button type="button" className="cc-btn" onClick={retry}>
          Retry
        </button>
      </div>
    );
  } else if (status === "loading") {
    body = (
      <>
        <p role="status" className="cc-sr-only">
          Loading the latest episode…
        </p>
        <HeroSkeleton showArtwork={showArtwork} />
      </>
    );
  } else if (!episode) {
    body = <p className="cc-muted">No episodes yet</p>;
  } else {
    const label = formatEpisodeLabel(episode.season, episode.number);
    const date = formatDate(episode.publishedAt);
    const duration = formatDuration(episode.durationSeconds);
    const guests = episode.guests.map((g) => g.name).filter(Boolean);
    const youtube = safeUrl(episode.links.youtube, "") || null; // http(s) only; drops javascript:/data:
    const listenHref = episodeHref(episodeLinkTemplate, episode);
    body = (
      <div style={frame}>
        {showArtwork ? <Artwork episode={episode} /> : null}
        <div className="cc-stack">
          <p className="cc-eyebrow" style={{ margin: 0 }}>
            {[eyebrow, label].filter(Boolean).join(" · ")}
          </p>
          <h2 style={{ fontSize: "var(--cc-text-2xl)" }}>{episode.title}</h2>
          <p className="cc-muted" style={{ display: "flex", flexWrap: "wrap", gap: "var(--cc-space-1) var(--cc-space-4)", fontSize: "var(--cc-text-sm)" }}>
            {date ? <time dateTime={episode.publishedAt}>{date}</time> : null}
            {duration ? <span>{duration}</span> : null}
          </p>
          {guests.length > 0 ? <p>With {guests.join(", ")}</p> : null}
          {showDescription && episode.description ? (
            <p
              className="cc-muted"
              style={{ display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden", maxWidth: "var(--cc-measure)" }}
            >
              {episode.description}
            </p>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--cc-space-3)" }}>
            {listenHref ? (
              <a className="cc-btn cc-btn--primary" href={listenHref}>
                {buttonLabel}
                <span className="cc-sr-only">: {episode.title}</span>
              </a>
            ) : null}
            {youtube ? (
              <a className="cc-btn" href={youtube}>
                Watch on YouTube
                <span className="cc-sr-only"> (opens YouTube)</span>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="cc-container cc-section" aria-busy={status === "loading"} aria-label="Latest episode">
      {body}
    </section>
  );
}

export const latestEpisodeHeroBlock = {
  label: "Latest Episode Hero",
  fields: {
    eyebrow: { type: "text" as const, label: "Eyebrow text" },
    buttonLabel: { type: "text" as const, label: "Button label" },
    showArtwork: {
      type: "radio" as const,
      label: "Show artwork",
      options: [
        { label: "Yes", value: true },
        { label: "No", value: false },
      ],
    },
    showDescription: {
      type: "radio" as const,
      label: "Show description",
      options: [
        { label: "Yes", value: true },
        { label: "No", value: false },
      ],
    },
    endpoint: {
      type: "text" as const,
      label: "Episodes API endpoint (must return { episodes, nextCursor }; same-origin path or http(s) URL)",
    },
    episodeLinkTemplate: {
      type: "text" as const,
      label: "Episode link pattern (placeholders: {slug} {id} {season} {number})",
    },
  },
  defaultProps: DEFAULTS,
  render: LatestEpisodeHeroRender,
};
