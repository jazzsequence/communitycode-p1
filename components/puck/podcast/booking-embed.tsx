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
 *
 * Colours: the booking page has its own palette and a cross-origin frame cannot be styled from here, so
 * the frame sits in a `cc-card` (site surface and border) and the iframe is `color-scheme: dark`. In
 * Chrome that makes the page pick its dark theme while its toggle is on "System" (checked: the same
 * property set to `light` turned it light on a dark system); a visitor who chose Light in its own
 * toggle still gets light. The site is always dark, so this is the closest match short of show.fm
 * offering theme options.
 *
 * Height / scrolling: a cross-origin frame cannot be sized to its content (the page sends no resize
 * message), and the page is `min-height: 100vh` plus ~6px, so in any frame it overflows and shows its own
 * scrollbar inside the page's scroll. Measured (see CLAUDE.md): it is stacked and 1210-1282px tall
 * below a 1024px frame width, two-column and 722-811px at 1024px and up, and 675px stacked once a date is
 * picked. So the frame gets a fixed height per layout, with headroom (`.cc-booking-clip` in
 * chrome-blocks.css: switches at 1024px), and `scrolling="no"` so the wheel always scrolls the page. The
 * cost: after a date is picked the frame is taller than the content (empty vendor background). The step
 * after "Confirm <time>" (the guest's details) was NOT measured, to avoid making a real booking.
 */

interface BookingEmbedProps {
  heading?: string;
  description?: string;
  url?: string;
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

export function BookingEmbed({ heading, description, url, linkLabel }: BookingEmbedProps) {
  const src = frameUrl(url);
  const title = heading?.trim() || "Book a recording";
  return (
    <section className="cc-container cc-section" aria-label={title}>
      <div className="cc-stack">
        {heading?.trim() ? <h2>{heading}</h2> : null}
        {description?.trim() ? <p className="cc-prose">{description}</p> : null}
        {src ? (
          <>
            <div className="cc-card" style={{ padding: "var(--cc-space-3)" }}>
              {/* Height per layout comes from .cc-booking-clip (chrome-blocks.css). */}
              <div className="cc-booking-clip">
                <iframe
                  src={src}
                  title={title}
                  loading="lazy"
                  scrolling="no"
                  referrerPolicy="strict-origin-when-cross-origin"
                  style={{ colorScheme: "dark" }}
                />
              </div>
            </div>
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
    linkLabel: { type: "text" as const, label: "Fallback link text" },
  },
  defaultProps: {
    heading: "Book a recording",
    description: "",
    url: siteConfig.showfm?.bookingUrl ?? "",
    linkLabel: "Open the booking page in a new tab",
  },
  render: ({ id: _id, ...props }: BookingEmbedProps & { id?: string }) => <BookingEmbed {...props} />,
};
