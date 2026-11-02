"use client";

/**
 * Offers the page in the visitor's saved locale when it is in another one or
 * has none. Either choice saves a locale, so the offer is not repeated; on a
 * page with no locale, "Stay here" only closes it.
 */

import { useState, useSyncExternalStore } from "react";
import { useP1Localization } from "@pantheon-systems/p1-next-sdk";
import {
  getSavedLocale,
  getSavedLocaleSuggestion,
  saveLocale,
} from "@pantheon-systems/p1-next-sdk/localization";
import { localeName } from "../lib/locale-name";
import styles from "./locale-suggestion.module.css";

export function LocaleSuggestionPrompt({
  locale,
  path,
  onAccept,
  onDismiss,
}: {
  locale: string;
  path: string;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <aside
      lang="en"
      aria-label="Language"
      className={styles.prompt}
    >
      <p className={styles.message}>
        This page is available in <span lang={locale}>{localeName(locale)}</span>.
      </p>
      <a
        href={path}
        hrefLang={locale}
        onClick={onAccept}
        className={styles.accept}
      >
        <span lang={locale}>{localeName(locale)}</span>
      </a>
      <button
        type="button"
        onClick={onDismiss}
        className={styles.dismiss}
      >
        Stay here
      </button>
    </aside>
  );
}

const subscribe = () => () => {};

/** The visitor's saved locale, or `null` on the server and while hydrating. */
function useSavedLocale(): string | null {
  return useSyncExternalStore(subscribe, getSavedLocale, () => null);
}

export function LocaleSuggestion() {
  // The live region is rendered empty first, so screen readers announce the offer when it fills.
  return (
    <div aria-live="polite">
      <LocaleOffer savedLocale={useSavedLocale()} />
    </div>
  );
}

export function LocaleOffer({ savedLocale }: { savedLocale: string | null }) {
  const { locale, siteLocales, variants } = useP1Localization();
  const [dismissed, setDismissed] = useState(false);

  const suggestion = siteLocales
    ? getSavedLocaleSuggestion({ variants, siteLocales, savedLocale })
    : null;
  if (!suggestion || dismissed) return null;

  return (
    <LocaleSuggestionPrompt
      locale={suggestion.locale}
      path={suggestion.path}
      onAccept={() => saveLocale(suggestion.locale)}
      onDismiss={() => {
        if (locale) saveLocale(locale);
        setDismissed(true);
      }}
    />
  );
}
