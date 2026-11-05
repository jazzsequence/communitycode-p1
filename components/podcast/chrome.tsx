/**
 * Header and footer as plain components, so both the Puck blocks and code routes
 * (e.g. /episodes/[slug]) render identical chrome. Implementations live in
 * `chrome-header.tsx` (client: mobile menu, aria-current) and `chrome-footer.tsx`.
 */
export { SiteHeaderView, type SiteHeaderProps } from "./chrome-header";
export { SiteFooterView, type SiteFooterProps } from "./chrome-footer";
