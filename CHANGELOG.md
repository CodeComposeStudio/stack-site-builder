# Changelog

All notable changes to this project are recorded in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

`stack-site-builder` is the Astro theme behind the awesome-\*-stack catalog
sites — it ships every route, component, style, the markdown pipeline and the
content schema, while a consuming site supplies only content, taxonomy data and
config. Sites track the theme with `pnpm up stack-site-builder`, so each release
here is a plain version bump they pull in.

## [1.17.1] - 2026-07-22

### Fixed

- **Mermaid never rendered on npm-consuming sites' dev server** — the loader
  imported the package default (`mermaid.core.mjs`), whose bare CJS
  dependencies (dayjs, …) are served without interop when the import chain
  starts inside `node_modules`, killing the whole loader module with a
  SyntaxError. It now imports the self-contained
  `mermaid/dist/mermaid.esm.min.mjs` bundle, which loads identically in dev
  and build. (The theme's own playground never hit this — its workspace
  symlink resolves outside `node_modules`, so Vite prebundled mermaid.)

- **Course → slide-deck links matched nothing** — a course's `slides`
  frontmatter lists locale-less deck slugs, but the detail page compared
  them against raw collection ids (`ko/<deck>/index`), so the chips never
  rendered and would have linked to the wrong path. Decks are now resolved
  per locale via the slides helpers.

## [1.17.0] - 2026-07-22

### Changed

- **`apps` → `products` (breaking for 1.16.0 `apps` users)** — the day-old
  apps section is renamed and generalized before real adoption: "apps" was
  too narrow an umbrella for what a studio offers, so the section is now
  **products** with a site-side mini-taxonomy (apps, services, education, …).
  Content moves to `src/content/products/`, routes to `/products/…`, the
  section key becomes `products` and — because the index needs
  `src/data/product-categories.ts` (exporting `productTree` /
  `productCatOf`) — it is now opt-IN (`sections: { products: true }`).
  Schemas gain an optional `category` (validated via the optional
  `productCategoryMap` argument to `defineAasCollections`); the landing/page
  templates, nested subpages and automatic header link carry over unchanged
  as `ProductLanding` / `ProductsIndex`.

### Added

- **Products index + header link** — `/products/` lists the top-level
  products (icon, name, subtitle, description) grouped by the site's
  category tree, and the header gains a Products link automatically once a
  locale has at least one product. Per-product header links (`nav: true`)
  still work for sites that prefer direct items.
- **Configurable browser icons** — `site.icons = { favicon, appleTouch,
  manifest }` in site.ts; `favicon` may be SVG, PNG or ICO (type inferred
  from the extension) so a site can keep its existing logo as the tab icon.
  Defaults to the theme's `/favicon.svg`.
- **Hideable GitHub link** — `repoNav: false` in site.ts removes the
  header's GitHub item (for private-repo sites); it also disappears when no
  `repoUrl` is declared.

### Fixed

- **Cards home links lost the locale** — card and CTA hrefs on the cards
  home are written locale-less ("/apps/foo/") and now get the current
  locale's prefix at render, so the `/en/` home links to `/en/…` pages
  instead of the default locale's.

## [1.16.0] - 2026-07-22

### Added

- **`apps` collection — product landings** — Things-style marketing pages
  driven entirely by frontmatter (`template: 'landing'`): hero with app icon,
  App Store / Google Play buttons (`"#"` renders disabled with a
  "coming soon" label) and a Product Hunt badge; alternating feature rows
  with optional device-frame screenshots and auto-rotating carousels; a
  video "themes" showcase with tab switching; a highlights grid; pricing
  tiers with a featured ribbon; a closing CTA; and legal links. Entries may
  nest — `apps/<lang>/<slug>/privacy.mdx` renders at
  `/apps/<slug>/privacy/` as a plain prose page (`template: 'page'`) — via
  one catch-all route. Landing media (icons, screenshots, videos, frame art)
  are `public/` paths. `nav: true` puts a landing in the header nav. The
  section is on by default; an empty collection builds zero pages.
- **Data-driven "cards" home** — a site that isn't a catalog can declare
  `home: { template: 'cards', hero, cards, cta }` in `src/data/site.ts` and
  get a hero + wide-card grid + CTA homepage instead of the stack catalog.
  Localized strings use per-locale records (`{ ko: '…', en: '…' }`) with
  default-locale fallback, like category labels. On a cards home the
  header's catalog-anchored Browse link hides itself; the catalog routes
  still build (empty without stacks).

## [1.15.0] - 2026-07-22

### Added

- **`courses` collection** — an opt-in section (`sections: { courses: true }`)
  for sites that teach rather than catalog: course cards with difficulty stars
  (`level` 1–5, localized labels), duration (`hours`), a manual sort key
  (`order`, highest first — e.g. `"2601-01"` cohort keys), a `type` tag, linked
  slide decks (`slides`), related courses, and the usual draft/private/teaser
  flags. Routes mirror concepts (`/course/`, `/course/<id>/`,
  `/course/category/<id>/`); an enabling site adds
  `src/data/course-categories.ts` (exporting `courseTree` / `courseCatOf`) and
  may pass `courseCategoryMap` to `defineAasCollections` for build-time
  category validation. Because the section needs that site data, it stays off
  until a site explicitly opts in — a theme upgrade alone changes nothing.
- **Body components** — `Bookmark` (link-preview card), `Embed` (responsive
  iframe wrapper for demos/videos, with `ratio`/`height`/`sandbox`), and
  `Lead` (intro paragraph), importable from
  `stack-site-builder/components/*` in any MDX body.
- **RSS feed** — a per-locale feed of the articles collection at `/rss.xml`
  (default locale) and `/<code>/rss.xml`, injected with the `articles` section
  and advertised via `<link rel="alternate">`. Drafts and private entries stay
  out, mirroring the sitemap.

## [1.14.0] - 2026-07-21

### Added

- **Private (login-gated) content** — mark any entry in any collection
  (stacks, concepts, articles, slides, pages) with `private: true`. The
  rendered body ships AES-256-GCM-encrypted and is decrypted in the browser
  after login, so it works on any static host with no server; the users
  (`AAS_PRIVATE_USERS`, `id:password` pairs) and the master secret
  (`AAS_PRIVATE_MASTER_SECRET` — rotate to force every device to log in again)
  come from env vars, with sessions cached per device for
  `AAS_PRIVATE_SESSION_DAYS` (default 30). Listings show only the title + 🔒
  plus an optional public `teaser`; private pages are `noindex` and excluded
  from the sitemap; the client re-initializes embedded behaviors (TOC,
  mermaid, tabs, copy buttons, the slide deck engine) after decryption. The
  source repo must be private — `.mdx` files stay plaintext; see
  docs/private-content-design.md.

## [1.13.0] - 2026-07-20

### Added

- **Optional sections** — a site can turn off any of the secondary sections
  (concepts, articles, samples, slides, glossary, and the standalone `pages`
  collection); the core catalog stays on. Disabling one removes both its routes
  and its header-nav item. Declare `sections` in `src/data/site.ts` (hides the
  nav item) and forward it to `aasTheme({ sections })` in astro.config (skips the
  routes); the key type (`SectionKey`) is exported from the theme, so
  `satisfies Partial<Record<SectionKey, boolean>>` gives autocomplete of the
  valid keys. The playground drops `slides` to demonstrate.

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

[1.17.1]: https://github.com/CodeCompose7/stack-site-builder/compare/v1.17.0...v1.17.1
[1.17.0]: https://github.com/CodeCompose7/stack-site-builder/compare/v1.16.0...v1.17.0
[1.16.0]: https://github.com/CodeCompose7/stack-site-builder/compare/v1.15.0...v1.16.0
[1.15.0]: https://github.com/CodeCompose7/stack-site-builder/compare/v1.14.0...v1.15.0
[1.14.0]: https://github.com/CodeCompose7/stack-site-builder/compare/v1.13.0...v1.14.0
[1.13.0]: https://github.com/CodeCompose7/stack-site-builder/compare/v1.12.0...v1.13.0
[1.12.0]: https://github.com/CodeCompose7/stack-site-builder/compare/v1.11.0...v1.12.0
[1.11.0]: https://github.com/CodeCompose7/stack-site-builder/compare/v1.10.0...v1.11.0
[1.10.0]: https://github.com/CodeCompose7/stack-site-builder/releases/tag/v1.10.0
