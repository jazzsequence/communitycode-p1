/**
 * The name of a locale in its own language, such as "Français" for `fr`, for
 * offering a visitor a language they read. Throws a `RangeError` for a value
 * that is not a language tag.
 */
export function localeName(locale: string): string {
  const name = new Intl.DisplayNames([locale], { type: "language" }).of(locale) ?? locale;
  return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
}
