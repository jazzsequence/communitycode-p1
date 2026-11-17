"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { site } from "@/content/site";
import { formatDateShort, formatDuration } from "@/lib/format";
import { safeImageUrl } from "@/lib/safe-link";
import { PlayerIcon } from "./player-icons";
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
 * - The only live region speaks on load failure (and "Link copied").
 *
 * Layout mirrors the show.fm player (cover + title, waveform, round controls) so
 * episodes look the same whichever player they get. The waveform is decorative:
 * a deterministic shape seeded from the title, not the audio, because decoding a
 * cross-origin MP3 in the browser just to draw bars is not worth it. The real
 * control is the (visually hidden) range input laid over it.
 */

export const SKIP_BACK_SECONDS = 15;
export const SKIP_FORWARD_SECONDS = 30;
export const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
const BARS = 240;

/** Stable 0..1 heights from a string: same episode, same shape, no hydration mismatch. */
export function waveformBars(seed: string, count = BARS): number[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  let prev = 0.5;
  return Array.from({ length: count }, () => {
    prev = prev * 0.6 + rand() * 0.4; // smoothed, so it reads as speech rather than noise
    return 0.18 + prev * 0.82;
  });
}

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
  /** ISO date shown in the byline next to the show name. */
  publishedAt?: string;
  /** Square cover; defaults to the site logo. */
  coverUrl?: string;
}

export function AudioPlayer({ src, title, channelKey, durationHint, youtubeUrl, publishedAt, coverUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(durationHint && durationHint > 0 ? durationHint : 0);
  const [rate, setRate] = useState(1);
  const [muted, setMuted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState("");
  const seekId = useId();
  const bars = useMemo(() => waveformBars(title), [title]);

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

  // One button that steps through the speeds, like show.fm's, instead of a <select>.
  const cycleRate = () => {
    const next = SPEEDS[(SPEEDS.indexOf(rate as (typeof SPEEDS)[number]) + 1) % SPEEDS.length];
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (audioRef.current) audioRef.current.muted = next;
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setNotice("Link copied");
        setTimeout(() => setNotice(""), 3000);
      }
    } catch {
      // Dismissing the share sheet rejects; nothing to report.
    }
  };

  const yt = httpsUrl(youtubeUrl);
  const cover = safeImageUrl(coverUrl || site.logo);
  const shownTime = Math.floor(duration > 0 ? Math.min(time, duration) : time);
  const played = duration > 0 ? Math.min(1, time / duration) : 0;
  const byline = [site.name, publishedAt ? formatDateShort(publishedAt) : ""].filter(Boolean).join(" · ");

  return (
    <div className="cc-card cc-player" role="group" aria-label={`Audio player: ${title}`}>
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

      <div className="cc-player__head">
        {cover ? <img className="cc-player__cover" src={cover} alt="" /> : null}
        <div className="cc-player__meta">
          <p className="cc-player__title">{title}</p>
          {byline ? <p className="cc-player__byline">{byline}</p> : null}
        </div>
        <div className="cc-player__tools">
          <a className="cc-player__icon" href={src} download target="_blank" rel="noopener noreferrer" aria-label="Download episode">
            <PlayerIcon name="download" />
          </a>
          <button type="button" className="cc-player__icon" onClick={share} aria-label="Share episode">
            <PlayerIcon name="share" />
          </button>
        </div>
      </div>

      <div className="cc-player__wave">
        <div className="cc-player__bars" aria-hidden="true">
          {bars.map((h, i) => (
            <span key={i} data-played={i / bars.length < played ? "" : undefined} style={{ height: `${Math.round(h * 100)}%` }} />
          ))}
        </div>
        <label htmlFor={seekId} className="cc-sr-only">
          Seek
        </label>
        <input
          id={seekId}
          className="cc-player__seek"
          type="range"
          min={0}
          max={duration > 0 ? duration : 0}
          step={1}
          value={shownTime}
          disabled={!(duration > 0)}
          aria-valuetext={`${formatDuration(shownTime)} of ${formatDuration(duration)}`}
          onChange={(e) => seekTo(Number(e.target.value))}
        />
      </div>

      {/* The slider is the accessible time; these are for sighted users. */}
      <div className="cc-player__times" aria-hidden="true">
        <span>{formatDuration(shownTime)}</span>
        <span>{formatDuration(duration)}</span>
      </div>

      <div className="cc-player__controls">
        <button type="button" className="cc-player__skip" aria-label={`Back ${SKIP_BACK_SECONDS} seconds`} onClick={() => seekTo(time - SKIP_BACK_SECONDS)}>
          <PlayerIcon name="back" seconds={SKIP_BACK_SECONDS} />
        </button>
        <button type="button" className="cc-player__play" aria-label={playing ? "Pause" : "Play"} onClick={toggle}>
          <PlayerIcon name={playing ? "pause" : "play"} />
        </button>
        <button type="button" className="cc-player__skip" aria-label={`Forward ${SKIP_FORWARD_SECONDS} seconds`} onClick={() => seekTo(time + SKIP_FORWARD_SECONDS)}>
          <PlayerIcon name="forward" seconds={SKIP_FORWARD_SECONDS} />
        </button>
        <span className="cc-player__spacer" />
        <button type="button" className="cc-player__speed" aria-label={`Playback speed ${rate}x. Change speed`} onClick={cycleRate}>
          {rate}×
        </button>
        <button type="button" className="cc-player__icon" aria-label={muted ? "Unmute" : "Mute"} aria-pressed={muted} onClick={toggleMute}>
          <PlayerIcon name={muted ? "muted" : "volume"} />
        </button>
      </div>

      {yt ? (
        <p className="cc-player__foot">
          <a href={yt} target="_blank" rel="noopener noreferrer">
            Watch on YouTube<span className="cc-sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      ) : null}

      {/* Quiet by design: only a load failure (or a copied link) is announced. */}
      <div role="status" aria-live="polite">
        {failed ? (
          <p className="cc-player__error">
            This audio could not be loaded.{" "}
            <a href={src} target="_blank" rel="noopener noreferrer">
              Open the file directly<span className="cc-sr-only"> (opens in a new tab)</span>
            </a>
            .
          </p>
        ) : null}
        {notice ? <span className="cc-sr-only">{notice}</span> : null}
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
        publishedAt={e.publishedAt}
      />
    );
  }
  return <div className="cc-container cc-section">{body}</div>;
}
