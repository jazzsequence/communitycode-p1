"use client";

import { memo, useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { formatDuration } from "@/lib/format";
import {
  activeCueIndex,
  blockMatches,
  groupCues,
  highlightBlock,
  type Cue,
  type TranscriptBlock,
} from "@/lib/transcript";
import { DEFAULT_ENDPOINTS, expandTemplate, safeUrl } from "@/lib/block-config";
import { seekPlayer, useEpisode, usePlayerSelector, type EpisodeEndpoints } from "./player-context";

/**
 * Transcript text is untrusted. Everything below renders cue text as React text
 * nodes (and <mark> wrappers we create ourselves); there is no
 * dangerouslySetInnerHTML anywhere in this file.
 */

type Load = { status: "loading" } | { status: "ready"; cues: Cue[] } | { status: "empty" } | { status: "error" };

function useCues(slug: string, transcriptEndpoint: string | undefined): { load: Load; retry: () => void } {
  const template = safeUrl(transcriptEndpoint, DEFAULT_ENDPOINTS.transcript);
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const url = expandTemplate(template, { slug });
    if (!url) {
      setLoad({ status: "error" });
      return;
    }
    const ctl = new AbortController();
    setLoad({ status: "loading" });
    fetch(url, { signal: ctl.signal })
      .then(async (res) => {
        if (res.status === 404) return { status: "empty" } as const;
        if (!res.ok) return { status: "error" } as const;
        const body = (await res.json()) as { cues?: Cue[] };
        const cues = Array.isArray(body.cues) ? body.cues : [];
        return cues.length ? ({ status: "ready", cues } as const) : ({ status: "empty" } as const);
      })
      .then((next) => {
        if (!ctl.signal.aborted) setLoad(next);
      })
      .catch(() => {
        if (!ctl.signal.aborted) setLoad({ status: "error" });
      });
    return () => ctl.abort();
  }, [slug, template, attempt]);

  return { load, retry: () => setAttempt((n) => n + 1) };
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

interface RowProps {
  block: TranscriptBlock;
  /** Flat index of the playing cue when it is inside this block, else -1. */
  activeIndex: number;
  query: string;
  canSeek: boolean;
  follow: boolean;
  onSeek: (seconds: number) => void;
}

const Row = memo(function TranscriptRow({ block, activeIndex, query, canSeek, follow, onSeek }: RowProps) {
  const ref = useRef<HTMLLIElement>(null);
  const active = activeIndex >= 0;
  const stamp = formatDuration(block.start);
  const segments = useMemo(() => highlightBlock(block, query), [block, query]);

  // Scroll only when the user opted in, and without animation if they asked for less.
  useEffect(() => {
    if (active && follow) {
      ref.current?.scrollIntoView?.({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  }, [active, follow]);

  return (
    <li
      ref={ref}
      aria-current={active ? "true" : undefined}
      style={{
        display: "grid",
        gridTemplateColumns: "4.5rem 1fr",
        gap: "var(--cc-space-3)",
        alignItems: "start",
        padding: "var(--cc-space-2) var(--cc-space-3)",
        borderLeft: `3px solid ${active ? "var(--cc-accent)" : "transparent"}`,
        // Offscreen rows skip layout and paint: long transcripts stay cheap.
        contentVisibility: "auto",
        containIntrinsicSize: "auto 5rem",
      }}
    >
      {canSeek ? (
        <button
          type="button"
          className="cc-btn"
          aria-label={`Play from ${stamp}`}
          onClick={() => onSeek(block.start)}
          style={{ padding: 0, fontVariantNumeric: "tabular-nums" }}
        >
          {stamp}
        </button>
      ) : (
        <span className="cc-muted" style={{ fontVariantNumeric: "tabular-nums", paddingBlock: "var(--cc-space-2)" }}>
          {stamp}
        </span>
      )}
      <p style={{ margin: 0, paddingBlock: "var(--cc-space-2)", maxWidth: "var(--cc-measure)" }}>
        {block.speaker ? <strong>{block.speaker}: </strong> : null}
        {block.cues.map((cue, i) => {
          const isActive = block.firstIndex + i === activeIndex;
          return (
            <span
              key={i}
              // Mouse convenience only; the timestamp button is the keyboard path.
              onClick={canSeek ? () => onSeek(cue.start) : undefined}
              style={{
                background: isActive ? "var(--cc-surface-2)" : undefined,
                borderRadius: "var(--cc-radius-sm)",
                cursor: canSeek ? "pointer" : undefined,
              }}
            >
              {segments[i].map((seg, j) =>
                seg.match ? (
                  <mark
                    key={j}
                    style={{ background: "var(--cc-accent)", color: "var(--cc-accent-ink)", borderRadius: "0.2em" }}
                  >
                    {seg.text}
                  </mark>
                ) : (
                  seg.text
                ),
              )}{" "}
            </span>
          );
        })}
      </p>
    </li>
  );
});

export interface TranscriptViewerProps {
  /** Episode slug: fetches the transcript and pairs with the player for that episode. */
  slug: string;
  showSearch?: boolean;
  /** URL template with `{slug}`; must answer { cues: Cue[] }. Default: DEFAULT_ENDPOINTS.transcript. */
  transcriptEndpoint?: string;
}

export function TranscriptViewer({ slug, showSearch = true, transcriptEndpoint }: TranscriptViewerProps) {
  const { load, retry } = useCues(slug, transcriptEndpoint);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [follow, setFollow] = useState(false);
  const searchId = useId();
  const followId = useId();

  const cues = load.status === "ready" ? load.cues : null;
  const blocks = useMemo(() => (cues ? groupCues(cues) : []), [cues]);
  const shown = useMemo(
    () => (deferredQuery.trim() ? blocks.filter((b) => blockMatches(b, deferredQuery)) : blocks),
    [blocks, deferredQuery],
  );

  const canSeek = usePlayerSelector(slug, (s) => s.hasPlayer);
  // A primitive, so this component re-renders when the cue changes, not on every tick.
  const activeIndex = usePlayerSelector(slug, (s) =>
    cues && (s.playing || s.currentTime > 0) ? activeCueIndex(cues, s.currentTime) : -1,
  );

  const onSeek = useCallback((seconds: number) => seekPlayer(slug, seconds, true), [slug]);

  if (load.status === "loading") {
    return (
      <p className="cc-muted" role="status">
        Loading transcript...
      </p>
    );
  }
  if (load.status === "empty") {
    return <p className="cc-muted">There is no transcript for this episode.</p>;
  }
  if (load.status === "error") {
    return (
      <div className="cc-stack">
        <p role="alert" style={{ color: "var(--cc-danger)", margin: 0 }}>
          The transcript could not be loaded.
        </p>
        <button type="button" className="cc-btn" onClick={retry}>
          Try again
        </button>
      </div>
    );
  }

  const searching = deferredQuery.trim().length > 0;
  return (
    <div className="cc-stack">
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--cc-space-4)", alignItems: "center" }}>
        {showSearch ? (
          <div style={{ flex: "1 1 16rem" }}>
            <label htmlFor={searchId} className="cc-sr-only">
              Search the transcript
            </label>
            <input
              id={searchId}
              type="search"
              className="cc-field"
              placeholder="Search the transcript"
              value={query}
              maxLength={100}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </div>
        ) : null}
        {canSeek ? (
          <label
            htmlFor={followId}
            style={{ display: "inline-flex", alignItems: "center", gap: "var(--cc-space-2)", minHeight: "2.75rem" }}
          >
            <input
              id={followId}
              type="checkbox"
              checked={follow}
              onChange={(e) => setFollow(e.target.checked)}
              style={{ width: "1.25rem", height: "1.25rem", accentColor: "var(--cc-accent)" }}
            />
            Follow along
          </label>
        ) : null}
      </div>

      {/* Settled value (deferred), so typing does not announce per keystroke. */}
      <p role="status" aria-live="polite" className={searching ? "cc-muted" : "cc-sr-only"} style={{ margin: 0 }}>
        {searching
          ? shown.length === 0
            ? "No matches."
            : `${shown.length} ${shown.length === 1 ? "passage matches" : "passages match"}.`
          : ""}
      </p>

      {shown.length > 0 ? (
        <ol style={{ listStyle: "none", margin: 0, padding: 0 }} aria-label="Transcript">
          {shown.map((block) => (
            <Row
              key={block.firstIndex}
              block={block}
              activeIndex={activeIndex >= block.firstIndex && activeIndex <= block.lastIndex ? activeIndex : -1}
              query={deferredQuery}
              canSeek={canSeek}
              follow={follow}
              onSeek={onSeek}
            />
          ))}
        </ol>
      ) : null}
    </div>
  );
}

/** The Puck block's body: resolves the episode (empty slug = latest), then shows its transcript. */
export function TranscriptBlockView({
  episodeSlug,
  showSearch = true,
  transcriptEndpoint,
  ...endpoints
}: { episodeSlug?: string; showSearch?: boolean; transcriptEndpoint?: string } & EpisodeEndpoints) {
  const lookup = useEpisode(episodeSlug, endpoints);
  let body: React.ReactNode;
  if (lookup.status === "loading") {
    body = (
      <p className="cc-muted" role="status">
        Loading transcript...
      </p>
    );
  } else if (lookup.status === "missing") {
    body = <p className="cc-muted">That episode could not be found.</p>;
  } else if (lookup.status === "error") {
    body = <p style={{ color: "var(--cc-danger)" }}>The transcript is temporarily unavailable. Try again shortly.</p>;
  } else if (!lookup.episode.transcript) {
    body = <p className="cc-muted">There is no transcript for this episode.</p>;
  } else {
    body = <TranscriptViewer slug={lookup.episode.slug} showSearch={showSearch} transcriptEndpoint={transcriptEndpoint} />;
  }
  return (
    <section className="cc-container cc-section" aria-label="Transcript">
      {body}
    </section>
  );
}
