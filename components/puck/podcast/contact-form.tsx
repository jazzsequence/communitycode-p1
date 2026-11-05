import { ContactForm } from "@/components/podcast/contact-form";
import { DEFAULT_ENDPOINTS } from "@/lib/block-config";

/**
 * Contact form. The default endpoint (/api/contact) validates and forwards to a
 * WordPress endpoint; see docs/contact-wordpress.md. Unconfigured, it answers
 * 501 and the form says it isn't available: it never fakes success.
 *
 * Endpoint contract (the `endpoint` field; default DEFAULT_ENDPOINTS.contact):
 *   POST <endpoint>  Content-Type: application/json
 *     { name: string, email: string, message: string, website: string }   (website = honeypot, always sent)
 *   2xx                       -> success message shown
 *   501                       -> "contact form isn't available yet" message
 *   other non-2xx with { error: string } -> that message is shown (keep it user-safe)
 */

export interface ContactFormBlockProps {
  heading: string;
  endpoint: string;
  description: string;
  nameLabel: string;
  emailLabel: string;
  messageLabel: string;
  submitLabel: string;
  successMessage: string;
  privacyNote: string;
}

export function ContactFormView({ heading, description, ...form }: ContactFormBlockProps) {
  return (
    <section className="cc-container cc-section" aria-label={heading || "Contact form"}>
      <div className="cc-card cc-form-card">
        {heading ? <h2 className="cc-form-card__heading">{heading}</h2> : null}
        {description ? <p className="cc-muted cc-form-card__description">{description}</p> : null}
        <ContactForm {...form} />
      </div>
    </section>
  );
}

const DEFAULTS: ContactFormBlockProps = {
  heading: "Get in touch",
  endpoint: DEFAULT_ENDPOINTS.contact,
  description: "Questions, ideas or a guest suggestion? Send a message and we'll get back to you.",
  nameLabel: "Name",
  emailLabel: "Email address",
  messageLabel: "Message",
  submitLabel: "Send message",
  successMessage: "Thanks! Your message has been sent.",
  privacyNote: "We only use your details to reply to your message.",
};

function withDefaults(props: Partial<ContactFormBlockProps>): ContactFormBlockProps {
  const defined = Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined && v !== null));
  return { ...DEFAULTS, ...defined };
}

export const contactFormBlock = {
  label: "Contact Form",
  fields: {
    heading: { type: "text" as const, label: "Heading" },
    endpoint: {
      type: "text" as const,
      label: "Contact endpoint (POST JSON { name, email, message, website } ; 2xx = success)",
    },
    description: { type: "textarea" as const, label: "Description" },
    nameLabel: { type: "text" as const, label: "Name field label" },
    emailLabel: { type: "text" as const, label: "Email field label" },
    messageLabel: { type: "text" as const, label: "Message field label" },
    submitLabel: { type: "text" as const, label: "Submit button label" },
    successMessage: { type: "textarea" as const, label: "Success message" },
    privacyNote: { type: "textarea" as const, label: "Privacy note" },
  },
  defaultProps: DEFAULTS,
  // Partial for the same reason as NewsletterSignup: Puck's render props only
  // satisfy an all-optional props type, and old content may lack newer fields.
  render: (props: Partial<ContactFormBlockProps> & { id?: string }) => <ContactFormView {...withDefaults(props)} />,
};
