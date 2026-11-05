# communitycode-p1

A P1 (Pantheon's AI-native web composition layer) frontend for the **Community + Code** podcast
(communitycode.dev). Next.js 16 App Router + Puck blocks, scaffolded from
`@pantheon-systems/create-p1-starter-kit` 0.25.0. It is a *virtual interface for the real show*, not a
copy: WordPress stays the CMS (episodes, uploads, blog) and show.fm is wired in as an episode source.

## Commands

Node **24** (`nvm use 24`). npm, not pnpm.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (editor at `/p1`). Use `npx next dev -p <port>` if 3000 is taken. |
| `npm run build` | Production build. Do not run it while a dev server is up: they share `.next`. |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck |
| `npm test` | Vitest (`npx vitest run <file>` for one) |

Run lint, tsc, tests and build before presenting changes.

## Where things live

- **Code** (blocks, routes, styles) is in this repo. **Page content** lives in P1's backend (CCR), keyed by
  site ID + workstream, edited at `/p1`. Blocks must be registered in `puck.config.tsx` to appear.
- `lib/episodes/` is the data layer. Everything reads the source-agnostic `Episode` type, never a vendor payload.
  - `wordpress.ts` / `wordpress-parse.ts`: PowerPress feed joined to WP REST `episodes` on permalink.
  - `showfm.ts`: show.fm public API, plus keyed `/v1/me/*` for show notes HTML. Server-only.
  - `index.ts`: `composite()` **merges** show.fm and WordPress (`EPISODE_SOURCE=auto`).
  - `filter.ts`: offset-cursor pagination + season/type/text filtering over the merged list.
- `app/api/episodes[/slug]`: what client blocks call. Keys and tokens never reach the browser.
- `components/puck/podcast/`: the blocks. `index.ts` is the barrel (ids + categories).
- `app/podcast.css`: the design system. `lib/format.ts`: shared date/duration formatting.

## Non-obvious decisions (read before changing the data layer)

- **show.fm is external-hosted for this show.** Its API only holds episodes created in show.fm; the 38-episode
  back catalogue shows in show.fm's UI as a read-only RSS list and is *not* in the API. Hence the merge:
  WordPress supplies the archive, show.fm adds/overrides. On a match (same season+number), show.fm wins, WP
  fills gaps (audio, transcript, show notes), and the **WP slug is kept** so `/episodes/{slug}` URLs don't change.
- **The show moved to show.fm hosting** (`hosting_type` went `external` -> `podcasterplus`, 38 episodes imported), so
  the merge is now exercised for real and audio/transcripts come from show.fm's CDN (`m.cdn.media`, allowed
  automatically for transcripts). Real-data findings that shaped the merge (`__tests__/episodes-real-merge.test.ts`
  runs on real snapshots of both sides):
  - show.fm's imported slugs get 6 random characters (`episode-36-x-a98avk`); the site keeps the WordPress slug.
  - Pairing is title -> unambiguous season+number -> slug-minus-suffix. Season+number alone is NOT unique
    (WordPress has two S1 E7) and show.fm lacks it for 4 episodes.
  - show.fm's imported `description` is the flattened show-notes link list + "appeared first on" footer, and
    `show_notes_html` is empty, so **WordPress owns editorial text** (description, show notes); show.fm owns
    identity and media. Its public `people` are empty, so guests still come from WordPress titles.
- **Both sources are needed for one episode.** REST has no audio/season/duration (PowerPress keeps them out of
  it); the feed has no show notes HTML/slug. Joined on permalink.
- **communitycode.dev is behind Pantheon next-gen GCDN bot protection.** Unknown clients get a 403 managed
  challenge (`cf-mitigated: challenge`), even for the feed, REST and `.vtt` files (MP3s pass). Server-side
  fetches get through by **User-Agent allowlist**: `terminus gcdn:ua-bypass:add <site>.<env> <host> "<ua>"`
  with the exact string in `WP_USER_AGENT` (default `communitycode-p1/1.0`; matching is exact, so change both
  together). Verified live: that UA gets 200 on the feed and REST with no token, while a near-miss UA is
  challenged. The alternative is `PANTHEON_BOT_BYPASS_TOKEN`, but it **rotates** (current/next, ~6 months), so
  never store it in a file that outlives it: read it with `terminus gcdn:bot-bypass communitycodedev`.
  `wpFetch` names both fixes when it sees a challenge. Bypass needs the *client* to send the UA/header, which is
  why show.fm's importer needed its own allowlist entries.
- **The feed is cached at the edge for a week** (`max-age=604800`) and stays stale after PowerPress changes.
  Fetches append `?cb=<5-minute bucket>` to force an origin read without defeating caching.
- **`_embed` needs `_links` in `_fields`.** Omit it and WordPress silently drops embedded featured images.
- **Guests come from titles** ("Episode 36: Jacquie Capur"), not a field. `parseGuestsFromTitle`; non-episode
  items have none. show.fm `people` replaces them when present.
- **Design tokens are scoped to `.cc-root`** (set in `components/puck/root.tsx`), not `<body>`: Puck copies host
  styles into its editor canvas iframe. Never put tokens on `body`/`:root`.
- `tsconfig` is `strict: false`, so boolean-discriminated unions don't narrow: use `"error" in x`.
- `server-only` is aliased to a stub in `vitest.config.ts` (it throws outside RSC).
- npm 11 crashed ("Invalid Version") on a stale lockfile with Tailwind's bundled wasm package; regenerating
  `package-lock.json` fixed it. If it recurs, do that.

## Generic and reusable: nothing site-specific is hardcoded

The components are meant to be reused for other shows and data sources, so **no endpoint, URL, hostname or site
name is baked into component or library code**.

- **Server** (`lib/config.ts`): all site-specific values come from env through `getConfig()` (WordPress base URL,
  feed path, show.fm slug/API base, transcript host allowlist). A backend whose variables are unset is *disabled*,
  not defaulted: `getEpisodeSource()` builds only what is configured and throws `ConfigError` if nothing is
  (routes answer 501 for that, 502 for real upstream failures). `isAllowedTranscriptUrl` is the SSRF guard.
- **Blocks** (`lib/block-config.ts`, client-safe): every API endpoint and link pattern is an editable Puck field.
  The defaults live only in `DEFAULT_ENDPOINTS` / `DEFAULT_LINKS`; render uses the *prop* through
  `safeUrl(prop, default)`, `expandTemplate("/episodes/{slug}", {...})` (null when a value is missing, so no
  `/episodes/undefined` links) and `withQuery(url, params)` (endpoint may already carry a `?`). A block works
  against any endpoint that returns the documented response shape (documented in a comment above each block).
- **Site identity** (`content/site.ts`): env-driven (`NEXT_PUBLIC_SITE_NAME`, `_TAGLINE`, `_FEED_URL`,
  `_APPLE_PODCASTS_URL`, `_SITE_NAV` JSON) with neutral defaults. `NEXT_PUBLIC_*` are baked at build time.
- Fixtures and tests may contain real Community + Code data. Code may not.

## Generic page blocks (P1 registry)

Heading, Paragraph, Hero, Columns, Container, Button, CtaBanner, CardGrid, FeatureMedia, Figure, Image, List,
Divider, Spacer, Faq, Callout and Embed come from P1's block registry (`components.p1.pantheon.io`), not from
hand-written code, so they stay in step with the P1 editor. They live in `components/puck/blocks/` and are
registered by `npm run blocks:sync` (do not edit between the `p1-blocks` markers).

- **Add one:** `npx shadcn@latest add @p1/<name>`, then `npm run blocks:sync`. Install a named subset, never
  `@p1/base` (192 files, the whole marketing kit).
- **The shadcn CLI will try to use pnpm** in this npm repo: it creates `pnpm-lock.yaml` and `node_modules/.pnpm`,
  and may bump `package.json` versions. After every install: delete those, `git checkout package.json`,
  `npm install`, `git checkout package-lock.json` (npm rewrites optional flags), then `rm -rf .next` or a running
  dev server keeps serving a cache that points at the deleted `.pnpm` paths (500s).
- **Theming:** the kit reads `--p1-*` tokens. `app/podcast.css` maps them onto `--cc-*` on `.cc-root`, so retheme
  there, not in `app/p1-tokens.css`.
- **Category keys must not collide** with the kit's (`attention`, `content`, `convert`, `editorial`, `layout`,
  `showcase`, `value`): `puck.config.tsx` spreads the kit's categories last. Podcast blocks use `episodes`,
  `show`, `site`.
- shadcn/ui's own components (`ui.shadcn.com`) are not used: their default style is not published for this
  scaffold's `"style": "p1"`, and the generated files expect `lib/utils.ts`, which does not exist here.

## Block conventions

- A block is a Puck component config: `{ label, fields, defaultProps, render }`. The key in `podcastBlocks` is
  the id **stored in page content**: never rename a shipped one.
- Blocks that need data are client components that `fetch("/api/...")`. Handle loading, empty, and error states.
- Use `cc-*` classes and tokens from `app/podcast.css`. No raw colours. Min 44px touch targets, visible focus,
  `prefers-reduced-motion` honoured, WCAG AA contrast.
- Render only sanitised HTML (`Episode.showNotesHtml` is sanitised server-side). Transcript text is untrusted:
  render as text, never HTML.
- Fields named `image`/`logo`/`thumbnail`/`*ImageUrl` get P1's media picker.
- Tests: Vitest. Pure logic in plain tests; interactive blocks with Testing Library
  (`// @vitest-environment jsdom` at the top of the file).

## Environment

`.env.local` is git-ignored. See `.env.example`. Never print, log, commit or `NEXT_PUBLIC_`-prefix
`SHOWFM_API_KEY` or `PANTHEON_BOT_BYPASS_TOKEN`.

## Status

Built, tested and committed on `feat/podcast-frontend`. Verified against the live site (production build):
every `/api/*` route and `/episodes/[slug]`; 38 episodes, 36 guests, 1408 transcript cues, secrets absent from
every response. **Not verified: anything visual** (layout, contrast, focus, real audio playback, the Puck
editor at `/p1`); nobody has looked at it in a browser.

| Area | Where |
|---|---|
| Episode data (merge, filters, params) | `lib/episodes/`, `app/api/episodes/**` |
| Blog (headless WordPress REST) | `lib/posts.ts`, `app/api/posts` |
| Transcripts (server-side VTT, SSRF-guarded) | `lib/transcript.ts`, `app/api/episodes/[slug]/transcript` |
| Guests (aggregated; host roles filtered in the block) | `lib/guests.ts`, `app/api/guests` |
| Newsletter (**501 until `NEWSLETTER_ENDPOINT` is set**; the MailPoet endpoint exists in the WordPress repo, written from MailPoet's source but never run against a real signup) | `app/api/newsletter`, `docs/newsletter-mailpoet.md` |
| Contact form (**501 until `CONTACT_ENDPOINT` + `CONTACT_SECRET` are set**; the WordPress endpoint is a separate repo/branch; block never viewed in a browser) | `app/api/contact`, `components/puck/podcast/contact-form.tsx`, `docs/contact-wordpress.md` |
| Shared form-route helpers (capped body, rate limit keyed per form, upstream URL check, WP-host-only UA/bypass headers) | `lib/forms/` |
| Detail page | `app/episodes/[slug]`, `components/podcast/episode-detail.tsx` |
| Blocks | `components/puck/podcast/*` (13), client bodies in `components/podcast/*` |

Known gaps / decisions pending:
- No `/blog/[slug]` route: blog cards link out to the post on the WordPress host. The nav's `/blog`, `/about`,
  `/be-a-guest`, `/subscribe` need P1 pages (create them in the editor).
- Skip link target: P1 pages have no `<main id="main-content">`; the root can't wrap it without putting the
  header inside `<main>`.
- **Player:** show.fm-hosted episodes use `<showfm-player>` and `<showfm-transcript>` from the vendor's
  `@showfm/embed` (bundled from npm, so no third-party script at runtime). `lib/showfm-embed.ts` decides per
  episode (`isShowfmHosted`: origin `showfm` + UUID id + audio on a show.fm media host, using the package's own
  host rules); everything else keeps the native `<audio>` player and VTT viewer. Blocks have `playerMode`/`source`
  = `auto` (default) | `showfm` | `native`. The embeds follow the site palette through `--showfm-*` hooks set on
  `.cc-root` in `app/podcast.css`. Verified in server HTML only: **not confirmed in a browser** that the
  elements upgrade, play audio or look right.
- **show.fm import bug (reported separately): every imported episode guid keeps a literal `&#038;`** where
  WordPress's feed has `&` (an undecoded XML character reference), so guids differ from the WordPress feed for
  all 38 episodes. Do not switch Apple/Spotify to the show.fm feed or redirect the old one until show.fm fixes it.
- Not done, each needs an explicit go-ahead: P1 site, GitHub repo, Pantheon front-end site, secrets, deploy.
