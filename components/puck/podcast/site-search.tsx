import { SiteSearchView } from "@/components/podcast/search-view";
import { DEFAULT_ENDPOINTS, DEFAULT_LINKS } from "@/lib/block-config";

/**
 * Endpoint contract: GET `<endpoint>?q=<text>&limit=<n>` (the endpoint may already
 * contain a query string) returns JSON `{ episodes: [{ slug, title, season, number,
 * publishedAt }], nextCursor }`, i.e. the EpisodeListResponse in lib/episodes/dto.ts.
 */
interface SiteSearchBlockProps {
  heading: string;
  placeholder: string;
  maxResults: number;
  endpoint: string;
  episodeLinkTemplate: string;
  formAction: string;
}

export const siteSearchBlock = {
  label: "Site Search",
  fields: {
    heading: { type: "text" as const, label: "Heading" },
    placeholder: { type: "text" as const, label: "Placeholder" },
    maxResults: { type: "number" as const, label: "Max results (3-20)", min: 3, max: 20 },
    endpoint: {
      type: "text" as const,
      label: "Search endpoint (GET ?q=&limit= returning { episodes: [{ slug, title, season, number, publishedAt }] })",
    },
    episodeLinkTemplate: {
      type: "text" as const,
      label: "Result link pattern ({slug}, {season}, {number} are replaced)",
    },
    formAction: {
      type: "text" as const,
      label: "No-JavaScript fallback: page the search form submits to (GET ?q=). Empty = current page",
    },
  },
  defaultProps: {
    heading: "Search episodes",
    placeholder: "Search episodes, guests, topics",
    maxResults: 8,
    endpoint: DEFAULT_ENDPOINTS.episodes,
    episodeLinkTemplate: DEFAULT_LINKS.episode,
    formAction: "",
  },
  render: ({ id: _id, ...props }: Partial<SiteSearchBlockProps> & { id?: string }) => <SiteSearchView {...props} />,
};
