# communitycode-p1

A P1 (Pantheon's AI-native web composition layer) frontend for the **Community + Code** podcast
(communitycode.dev). Next.js 16 (16.4.6+: 16.4.4 and below carry GHSA-mfr8-8qww-v76h) App Router + Puck blocks, scaffolded from
`@pantheon-systems/create-p1-starter-kit` 0.25.0. It is a *virtual interface for the real show*, not a
copy: WordPress stays the CMS (episodes, uploads, blog) and show.fm is wired in as an episode source.

## Commands

Node **24** (`nvm use 24`). npm, not pnpm.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (editor at `/p1`). Use `npx next dev -p <port>` if 3000 is taken. |
| `npm run build` | Production build. Do not run it while a dev server is up: they share `.next`. |
| `npm run lint` | ESLint |
| `npm run typecheck` | Typecheck (`next typegen && tsc --noEmit`: the gitignored `next-env.d.ts` that image/CSS imports need only exists after a Next command has run, so a bare `tsc` fails on a fresh clone) |
| `npm test` | Vitest (`npx vitest run <file>` for one) |
| `npm run storybook` | Design-system workshop on :6006 (`npm run build-storybook` to build). Independent of `.next`, so it can run beside `dev`/`build`. |

Run lint, typecheck, tests and build before presenting changes. **CI (`.github/workflows/ci.yml`) runs exactly these on every pull request and on `main`** (clean checkout, no `.env.local`), so the PR's check, not anyone's say-so, is the evidence they pass.

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
- `app/podcast.css`: the design system (tokens + `cc-*` components). `app/layout-contract.css`: holds the P1 kit blocks to the
  same gutter/rhythm. `docs/design-system.md`: the rationale. `stories/` + `.storybook/`: Storybook. `lib/format.ts`: date/duration formatting.

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
- **`Episode.artworkUrl` is the WordPress featured image (a 16:9 video thumbnail), never the podcast cover.** show.fm
  gives every episode the square show cover (`artwork.own: false`) and the feed has `itunes:image`; both are the wrong
  shape, so `showfm.ts` only keeps artwork flagged `own`, the WordPress parser drops the feed fallback, and
  `mergeEpisode` prefers WordPress. Missing means `null` (a placeholder), not a wrong-shaped image. Every episode image
  uses `.cc-episode-img` (16:9) so card, hero and detail agree.
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
- **The theme is always dark; it is not tied to the OS, and there is no light variant.** The P1 editor canvas reports
  a light color scheme on a dark OS, so a `prefers-color-scheme` switch showed editors a cream page visitors never see.
- **The palette (warm graphite + apricot) is tuned for astigmatism, so do not "fix" contrast by brightening.** Body text is
  WCAG 13:1 / APCA Lc -86, deliberately under the ~Lc 90 glare ceiling (halation). Muted text and errors are held at
  Lc >= 60 on every surface; control borders use `--cc-border-strong` (>= 3:1), never `--cc-border`. The Storybook Colors
  page computes the table live: if you touch a colour token, read it. Rationale and sources: `docs/design-system.md`.
- **One layout contract (`--cc-gutter`, `--cc-section-y`, `--cc-block-y`, `--cc-content`, `--cc-narrow`) places every block.**
  Podcast blocks get it from `.cc-container` / `.cc-section`; P1 kit blocks get it from `app/layout-contract.css`, which
  overrides them (they are registry-owned and `shadcn add` overwrites edits). A stray margin on a kit block is fixed there.
  Blocks add no outer margin of their own, and a block nested in Columns/Container adds no gutter. Use the `--cc-space-*`
  scale; no raw rem/px spacing. Check with the Storybook **Layout guides** toolbar toggle.
- **The header shows the `<&>` mark** (`site.config.ts` `site.logo`, file in `public/images/`; white on transparent, so it
  only reads on the dark theme). A blank `logo` field on the Site Header block means "the site logo", because saved
  pages carry `logo: ""` from before it existed. The mark is the WordPress favicon, trimmed. On mobile the nav toggle is a hamburger icon (a cross while open), not the word "Menu"; its accessible name is still "Menu" (`aria-label`) and the icon is `aria-hidden`.
- **The native player copies the show.fm player's layout** (`components/podcast/audio-player.tsx`, `.cc-player*` in
  `podcast.css`): cover, title, waveform, round controls, speed button. The waveform is decorative (seeded from the
  title, not the audio); the real control is a visually hidden range input over it, so keyboard and screen readers get a
  normal slider. Keep it in step if show.fm's player changes.
- **One transcript format for every episode: the native `TranscriptViewer`** (search, timestamps, follow along), including
  show.fm-hosted ones. `shouldUseShowfmTranscript` is true only for an explicit `source: showfm`. `<showfm-player>` has no
  public seek/time API, so `useShowfmChannel` (in `showfm-player.tsx`) reads the `<audio>` in its OPEN shadow root and
  publishes it onto the player channel. That is an internal detail: it is best effort, and if the audio is not found the
  transcript just has no seek buttons. Verified in Chrome (click a timestamp, the show.fm audio seeks and plays); re-check
  after a `@showfm/embed` upgrade.
- **Text width comes from `--cc-measure` (100ch), `--cc-narrow` (56rem) and `--cc-hero-copy` (48rem).** The kit hardcodes
  65ch / 35rem, so `layout-contract.css` (2c) overrides it; change the tokens, not the kit.
- **The Host / About bio uses the same rich-text field as the Paragraph** (`richtextLinkField`, see the next note), rendered
  through `RichValue` (sanitised). A bio saved before that holds a plain/Markdown string; one without a leading block tag still
  renders through `react-markdown` (allow-list: p, strong, em, code, a; URLs through `safeHref`, raw HTML as text), but it shows
  as raw `[text](url)` inside the rich editor, so convert saved bios to HTML when you touch them. The `links` list is separate:
  it renders buttons *under* the bio, it is not how inline text gets linked. Vitest stubs `ResizeObserver`
  (`__tests__/stubs/setup.ts`) because the field imports the Puck editor.
- **The kit Paragraph's rich-text toolbar is replaced** (`lib/rich-link-field.tsx`, swapped in `puck.config.tsx`, not in the
  kit file `shadcn add` overwrites). The kit's has no way to remove a link or clear formatting, so this adds **Remove link**
  and **Clear formatting** buttons and turns typed `[words](https://…)` into a link (address through `safeHref`). Buttons
  only, no address form: a form inside Puck's toolbar submitted the page instead of the link. **It imports nothing from
  tiptap and the repo must not depend on `@tiptap/*`**: every tiptap package peer-pins the exact version of the others, so a
  direct dependency of ours breaks the next Puck upgrade (npm ERESOLVE; `^` ranges resolve to the newest tiptap and conflict
  with the locked family). It works through the `editor` Puck passes to the menu instead. Puck does not re-render the menu
  when only the selection moves, so the menu subscribes to the editor itself. Tests build a real tiptap editor from Puck's own
  packages; the toolbar only really proves out in the P1 editor, so re-check it there after a Puck upgrade.
- **The Booking Embed block frames show.fm's public booking page** (`components/puck/podcast/booking-embed.tsx`; default URL is
  `showfm.bookingUrl` in `site.config.ts`). `@showfm/embed` has no booking element, so it is an https-only `<iframe>` plus a
  fallback link. The page is the vendor's: it keeps its own colours (it follows the visitor's system light/dark, with its own
  toggle) and takes no theme/accent URL options that I could find, and a cross-origin frame cannot be styled from here. So the frame sits in
  a `cc-card` and the iframe is `color-scheme: dark` (in Chrome that makes the page pick its dark theme on "System"; checked, but not in
  Safari/Firefox, and a visitor who picked Light in its toggle still gets light). The vendor page cannot be auto-sized (no resize message) and
  is `min-height: 100vh` plus ~6px, so in any frame it overflows and shows its own scrollbar inside the page scroll. Measured (page
  scrollHeight by frame width): stacked below **1024px** (show.fm's own breakpoint) 1210-1282px, two-column at 1024px+ 722px (811px
  with a time picked), and only 675px stacked once a date is picked. So `.cc-booking-clip` (chrome-blocks.css) gives the frame a fixed
  height per layout (1350px stacked, 960px two-column, via a container query at 1024px) and the iframe has `scrolling="no"` so the
  wheel always scrolls the page. Cost: after a date is picked the frame is taller than the content (empty vendor background). **The
  details step after "Confirm <time>" was not measured** (it would make a real booking); the headroom is a guess, so re-check it if
  the form looks cut off. There is deliberately no editor height field. A scrollbar-track clip (widening the frame) was tried first and
  did not fix the nested scroll. Scheduling
  and the guest's details never pass through this site. The live site's /be-a-guest uses a Ninja Forms form, not show.fm.
- **The favicon is the communitycode.dev one** (the WordPress site icon, white on transparent): `app/icon.png` (192px) and
  `app/apple-icon.png` (180px) are Next file conventions, so every root layout (site, `/episodes`, `/blog`, editor) gets the
  `<link>` tags; `public/favicon.ico` (32px) is the fallback for browsers that ask for `/favicon.ico`. They are copies of
  `communitycode.dev/app/uploads/2025/04/cropped-community-code-logo-favicon-white-1-*.png` (found in that site's `<link rel="icon">`
  tags): re-copy them if the WordPress icon changes. White on transparent only reads on a dark tab bar, same as the header mark.
- **Tags (`post_tag`) come from WordPress for both episodes and posts** (`lib/tags.ts` `mapTags`, from `_embed=wp:term`; the embed
  returns categories in the same array, so it filters by taxonomy). They show as plain pills (`TagList`) on episode/post cards and
  on the single pages, and as `keywords` in the JSON-LD. Not links: there is no tag archive page, and the episode card is one big link.
  show.fm has no tags, so `mergeEpisode` takes WordPress's (`tags` is spread over by show.fm's `[]` otherwise). The hero block, the
  text search and tag filtering do not use tags yet. The real-data posts fixture predates the embed, so it has none.
- **The episode page's transcript is collapsed by default**: a native `<details class="cc-disclosure">` (heading inside the summary),
  so it works without script and find-in-page opens it. The viewer is mounted (it fetches the cues once) but not shown. The
  `TranscriptViewer` *block* on P1 pages is unchanged (always open).
- **An episode's description is Yoast's meta description, not the WordPress excerpt** (`yoast_head_json.description` on the REST
  `episodes` item; it is the resolved value: a custom one if the editor wrote it, else Yoast's template). Order: Yoast, then the excerpt,
  then the feed text. It is fetched with the nested `_fields=yoast_head_json.description`, never the whole object (its schema graph is
  ~235 KB for 39 episodes vs 9 KB). The same string feeds the cards, the episode page, the `<meta name="description">`/Open Graph and
  JSON-LD, and the text search. Blog posts still use their excerpt. An episode Yoast has nothing for falls back, so its text is
  whatever the excerpt/feed gives (episode 29: the music credits; episode 9: a link list): fix those in WordPress (Yoast meta
  description or excerpt), not here.
  **The description is never truncated for display**: no line clamp on the episode cards or the hero, and the page meta/Open Graph text is
  the full string (a 160-char cut used to be applied). The only cut left is `.slice(0, 280)` on the *feed-text fallback* (raw show notes,
  not a description), which only applies when Yoast and the excerpt are both empty.
- **`proxy.ts` is Next 16's name for `middleware.ts`** (the starter kit shipped the old name, which warns on every build). It wraps the
  P1 SDK's request handling (`createP1Middleware`, whose own name is unchanged) and runs on Node, not the edge runtime. Do not rename it
  back: the file name and the `proxy` export are both what Next looks for.
- **Prose links keep a persistent dotted underline**; UI links use the live site's underline-on-intent. Link colour vs body
  colour is ~1.4:1, so colour alone cannot carry an inline link (WCAG 1.4.1).
- **Design tokens are scoped to `.cc-root`** (set in `components/puck/root.tsx`), not `<body>`: Puck copies host
  styles into its editor canvas iframe. Never put tokens on `body`/`:root`.
- `tsconfig` is `strict: false`, so boolean-discriminated unions don't narrow: use `"error" in x`.
- `server-only` is aliased to a stub in `vitest.config.ts` (it throws outside RSC).
- npm 11 crashed ("Invalid Version") on a stale lockfile with Tailwind's bundled wasm package; regenerating
  `package-lock.json` fixed it. If it recurs, do that.

## Generic and reusable: nothing site-specific is hardcoded

The components are meant to be reused for other shows and data sources, so **no endpoint, URL, hostname or site
name is baked into component or library code**.

- **`site.config.ts`** (repo root, committed) holds every **non-secret** site value: WordPress base URL/feed path,
  show.fm slug, site name/tagline/feed/Apple links/nav, and the contact/newsletter endpoints. Env vars of the same
  meaning override it (a preview pointing elsewhere). Only secrets (`*_SECRET`, `SHOWFM_API_KEY`, `CSS_API_KEY`,
  `PANTHEON_BOT_BYPASS_TOKEN`) belong in Pantheon secrets: a public URL stored as a secret can't be read back and
  is awkward to update. Another show edits this one file.
- **Server** (`lib/config.ts`): site-specific values come from `site.config.ts` with env overrides, through
  `getConfig()` (WordPress base URL, feed path, show.fm slug/API base; transcript hosts derive from them).
  `loadConfig(env, file)` is pure: the file defaults to empty, so tests pass only env. A backend whose variables are unset is *disabled*,
  not defaulted: `getEpisodeSource()` builds only what is configured and throws `ConfigError` if nothing is
  (routes answer 501 for that, 502 for real upstream failures). `isAllowedTranscriptUrl` is the SSRF guard.
- **Blocks** (`lib/block-config.ts`, client-safe): every API endpoint and link pattern is an editable Puck field.
  The defaults live only in `DEFAULT_ENDPOINTS` / `DEFAULT_LINKS`; render uses the *prop* through
  `safeUrl(prop, default)`, `expandTemplate("/episodes/{slug}", {...})` (null when a value is missing, so no
  `/episodes/undefined` links) and `withQuery(url, params)` (endpoint may already carry a `?`). A block works
  against any endpoint that returns the documented response shape (documented in a comment above each block).
- **Site identity** (`content/site.ts`): from `site.config.ts`, overridable by `NEXT_PUBLIC_SITE_NAME`, `_TAGLINE`,
  `_FEED_URL`, `_APPLE_PODCASTS_URL`, `_SITE_NAV` (JSON). `NEXT_PUBLIC_*` are baked at build time.
- **Form endpoints** (`lib/forms/endpoints.ts`): `formEndpoint("contact"|"newsletter")` = env override, else
  `site.config.ts`. Route tests mock `@/site.config` so the real endpoints don't leak into env-driven cases.
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
editor at `/p1`); nobody has looked at it in a browser. (Since then: header logo, 16:9 episode cards/detail and the native player were
checked in Chrome on a dev server; real audio playback and the show.fm embed's upgrade still were not.)

| Area | Where |
|---|---|
| Episode data (merge, filters, params) | `lib/episodes/`, `app/api/episodes/**` |
| Blog (headless WordPress REST). Cards link to `/blog/[slug]`, which renders the post body here (`loadPostBySlug`, sanitised with the show-notes allow-list: YouTube-only iframes); a slug WordPress doesn't have is a 404, an upstream failure is a 500, not a 404. Links inside a post body still point at the WordPress host. | `lib/posts.ts`, `app/api/posts`, `app/blog/[slug]`, `components/podcast/post-detail.tsx` |
| Transcripts (server-side VTT, SSRF-guarded) | `lib/transcript.ts`, `app/api/episodes/[slug]/transcript` |
| Guests (aggregated; host roles filtered in the block) | `lib/guests.ts`, `app/api/guests` |
| Newsletter (**501 until `NEWSLETTER_SECRET` is set; the endpoint is in `site.config.ts`**; the MailPoet endpoint exists in the WordPress repo, written from MailPoet's source but never run against a real signup) | `app/api/newsletter`, `docs/newsletter-mailpoet.md` |
| Contact form (**501 until `CONTACT_SECRET` is set; the endpoint is in `site.config.ts`**; the WordPress endpoint is a separate repo/branch; block never viewed in a browser) | `app/api/contact`, `components/puck/podcast/contact-form.tsx`, `docs/contact-wordpress.md` |
| Shared form-route helpers (capped body, rate limit keyed per form, upstream URL check, WP-host-only UA/bypass headers) | `lib/forms/` |
| Detail page | `app/episodes/[slug]`, `components/podcast/episode-detail.tsx` |
| Blocks | `components/puck/podcast/*` (13), client bodies in `components/podcast/*` |

Known gaps / decisions pending:
- The nav's `/blog`, `/about`, `/be-a-guest`, `/subscribe` need P1 pages (create them in the editor). `/blog/[slug]` is code
  (below), so a P1 page at `/blog` is the archive and each post renders on this site.
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
- **Search is planned, not built:** `docs/search-plan.md` (the site's ElasticPress autosuggest endpoint works server-side
  with the plugin's own query template and the episode ES documents include `transcript_content`; custom queries get 403).
- Not done, each needs an explicit go-ahead: P1 site, GitHub repo, Pantheon front-end site, secrets, deploy.
