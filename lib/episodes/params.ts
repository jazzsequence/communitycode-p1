import { clampLimit, type EpisodeType, type ListParams } from "./types";

const TYPES: readonly EpisodeType[] = ["full", "trailer", "bonus"];

export type ParsedParams = { ok: true; params: ListParams } | { ok: false; error: string };

/** Validate the query string of /api/episodes. Never trust it to be well-formed. */
export function parseListParams(sp: URLSearchParams): ParsedParams {
  const params: ListParams = {};

  const season = sp.get("season");
  if (season !== null && season !== "") {
    if (!/^\d{1,4}$/.test(season)) return { ok: false, error: "season must be an integer 0-9999" };
    params.season = Number(season);
  }

  const type = sp.get("type");
  if (type) {
    const types = type.split(",").map((t) => t.trim());
    if (!types.every((t): t is EpisodeType => (TYPES as readonly string[]).includes(t))) {
      return { ok: false, error: `type must be a comma-separated list of: ${TYPES.join(", ")}` };
    }
    params.type = types as EpisodeType[];
  }

  const limit = sp.get("limit");
  if (limit !== null && limit !== "") {
    if (!/^\d{1,3}$/.test(limit)) return { ok: false, error: "limit must be an integer 1-50" };
    params.limit = clampLimit(Number(limit));
  }

  const cursor = sp.get("cursor");
  if (cursor) {
    if (cursor.length > 512) return { ok: false, error: "cursor too long" };
    params.cursor = cursor;
  }

  const q = sp.get("q")?.trim();
  if (q) params.query = q.slice(0, 100);

  return { ok: true, params };
}
