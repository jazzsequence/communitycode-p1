"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_ENDPOINTS, DEFAULT_LINKS, expandTemplate, safeUrl } from "@/lib/block-config";
import { safeHref } from "@/lib/safe-link";
import { formatEpisodeLabel } from "@/lib/format";
import { excludeRoles, type AggregatedGuest, type GuestsResponse } from "@/lib/guests";
import { GuestAvatar } from "./guest-avatar";
import "./chrome-blocks.css";

type State = { status: "loading" } | { status: "error" } | { status: "done"; guests: AggregatedGuest[] };

export function clampColumns(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 3;
  return Math.min(4, Math.max(2, Math.floor(v)));
}

function parseGuests(body: unknown): AggregatedGuest[] {
  const b = body as Partial<GuestsResponse> | null;
  if (!b || !Array.isArray(b.guests)) throw new Error("Unexpected response");
  return b.guests.filter((g) => !!g && typeof g.name === "string" && Array.isArray(g.episodes));
}

export interface GuestGridViewProps {
  heading?: string;
  columns?: number;
  showEpisodeCount?: boolean;
  /** Cap how many guests render. Empty/0 means all. */
  limit?: number | string | null;
  /** Guests endpoint. Falls back to the default if empty/unsafe. */
  endpoint?: string;
  /** Episode link pattern with {slug} (also {season} {number}). */
  episodeLinkTemplate?: string;
  /** Case-insensitive regex of roles to hide (hosts). Undefined = "host|co-host"; empty = hide nobody. */
  excludeRolesPattern?: string;
}

export function GuestGridView({ heading, columns, showEpisodeCount = true, limit, endpoint, episodeLinkTemplate, excludeRolesPattern }: GuestGridViewProps) {
  const url = safeUrl(endpoint, DEFAULT_ENDPOINTS.guests);
  const linkTemplate = episodeLinkTemplate?.trim() || DEFAULT_LINKS.episode;
  const [state, setState] = useState<State>({ status: "loading" });
  const [nonce, setNonce] = useState(0);
  const retry = useCallback(() => {
    setState({ status: "loading" });
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((body) => setState({ status: "done", guests: parseGuests(body) }))
      .catch((e: Error) => {
        if (e.name !== "AbortError") setState({ status: "error" });
      });
    return () => controller.abort();
  }, [url, nonce]);

  const cap = Number(limit);
  const visible = state.status === "done" ? excludeRoles(state.guests, excludeRolesPattern) : [];
  const guests = Number.isFinite(cap) && cap > 0 ? visible.slice(0, Math.floor(cap)) : visible;

  return (
    <section className="cc-section">
      <div className="cc-container cc-stack">
        {heading?.trim() ? <h2 style={{ fontSize: "var(--cc-text-xl)" }}>{heading}</h2> : null}

        {state.status === "loading" ? (
          <p role="status" className="cc-muted">
            Loading guests…
          </p>
        ) : null}

        {state.status === "error" ? (
          <div role="alert" className="cc-stack">
            <p style={{ color: "var(--cc-danger)", margin: 0 }}>Guests couldn’t be loaded right now.</p>
            <button type="button" className="cc-btn" onClick={retry}>
              Try again
            </button>
          </div>
        ) : null}

        {state.status === "done" && guests.length === 0 ? <p className="cc-muted">No guests to show yet.</p> : null}

        {guests.length ? (
          <ul className="cc-guest-grid" style={{ ["--cc-guest-cols" as string]: clampColumns(columns) }}>
            {guests.map((g) => (
              <li key={g.name.toLowerCase()} className="cc-card">
                <GuestAvatar name={g.name} photoUrl={g.photoUrl} />
                <div className="cc-guest-body">
                  <h3 className="cc-guest-name">{g.name}</h3>
                  {showEpisodeCount ? (
                    <p className="cc-muted" style={{ margin: "var(--cc-space-1) 0 0", fontSize: "var(--cc-text-sm)" }}>
                      {g.episodes.length} {g.episodes.length === 1 ? "episode" : "episodes"}
                    </p>
                  ) : null}
                  <ul className="cc-guest-eps">
                    {g.episodes.map((e) => {
                      const label = formatEpisodeLabel(e.season, e.number);
                      const raw = expandTemplate(linkTemplate, { slug: e.slug, season: e.season, number: e.number });
                      const href = raw ? safeHref(raw) : null;
                      const text = (
                        <>
                          {label || e.title}
                          {label ? <span className="cc-sr-only">: {e.title}</span> : null}
                        </>
                      );
                      return <li key={e.slug}>{href ? <a href={href}>{text}</a> : <span>{text}</span>}</li>;
                    })}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
