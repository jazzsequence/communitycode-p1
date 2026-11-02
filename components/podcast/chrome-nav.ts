export type CurrentState = "page" | "true" | undefined;

function stripToPath(href: string): string | null {
  // Only same-site links can be "current". Scheme or protocol-relative -> no.
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")) return null;
  const path = href.split(/[?#]/)[0];
  if (!path.startsWith("/")) return null;
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

/**
 * `aria-current` for a nav link. Exact route -> "page"; a route inside the
 * section (/episodes/some-slug under /episodes) -> "true", which still marks the
 * section without claiming the user is on that exact page. "/" only matches "/".
 */
export function currentState(pathname: string | null | undefined, href: string): CurrentState {
  if (!pathname) return undefined;
  const target = stripToPath(href);
  if (target === null) return undefined;
  const here = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (here === target) return "page";
  if (target !== "/" && here.startsWith(`${target}/`)) return "true";
  return undefined;
}

/** UTC so a server render and a client hydrate agree except across New Year. */
export function copyrightYear(now: Date = new Date()): number {
  return now.getUTCFullYear();
}
