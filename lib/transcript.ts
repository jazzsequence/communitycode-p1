/**
 * Transcript handling: a lenient WebVTT parser, the SSRF guard for the
 * transcript proxy route, and the pure helpers the viewer uses (grouping,
 * active-cue lookup, search highlighting).
 *
 * No server-only imports: the viewer (client) and the route (server) share this.
 *
 * Transcript text is UNTRUSTED. The parser strips every tag-like sequence, and
 * the viewer renders the result as React text nodes only, never as HTML.
 */

export interface Cue {
  /** Seconds from the start of the audio. */
  start: number;
  end: number;
  /** From a `<v Name>` voice tag, when present. */
  speaker?: string;
  /** Plain text, whitespace-collapsed, never markup. */
  text: string;
}

/** Upper bound on what the proxy route will read from upstream. */
export const MAX_TRANSCRIPT_BYTES = 2 * 1024 * 1024;
/** Defence in depth against a pathological file that is small but all cues. */
const MAX_CUES = 50_000;
const MAX_CUE_TEXT = 2_000;

// --- parsing --------------------------------------------------------------

/** "HH:MM:SS.mmm" or "MM:SS.mmm" (SRT's comma is accepted too). null if invalid. */
export function parseTimestamp(raw: string): number | null {
  const m = /^(?:(\d{1,3}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?$/.exec(raw.trim());
  if (!m) return null;
  const hours = m[1] !== undefined ? Number(m[1]) : 0;
  const minutes = Number(m[2]);
  const seconds = Number(m[3]);
  if (seconds > 59 || minutes > 59) return null;
  const ms = m[4] ? Number(m[4].padEnd(3, "0")) : 0;
  return hours * 3600 + minutes * 60 + seconds + ms / 1000;
}

const TIMING = /^\s*(\S+)\s+-->\s+(\S+)/;
// Voice tag, optionally with classes: <v Speaker>, <v.loud Speaker>.
const VOICE = /<v(?:\.[^\s>]*)*\s+([^>]*)>/i;
// Anything tag-like: element tags, comments, inline timestamps, and an unclosed
// tag running to the end of the text.
const TAGS = /<(?:\/?[A-Za-z][^<>]*|!--[\s\S]*?--|\d[\d:.,]*)(?:>|$)/g;
// Built from a string: a bundler may emit a literal U+2028 into a regex literal, which is a syntax error.
// eslint-disable-next-line no-control-regex -- stripping control characters is the point
const CONTROL = new RegExp("[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f\\u2028\\u2029]", "g");
const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  lrm: "",
  rlm: "",
};

function decodeEntities(s: string): string {
  // One pass: "&amp;lt;" decodes to "&lt;" and stops, never to "<".
  return s.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,6});/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code < 0x20 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return "";
      return String.fromCodePoint(code);
    }
    return ENTITIES[body.toLowerCase()] ?? whole;
  });
}

function stripTags(s: string): string {
  // Loop to a fixed point so "<<b>script>" cannot reassemble into a tag.
  let prev: string;
  let out = s;
  do {
    prev = out;
    out = out.replace(TAGS, "");
  } while (out !== prev);
  return out;
}

function cleanText(raw: string): string {
  return decodeEntities(stripTags(raw).replace(CONTROL, ""))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CUE_TEXT);
}

/**
 * Parse WebVTT (and, incidentally, SRT) into cues. Never throws: anything that
 * is not a well-formed cue is skipped.
 */
export function parseVtt(input: string): Cue[] {
  if (typeof input !== "string" || input.length === 0) return [];
  const body = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input; // BOM
  const lines = body.split(/\r\n|\r|\n/);
  const cues: Cue[] = [];

  // Group into blocks separated by blank lines.
  let block: string[] = [];
  const flush = () => {
    if (block.length > 0) parseBlock(block, cues);
    block = [];
  };
  for (const line of lines) {
    if (line.trim() === "") flush();
    else block.push(line);
    if (cues.length >= MAX_CUES) break;
  }
  flush();

  // Cues should be in order; the viewer's binary search relies on it.
  for (let i = 1; i < cues.length; i++) {
    if (cues[i].start < cues[i - 1].start) {
      cues.sort((a, b) => a.start - b.start);
      break;
    }
  }
  return cues;
}

function parseBlock(block: string[], out: Cue[]): void {
  if (/^(NOTE|STYLE|REGION)(\s|$)/.test(block[0])) return;
  const timingAt = block.findIndex((l) => l.includes("-->"));
  if (timingAt === -1) return; // header, identifier-only block, junk
  const m = TIMING.exec(block[timingAt]);
  if (!m) return;
  const start = parseTimestamp(m[1]);
  const end = parseTimestamp(m[2]);
  if (start === null || end === null || end < start) return;

  const body = block.slice(timingAt + 1).join(" ");
  if (body.trim() === "") return;
  const voice = VOICE.exec(body);
  const speaker = voice ? cleanText(voice[1]).slice(0, 80) : "";
  const text = cleanText(body);
  if (!text) return;
  out.push(speaker ? { start, end, speaker, text } : { start, end, text });
}

// --- transcript URLs ------------------------------------------------------

/**
 * Parse a transcript URL (resolving a relative one against `base`) and apply the
 * checks that do not depend on configuration: https, no credentials, default
 * port. The host allow-list lives in `lib/config.ts` (`isAllowedTranscriptUrl`);
 * the route applies both. Kept separate so this module stays client-safe.
 */
export function parseTranscriptUrl(raw: string, base?: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "443") return null;
  return url;
}

/** Same host as `baseUrl`? Only the WordPress host may be sent the Pantheon bypass header. */
export function isSameHost(url: URL, baseUrl: string | undefined): boolean {
  if (!baseUrl) return false;
  try {
    return url.hostname.toLowerCase() === new URL(baseUrl).hostname.toLowerCase();
  } catch {
    return false;
  }
}

// --- viewer helpers -------------------------------------------------------

/** Index of the cue playing at `time` (the last cue starting at or before it), or -1. */
export function activeCueIndex(cues: readonly Cue[], time: number): number {
  let lo = 0;
  let hi = cues.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].start <= time) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

export interface TranscriptBlock {
  start: number;
  end: number;
  speaker?: string;
  cues: Cue[];
  /** Indices into the flat cue list, inclusive. */
  firstIndex: number;
  lastIndex: number;
}

/**
 * Auto-generated captions are 2-second fragments. Showing one row each is
 * unreadable, so they are grouped into paragraphs: a new block starts when the
 * speaker changes, after a sentence end once the block spans 20s, or at 45s.
 */
export function groupCues(cues: readonly Cue[], softSeconds = 20, hardSeconds = 45): TranscriptBlock[] {
  const blocks: TranscriptBlock[] = [];
  let current: TranscriptBlock | null = null;
  cues.forEach((cue, index) => {
    if (current) {
      const span = cue.start - current.start;
      const last = current.cues[current.cues.length - 1].text;
      const speakerChanged = (cue.speaker ?? "") !== (current.speaker ?? "");
      if (speakerChanged || span >= hardSeconds || (span >= softSeconds && /[.?!]["')\]]?$/.test(last))) {
        blocks.push(current);
        current = null;
      }
    }
    if (!current) {
      current = { start: cue.start, end: cue.end, speaker: cue.speaker, cues: [], firstIndex: index, lastIndex: index };
    }
    current.cues.push(cue);
    current.end = Math.max(current.end, cue.end);
    current.lastIndex = index;
  });
  if (current) blocks.push(current);
  return blocks;
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MAX_QUERY = 100;

/** Case-insensitive literal matcher for user input; null for an empty query. */
export function buildMatcher(query: string): RegExp | null {
  const q = query.trim().slice(0, MAX_QUERY);
  if (!q) return null;
  return new RegExp(escapeRegExp(q), "gi");
}

export interface Segment {
  text: string;
  match: boolean;
}

const blockText = (b: TranscriptBlock) => b.cues.map((c) => c.text).join(" ");

/** Does the block (text across its cues, or speaker) contain the query? */
export function blockMatches(block: TranscriptBlock, query: string): boolean {
  const re = buildMatcher(query);
  if (!re) return true;
  return re.test(blockText(block)) || (block.speaker ? new RegExp(re.source, "i").test(block.speaker) : false);
}

/**
 * Per-cue text segments with matches flagged. Matching runs on the block's
 * joined text so a phrase split across two caption fragments is still found.
 */
export function highlightBlock(block: TranscriptBlock, query: string): Segment[][] {
  const re = buildMatcher(query);
  if (!re) return block.cues.map((c) => [{ text: c.text, match: false }]);

  const joined = blockText(block);
  const ranges: [number, number][] = [];
  for (const m of joined.matchAll(re)) {
    if (m[0].length === 0) continue;
    ranges.push([m.index, m.index + m[0].length]);
  }

  let offset = 0;
  return block.cues.map((cue) => {
    const from = offset;
    const to = from + cue.text.length;
    offset = to + 1; // the joining space
    const segments: Segment[] = [];
    let cursor = from;
    for (const [rs, re_] of ranges) {
      if (re_ <= from || rs >= to) continue;
      const a = Math.max(rs, from);
      const b = Math.min(re_, to);
      if (a > cursor) segments.push({ text: joined.slice(cursor, a), match: false });
      segments.push({ text: joined.slice(a, b), match: true });
      cursor = b;
    }
    if (cursor < to) segments.push({ text: joined.slice(cursor, to), match: false });
    return segments.length ? segments : [{ text: cue.text, match: false }];
  });
}
