import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { P1Localization } from "@pantheon-systems/p1-next-sdk";

const localization = vi.hoisted(() => ({ current: null as P1Localization | null }));

vi.mock("@pantheon-systems/p1-next-sdk", () => ({
  useP1Localization: () => localization.current,
}));

const { getSavedLocaleSuggestion } = vi.hoisted(() => ({ getSavedLocaleSuggestion: vi.fn() }));

// The suggestion rules are the SDK's and tested there; this covers the prompt's wiring.
vi.mock("@pantheon-systems/p1-next-sdk/localization", () => ({
  getSavedLocale: () => "fr",
  getSavedLocaleSuggestion,
  saveLocale: vi.fn(),
}));

const { LocaleOffer, LocaleSuggestion, LocaleSuggestionPrompt } = await import(
  "../components/locale-suggestion"
);

const noop = () => {};

const pageInEnglish: P1Localization = {
  locale: "en",
  siteLocales: { markets: ["en", "fr"], policy: "fallback" },
  variants: [
    { locale: "en", path: "/about", current: true },
    { locale: "fr", path: "/a-propos", current: false },
  ],
};

describe("LocaleSuggestionPrompt", () => {
  it("names the offered locale in its own language", () => {
    const html = renderToStaticMarkup(
      <LocaleSuggestionPrompt locale="fr" path="/a-propos" onAccept={noop} onDismiss={noop} />,
    );
    expect(html).toContain('This page is available in <span lang="fr">Français</span>.');
  });

  it("links to the page's version in the offered locale", () => {
    const html = renderToStaticMarkup(
      <LocaleSuggestionPrompt locale="fr" path="/a-propos" onAccept={noop} onDismiss={noop} />,
    );
    expect(html).toContain('href="/a-propos"');
    expect(html).toContain('hrefLang="fr"');
  });
});

describe("LocaleSuggestion", () => {
  beforeEach(() => {
    localization.current = pageInEnglish;
    getSavedLocaleSuggestion.mockReset().mockReturnValue(null);
  });

  it("renders an empty live region on the server, where the saved locale is unknown", () => {
    getSavedLocaleSuggestion.mockImplementation(({ savedLocale }) =>
      savedLocale ? { locale: "fr", path: "/a-propos", current: false } : null,
    );
    expect(renderToStaticMarkup(<LocaleSuggestion />)).toBe('<div aria-live="polite"></div>');
  });

  it("offers the variant suggested for the saved locale", () => {
    getSavedLocaleSuggestion.mockReturnValue({ locale: "fr", path: "/a-propos", current: false });
    const html = renderToStaticMarkup(<LocaleOffer savedLocale="fr" />);
    expect(getSavedLocaleSuggestion).toHaveBeenCalledWith({
      variants: pageInEnglish.variants,
      siteLocales: pageInEnglish.siteLocales,
      savedLocale: "fr",
    });
    expect(html).toContain('href="/a-propos"');
    expect(html).toContain("Français");
  });

  it("offers nothing when no variant is suggested", () => {
    expect(renderToStaticMarkup(<LocaleOffer savedLocale="en" />)).toBe("");
  });

  it("offers nothing outside a localized page", () => {
    localization.current = { locale: null, siteLocales: null, variants: [] };
    expect(renderToStaticMarkup(<LocaleOffer savedLocale="fr" />)).toBe("");
    expect(getSavedLocaleSuggestion).not.toHaveBeenCalled();
  });
});
