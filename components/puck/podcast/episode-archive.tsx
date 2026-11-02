"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { DEFAULT_ENDPOINTS, DEFAULT_LINKS, safeUrl } from "@/lib/block-config";
import { EpisodeCardView } from "@/components/podcast/episode-card";
import { useEpisodes } from "@/components/podcast/use-episodes";
import type { EpisodeType } from "@/lib/episodes/types";

type TypeChoice = EpisodeType | "all";

export interface EpisodeArchiveProps {
  heading: string;
  /** Base type filter. Visitors can change it only when showTypeFilter is on. */
  defaultType: TypeChoice;
  showTypeFilter: boolean;
  pageSize: number;
  /**
   * Episodes list endpoint. Contract: GET `?limit=&season=&type=a,b&cursor=`
   * returns `EpisodeListResponse` (lib/episodes/dto.ts): `{ episodes, nextCursor,
   * origin, seasons? }`, with `seasons` on the first page only and `nextCursor`
   * an opaque string passed back unchanged with the same filters.
   */
  endpoint: string;
  /** Link pattern for each card. Placeholders: {slug} {id} {season} {number}. */
  episodeLinkTemplate: string;
}

const DEFAULTS: EpisodeArchiveProps = {
  heading: "All episodes",
  defaultType: "full",
  showTypeFilter: false,
  pageSize: 12,
  endpoint: DEFAULT_ENDPOINTS.episodes,
  episodeLinkTemplate: DEFAULT_LINKS.episode,
};

const MIN_PAGE = 6;
const MAX_PAGE = 24;
const SKELETON_COUNT = 6;

const TYPE_LABELS: Record<TypeChoice, string> = {
  all: "All types",
  full: "Full episodes",
  trailer: "Trailers",
  bonus: "Bonus",
};

function clampPageSize(n: unknown): number {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : 12;
  return Math.min(MAX_PAGE, Math.max(MIN_PAGE, v));
}

/** Props may predate a field (content saved before it existed), so merge defaults at render. */
export function EpisodeArchiveRender(props: Partial<EpisodeArchiveProps> & { id?: string }) {
  const { heading, defaultType, showTypeFilter, pageSize, episodeLinkTemplate } = {
    ...DEFAULTS,
    ...Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined && v !== null)),
  } as EpisodeArchiveProps;
  const endpoint = safeUrl(props.endpoint, DEFAULTS.endpoint);
  const uid = useId();
  const [season, setSeason] = useState<string>("all");
  const [type, setType] = useState<TypeChoice>(defaultType);
  const limit = clampPageSize(pageSize);

  // Editors can change the base type in the sidebar; follow it.
  useEffect(() => setType(defaultType), [defaultType]);

  const filters = useMemo(
    () => ({
      endpoint,
      season: season === "all" ? null : Number(season),
      types: type === "all" ? undefined : ([type] as const),
      limit,
    }),
    [endpoint, season, type, limit],
  );
  const { status, episodes, nextCursor, seasons, error, errorPhase, loadMore, retry } = useEpisodes(filters);

  // Focus: after "Load more" lands, move to the first newly added card so a
  // keyboard/SR user continues from where the new content starts. The button
  // may disappear (last page), so leaving focus on it is not safe.
  const listRef = useRef<HTMLDivElement>(null);
  const focusFrom = useRef<number | null>(null);
  useEffect(() => {
    const from = focusFrom.current;
    if (from === null || status !== "ready") return;
    focusFrom.current = null;
    if (episodes.length > from) {
      listRef.current?.querySelectorAll<HTMLAnchorElement>("[data-episode-card] > a")[from]?.focus();
    }
  }, [status, episodes.length]);

  const onSeason = (v: string) => {
    focusFrom.current = null;
    setSeason(v);
  };
  const onType = (v: TypeChoice) => {
    focusFrom.current = null;
    setType(v);
  };
  const onLoadMore = () => {
    if (status === "error" && errorPhase === "more") {
      focusFrom.current = episodes.length;
      retry();
    } else if (status === "ready") {
      focusFrom.current = episodes.length;
      loadMore();
    }
  };

  const loadingFirst = status === "loading";
  const loadingMore = status === "loadingMore";
  const initialError = status === "error" && errorPhase === "initial";
  const moreError = status === "error" && errorPhase === "more";
  const showList = episodes.length > 0;
  const filtered = season !== "all" || type !== defaultType;

  let announcement = "";
  if (loadingFirst) announcement = "Loading episodes…";
  else if (loadingMore) announcement = "Loading more episodes…";
  else if (status === "ready") {
    announcement = showList
      ? `Showing ${episodes.length} ${episodes.length === 1 ? "episode" : "episodes"}${nextCursor ? ", more available" : ""}`
      : filtered
        ? "No episodes match these filters."
        : "No episodes yet";
  }
  // Errors are announced by their role="alert" message, not repeated here.

  const labelId = `${uid}-heading`;
  const seasonId = `${uid}-season`;
  const typeId = `${uid}-type`;

  return (
    <section className="cc-container cc-section" aria-labelledby={heading ? labelId : undefined} aria-label={heading ? undefined : "Episodes"}>
      {heading ? (
        <h2 id={labelId} style={{ fontSize: "var(--cc-text-xl)", marginBottom: "var(--cc-space-5)" }}>
          {heading}
        </h2>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--cc-space-4)", marginBottom: "var(--cc-space-4)" }}>
        <div style={{ minWidth: "12rem" }}>
          <label htmlFor={seasonId} style={{ display: "block", fontSize: "var(--cc-text-sm)", marginBottom: "var(--cc-space-1)" }}>
            Season
          </label>
          <select id={seasonId} className="cc-field" value={season} onChange={(e) => onSeason(e.target.value)}>
            <option value="all">All seasons</option>
            {(seasons ?? []).map((s) => (
              <option key={s} value={String(s)}>
                Season {s}
              </option>
            ))}
          </select>
        </div>
        {showTypeFilter ? (
          <div style={{ minWidth: "12rem" }}>
            <label htmlFor={typeId} style={{ display: "block", fontSize: "var(--cc-text-sm)", marginBottom: "var(--cc-space-1)" }}>
              Type
            </label>
            <select id={typeId} className="cc-field" value={type} onChange={(e) => onType(e.target.value as TypeChoice)}>
              {(Object.keys(TYPE_LABELS) as TypeChoice[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <p className="cc-muted" role="status" aria-live="polite" style={{ margin: "0 0 var(--cc-space-4)", fontSize: "var(--cc-text-sm)", minHeight: "1.5em" }}>
        {announcement}
      </p>

      {initialError ? (
        <div role="alert" className="cc-stack">
          <p style={{ margin: 0, color: "var(--cc-danger)" }}>{error}</p>
          <button type="button" className="cc-btn" onClick={retry}>
            Retry
          </button>
        </div>
      ) : null}

      {loadingFirst ? (
        <div className="cc-grid" aria-hidden="true" data-testid="episode-skeleton">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <div key={i} className="cc-card" style={{ aspectRatio: "3 / 4", background: "var(--cc-surface-2)" }} />
          ))}
        </div>
      ) : null}

      {!loadingFirst && !initialError && !showList ? (
        <p className="cc-muted">{filtered ? "No episodes match these filters." : "No episodes yet"}</p>
      ) : null}

      {showList ? (
        <div ref={listRef} className="cc-grid" aria-busy={loadingMore}>
          {episodes.map((ep) => (
            <EpisodeCardView key={ep.id} episode={ep} linkTemplate={episodeLinkTemplate} />
          ))}
        </div>
      ) : null}

      {showList && (nextCursor || moreError) ? (
        <div className="cc-stack" style={{ marginTop: "var(--cc-space-5)", textAlign: "center" }}>
          {moreError ? (
            <p role="alert" style={{ margin: 0, color: "var(--cc-danger)" }}>
              {error}
            </p>
          ) : null}
          {/* aria-disabled (not disabled) while loading so a focused button keeps focus. */}
          <button type="button" className="cc-btn" aria-disabled={loadingMore} onClick={loadingMore ? undefined : onLoadMore}>
            {loadingMore ? "Loading…" : moreError ? "Retry" : "Load more"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

export const episodeArchiveBlock = {
  label: "Episode Archive",
  fields: {
    heading: { type: "text" as const, label: "Heading" },
    defaultType: {
      type: "select" as const,
      label: "Episode type",
      options: [
        { label: "Full episodes", value: "full" },
        { label: "All types", value: "all" },
        { label: "Trailers", value: "trailer" },
        { label: "Bonus", value: "bonus" },
      ],
    },
    showTypeFilter: {
      type: "radio" as const,
      label: "Let visitors filter by type",
      options: [
        { label: "Yes", value: true },
        { label: "No", value: false },
      ],
    },
    pageSize: { type: "number" as const, label: "Episodes per page (6-24)", min: MIN_PAGE, max: MAX_PAGE },
    endpoint: {
      type: "text" as const,
      label: "Episodes API endpoint (must return { episodes, nextCursor, seasons? }; same-origin path or http(s) URL)",
    },
    episodeLinkTemplate: {
      type: "text" as const,
      label: "Episode link pattern (placeholders: {slug} {id} {season} {number})",
    },
  },
  defaultProps: DEFAULTS,
  render: EpisodeArchiveRender,
};
