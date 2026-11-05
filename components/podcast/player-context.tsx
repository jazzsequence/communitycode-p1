"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { DEFAULT_ENDPOINTS, expandTemplate, safeUrl, withQuery } from "@/lib/block-config";
import type { EpisodeCard } from "@/lib/episodes/dto";

/**
 * A tiny event bus between the audio player and the transcript viewer.
 *
 * Why a module-level store and not a React context: on a Puck page the player
 * and the transcript are separate blocks with no common ancestor we control, so
 * a provider cannot wrap both. They meet on a channel keyed by episode slug
 * instead. Each works alone: a transcript with no player on the page just has
 * no seek buttons; a player with no transcript publishes to nobody.
 */

export interface PlayerSnapshot {
  hasPlayer: boolean;
  currentTime: number;
  duration: number;
  playing: boolean;
}

export interface PlayerController {
  seek(seconds: number, play: boolean): void;
}

export const EMPTY_SNAPSHOT: PlayerSnapshot = { hasPlayer: false, currentTime: 0, duration: 0, playing: false };

interface Channel {
  snapshot: PlayerSnapshot;
  controller: PlayerController | null;
  listeners: Set<() => void>;
}

const channels = new Map<string, Channel>();

function channel(key: string): Channel {
  let c = channels.get(key);
  if (!c) {
    c = { snapshot: EMPTY_SNAPSHOT, controller: null, listeners: new Set() };
    channels.set(key, c);
  }
  return c;
}

function emit(c: Channel) {
  c.listeners.forEach((l) => l());
}

/** A player announces itself. Returns the cleanup. */
export function registerPlayer(key: string, controller: PlayerController): () => void {
  const c = channel(key);
  c.controller = controller;
  c.snapshot = { ...EMPTY_SNAPSHOT, hasPlayer: true };
  emit(c);
  return () => {
    if (c.controller !== controller) return; // a newer player took over
    c.controller = null;
    c.snapshot = EMPTY_SNAPSHOT;
    emit(c);
  };
}

/** Publish playback state. Snapshots are immutable and only replaced on change. */
export function publishPlayerState(key: string, patch: Partial<Omit<PlayerSnapshot, "hasPlayer">>): void {
  const c = channel(key);
  const next = { ...c.snapshot, ...patch };
  if (
    next.currentTime === c.snapshot.currentTime &&
    next.duration === c.snapshot.duration &&
    next.playing === c.snapshot.playing
  ) {
    return;
  }
  c.snapshot = next;
  emit(c);
}

/** Ask the episode's player to jump. A no-op when there is none. */
export function seekPlayer(key: string, seconds: number, play = true): void {
  channels.get(key)?.controller?.seek(seconds, play);
}

/**
 * Subscribe to a derived value of the channel. Return a primitive from the
 * selector (an index, a boolean): the component then re-renders only when that
 * value changes, not on every `timeupdate`.
 */
export function usePlayerSelector<T extends string | number | boolean>(
  key: string | null | undefined,
  selector: (s: PlayerSnapshot) => T,
): T {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!key) return () => {};
      const c = channel(key);
      c.listeners.add(onChange);
      return () => {
        c.listeners.delete(onChange);
      };
    },
    [key],
  );
  return useSyncExternalStore(
    subscribe,
    () => selector(key ? channel(key).snapshot : EMPTY_SNAPSHOT),
    () => selector(EMPTY_SNAPSHOT),
  );
}

// --- episode lookup for blocks --------------------------------------------

export type EpisodeLookup =
  | { status: "loading" }
  | { status: "ready"; episode: EpisodeCard }
  | { status: "missing" }
  | { status: "error" };

export interface EpisodeEndpoints {
  /** List endpoint, used for "latest" when no slug is set. Expects { episodes: EpisodeCard[] }. */
  episodesEndpoint?: string;
  /** Single-episode template with `{slug}`. Expects { episode: EpisodeCard }. */
  episodeEndpoint?: string;
}

/**
 * Resolve the episode a block shows: the slug in its field, or the latest full
 * episode when the field is empty. Runs in the browser against the endpoints the
 * block was configured with (defaults: lib/block-config.ts), so no keys are
 * needed client-side. An endpoint that fails `safeUrl` falls back to the default.
 */
export function useEpisode(slug: string | undefined, endpoints: EpisodeEndpoints = {}): EpisodeLookup {
  const wanted = (slug ?? "").trim();
  const listUrl = safeUrl(endpoints.episodesEndpoint, DEFAULT_ENDPOINTS.episodes);
  const itemTemplate = safeUrl(endpoints.episodeEndpoint, DEFAULT_ENDPOINTS.episode);
  const [state, setState] = useState<{ for: string; result: EpisodeLookup }>({
    for: wanted,
    result: { status: "loading" },
  });

  useEffect(() => {
    if (wanted && !/^[a-z0-9-]{1,200}$/i.test(wanted)) {
      setState({ for: wanted, result: { status: "missing" } });
      return;
    }
    const url = wanted ? expandTemplate(itemTemplate, { slug: wanted }) : withQuery(listUrl, { limit: 1, type: "full" });
    if (!url) {
      setState({ for: wanted, result: { status: "missing" } });
      return;
    }
    const ctl = new AbortController();
    setState({ for: wanted, result: { status: "loading" } });
    fetch(url, { signal: ctl.signal })
      .then(async (res) => {
        if (res.status === 404) return { status: "missing" } as const;
        if (!res.ok) return { status: "error" } as const;
        const body = (await res.json()) as { episode?: EpisodeCard; episodes?: EpisodeCard[] };
        const episode = wanted ? body.episode : body.episodes?.[0];
        return episode ? ({ status: "ready", episode } as const) : ({ status: "missing" } as const);
      })
      .then((result) => {
        if (!ctl.signal.aborted) setState({ for: wanted, result });
      })
      .catch(() => {
        if (!ctl.signal.aborted) setState({ for: wanted, result: { status: "error" } });
      });
    return () => ctl.abort();
  }, [wanted, listUrl, itemTemplate]);

  // A stale result for a previous slug must not flash while the next loads.
  return state.for === wanted ? state.result : { status: "loading" };
}
