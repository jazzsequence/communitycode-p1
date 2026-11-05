import { NextResponse, type NextRequest } from "next/server";
import { ConfigError, getConfig, isAllowedTranscriptUrl, type AppConfig } from "@/lib/config";
import { getEpisodeSource } from "@/lib/episodes";
import { wpFetch } from "@/lib/episodes/wordpress";
import { MAX_TRANSCRIPT_BYTES, isSameHost, parseTranscriptUrl, parseVtt } from "@/lib/transcript";

/**
 * GET /api/episodes/{slug}/transcript -> { cues: Cue[] }
 *
 * The browser never fetches the .vtt itself: the WordPress host may sit behind
 * Pantheon bot protection (a .vtt gets a 403 challenge without the bypass
 * header), and the bypass token must stay server-side. This route is also the
 * SSRF boundary: the transcript URL comes from upstream data, so it is fetched
 * only if `isAllowedTranscriptUrl` (lib/config.ts: WP_BASE_URL host +
 * TRANSCRIPT_ALLOWED_HOSTS, https only, exact hostname) accepts it. Nothing here
 * names a host.
 *
 *   200 { cues }  parsed (possibly empty)
 *   400           invalid slug
 *   404           no such episode, or it has no (fetchable) transcript
 *   501           no transcript host is configured at all
 *   502           upstream failure (generic message; details go to the server log)
 */

const CACHE = "public, s-maxage=300, stale-while-revalidate=3600";

class TooLarge extends Error {}

/** Read at most MAX_TRANSCRIPT_BYTES, whatever Content-Length claims. */
async function readCapped(res: Response): Promise<string> {
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_TRANSCRIPT_BYTES) throw new TooLarge();
  if (!res.body) {
    const text = await res.text();
    if (new TextEncoder().encode(text).length > MAX_TRANSCRIPT_BYTES) throw new TooLarge();
    return text;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_TRANSCRIPT_BYTES) {
      await reader.cancel().catch(() => {});
      throw new TooLarge();
    }
    chunks.push(value);
  }
  const all = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder("utf-8").decode(all);
}

async function fetchTranscript(url: URL, wordpress: AppConfig["wordpress"]): Promise<Response> {
  if (wordpress && isSameHost(url, wordpress.baseUrl)) {
    // Sends the bypass header and turns a Pantheon challenge into a clear error.
    return wpFetch(wordpress, url.toString(), "text/vtt, text/plain, */*");
  }
  // Any other allowed host must never receive the Pantheon bypass token.
  const res = await fetch(url, {
    headers: { Accept: "text/vtt, text/plain, */*", "User-Agent": "p1-podcast-site/0.1" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Transcript request failed: ${res.status}`);
  return res;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!/^[a-z0-9-]{1,200}$/i.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  try {
    const { wordpress, transcriptHosts } = getConfig();
    if (transcriptHosts.length === 0) {
      return NextResponse.json(
        { error: "Transcripts are not configured: set WP_BASE_URL (or TRANSCRIPT_ALLOWED_HOSTS)." },
        { status: 501 },
      );
    }

    const episode = await getEpisodeSource().bySlug(slug);
    if (!episode) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!episode.transcript) return NextResponse.json({ error: "No transcript" }, { status: 404 });

    const url = parseTranscriptUrl(episode.transcript.url, wordpress?.baseUrl);
    if (!url || !isAllowedTranscriptUrl(url.toString(), transcriptHosts)) {
      console.warn("[api/transcript] refused transcript URL for", slug);
      return NextResponse.json({ error: "No transcript" }, { status: 404 });
    }

    const res = await fetchTranscript(url, wordpress);
    // A redirect may have left the allowed hosts; do not read that body.
    if (res.url && !isAllowedTranscriptUrl(res.url, transcriptHosts)) {
      console.warn("[api/transcript] upstream redirected off-list for", slug);
      return NextResponse.json({ error: "Transcript is temporarily unavailable." }, { status: 502 });
    }
    const cues = parseVtt(await readCapped(res));
    return NextResponse.json({ cues }, { headers: { "Cache-Control": CACHE } });
  } catch (e) {
    if (e instanceof ConfigError) {
      console.error("[api/transcript]", e.message);
      return NextResponse.json({ error: "Transcripts are not configured." }, { status: 501 });
    }
    // The message can contain a path; the log is server-side, the response is generic.
    console.error("[api/transcript]", e instanceof TooLarge ? "transcript too large" : (e as Error).message);
    return NextResponse.json({ error: "Transcript is temporarily unavailable." }, { status: 502 });
  }
}
