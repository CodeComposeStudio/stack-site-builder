# stack-site-builder

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
| `src/data/site.ts` | Site identity: name, repo URL, the `locales` it ships, optional `sections` toggles, per-locale UI string overrides |
| `src/data/categories.ts` | The tool-catalog category tree (validated against content) |
| `src/data/concept-categories.ts` · `article-categories.ts` | Taxonomies for concepts / articles |
| `src/data/glossary.mjs` | `[[Term]]` wikilink targets |
| `src/content/{stacks,concepts,articles,slides}/` | The content, one MDX file per locale |
| `src/content/pages/` | Standalone top-level pages (e.g. an About/소개), rendered at `/<slug>/` and optionally linked in the header nav |
| `public/` · `samples/` | Logos/favicons and runnable sample projects |

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
authoring it.)

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
