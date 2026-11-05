import { NextResponse, type NextRequest } from "next/server";
import { getEpisodeSource } from "@/lib/episodes";
import { toCard, type EpisodeListResponse } from "@/lib/episodes/dto";
import { parseListParams } from "@/lib/episodes/params";

/**
 * GET /api/episodes?season=&type=full,bonus&cursor=&limit=&q=
 *
 * Called by the archive, search and hero blocks. Runs server-side so the show.fm
 * key and Pantheon bypass token never reach the browser.
 */
export async function GET(req: NextRequest) {
  const parsed = parseListParams(req.nextUrl.searchParams);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const source = getEpisodeSource();
    const [page, seasons] = await Promise.all([
      source.list(parsed.params),
      // Seasons belong to the first page only.
      parsed.params.cursor ? Promise.resolve(undefined) : source.seasons(),
    ]);
    const body: EpisodeListResponse = {
      episodes: page.episodes.map(toCard),
      nextCursor: page.nextCursor,
      origin: page.origin,
      ...(seasons ? { seasons } : {}),
    };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (e) {
    console.error("[api/episodes]", (e as Error).message);
    return NextResponse.json({ error: "Episodes are temporarily unavailable." }, { status: 502 });
  }
}
