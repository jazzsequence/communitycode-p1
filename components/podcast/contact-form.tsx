"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { DEFAULT_ENDPOINTS, safeUrl } from "@/lib/block-config";

/**
 * Contact form. Posts { name, email, message, website } to the configured
 * endpoint (default /api/contact, which forwards to WordPress; see
 * docs/contact-wordpress.md). Until that is configured the API answers 501 and
 * this form says so: the success message only ever follows a server 2xx.
 * On any failure the form stays as it was, so nothing the visitor typed is lost.
 */

export interface ContactFormProps {
  /** POST target. Validated with safeUrl; falls back to DEFAULT_ENDPOINTS.contact. */
  endpoint: string;
  submitLabel: string;
  successMessage: string;
  privacyNote: string;
  nameLabel: string;
  emailLabel: string;
  messageLabel: string;
}

// Mirror the server's limits and loose email check; the server is the authority.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 5_000;

const NOT_CONFIGURED = "The contact form isn't available yet. Please check back soon.";
const GENERIC_ERROR = "We couldn't send your message right now. Please try again in a moment.";
const NETWORK_ERROR = "We couldn't reach the server. Check your connection and try again. Your message is still here.";

type Status = "idle" | "submitting" | "success";
type Field = "name" | "email" | "message";
type FieldErrors = Partial<Record<Field, string>>;

function validate(name: string, email: string, message: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!name.trim()) errors.name = "Enter your name.";
  else if (name.trim().length > MAX_NAME) errors.name = `Name must be ${MAX_NAME} characters or fewer.`;
  const e = email.trim();
  if (!EMAIL_RE.test(e) || e.length > MAX_EMAIL) errors.email = "Enter a valid email address, like name@example.com.";
  if (!message.trim()) errors.message = "Enter a message.";
  else if (message.trim().length > MAX_MESSAGE) errors.message = `Message must be ${MAX_MESSAGE} characters or fewer.`;
  return errors;
}

export function ContactForm({
  endpoint,
  submitLabel,
  successMessage,
  privacyNote,
  nameLabel,
  emailLabel,
  messageLabel,
}: ContactFormProps) {
  const uid = useId();
  const id = (part: string) => `${uid}-${part}`;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const refs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    message: useRef<HTMLTextAreaElement>(null),
  };
  const buttonRef = useRef<HTMLButtonElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  // A ref, not state: two submits in the same tick would both see "idle".
  const inFlight = useRef(false);
  const focusButton = useRef(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  // The disabled button can only take focus again once it is re-enabled.
  useEffect(() => {
    if (status === "idle" && focusButton.current) {
      buttonRef.current?.focus();
      focusButton.current = false;
    }
  }, [status, formError]);

  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  function clearError(field: Field) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;

    const errors = validate(name, email, message);
    const first = (["name", "email", "message"] as const).find((f) => errors[f]);
    if (first) {
      setFieldErrors(errors);
      setFormError(null);
      refs[first].current?.focus();
      return;
    }

    inFlight.current = true;
    setFieldErrors({});
    setFormError(null);
    setStatus("submitting");
    const ctl = new AbortController();
    controller.current = ctl;

    try {
      const res = await fetch(safeUrl(endpoint, DEFAULT_ENDPOINTS.contact), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim(), website }),
        signal: ctl.signal,
      });
      if (res.ok) {
        setStatus("success");
        return;
      }
      let text = GENERIC_ERROR;
      if (res.status === 501) text = NOT_CONFIGURED;
      else {
        const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
        if (typeof body?.error === "string" && body.error) text = body.error;
      }
      focusButton.current = true;
      setFormError(text);
      setStatus("idle");
    } catch {
      if (ctl.signal.aborted) return;
      focusButton.current = true;
      setFormError(NETWORK_ERROR);
      setStatus("idle");
    } finally {
      inFlight.current = false;
    }
  }

  const submitting = status === "submitting";
  const hintId = id("hint");
  const formErrorId = id("form-error");

  function describedBy(field: Field): string | undefined {
    return fieldErrors[field] ? id(`${field}-error`) : undefined;
  }

  function renderError(field: Field) {
    // Always mounted so assistive tech registers the region before text arrives.
    return (
      <p id={id(`${field}-error`)} role="alert" className="cc-form__error">
        {fieldErrors[field]}
      </p>
    );
  }

  return (
    <div className="cc-form-wrap">
      <div role="status" aria-live="polite" ref={successRef} tabIndex={-1} className="cc-form__status">
        {status === "success" ? <p className="cc-card cc-form__success">{successMessage}</p> : null}
      </div>

      {status !== "success" ? (
        <form onSubmit={onSubmit} noValidate aria-busy={submitting} className="cc-form">
          <div role="alert" id={formErrorId} className="cc-form__error cc-form__error--summary">
            {formError}
          </div>

          <div className="cc-form__field">
            <label htmlFor={id("name")} className="cc-form__label">
              {nameLabel}
            </label>
            <input
              id={id("name")}
              ref={refs.name}
              className="cc-field"
              type="text"
              name="name"
              autoComplete="name"
              maxLength={MAX_NAME}
              aria-required="true"
              aria-invalid={fieldErrors.name ? true : undefined}
              aria-describedby={describedBy("name")}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearError("name");
              }}
            />
            {renderError("name")}
          </div>

          <div className="cc-form__field">
            <label htmlFor={id("email")} className="cc-form__label">
              {emailLabel}
            </label>
            <input
              id={id("email")}
              ref={refs.email}
              className="cc-field"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              maxLength={MAX_EMAIL}
              aria-required="true"
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={describedBy("email")}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError("email");
              }}
            />
            {renderError("email")}
          </div>

          <div className="cc-form__field">
            <label htmlFor={id("message")} className="cc-form__label">
              {messageLabel}
            </label>
            <textarea
              id={id("message")}
              ref={refs.message}
              className="cc-field cc-field--textarea"
              name="message"
              rows={6}
              maxLength={MAX_MESSAGE}
              aria-required="true"
              aria-invalid={fieldErrors.message ? true : undefined}
              aria-describedby={describedBy("message")}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                clearError("message");
              }}
            />
            {renderError("message")}
          </div>

          {/* Honeypot. Visually hidden rather than display:none (bots skip
              hidden fields), and out of the tab order and accessibility tree
              for people. */}
          <div aria-hidden="true" className="cc-form__honeypot">
            <label htmlFor={id("website")}>Leave this field empty</label>
            <input
              id={id("website")}
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
              {submitting ? "Sending…" : submitLabel}
            </button>
          </div>

          {privacyNote ? (
            <p id={hintId} className="cc-muted cc-form__hint">
              {privacyNote}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
