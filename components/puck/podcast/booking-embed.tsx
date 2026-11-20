import { siteConfig } from "@/site.config";
import { isExternalHref, safeHref } from "@/lib/safe-link";
import "@/components/podcast/chrome-blocks.css";

/**
 * show.fm has no booking web component (its embed package ships only player, transcript and episode
 * elements), but a booking link is a public page that does not forbid framing, so this frames it. The
 * page is the vendor's: scheduling, time zones and the guest's details stay there, nothing is posted
 * through this site. https only, so a saved `javascript:` or `http:` value renders the fallback link
 * (or nothing) instead of a frame. The link under the frame is for visitors whose browser or
 * extensions block frames.
 */

interface BookingEmbedProps {
  heading?: string;
  description?: string;
  url?: string;
  height?: number;
  linkLabel?: string;
}

/** The URL if it is https, else null. Frames are stricter than links: no relative paths, no http. */
export function frameUrl(input: unknown): string | null {
  const href = safeHref(input);
  if (!href || !isExternalHref(href)) return null;
  try {
    return new URL(href).protocol === "https:" ? href : null;
  } catch {
    return null;
  }
}

const clampHeight = (h: unknown) => {
  const n = Number(h);
  return Number.isFinite(n) ? Math.min(1600, Math.max(400, Math.round(n))) : 760;
};

export function BookingEmbed({ heading, description, url, height, linkLabel }: BookingEmbedProps) {
  const src = frameUrl(url);
  const title = heading?.trim() || "Book a recording";
  return (
    <section className="cc-container cc-section" aria-label={title}>
      <div className="cc-stack">
        {heading?.trim() ? <h2>{heading}</h2> : null}
        {description?.trim() ? <p className="cc-prose">{description}</p> : null}
        {src ? (
          <>
            <iframe
              src={src}
              title={title}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              style={{ inlineSize: "100%", blockSize: `${clampHeight(height)}px`, border: 0, borderRadius: "var(--cc-radius, 0.75rem)", background: "var(--cc-surface, transparent)" }}
            />
            <p className="cc-prose">
              <a href={src} rel="noopener noreferrer" target="_blank">
                {linkLabel?.trim() || "Open the booking page in a new tab"}
              </a>
            </p>
          </>
        ) : (
          <p className="cc-prose" role="note">Booking isn&rsquo;t available yet. Add an https booking link to this block.</p>
        )}
      </div>
    </section>
  );
}

export const bookingEmbedBlock = {
  label: "Booking Embed",
  fields: {
    heading: { type: "text" as const, label: "Heading" },
    description: { type: "textarea" as const, label: "Intro text" },
    url: { type: "text" as const, label: "Booking page (https://, from show.fm > Booking links)" },
    height: { type: "number" as const, label: "Frame height (px, 400-1600)", min: 400, max: 1600 },
    linkLabel: { type: "text" as const, label: "Fallback link text" },
  },
  defaultProps: {
    heading: "Book a recording",
    description: "",
    url: siteConfig.showfm?.bookingUrl ?? "",
    height: 760,
    linkLabel: "Open the booking page in a new tab",
  },
  render: ({ id: _id, ...props }: BookingEmbedProps & { id?: string }) => <BookingEmbed {...props} />,
};
