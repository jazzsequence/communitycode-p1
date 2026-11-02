"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { formatDuration } from "@/lib/format";
import { publishPlayerState, registerPlayer, useEpisode, type EpisodeEndpoints } from "./player-context";

/**
 * A custom-controlled native <audio>. The MP3 is a direct URL that plays
 * cross-origin, so no proxying is needed.
 *
 * Accessibility notes:
 * - Native controls are off; every custom control is a real button/input/select,
 *   so keyboard and screen reader behaviour comes from the platform.
 * - The seek slider carries aria-valuetext ("1:02 of 43:28"); the visible time is
 *   not a live region, so `timeupdate` is never announced.
 * - The only live region speaks on load failure.
 */

export const SKIP_BACK_SECONDS = 15;
export const SKIP_FORWARD_SECONDS = 30;
export const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

/** Only https links are rendered from upstream data (no `javascript:` URLs). */
function httpsUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).protocol === "https:" ? raw : null;
  } catch {
    return null;
  }
}

export interface AudioPlayerProps {
  src: string;
  title: string;
  /** Episode slug. When set, the player talks to a TranscriptViewer for the same episode. */
  channelKey?: string;
  /** Used until the audio reports its real duration. */
  durationHint?: number | null;
  youtubeUrl?: string;
}

export function AudioPlayer({ src, title, channelKey, durationHint, youtubeUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(durationHint && durationHint > 0 ? durationHint : 0);
  const [rate, setRate] = useState(1);
  const [failed, setFailed] = useState(false);
  const speedId = useId();
  const seekId = useId();

  const sync = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    const d = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : undefined;
    setTime(a.currentTime);
    setPlaying(!a.paused);
    if (d !== undefined) setDuration(d);
    if (channelKey) {
      publishPlayerState(channelKey, {
        currentTime: a.currentTime,
        playing: !a.paused,
        ...(d !== undefined ? { duration: d } : {}),
      });
    }
  }, [channelKey]);

  const play = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    // play() rejects on autoplay policy or when a seek interrupts it; neither is an error to show.
    Promise.resolve(a.play()).catch(() => sync());
  }, [sync]);

  // Let the transcript drive this player.
  useEffect(() => {
    if (!channelKey) return;
    return registerPlayer(channelKey, {
      seek(seconds, shouldPlay) {
        const a = audioRef.current;
        if (!a) return;
        a.currentTime = Math.max(0, seconds);
        sync();
        if (shouldPlay && a.paused) play();
      },
    });
  }, [channelKey, play, sync]);

  const seekTo = (seconds: number) => {
    const a = audioRef.current;
    if (!a) return;
    const max = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : duration || Infinity;
    a.currentTime = Math.min(Math.max(0, seconds), max);
    sync();
  };

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) play();
    else a.pause();
  };

  const onRate = (value: string) => {
    const next = Number(value);
    if (!SPEEDS.includes(next as (typeof SPEEDS)[number])) return;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const yt = httpsUrl(youtubeUrl);
  const shownTime = Math.floor(duration > 0 ? Math.min(time, duration) : time);

  return (
    <div
      className="cc-card"
      role="group"
      aria-label={`Audio player: ${title}`}
      style={{ padding: "var(--cc-space-4)", display: "grid", gap: "var(--cc-space-3)" }}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={sync}
        onDurationChange={sync}
        onTimeUpdate={sync}
        onSeeked={sync}
        onPlay={sync}
        onPause={sync}
        onEnded={sync}
        onRateChange={sync}
        onError={() => setFailed(true)}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--cc-space-3)", alignItems: "center" }}>
        <button
          type="button"
          className="cc-btn"
          aria-label={`Back ${SKIP_BACK_SECONDS} seconds`}
          onClick={() => seekTo(time - SKIP_BACK_SECONDS)}
        >
          <span aria-hidden="true">-{SKIP_BACK_SECONDS}s</span>
        </button>
        <button type="button" className="cc-btn cc-btn--primary" onClick={toggle} style={{ minWidth: "6.5rem" }}>
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          className="cc-btn"
          aria-label={`Forward ${SKIP_FORWARD_SECONDS} seconds`}
          onClick={() => seekTo(time + SKIP_FORWARD_SECONDS)}
        >
          <span aria-hidden="true">+{SKIP_FORWARD_SECONDS}s</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--cc-space-2)" }}>
          <label htmlFor={speedId} className="cc-muted">
            Speed
          </label>
          <select
            id={speedId}
            className="cc-field"
            style={{ width: "auto" }}
            value={String(rate)}
            onChange={(e) => onRate(e.target.value)}
          >
            {SPEEDS.map((s) => (
              <option key={s} value={String(s)}>
                {s}x
              </option>
            ))}
          </select>
        </div>

        {yt ? (
          <a className="cc-btn" href={yt} target="_blank" rel="noopener noreferrer">
            Watch on YouTube<span className="cc-sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--cc-space-3)" }}>
        <label htmlFor={seekId} className="cc-sr-only">
          Seek
        </label>
        <input
          id={seekId}
          type="range"
          min={0}
          max={duration > 0 ? duration : 0}
          step={1}
          value={shownTime}
          disabled={!(duration > 0)}
          aria-valuetext={`${formatDuration(shownTime)} of ${formatDuration(duration)}`}
          onChange={(e) => seekTo(Number(e.target.value))}
          style={{ flex: 1, minHeight: "2.75rem", accentColor: "var(--cc-accent)" }}
        />
        <span className="cc-muted" aria-hidden="true" style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
          {formatDuration(shownTime)} / {formatDuration(duration)}
        </span>
      </div>

      {/* Quiet by design: only a load failure is announced. */}
      <div role="status" aria-live="polite">
        {failed ? (
          <p style={{ margin: 0, color: "var(--cc-danger)" }}>
            This audio could not be loaded.{" "}
            <a href={src} target="_blank" rel="noopener noreferrer">
              Open the file directly<span className="cc-sr-only"> (opens in a new tab)</span>
            </a>
            .
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** The Puck block's body: resolves the episode, then shows its player. */
export function EpisodePlayerView({ episodeSlug, ...endpoints }: { episodeSlug?: string } & EpisodeEndpoints) {
  const lookup = useEpisode(episodeSlug, endpoints);

  let body: React.ReactNode;
  if (lookup.status === "loading") {
    body = (
      <p className="cc-muted" role="status">
        Loading player...
      </p>
    );
  } else if (lookup.status === "missing") {
    body = <p className="cc-muted">That episode could not be found.</p>;
  } else if (lookup.status === "error") {
    body = <p style={{ color: "var(--cc-danger)" }}>The player is temporarily unavailable. Try again shortly.</p>;
  } else if (!lookup.episode.audio) {
    body = <p className="cc-muted">There is no audio for this episode yet.</p>;
  } else {
    const e = lookup.episode;
    body = (
      <AudioPlayer
        src={lookup.episode.audio.url}
        title={e.title}
        channelKey={e.slug}
        durationHint={e.durationSeconds}
        youtubeUrl={e.links.youtube}
      />
    );
  }
  return <div className="cc-container cc-section">{body}</div>;
}
