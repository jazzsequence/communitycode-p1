"use client";

// Importing the package registers <showfm-player> & co. where `customElements`
// exists and is a no-op during SSR (documented as safe). Kept as a bare import
// because the package lists ./dist/index.js in `sideEffects`.
import "@showfm/embed";
import { useEffect, useRef } from "react";
import { publishPlayerState, registerPlayer } from "@/components/podcast/player-context";
import { safeUrl } from "@/lib/block-config";
import type { Episode } from "@/lib/episodes/types";
import { playerAttributes, playerMinHeight, pick, PLAYER_SIZES, type PlayerOptions } from "@/lib/showfm-embed";

export type ShowfmPlayerEpisode = Pick<Episode, "id" | "title" | "audio" | "links">;

export interface ShowfmPlayerProps extends PlayerOptions {
  episode: ShowfmPlayerEpisode;
  /** Episode slug. When set, the native transcript can seek and follow this player. */
  channelKey?: string;
}

/**
 * Connect the vendor element to the player channel, so the native transcript can seek it and follow it.
 *
 * `<showfm-player>` has no public seek or time API, but it renders a real <audio> into an OPEN shadow
 * root. That is an implementation detail, so this is strictly best effort: if the audio is never found
 * (the element is hidden, or a future version closes the root or drops the <audio>) no controller is
 * registered and the transcript simply shows no seek buttons, like a transcript with no player at all.
 */
export function useShowfmChannel(ref: React.RefObject<HTMLElement | null>, channelKey: string | undefined) {
  useEffect(() => {
    const host = ref.current;
    if (!channelKey || !host) return;
    let audio: HTMLAudioElement | null = null;
    let detach: (() => void) | null = null;

    const publish = () => {
      if (!audio) return;
      const d = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : undefined;
      publishPlayerState(channelKey, {
        currentTime: audio.currentTime,
        playing: !audio.paused,
        ...(d !== undefined ? { duration: d } : {}),
      });
    };

    const attach = (a: HTMLAudioElement) => {
      detach?.();
      audio = a;
      const unregister = registerPlayer(channelKey, {
        seek(seconds, shouldPlay) {
          a.currentTime = Math.max(0, seconds);
          publish();
          if (shouldPlay && a.paused) Promise.resolve(a.play()).catch(() => publish());
        },
      });
      const events = ["timeupdate", "play", "pause", "ended", "seeked", "durationchange", "loadedmetadata"] as const;
      events.forEach((e) => a.addEventListener(e, publish));
      publish();
      detach = () => {
        events.forEach((e) => a.removeEventListener(e, publish));
        unregister();
        audio = null;
        detach = null;
      };
    };

    const find = () => host.shadowRoot?.querySelector("audio") ?? null;
    const check = () => {
      const a = find();
      if (a && a !== audio) attach(a);
    };
    check();
    // The element builds its UI after it has fetched the episode, so wait for the audio to appear.
    let observer: MutationObserver | null = null;
    const observe = () => {
      const root = host.shadowRoot;
      if (!root || observer) return;
      observer = new MutationObserver(check);
      observer.observe(root, { childList: true, subtree: true });
      check();
    };
    observe();
    // The element may not be upgraded yet (its script loads after hydration): look again for a few seconds.
    let tries = 0;
    const poll = observer ? undefined : setInterval(() => {
      observe();
      if (observer || ++tries >= 20) clearInterval(poll);
    }, 500);

    return () => {
      clearInterval(poll);
      observer?.disconnect();
      detach?.();
    };
  }, [ref, channelKey]);
}

/**
 * The show.fm player for one episode. The children are the vendor's documented
 * fallback: they show before the script loads, without JavaScript, to crawlers
 * and when the episode cannot be played, then the element upgrades them.
 * The inline min-height reserves the player's space so the page does not jump.
 */
export function ShowfmPlayer({ episode, channelKey, ...options }: ShowfmPlayerProps) {
  const ref = useRef<HTMLElement>(null);
  useShowfmChannel(ref, channelKey);
  const attrs = playerAttributes(options);
  const size = pick(options.size, PLAYER_SIZES) ?? "standard";
  const listen = episode.links.listen ? safeUrl(episode.links.listen, "") : "";
  const audioUrl = episode.audio ? safeUrl(episode.audio.url, "") : "";

  return (
    <showfm-player
      ref={ref}
      episode={episode.id}
      style={{ display: "block", minHeight: `${playerMinHeight(size)}px` }}
      {...attrs}
    >
      {listen ? <a href={listen}>{`Listen to ${episode.title} on show.fm`}</a> : null}
      {audioUrl ? <audio controls preload="none" src={audioUrl} /> : null}
    </showfm-player>
  );
}
