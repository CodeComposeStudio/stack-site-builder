# stack-site-builder

> 한국어: [docs/readme.ko.md](docs/readme.ko.md)

An [Astro](https://astro.build) theme for curated "awesome stack" catalog
sites — a tool catalog with per-entry detail pages, concepts, articles,
presentation slides, runnable samples, a `[[wikilink]]` glossary, and full
en/ko i18n. The site that grew it: [awesome-ai-stack](https://github.com/codecompose7/awesome-ai-stack).

A consuming site provides only content and data; the theme provides every
route, component, style and the markdown pipeline.

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import aasTheme from 'stack-site-builder';
import { glossary } from './src/data/glossary.mjs';

export default defineConfig({
  site: 'https://example.github.io',
  base: '/my-stack',
  i18n: { locales: ['en', 'ko'], defaultLocale: 'en', routing: { prefixDefaultLocale: false } },
  integrations: [aasTheme({ glossary })],
});
```

```ts
// src/content.config.ts
import { defineAasCollections } from 'stack-site-builder/content';
import { categoryMap } from './data/categories';

export const collections = defineAasCollections({ categoryMap });
```

## What a site supplies

| Where | What |
| --- | --- |
| `src/data/site.ts` | Site identity: name, repo URL (`repoNav: false` hides the header's GitHub link), the `locales` it ships, optional `sections` toggles, browser icons (`icons: { favicon, appleTouch, manifest }`), the `home` template, per-locale UI string overrides |
| `src/data/categories.ts` | The tool-catalog category tree (validated against content) |
| `src/data/concept-categories.ts` · `article-categories.ts` · `course-categories.ts` · `product-categories.ts` · `paper-categories.ts` (opt-in) | Taxonomies for concepts / articles / courses / products / papers |
| `src/data/glossary.mjs` | `[[Term]]` wikilink targets |
| `src/content/{stacks,concepts,courses,products,papers,articles,slides}/` | The content, one MDX file per locale |
| `src/content/pages/` | Standalone top-level pages (e.g. an About/소개), rendered at `/<slug>/` and optionally linked in the header nav |
| `public/` · `samples/` | Logos/favicons and runnable sample projects |
| `src/components/Footer.astro` (optional) | Replaces the theme's stock footer wholesale — receives a `lang` prop |

The theme reaches the site's data through the `@aas-data/*` alias (set up by
the integration), so everything above is swappable per site.

## Locales

The theme defaults to English (at the root) and Korean (under `/ko/`), but the
locale set is the site's to choose — it renders every route for each configured
locale from one source. To add a language (say Japanese):

1. List it in astro.config `i18n.locales` (this drives routing):
   `i18n: { locales: ['en', 'ko', 'ja'], defaultLocale: 'en', routing: { prefixDefaultLocale: false } }`.
   The first/`defaultLocale` is served at the root; the others under `/<code>/`.
2. Add it to `locales` in `src/data/site.ts` — `{ code, label, dateLocale? }` —
   so it appears (named) in the language switcher and formats dates correctly.
3. Supply its UI strings in `src/data/site.ts` under `site.ui.<code>`; any key
   you omit falls back to the default locale. Add the `<code>` translations to
   your content (`src/content/<collection>/<code>/…`), glossary and category
   labels the same way you did for the built-in locales.

No theme files change — adding a locale is entirely site config and content.

## Sections

The core catalog (home, tool detail, categories, tags, vendors) is always on.
The rest are opt-out — **concepts, articles, samples, slides, glossary** and the
standalone **pages** collection (About/소개, …) — so a site can ship only what it
needs. Turning one off removes both its routes and its header-nav item. (`pages`
also has finer control: each page's `nav` / `draft` frontmatter, or simply not
authoring it.) **courses**, **products** and **papers** are the opt-IN sections — see below.

Declare the toggles once in `src/data/site.ts` and forward them to the theme in
astro.config (which needs them to skip route injection). Import `SectionKey` from
the theme so `satisfies` lists the valid keys as you type:

```ts
// src/data/site.ts
import type { SectionKey } from 'stack-site-builder';
export const site = {
  /* … */
  sections: { slides: false } satisfies Partial<Record<SectionKey, boolean>>,
};
```

```js
// astro.config.mjs
import { site } from './src/data/site';
integrations: [aasTheme({ glossary, sections: site.sections })];
```

## Courses (opt-in)

A course section for sites that teach: cards with difficulty stars and
duration, cohort ordering, category browse pages, and paid courses gated by
the same private-content machinery. It stays off until a site opts in, because
it needs site data:

1. `sections: { courses: true }` in `src/data/site.ts` (forwarded to
   `aasTheme` as above).
2. `src/data/course-categories.ts` exporting `courseTree` / `courseCatOf`
   (copy `playground/src/data/course-categories.ts` and edit the tree).
3. Optionally pass the map to
   `defineAasCollections({ categoryMap, courseCategoryMap })` so course
   category ids are validated at build time.

Then author `src/content/courses/<lang>/<slug>.mdx`:

```yaml
title: Getting Started with AI Agents
description: A hands-on introduction.
date: 2026-06-01
category: ai-basics # id from course-categories.ts
level: 2 # difficulty 1–5, shown as stars
hours: "1:30" # duration, shown verbatim
order: "2601-01" # manual sort key, highest first (optional)
slides: [deck-id] # decks in the slides collection (optional)
private: true # paid course — body ships encrypted
teaser: A public one-liner for the login gate.
```

Routes mirror concepts: `/course/`, `/course/<slug>/`, `/course/category/<id>/`.

## Products (opt-in)

The `products` collection is the "what we offer" umbrella — entries grouped
by a site-side mini-taxonomy (apps, services, education, …) on the
`/products/` index. Each entry is either a Things-style marketing landing
(`template: 'landing'`: hero with store buttons and an optional Product Hunt
badge, alternating feature rows with device-frame screenshots and
auto-rotating carousels, a video themes showcase, a highlights grid, pricing
tiers, a closing CTA and legal links — media are `public/` paths) or a plain
prose page (a service pitch, a legal subpage). Entries nest:
`products/<lang>/flowstate.mdx` → `/products/flowstate/`, and
`products/<lang>/flowstate/privacy.mdx` → `/products/flowstate/privacy/`.
The header gains a Products link automatically once a locale has a product;
`nav: true` additionally gives an entry its own header item.

Enable with `sections: { products: true }` plus
`src/data/product-categories.ts` (exporting `productTree` / `productCatOf` —
copy the playground's), and optionally pass `productCategoryMap` to
`defineAasCollections` for build-time category validation. See
`playground/src/content/products/` for a complete example.

## Homepage

The default home is the stack catalog. A site that isn't a catalog can swap in
a data-driven home from `src/data/site.ts`:

```ts
home: {
  template: 'cards',
  hero: { icon: '/img/logo.png', subtitle: { ko: '…', en: '…' } },
  cardsTitle: { ko: '앱', en: 'Apps' },
  cards: [{ href: '/products/flowstate/', name: 'FlowState', icon: '/img/icon.png',
            rounded: true, description: { ko: '…', en: '…' }, tags: ['iOS'] }],
  cta: { title: { … }, description: { … }, button: { label: { … }, href: '/course/' } },
},
```

Localized values are either one string or a per-locale record with
default-locale fallback. On a cards home the header's Browse link (which
anchors into the catalog) hides itself.

## Papers (opt-in)

A reading room for the literature behind the stack: each entry is one paper
with its full author list, venue/year, arXiv / publisher / code links and an
open-source availability badge; the body is your reading of it. `tools`
cross-links catalog stacks. Enable with `sections: { papers: true }` plus
`src/data/paper-categories.ts` (exporting `paperTree` / `paperCatOf`), and
optionally pass `paperCategoryMap` to `defineAasCollections`. Routes mirror
concepts: `/paper/`, `/paper/<id>/`, `/paper/category/<id>/`.

## Body components

Reusable MDX-body components, importable from any collection's content:
`Bookmark` (link-preview card), `Embed` (responsive iframe for demos/videos —
`ratio`, `height`, `sandbox`), `Lead` (intro paragraph).

```mdx
import Bookmark from 'stack-site-builder/components/Bookmark.astro';

<Bookmark url="https://…" title="…" description="…" />
```

## RSS

The articles collection feeds `/rss.xml` (default locale) and
`/<code>/rss.xml`, advertised with `<link rel="alternate">`. Drafts and
private entries stay out (mirroring the sitemap); the feed is injected only
while the `articles` section is on.

## Private content

Any entry (tools, concepts, articles, slides, pages) can require login:

```yaml
private: true
teaser: A public one-liner shown on cards and above the login form. # optional
```

The body ships **encrypted** (AES-256-GCM, key wrapped per user with PBKDF2) and
is decrypted in the browser after login — no server needed, works on any static
host. By default a private entry stays OUT of index listings (reachable via
direct links and the related sections on detail pages); set `listed: true` to
show it as a locked teaser card (title + 🔒 + teaser). Private URLs get
`noindex` and stay out of the sitemap. Users and keys come from env vars (see
`playground/.env.sample`): `AAS_PRIVATE_USERS` (`id:password,…`),
`AAS_PRIVATE_MASTER_SECRET` (rotate it to log every device out) and
`AAS_PRIVATE_SESSION_DAYS`. Set them in `.env` locally or as CI secrets.

Two rules: the **source repo must be private** (the `.mdx` files are plaintext —
only the built output is encrypted), and when you remove a user, also rotate the
master secret. Full design: `docs/private-content-design.md`.

## Deploying (and where the secrets live)

Encryption happens wherever `astro build` runs, reading `process.env` — the
values just come from a different place per environment:

| Where you build | Where the `AAS_PRIVATE_*` values live |
| --- | --- |
| Your machine (`pnpm build`, `firebase deploy`) | `.env` file (gitignored — copy `.env.sample`) |
| GitHub Actions (deploy on push) | **Repository secrets**: Settings → Secrets and variables → Actions |

`.env` never reaches GitHub; in CI the workflow maps repository secrets to env
vars on the build step:

```yaml
- name: Build
  run: pnpm install && pnpm build # encryption happens here
  env:
    AAS_PRIVATE_USERS: ${{ secrets.AAS_PRIVATE_USERS }}
    AAS_PRIVATE_MASTER_SECRET: ${{ secrets.AAS_PRIVATE_MASTER_SECRET }}
    AAS_PRIVATE_SESSION_DAYS: '30'
```

A complete GitHub Pages workflow a site can copy is in
[`playground/.github/workflows/deploy.yml`](playground/.github/workflows/deploy.yml)
(inert inside the playground — workflows only run from a repo's root
`.github/`). Managing users/keys then never touches git: edit the secrets and
re-run the workflow. Sites without private content need none of this.
