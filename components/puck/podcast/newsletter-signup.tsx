import { NewsletterForm } from "@/components/podcast/newsletter-form";
import { DEFAULT_ENDPOINTS } from "@/lib/block-config";

/**
 * Newsletter signup. The default endpoint (/api/newsletter) validates and
 * forwards to a MailPoet-backed endpoint; see docs/newsletter-mailpoet.md.
 * Unconfigured, it answers 501 and the form says signup isn't available: it
 * never fakes success.
 *
 * Endpoint contract (the `endpoint` field; default DEFAULT_ENDPOINTS.newsletter):
 *   POST <endpoint>  Content-Type: application/json
 *     { email: string, firstName?: string, website: string }   (website = honeypot, always sent)
 *   2xx                       -> success message shown
 *   501                       -> "signup isn't available yet" message
 *   other non-2xx with { error: string } -> that message is shown (keep it user-safe)
 */

export interface NewsletterSignupProps {
  heading: string;
  endpoint: string;
  description: string;
  buttonLabel: string;
  successMessage: string;
  collectFirstName: boolean;
  privacyNote: string;
}

export function NewsletterSignupView({ heading, description, ...form }: NewsletterSignupProps) {
  return (
    <section className="cc-container cc-section" aria-label={heading || "Newsletter signup"}>
      <div
        className="cc-card"
        style={{ padding: "var(--cc-space-6)", maxWidth: "40rem", marginInline: "auto", overflow: "visible" }}
      >
        {heading ? (
          <h2 style={{ fontSize: "var(--cc-text-xl)", marginBottom: "var(--cc-space-3)" }}>{heading}</h2>
        ) : null}
        {description ? (
          <p className="cc-muted" style={{ marginTop: 0, marginBottom: "var(--cc-space-5)" }}>
            {description}
          </p>
        ) : null}
        <NewsletterForm {...form} />
      </div>
    </section>
  );
}

const DEFAULTS: NewsletterSignupProps = {
  heading: "Get new episodes in your inbox",
  endpoint: DEFAULT_ENDPOINTS.newsletter,
  description: "One email when a new episode drops. No spam.",
  buttonLabel: "Subscribe",
  successMessage: "Thanks! Check your inbox to confirm your subscription.",
  collectFirstName: false,
  privacyNote: "You can unsubscribe at any time.",
};

function withDefaults(props: Partial<NewsletterSignupProps>): NewsletterSignupProps {
  const defined = Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined && v !== null));
  return { ...DEFAULTS, ...defined };
}

export const newsletterSignupBlock = {
  label: "Newsletter Signup",
  fields: {
    heading: { type: "text" as const, label: "Heading" },
    endpoint: {
      type: "text" as const,
      label: "Signup endpoint (POST JSON { email, firstName?, website } ; 2xx = success)",
    },
    description: { type: "textarea" as const, label: "Description" },
    buttonLabel: { type: "text" as const, label: "Button label" },
    successMessage: { type: "textarea" as const, label: "Success message" },
    collectFirstName: {
      type: "radio" as const,
      label: "Ask for first name",
      options: [
        { label: "Yes", value: true },
        { label: "No", value: false },
      ],
    },
    privacyNote: { type: "textarea" as const, label: "Privacy note" },
  },
  defaultProps: DEFAULTS,
  // Partial for the same reason as BlogArchive: Puck's render props only
  // satisfy an all-optional props type, and old content may lack newer fields.
  render: (props: Partial<NewsletterSignupProps> & { id?: string }) => <NewsletterSignupView {...withDefaults(props)} />,
};
