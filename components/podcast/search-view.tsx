"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { DEFAULT_ENDPOINTS, DEFAULT_LINKS, expandTemplate, safeUrl, withQuery } from "@/lib/block-config";
import { formatDate, formatEpisodeLabel } from "@/lib/format";
import type { EpisodeCard, EpisodeListResponse } from "@/lib/episodes/dto";
import { safeHref } from "@/lib/safe-link";
import "./chrome-blocks.css";

export const MIN_QUERY = 2;
export const DEBOUNCE_MS = 250;

type Hit = Pick<EpisodeCard, "slug" | "title" | "season" | "number" | "publishedAt">;
type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; hits: Hit[]; more: boolean; term: string }
  | { status: "error" };

export function clampMax(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 8;
  return Math.min(20, Math.max(3, Math.floor(v)));
}

function parseHits(body: unknown): { hits: Hit[]; more: boolean } {
  const b = body as Partial<EpisodeListResponse> | null;
  if (!b || !Array.isArray(b.episodes)) throw new Error("Unexpected response");
  const hits = b.episodes
    .filter((e): e is EpisodeCard => !!e && typeof e.slug === "string" && typeof e.title === "string")
    .map(({ slug, title, season, number, publishedAt }) => ({ slug, title, season, number, publishedAt }));
  return { hits, more: Boolean(b.nextCursor) };
}

export interface SiteSearchViewProps {
  heading?: string;
  placeholder?: string;
  maxResults?: number;
  /** Search endpoint; `q` and `limit` are appended. Falls back to the default if empty/unsafe. */
  endpoint?: string;
  /** Result link pattern with {slug} (also {id} {season} {number}). */
  episodeLinkTemplate?: string;
  /** Where the no-JS form submits (GET ?q=). Empty = submit to the current page. */
  formAction?: string;
}

export function SiteSearchView({
  heading,
  placeholder = "Search episodes, guests, topics",
  maxResults,
  endpoint,
  episodeLinkTemplate,
  formAction,
}: SiteSearchViewProps) {
  const limit = clampMax(maxResults);
  const searchUrl = safeUrl(endpoint, DEFAULT_ENDPOINTS.episodes);
  const linkTemplate = episodeLinkTemplate?.trim() || DEFAULT_LINKS.episode;
  const action = formAction?.trim() ? safeUrl(formAction, "") || undefined : undefined;
  const inputId = useId();
  const hintId = useId();
  const [value, setValue] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const [nonce, setNonce] = useState(0);
  // A submit or retry skips the debounce wait.
  const immediate = useRef(false);

  const term = value.trim().replace(/\s+/g, " ");
  const active = term.length >= MIN_QUERY;

  useEffect(() => {
    if (!active) {
      setState({ status: "idle" });
      return;
    }
    setState({ status: "loading" });
    const controller = new AbortController();
    // Belt and braces with abort: a fetch that ignores its signal must still not
    // be able to overwrite newer results.
    let stale = false;
    const delay = immediate.current ? 0 : DEBOUNCE_MS;
    immediate.current = false;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(withQuery(searchUrl, { q: term, limit }), {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { hits, more } = parseHits(await res.json());
        if (!stale) setState({ status: "done", hits, more, term });
      } catch (e) {
        if (stale || (e as Error).name === "AbortError") return;
        setState({ status: "error" });
      }
    }, delay);

    return () => {
      stale = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, active, limit, searchUrl, nonce]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!active) return;
    immediate.current = true;
    setNonce((n) => n + 1);
  }

  let status = "";
  if (state.status === "loading") status = "Searching…";
  else if (state.status === "error") status = "Search is unavailable right now.";
  else if (state.status === "done") {
    const n = state.hits.length;
    if (n === 0) status = `No episodes found for “${state.term}”.`;
    else if (state.more) status = `Showing the first ${n} matching episodes.`;
    else status = `${n} ${n === 1 ? "episode" : "episodes"} found.`;
  }

  return (
    <section className="cc-section">
      <div className="cc-container cc-stack">
        {heading?.trim() ? <h2 style={{ fontSize: "var(--cc-text-xl)" }}>{heading}</h2> : null}
        {/* Without JS this is a plain GET to the archive; with JS it searches in place. */}
        <form role="search" className="cc-search-form" action={action} method="get" onSubmit={onSubmit}>
          <label htmlFor={inputId} className="cc-sr-only">
            Search episodes
          </label>
          <input
            id={inputId}
            className="cc-field"
            type="search"
            name="q"
            autoComplete="off"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-describedby={hintId}
          />
          <button type="submit" className="cc-btn cc-btn--primary">
            Search
          </button>
        </form>
        <p id={hintId} className="cc-muted" style={{ margin: "var(--cc-space-2) 0 0", fontSize: "var(--cc-text-sm)" }}>
          Type at least {MIN_QUERY} characters. Matches titles, descriptions and guest names.
        </p>

        <div role="status" aria-live="polite" className="cc-muted" aria-busy={state.status === "loading"}>
          {status}
        </div>
        {state.status === "error" ? (
          <button
            type="button"
            className="cc-btn"
            onClick={() => {
              immediate.current = true;
              setNonce((n) => n + 1);
            }}
          >
            Try again
          </button>
        ) : null}

        {state.status === "done" && state.hits.length ? (
          <ul className="cc-search-results" aria-label="Search results">
            {state.hits.map((h) => {
              const meta = [formatEpisodeLabel(h.season, h.number), formatDate(h.publishedAt)].filter(Boolean).join(" · ");
              const href = expandTemplate(linkTemplate, { slug: h.slug, season: h.season, number: h.number });
              const body = (
                <>
                  <span className="cc-search-item-title">{h.title}</span>
                  {meta ? <span className="cc-muted">{meta}</span> : null}
                </>
              );
              // A template needing a value this episode lacks renders plain text, not a broken link.
              return (
                <li key={h.slug}>
                  {href && safeHref(href) ? (
                    <a className="cc-search-item" href={safeHref(href) as string}>
                      {body}
                    </a>
                  ) : (
                    <div className="cc-search-item">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
