"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { withQuery } from "@/lib/block-config";
import type { Post, PostsResponse } from "@/lib/posts";

/** "unconfigured" is the endpoint answering 501: the backend is switched off, not broken. */
export type PostsStatus = "loading" | "ready" | "error" | "unconfigured";

class UnconfiguredError extends Error {}

export interface UsePosts {
  posts: Post[];
  status: PostsStatus;
  /** A "load more" request is in flight (the list stays on screen). */
  loadingMore: boolean;
  /** A "load more" request failed; the posts already loaded are kept. */
  moreError: boolean;
  hasMore: boolean;
  /** Id of the first post of the most recent page appended by loadMore. */
  firstNewId: number | null;
  loadMore: () => void;
  retry: () => void;
}

async function fetchPage(
  endpoint: string,
  page: number,
  perPage: number,
  signal: AbortSignal,
): Promise<PostsResponse> {
  // The endpoint may already carry a query string (`?x=1`), so append, don't assume.
  const res = await fetch(withQuery(endpoint, { page, per_page: perPage }), { signal });
  if (res.status === 501) throw new UnconfiguredError("posts endpoint not configured");
  if (!res.ok) throw new Error(`posts ${res.status}`);
  const body = (await res.json()) as Partial<PostsResponse>;
  if (!Array.isArray(body.posts)) throw new Error("posts: bad payload");
  return { posts: body.posts, page, totalPages: body.totalPages ?? 0 };
}

/**
 * Pages through the posts endpoint (a caller-validated URL). Race-safe two ways: every request carries an
 * AbortSignal that is tripped when the params change, the component unmounts
 * or a retry starts; and each result is checked against a generation counter
 * before it touches state, so a response that can't be aborted (already
 * resolved) still can't overwrite newer data.
 */
export function usePosts(endpoint: string, perPage: number): UsePosts {
  const [posts, setPosts] = useState<Post[]>([]);
  const [status, setStatus] = useState<PostsStatus>("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [firstNewId, setFirstNewId] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const postsRef = useRef<Post[]>([]);
  postsRef.current = posts;

  // First page: runs on mount, when perPage changes, and on retry.
  useEffect(() => {
    const gen = ++generation.current;
    controller.current?.abort();
    const ctl = new AbortController();
    controller.current = ctl;
    busy.current = true;
    setStatus("loading");
    setPosts([]);
    setPage(0);
    setTotalPages(0);
    setLoadingMore(false);
    setMoreError(false);
    setFirstNewId(null);

    fetchPage(endpoint, 1, perPage, ctl.signal)
      .then((r) => {
        if (gen !== generation.current) return;
        setPosts(r.posts);
        setPage(1);
        setTotalPages(r.totalPages);
        setStatus("ready");
      })
      .catch((e: unknown) => {
        if (gen !== generation.current || ctl.signal.aborted) return;
        setStatus(e instanceof UnconfiguredError ? "unconfigured" : "error");
      })
      .finally(() => {
        if (gen === generation.current) busy.current = false;
      });

    return () => controller.current?.abort();
  }, [endpoint, perPage, attempt]);

  const loadMore = useCallback(() => {
    // The ref (not state) guards double activation within one render.
    if (busy.current || status !== "ready" || page >= totalPages) return;
    busy.current = true;
    const gen = generation.current;
    const ctl = new AbortController();
    controller.current = ctl;
    setLoadingMore(true);
    setMoreError(false);

    fetchPage(endpoint, page + 1, perPage, ctl.signal)
      .then((r) => {
        if (gen !== generation.current) return;
        // A post published between pages shifts the window; never show one twice.
        const seen = new Set(postsRef.current.map((p) => p.id));
        const fresh = r.posts.filter((p) => !seen.has(p.id));
        setFirstNewId(fresh[0]?.id ?? null);
        setPosts((prev) => [...prev, ...fresh]);
        setPage(page + 1);
        setTotalPages(r.totalPages);
      })
      .catch(() => {
        if (gen !== generation.current || ctl.signal.aborted) return;
        setMoreError(true);
      })
      .finally(() => {
        if (gen !== generation.current) return;
        busy.current = false;
        setLoadingMore(false);
      });
  }, [status, page, totalPages, perPage, endpoint]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    posts,
    status,
    loadingMore,
    moreError,
    hasMore: status === "ready" && page < totalPages,
    firstNewId,
    loadMore,
    retry,
  };
}
