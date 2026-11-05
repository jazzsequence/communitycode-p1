"use client";

import { AudioPlayer, EpisodePlayerView } from "@/components/podcast/audio-player";
import { useEpisode, type EpisodeEndpoints } from "@/components/podcast/player-context";
import { ShowfmPlayer } from "@/components/podcast/showfm-player";
import { ShowfmTranscript } from "@/components/podcast/showfm-transcript";
import { TranscriptBlockView, TranscriptViewer } from "@/components/podcast/transcript-view";
import { embedMode, shouldUseShowfmPlayer, shouldUseShowfmTranscript, type PlayerOptions } from "@/lib/showfm-embed";

/**
 * Block bodies that choose between the show.fm embed and the native components.
 * `native` hands straight to the existing views, so nothing changes for it (and
 * no second fetch happens); the other modes resolve the episode first because
 * the choice depends on where its audio and transcript live.
 */

export interface EpisodePlayerBlockProps extends EpisodeEndpoints, Pick<PlayerOptions, "size" | "transcript" | "theme" | "accent" | "miniPlayer" | "headingLevel"> {
  episodeSlug?: string;
  playerMode?: string;
}

export function EpisodePlayerBlockView({ playerMode, episodeSlug, ...rest }: EpisodePlayerBlockProps) {
  if (embedMode(playerMode) === "native") {
    return <EpisodePlayerView episodeSlug={episodeSlug} episodesEndpoint={rest.episodesEndpoint} episodeEndpoint={rest.episodeEndpoint} />;
  }
  return <ResolvedPlayer playerMode={playerMode} episodeSlug={episodeSlug} {...rest} />;
}

function ResolvedPlayer({ playerMode, episodeSlug, episodesEndpoint, episodeEndpoint, ...embed }: EpisodePlayerBlockProps) {
  const lookup = useEpisode(episodeSlug, { episodesEndpoint, episodeEndpoint });
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
  } else if (shouldUseShowfmPlayer(lookup.episode, playerMode)) {
    body = <ShowfmPlayer episode={lookup.episode} {...embed} />;
  } else {
    const e = lookup.episode;
    body = (
      <AudioPlayer src={e.audio?.url ?? ""} title={e.title} channelKey={e.slug} durationHint={e.durationSeconds} youtubeUrl={e.links.youtube} />
    );
  }
  return <div className="cc-container cc-section">{body}</div>;
}

export interface TranscriptBlockProps extends EpisodeEndpoints, Pick<PlayerOptions, "theme" | "accent" | "headingLevel"> {
  episodeSlug?: string;
  showSearch?: boolean;
  transcriptEndpoint?: string;
  source?: string;
  height?: number | string;
}

export function TranscriptSourceBlockView({ source, episodeSlug, showSearch, transcriptEndpoint, ...rest }: TranscriptBlockProps) {
  if (embedMode(source) === "native") {
    return (
      <TranscriptBlockView
        episodeSlug={episodeSlug}
        showSearch={showSearch}
        transcriptEndpoint={transcriptEndpoint}
        episodesEndpoint={rest.episodesEndpoint}
        episodeEndpoint={rest.episodeEndpoint}
      />
    );
  }
  return <ResolvedTranscript source={source} episodeSlug={episodeSlug} showSearch={showSearch} transcriptEndpoint={transcriptEndpoint} {...rest} />;
}

function ResolvedTranscript({ source, episodeSlug, showSearch = true, transcriptEndpoint, episodesEndpoint, episodeEndpoint, ...embed }: TranscriptBlockProps) {
  const lookup = useEpisode(episodeSlug, { episodesEndpoint, episodeEndpoint });
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
  } else if (shouldUseShowfmTranscript(lookup.episode, source)) {
    body = <ShowfmTranscript episode={lookup.episode} {...embed} />;
  } else {
    body = <TranscriptViewer slug={lookup.episode.slug} showSearch={showSearch} transcriptEndpoint={transcriptEndpoint} />;
  }
  return (
    <section className="cc-container cc-section" aria-label="Transcript">
      {body}
    </section>
  );
}
