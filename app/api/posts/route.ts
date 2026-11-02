import { NextResponse, type NextRequest } from "next/server";
import { ConfigError } from "@/lib/config";
import { loadPosts, parsePostsParams } from "@/lib/posts";

/**
 * GET /api/posts?page=&per_page=&q=  ->  { posts, page, totalPages }
 *
 * Called by the BlogArchive block. Runs server-side so the Pantheon bot-bypass
 * token never reaches the browser. 501 when WordPress isn't configured
 * (WP_BASE_URL unset): the blog is disabled, not broken.
 */
export async function GET(req: NextRequest) {
  const parsed = parsePostsParams(req.nextUrl.searchParams);
  // tsconfig is strict:false, so the union doesn't narrow on `ok`.
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const body = await loadPosts(parsed.query);
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (e) {
    if (e instanceof ConfigError) {
      console.error("[api/posts]", e.message);
      return NextResponse.json({ error: "Blog isn't configured." }, { status: 501 });
    }
    // Messages from wpFetch hold a path only, never the token; the response
    // still says nothing about the upstream.
    console.error("[api/posts]", (e as Error).message);
    return NextResponse.json({ error: "Posts are temporarily unavailable." }, { status: 502 });
  }
}
