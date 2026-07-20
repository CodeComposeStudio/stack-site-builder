# Changelog

All notable changes to this project are recorded in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

`stack-site-builder` is the Astro theme behind the awesome-\*-stack catalog
sites — it ships every route, component, style, the markdown pipeline and the
content schema, while a consuming site supplies only content, taxonomy data and
config. Sites track the theme with `pnpm up stack-site-builder`, so each release
here is a plain version bump they pull in.

## [1.12.0] - 2026-07-20

Locales are now **site-configurable**. The theme was wired to exactly two
languages (English at the root, Korean under `/ko/`, plus a hand-written `ko/`
copy of every route); a consuming site could not add a third. Now the theme
reads the locales from the site's own astro.config `i18n` and renders every
route for each of them from one source, so a site adds a language (e.g.
Japanese) by editing its config and data — no theme changes, no per-locale route
files. Existing en/ko sites are unaffected: the same URLs build, and the theme
still defaults to en/ko when a site declares nothing.

### Added

- **Site-configurable locales** — the header language switcher, route
  generation, date formatting, wikilink resolution and sitemap hreflang all
  derive from the site's configured locales. A site declares them in
  astro.config `i18n` (routing) and, optionally, `site.locales` in
  `src/data/site.ts` (display name + date format per locale); it supplies each
  extra locale's UI strings via `site.ui.<code>`, with any missing key falling
  back to the default locale. The playground ships a third locale (`ja`) to
  demonstrate the path.

### Changed

- **One route tree instead of a per-locale mirror** — the hand-maintained
  `src/pages/ko/` copy of every page is gone; all pages now live once under
  `src/pages/[...lang]/` and enumerate the site's locales in `getStaticPaths`.
  This is internal to the theme, but it is what makes adding a locale free.
- **`Lang` is now `string`** (was the `'en' | 'ko'` union) since locales are no
  longer fixed at build time. Locale-keyed maps (`pricingLabels`, category
  labels, …) resolve through helpers that fall back to the default locale rather
  than assuming a key exists.

## [1.11.0] - 2026-07-20

The center of this release is **standalone pages**: a site can now add a
first-class top-level section — an About/소개 page, contact, terms — that is
just one Markdown file, rendered on its own and linked from the header
navigation, without the listing and taxonomy of the catalog collections.
Alongside it, the header collapses into a menu on phones, the language switcher
becomes a globe icon, and two rendering bugs on the new pages are fixed.

### Added

- **Standalone `pages` collection** — author a top-level page as one MDX file
  (`src/content/pages/{en,ko}/<slug>.mdx`); the theme renders it at `/<slug>/`
  in both locales. Frontmatter drives a hero image, description, and header-nav
  placement (`nav`, `navLabel`, `order`, `draft`). Ships the `PageDetail`
  component, the `getPages` / `getNavPages` / `pageSlugOf` helpers, and a
  per-locale route injected by the integration.
- **Mobile navigation menu** — below the `sm` breakpoint the section links
  collapse into a labelled dropdown menu (hamburger), so a phone header stays to
  a few controls instead of a long icon run. The icon row (≥`sm`) and the menu
  render from one `navItems` source, so they never drift, and nav pages appear
  in both automatically.

### Changed

- **Globe icon for the language switcher** — the switcher shows a globe instead
  of the locale code/name, and the dropdown chevrons are removed from both the
  language and theme switchers, leaving a single clean control each. Adds
  `nav.language` and `nav.menu` UI strings (en/ko).

### Fixed

- **In-locale wikilinks on standalone pages** — wikilink targets were emitted as
  `../../glossary/` (and `../../stack/…`, etc.), which assumes the source sits
  two levels deep within its locale, true for the collection detail routes
  (`/ko/stack/<slug>/`) but not for a one-deep standalone page (`/ko/about/`).
  The extra `../` overshot the locale prefix and linked to the default-locale
  glossary; the depth is now derived from where the source actually sits.
- **In-body images no longer force horizontal scroll** — content images had no
  width cap and Astro's `<Image>` emits intrinsic `width`/`height`, so an image
  wider than the viewport (e.g. a screenshot on a phone) stretched the body and
  scrolled the whole page sideways. `.prose img` is now capped to
  `max-width: 100%; height: auto`.

## [1.10.0] - 2026-07-20

First public release. The rendering engine of
[awesome-ai-stack](https://github.com/codecompose7/awesome-ai-stack) — routes,
components, styles, the markdown pipeline and the content schema — extracted
into a reusable, MIT-licensed Astro theme so the same engine can drive other
catalog sites from a thin content-only repository.

### Added

- **The awesome-\*-stack theme** — an integration that injects every route
  (catalog, concepts, articles, slides, samples, glossary, tags, vendors, in
  en/ko), the components and styles, the shared markdown pipeline
  (`[[wikilink]]` glossary, slides, mermaid), and the content schema via
  `defineAasCollections`. A consuming site provides content, taxonomy data
  (`categories`, `glossary`, `site`) and config.
- **Standalone development setup** — a devcontainer and a minimal `playground/`
  consuming site for developing and previewing the theme on its own.

[1.12.0]: https://github.com/CodeCompose7/stack-site-builder/compare/v1.11.0...v1.12.0
[1.11.0]: https://github.com/CodeCompose7/stack-site-builder/compare/v1.10.0...v1.11.0
[1.10.0]: https://github.com/CodeCompose7/stack-site-builder/releases/tag/v1.10.0
