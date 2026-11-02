"use client";

import { useEffect, useRef, useState } from "react";
import { resolveEntries, feedUrlFor, type SubscribeEntry } from "./subscribe-data";
import "./chrome-blocks.css";

type CopyState = "idle" | "copied" | "manual";

/** Last-resort copy for browsers/contexts without the async clipboard API. */
function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export interface SubscribeLinksViewProps {
  heading?: string;
  entries?: SubscribeEntry[];
  showCopyFeed?: boolean;
}

export function SubscribeLinksView({ heading, entries, showCopyFeed = true }: SubscribeLinksViewProps) {
  const resolved = resolveEntries(entries);
  const feedUrl = feedUrlFor(entries);
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fallbackRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (state === "manual") fallbackRef.current?.select();
  }, [state]);

  async function copy() {
    clearTimeout(timer.current);
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(feedUrl);
        ok = true;
      }
    } catch {
      ok = false; // permission denied / insecure context: try the legacy path
    }
    if (!ok) ok = legacyCopy(feedUrl);
    setState(ok ? "copied" : "manual");
    if (ok) timer.current = setTimeout(() => setState("idle"), 4000);
  }

  const message =
    state === "copied"
      ? "RSS feed URL copied to clipboard."
      : state === "manual"
        ? "Copying isn't available here. The URL is selected below: copy it manually."
        : "";

  return (
    <section className="cc-section">
      <div className="cc-container cc-stack">
        {heading?.trim() ? <h2 style={{ fontSize: "var(--cc-text-xl)" }}>{heading}</h2> : null}
        {resolved.length ? (
          <ul className="cc-subscribe-list">
            {resolved.map((e, i) => (
              <li key={`${i}-${e.url}`}>
                <a className="cc-btn cc-btn--primary" href={e.url} rel="noopener noreferrer">
                  {e.custom ? (
                    <>
                      {e.text}{" "}
                      <span className="cc-sr-only">({e.platformName})</span>
                    </>
                  ) : (
                    <>
                      <span className="cc-sr-only">Subscribe on</span>{" "}
                      {e.text}
                    </>
                  )}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="cc-muted">No subscribe links yet.</p>
        )}
        {showCopyFeed && feedUrl ? (
          <div className="cc-subscribe-copy">
            <button type="button" className="cc-btn" onClick={copy}>
              Copy RSS feed URL
            </button>
            {state === "manual" ? (
              <input
                ref={fallbackRef}
                className="cc-field cc-subscribe-fallback"
                readOnly
                value={feedUrl}
                aria-label="RSS feed URL"
                onFocus={(e) => e.currentTarget.select()}
              />
            ) : null}
            {/* Always mounted: live regions must exist before their text changes to be announced. */}
            <p role="status" aria-live="polite" className="cc-muted" style={{ margin: 0 }}>
              {message}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
