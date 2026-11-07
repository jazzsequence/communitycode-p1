# Community + Code design system

Source of truth in code: `app/podcast.css` (tokens), `app/layout-contract.css` (P1 kit overrides).
Live reference: `npm run storybook` (http://localhost:6006), where the Colors page computes the
contrast table from the live tokens.

## Direction

A dark theme that keeps the live site's character and replaces its palette.

| From the live site (kept) | Replaced |
|---|---|
| Victor Mono headings and code, Source Sans 3 body | Solarized (`#002B36` base, teal / blue / orange / magenta accents) |
| Links that reveal on intent (transparent underline, dotted on hover/focus, 0.2s) | The repo's earlier "midnight broadcast" blue-black + amber, Fraunces + Inter |
| Dark ground, monospace terminal feel | |

Not carried over, deliberately: uppercase letter-spaced section headings, and the flat 4px radii with
left accent bars. Cards keep 12px radii and buttons stay pills. (Blockquotes in prose get a neutral left
rule, not an accent bar.)

## Palette: warm graphite + apricot

| Token | Value | Use |
|---|---|---|
| `--cc-bg` | `#1c1a19` | Page ground |
| `--cc-surface` | `#262321` | Cards, fields, header |
| `--cc-surface-2` | `#2f2b29` | Raised: buttons, pills, avatars |
| `--cc-border` | `#413c38` | Decorative dividers only |
| `--cc-border-strong` | `#857c72` | Control boundaries (>= 3:1) |
| `--cc-text` | `#e5dfd6` | Body, headings |
| `--cc-muted` | `#c2baaf` | Secondary text |
| `--cc-accent` / `-hover` / `-ink` | `#e6ae7a` / `#eebf93` / `#1c1a19` | Primary action, eyebrow, current page |
| `--cc-link` | `#9cbfd6` | Links |
| `--cc-danger` | `#eda79e` | Errors |

### Why these numbers (astigmatism)

Astigmatism blurs light unevenly, so bright text on a dark ground blooms ("halation"). The mitigations
that recur across the guidance, and what we did:

- **No pure black ground, no pure white text.** Ground is `#1c1a19`, text `#e5dfd6`.
- **Cap text contrast, do not maximise it.** Body text is WCAG 13.1:1 / APCA Lc -86. The APCA/W3C
  dark-mode discussion treats roughly Lc 85-90 as the working ceiling and says it is still under
  evaluation. **Do not brighten `--cc-text` to chase a bigger ratio.**
- **Near-neutral surfaces, desaturated accents.** Surfaces are warm greys (chroma is minimal) and the
  accents are pulled back ~15%, since saturated colour on dark vibrates.
- **Secondary text still has to read.** WCAG alone would pass much dimmer greys; APCA does not. Muted text
  and errors are held at Lc >= 60 on every surface they sit on (the Colors story checks 14 pairs and
  fails the build visually if one drops).
- **Control boundaries are 3:1** (`--cc-border-strong`, WCAG 1.4.11). `--cc-border` is for decoration only.

Evidence caveat: most of this guidance is practitioner and vendor writing; controlled studies are thin and
the APCA thresholds are not final. Treat the numbers as a defensible starting point, not a standard.
Sources: [APCA / W3C dark-mode discussion](https://www.github.com/Myndex/SAPC-APCA/discussions/111),
[Level Access: astigmatism](https://www.levelaccess.com/blog/accessibility-for-people-with-astigmatism/),
[Trimble Modus: dark mode](https://modus.trimble.com/foundations/dark-mode).

Links in running text are the one place the live site's pattern is bent: link colour against body colour is
only ~1.4:1, so colour cannot carry a link (WCAG 1.4.1). Prose links keep a persistent dotted underline that
goes solid on hover; UI links (nav, cards, footer) use the live site's underline-on-intent.

## Spacing and layout

One 8pt-based scale, `--cc-space-1` to `-9` (4, 8, 12, 16, 24, 32, 48, 64, 96px). Nothing should hold a raw
`rem`/`px` margin or padding.

### The layout contract

Three numbers place all content on the page, and every top-level block (podcast and P1 kit) obeys them:

| Token | Mobile | >= 40rem | >= 64rem |
|---|---|---|---|
| `--cc-gutter` (side inset) | 16px | 24px | 40px |
| `--cc-section-y` (hero, archive, CTA, FAQ, ...) | 48px | 64px | 96px |
| `--cc-block-y` (heading, paragraph, button, ...) | 12px | 16px | 16px |

Content is capped at `--cc-content` (72rem) or `--cc-narrow` (48rem), measured **excluding** the gutter.
Two adjacent sections sit `2 x section-y` apart; two small blocks `2 x block-y`. A block nested in Columns or
Container adds no gutter of its own.

### Why the margins used to drift

Two spacing systems ran side by side, and the P1 kit had no system at all. The podcast blocks used a fixed
1.5rem gutter and 3rem sections; the kit's `.p1-block` used 4rem (1.5rem under 48rem), `columns` and
`callout` 1.5rem, `hero` 1.5 / 2.5 / 4rem, and each capped width in a different element (kit "wide" was
80rem, podcast 72rem). Blocks inside Columns/Container stacked a second gutter on the parent's. A heading and
an episode list therefore never shared a left edge.

The kit's blocks are registry-owned (`npx shadcn add @p1/...` overwrites them), so they are **not edited**:
`app/layout-contract.css` overrides them once, with doubled `.cc-root.cc-root` selectors in place of
`!important`. If a kit block shows a stray margin, fix it there, not in the block.

## Storybook

`npm run storybook` (port 6006). Stories render the real components against `app/styles.css`, inside
`.cc-root`, with the network mocked (`stories/_helpers/mock-api.tsx`, `fixtures.ts`). Toolbar **Layout
guides** draws the two content edges: every top-level block's text must touch them (narrow blocks are
centered by design). `stories/kit/PageComposition.stories.tsx` stacks kit and podcast blocks to prove it.

Layout: `stories/foundations` (tokens), `stories/blocks` (13 podcast blocks), `stories/kit` (P1 kit).
