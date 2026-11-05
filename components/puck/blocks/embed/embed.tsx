import { Icon, type IconName } from "@/lib/icons";
import { safeUrl } from "@/lib/safe-url";
import { textOf } from "@/lib/text";
import "./embed.css";

export interface EmbedProps {
  kind: "video" | "social" | "map" | "generic";
  url: string;
  title: string;
  ratio: "16 / 9" | "4 / 3" | "1 / 1";
  caption: string;
  width: "contained" | "wide";
}

// Names the provider from the address's host, never from its path or query.
function providerOf(address: string, kind: EmbedProps["kind"]): string {
  let host = "";
  let path = "";
  try {
    ({ hostname: host, pathname: path } = new URL(address));
  } catch {
    // Not a full address: no provider, so the kind's label is used.
  }
  const is = (domain: string) => host === domain || host.endsWith(`.${domain}`);
  if (is("youtube.com") || is("youtu.be")) return "YouTube";
  if (is("vimeo.com")) return "Vimeo";
  if (is("wistia.com") || is("wistia.net")) return "Wistia";
  if (is("twitter.com") || is("x.com")) return "X / Twitter";
  if (is("instagram.com")) return "Instagram";
  if (is("linkedin.com")) return "LinkedIn";
  if (host === "maps.google.com" || (is("google.com") && path.startsWith("/maps"))) return "Google Maps";
  return { video: "Video", social: "Social post", map: "Map", generic: "Embedded content" }[kind];
}

// Turns a YouTube or Vimeo watch page into the address the provider allows in a frame.
// Any other address, or a watch page with no video id, is returned unchanged.
function embedAddress(src: string): string {
  try {
    const u = new URL(src, "https://x.invalid");
    const host = u.hostname.replace(/^(www|m)\./, "");
    const id =
      host === "youtu.be" ? u.pathname.slice(1)
      : host === "youtube.com" && u.pathname === "/watch" ? u.searchParams.get("v")
      : host === "vimeo.com" ? u.pathname.match(/^\/(\d+)$/)?.[1]
      : null;
    if (!id || !/^[\w-]+$/.test(id)) return src;
    return host === "vimeo.com" ? `https://player.vimeo.com/video/${id}` : `https://www.youtube.com/embed/${id}`;
  } catch {
    return src;
  }
}

const ICON_BY_KIND: Record<EmbedProps["kind"], IconName> = {
  video: "external",
  social: "chat",
  map: "map-pin",
  generic: "external",
};

export function EmbedRender({ kind, url, title, ratio, caption, width }: EmbedProps) {
  // Only an https:// or local address is framed; anything else keeps the placeholder.
  const src = safeUrl(url);
  // The name comes from the framed address; the placeholder names what was typed.
  const provider = providerOf(src || textOf(url), kind);
  const isVideo = kind === "video";
  return (
    <div className="p1-embed p1-block" data-width={width}>
      <div className="p1-embed__frame" data-kind={kind} style={{ aspectRatio: ratio }}>
        {src ? (
          // No sandbox: each provider needs different capabilities. To restrict one, add a
          // sandbox attribute listing what its player needs (scripts, popups, fullscreen).
          <iframe
            className="p1-embed__iframe"
            src={embedAddress(src)}
            title={textOf(title).trim() || provider}
            loading="lazy"
            allow="fullscreen; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : isVideo ? (
          <div className="p1-embed__play" aria-hidden="true">
            <span className="p1-embed__play-triangle" />
          </div>
        ) : (
          <div className="p1-embed__placeholder">
            <Icon name={ICON_BY_KIND[kind]} className="p1-embed__placeholder-icon" />
            <div className="p1-embed__placeholder-label">{provider}</div>
          </div>
        )}
        {!src && <div className="p1-embed__provider-tag" data-kind={kind}>{provider}</div>}
        {!src && isVideo && title && (
          <div className="p1-embed__video-title">{title}</div>
        )}
      </div>
      {src && isVideo && title && <div className="p1-embed__title">{title}</div>}
      {caption && <div className="p1-embed__caption">{caption}</div>}
    </div>
  );
}
