import { NextResponse, type NextRequest } from "next/server";
import { getEpisodeSource } from "@/lib/episodes";

/** GET /api/episodes/{slug} - one full episode, show notes included. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!/^[a-z0-9-]{1,200}$/i.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }
  try {
    const episode = await getEpisodeSource().bySlug(slug);
    if (!episode) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(
      { episode },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (e) {
    console.error("[api/episodes/slug]", (e as Error).message);
    return NextResponse.json({ error: "Episodes are temporarily unavailable." }, { status: 502 });
  }
}
