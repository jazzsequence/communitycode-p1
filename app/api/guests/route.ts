import { NextResponse } from "next/server";
import { ConfigError } from "@/lib/config";
import { getEpisodeSource } from "@/lib/episodes";
import { aggregateGuests, type GuestsResponse } from "@/lib/guests";

/**
 * GET /api/guests
 *
 * Every guest across the merged episode list, built server-side so the show.fm
 * key and Pantheon bypass token never reach the browser.
 */
export async function GET() {
  try {
    const episodes = await getEpisodeSource().all();
    const body: GuestsResponse = { guests: aggregateGuests(episodes) };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (e) {
    // No backend configured is a deployment state, not an outage.
    if (e instanceof ConfigError) {
      return NextResponse.json({ error: "No episode source configured." }, { status: 501 });
    }
    console.error("[api/guests]", (e as Error).message);
    return NextResponse.json({ error: "Guests are temporarily unavailable." }, { status: 502 });
  }
}
