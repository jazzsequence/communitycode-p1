"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { DEFAULT_ENDPOINTS, safeUrl } from "@/lib/block-config";

/**
 * Newsletter signup form. Posts to the configured endpoint (default /api/newsletter, which
 * forwards to a MailPoet-backed endpoint; docs/newsletter-mailpoet.md). Until that is
 * configured the API answers 501 and this form says so; it never shows the
 * success message unless the server confirmed it.
 */

export interface NewsletterFormProps {
  /** POST target. Validated with safeUrl; falls back to DEFAULT_ENDPOINTS.newsletter. */
  endpoint: string;
  buttonLabel: string;
  successMessage: string;
  collectFirstName: boolean;
  privacyNote: string;
}

// Mirrors the server's loose check; the server is the authority.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const NOT_CONFIGURED = "Newsletter signup isn't available yet. Please check back soon.";
const GENERIC_ERROR = "We couldn't sign you up right now. Please try again in a moment.";

type Status = "idle" | "submitting" | "success";

const honeypotStyle = {
  position: "absolute" as const,
  left: "-10000px",
  width: "1px",
  height: "1px",
  overflow: "hidden",
};

export function NewsletterForm({ endpoint, buttonLabel, successMessage, collectFirstName, privacyNote }: NewsletterFormProps) {
  const uid = useId();
  const emailId = `${uid}-email`;
  const nameId = `${uid}-name`;
  const hintId = `${uid}-hint`;
  const errorId = `${uid}-error`;
  const honeypotId = `${uid}-website`;

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [emailInvalid, setEmailInvalid] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  // A ref, not state: two submits in the same tick would both see "idle".
  const inFlight = useRef(false);
  const focusTarget = useRef<"email" | "button" | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  // Focus moves after render, once the disabled button is enabled again.
  useEffect(() => {
    if (status === "idle" && focusTarget.current) {
      (focusTarget.current === "email" ? emailRef : buttonRef).current?.focus();
      focusTarget.current = null;
    }
  }, [status, error]);

  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;

    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed) || trimmed.length > 254) {
      setError("Enter a valid email address, like name@example.com.");
      setEmailInvalid(true);
      emailRef.current?.focus();
      return;
    }

    inFlight.current = true;
    setError(null);
    setEmailInvalid(false);
    setStatus("submitting");
    const ctl = new AbortController();
    controller.current = ctl;

    try {
      const res = await fetch(safeUrl(endpoint, DEFAULT_ENDPOINTS.newsletter), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          ...(collectFirstName && firstName.trim() ? { firstName: firstName.trim() } : {}),
          website,
        }),
        signal: ctl.signal,
      });
      if (res.ok) {
        setStatus("success");
        return;
      }
      let message = GENERIC_ERROR;
      if (res.status === 501) message = NOT_CONFIGURED;
      else {
        const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
        if (typeof body?.error === "string" && body.error) message = body.error;
      }
      focusTarget.current = res.status === 400 ? "email" : "button";
      setEmailInvalid(res.status === 400);
      setError(message);
      setStatus("idle");
    } catch {
      if (ctl.signal.aborted) return;
      focusTarget.current = "button";
      setError("We couldn't reach the server. Check your connection and try again.");
      setStatus("idle");
    } finally {
      inFlight.current = false;
    }
  }

  const submitting = status === "submitting";
  const describedBy = [privacyNote ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div style={{ position: "relative" }}>
      {/* Always mounted so assistive tech registers it before the message arrives. */}
      <div role="status" aria-live="polite" ref={successRef} tabIndex={-1} style={{ outline: "none" }}>
        {status === "success" ? (
          <p className="cc-card" style={{ margin: 0, padding: "var(--cc-space-5)" }}>
            {successMessage}
          </p>
        ) : null}
      </div>

      {status !== "success" ? (
        <form onSubmit={onSubmit} noValidate aria-busy={submitting} style={{ display: "grid", gap: "var(--cc-space-4)" }}>
          {/* Error summary: role="alert" is announced as soon as text appears. */}
          <div role="alert" id={errorId} style={error ? { color: "var(--cc-danger)", fontWeight: 600 } : { marginBlockEnd: "calc(-1 * var(--cc-space-4))" }}>
            {error}
          </div>

          {collectFirstName ? (
            <div style={{ display: "grid", gap: "var(--cc-space-2)" }}>
              <label htmlFor={nameId} style={{ fontWeight: 600 }}>
                First name <span className="cc-muted">(optional)</span>
              </label>
              <input
                id={nameId}
                className="cc-field"
                type="text"
                name="firstName"
                autoComplete="given-name"
                maxLength={80}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
          ) : null}

          <div style={{ display: "grid", gap: "var(--cc-space-2)" }}>
            <label htmlFor={emailId} style={{ fontWeight: 600 }}>
              Email address
            </label>
            <input
              id={emailId}
              ref={emailRef}
              className="cc-field"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              aria-required="true"
              aria-invalid={emailInvalid || undefined}
              aria-describedby={describedBy}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailInvalid(false);
              }}
            />
          </div>

          {/* Honeypot. Off-screen rather than display:none (bots skip hidden
              fields), and out of the tab order and accessibility tree for people. */}
          <div aria-hidden="true" style={honeypotStyle}>
            <label htmlFor={honeypotId}>Leave this field empty</label>
            <input
              id={honeypotId}
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div>
            <button
              ref={buttonRef}
              type="submit"
              className="cc-btn cc-btn--primary"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? "Subscribing…" : buttonLabel}
            </button>
          </div>

          {privacyNote ? (
            <p id={hintId} className="cc-muted" style={{ margin: 0, fontSize: "var(--cc-text-sm)" }}>
              {privacyNote}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
