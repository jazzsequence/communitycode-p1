import { GuestGridView } from "@/components/podcast/guest-grid-view";
import { DEFAULT_HOST_ROLES } from "@/lib/guests";
import { DEFAULT_ENDPOINTS, DEFAULT_LINKS } from "@/lib/block-config";

/**
 * Endpoint contract: GET `<endpoint>` returns JSON
 * `{ guests: [{ name, photoUrl: string|null, role: string|null,
 *   episodes: [{ slug, title, season: number|null, number: number|null }] }] }`
 * (GuestsResponse in lib/guests.ts), newest appearance first.
 */
interface GuestGridBlockProps {
  heading: string;
  columns: number;
  showEpisodeCount: boolean;
  limit: number | null;
  endpoint: string;
  episodeLinkTemplate: string;
  excludeRoles: string;
}

export const guestGridBlock = {
  label: "Guest Grid",
  fields: {
    heading: { type: "text" as const, label: "Heading" },
    columns: { type: "number" as const, label: "Columns (2-4)", min: 2, max: 4 },
    showEpisodeCount: {
      type: "radio" as const,
      label: "Show episode count",
      options: [
        { label: "Yes", value: true },
        { label: "No", value: false },
      ],
    },
    limit: { type: "number" as const, label: "Max guests (empty for all)", min: 1 },
    endpoint: {
      type: "text" as const,
      label: "Guests endpoint (GET returning { guests: [{ name, photoUrl, role, episodes: [{ slug, title, season, number }] }] })",
    },
    episodeLinkTemplate: {
      type: "text" as const,
      label: "Episode link pattern ({slug}, {season}, {number} are replaced)",
    },
    excludeRoles: {
      type: "text" as const,
      label: "Hide people whose role matches (case-insensitive regex, e.g. host|co-host; empty shows everyone)",
    },
  },
  defaultProps: {
    heading: "Guests",
    columns: 3,
    showEpisodeCount: true,
    endpoint: DEFAULT_ENDPOINTS.guests,
    episodeLinkTemplate: DEFAULT_LINKS.episode,
    excludeRoles: DEFAULT_HOST_ROLES,
  },
  render: ({ id: _id, excludeRoles: excludeRolesPattern, ...props }: Partial<GuestGridBlockProps> & { id?: string }) => (
    <GuestGridView {...props} excludeRolesPattern={excludeRolesPattern} />
  ),
};
