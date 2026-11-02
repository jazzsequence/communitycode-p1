"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { EpisodeCard, EpisodeListResponse } from "@/lib/episodes/dto";
import { withQuery } from "@/lib/block-config";
import type { EpisodeType } from "@/lib/episodes/types";

export interface EpisodeFilters {
  /** List endpoint (already passed through `safeUrl`). May contain its own `?query`. */
  endpoint: string;
  /** null/undefined = all seasons. */
  season?: number | null;
  /** undefined or empty = all types. */
  types?: readonly EpisodeType[];
  limit: number;
}

export type ErrorPhase = "initial" | "more";

export interface EpisodesState {
  /** "loading" = first page for the current filters; "loadingMore" = a later page. */
  status: "loading" | "ready" | "loadingMore" | "error";
  episodes: EpisodeCard[];
  nextCursor: string | null;
  /** From the first page of any filter set; null until the first response. Kept across filter changes. */
  seasons: number[] | null;
  error: string | null;
  /** Which request failed, so Retry repeats the right one. */
  errorPhase: ErrorPhase | null;
}

export const initialEpisodesState: EpisodesState = {
  status: "loading",
  episodes: [],
  nextCursor: null,
  seasons: null,
  error: null,
  errorPhase: null,
};

export type EpisodesAction =
  | { type: "reset" }
  | { type: "more-start" }
  | { type: "page"; page: EpisodeListResponse; append: boolean }
  | { type: "fail"; message: string; phase: ErrorPhase };

export function episodesReducer(state: EpisodesState, action: EpisodesAction): EpisodesState {
  switch (action.type) {
    // Filters changed (or Retry of the first page): drop the list AND the cursor.
    // A cursor is only valid with the filters it was issued for.
    case "reset":
      return { ...state, status: "loading", episodes: [], nextCursor: null, error: null, errorPhase: null };
    case "more-start":
      return { ...state, status: "loadingMore", error: null, errorPhase: null };
    case "page":
      return {
        ...state,
        status: "ready",
        episodes: action.append ? [...state.episodes, ...action.page.episodes] : action.page.episodes,
        nextCursor: action.page.nextCursor ?? null,
        // Seasons only come with a first page; never clobber them with undefined.
        seasons: action.page.seasons ?? state.seasons,
        error: null,
        errorPhase: null,
      };
    case "fail":
      return { ...state, status: "error", error: action.message, errorPhase: action.phase };
  }
}

/**
 * Endpoint contract (see EpisodeListResponse in lib/episodes/dto.ts): GET
 * `?limit=&season=&type=a,b&cursor=` -> { episodes, nextCursor, origin, seasons? }.
 */
export function buildEpisodesUrl(filters: EpisodeFilters, cursor?: string | null): string {
  return withQuery(filters.endpoint, {
    limit: filters.limit,
    season: filters.season,
    type: filters.types?.join(","),
    cursor, // opaque: passed back untouched
  });
}

const UNAVAILABLE = "Episodes are temporarily unavailable.";

function isListResponse(body: unknown): body is EpisodeListResponse {
  return typeof body === "object" && body !== null && Array.isArray((body as { episodes?: unknown }).episodes);
}

function isAbort(e: unknown, signal: AbortSignal): boolean {
  return signal.aborted || (e instanceof Error && e.name === "AbortError");
}

export interface UseEpisodes extends EpisodesState {
  loadMore: () => void;
  /** Repeat whichever request failed. */
  retry: () => void;
}

/**
 * Fetches an episodes list endpoint for a set of filters. Changing any filter aborts the
 * in-flight request, clears the list and cursor, and refetches page one.
 * Responses from superseded requests are dropped (request id), even if the
 * network layer ignores the abort.
 */
export function useEpisodes(filters: EpisodeFilters): UseEpisodes {
  const [state, dispatch] = useReducer(episodesReducer, initialEpisodesState);
  const stateRef = useRef(state);
  const filtersRef = useRef(filters);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);

  // Refs are synced in an effect (declared first, so it runs before the fetch effect).
  useEffect(() => {
    stateRef.current = state;
    filtersRef.current = filters;
  });

  const run = useCallback(async (cursor: string | null) => {
    controller.current?.abort();
    const ctl = new AbortController();
    controller.current = ctl;
    const id = ++requestId.current;
    const append = cursor !== null;
    const phase: ErrorPhase = append ? "more" : "initial";
    dispatch({ type: append ? "more-start" : "reset" });

    try {
      const res = await fetch(buildEpisodesUrl(filtersRef.current, cursor), {
        signal: ctl.signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body: unknown = await res.json();
      if (id !== requestId.current) return;
      if (!isListResponse(body)) throw new Error("Unexpected response shape");
      dispatch({ type: "page", page: body, append });
    } catch (e) {
      // A superseded or aborted request is not an error the user should see.
      if (id !== requestId.current || isAbort(e, ctl.signal)) return;
      dispatch({ type: "fail", message: UNAVAILABLE, phase });
    }
  }, []);

  // Invalidate in-flight work (filter change, unmount). A callback, not inline in
  // the effect cleanup, because the refs hold request bookkeeping, not DOM nodes.
  const invalidate = useCallback(() => {
    requestId.current++;
    controller.current?.abort();
  }, []);

  const typesKey = filters.types?.join(",") ?? "";
  const season = filters.season ?? null;
  const { limit, endpoint } = filters;

  useEffect(() => {
    void run(null);
    return invalidate;
  }, [run, invalidate, endpoint, season, typesKey, limit]);

  const loadMore = useCallback(() => {
    const { status, nextCursor } = stateRef.current;
    if (status !== "ready" || !nextCursor) return;
    void run(nextCursor);
  }, [run]);

  const retry = useCallback(() => {
    const { status, errorPhase, nextCursor } = stateRef.current;
    if (status !== "error") return;
    void run(errorPhase === "more" ? nextCursor : null);
  }, [run]);

  return { ...state, loadMore, retry };
}
