import { siteConfig, type SiteConfig } from "@/site.config";

type Form = "contact" | "newsletter";

const ENV_NAME: Record<Form, string> = {
  contact: "CONTACT_ENDPOINT",
  newsletter: "NEWSLETTER_ENDPOINT",
};

/**
 * Where a form forwards to. The URL is public, so it lives in site.config.ts;
 * the env var of the same name overrides it (a preview pointing at another
 * backend). Blank counts as unset. Only the *_SECRET stays a secret.
 */
export function formEndpoint(
  form: Form,
  env: Record<string, string | undefined> = process.env,
  file: SiteConfig["forms"] = siteConfig.forms,
): string | undefined {
  const fromFile = form === "contact" ? file?.contactEndpoint : file?.newsletterEndpoint;
  return env[ENV_NAME[form]]?.trim() || fromFile?.trim() || undefined;
}
