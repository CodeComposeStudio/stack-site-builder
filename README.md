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
| `src/data/site.ts` | Site identity: name, repo URL, per-locale UI string overrides |
| `src/data/categories.ts` | The tool-catalog category tree (validated against content) |
| `src/data/concept-categories.ts` · `article-categories.ts` | Taxonomies for concepts / articles |
| `src/data/glossary.mjs` | `[[Term]]` wikilink targets |
| `src/content/{stacks,concepts,articles,slides}/` | The content, one MDX file per locale |
| `public/` · `samples/` | Logos/favicons and runnable sample projects |

The theme reaches the site's data through the `@aas-data/*` alias (set up by
the integration), so everything above is swappable per site.
