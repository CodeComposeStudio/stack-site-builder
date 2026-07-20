// @ts-check
// The awesome-*-stack theme. A site's astro.config.mjs stays tiny:
//
//   import aasTheme from 'stack-site-builder';
//   import { glossary } from './src/data/glossary.mjs';
//   export default defineConfig({
//     site: '…', base: '/…', i18n: { … },
//     integrations: [aasTheme({ glossary })],
//   });
//
// The theme injects every route (catalog, concepts, articles, samples, slides,
// glossary, tags, vendors — in both locales), wires the shared markdown
// pipeline, tailwind, and the dev-only local-samples middleware, and aliases
// `@aas-data/*` / `@assets/*` to the SITE's `src/data` / `src/assets` so core
// components resolve per-site taxonomy (categories, glossary, site identity)
// at build time.
import { fileURLToPath } from 'node:url';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { aasMarkdown } from './markdown.mjs';
import { localSamples } from './dev/local-samples.mjs';

// Every page the theme provides, as `src/pages/`-relative entrypoints. The
// same tree is served at `/` (en) and under `/ko/` (physical mirrors, matching
// prefixDefaultLocale: false).
const PAGES = [
  'index.astro',
  // Standalone top-level pages (the `pages` collection), e.g. an About/소개
  // page. A single dynamic route per locale renders every entry at `/<slug>/`;
  // static routes above (glossary, etc.) still win over it by specificity.
  '[page].astro',
  'article/index.astro',
  'article/[...id].astro',
  'article/category/[id].astro',
  'categories/[id].astro',
  'concept/index.astro',
  'concept/[...id].astro',
  'concept/category/[id].astro',
  'glossary.astro',
  'sample/index.astro',
  'sample/[folder].astro',
  'slides/index.astro',
  'slides/[deck].astro',
  'stack/[...id].astro',
  'tags/[tag].astro',
  'vendors/[vendor].astro',
];

/** `article/[...id].astro` → `/article/[...id]`, `index.astro` → `/` */
/** @param {string} file @param {string} prefix */
function patternOf(file, prefix) {
  const p = file.replace(/\.astro$/, '').replace(/\/?index$/, '');
  const full = `/${prefix}${p}`.replace(/\/$/, '');
  return full || '/';
}

/**
 * @param {object} opts
 * @param {Record<string, any>} opts.glossary — the site's glossary
 *   (`src/data/glossary.mjs`), used by `[[wikilink]]` resolution.
 * @returns {import('astro').AstroIntegration[]}
 */
export default function aasTheme({ glossary }) {
  /** @type {import('astro').AstroIntegration} */
  const core = {
    name: 'stack-site-builder',
    hooks: {
      'astro:config:setup': ({ config, injectRoute, updateConfig }) => {
        for (const prefix of ['', 'ko/']) {
          for (const file of PAGES) {
            const entry = prefix === '' ? file : `ko/${file}`;
            injectRoute({
              pattern: patternOf(file, prefix),
              entrypoint: `stack-site-builder/pages/${entry}`,
            });
          }
        }

        updateConfig({
          markdown: aasMarkdown({ glossary }),

          // Bind the dev server to 0.0.0.0 so it's reachable from a browser on
          // the host (outside the Docker container).
          server: { host: true },

          vite: {
            plugins: [tailwindcss(), localSamples()],

            // Core code reaches the SITE's data and assets through these
            // aliases: `@aas-data/…` → `<site>/src/data/…` (taxonomy, glossary,
            // site identity), `@assets/…` → `<site>/src/assets/…` (in-body
            // images without long relative paths).
            resolve: {
              alias: {
                '@aas-data': fileURLToPath(new URL('./src/data', config.root)),
                '@assets': fileURLToPath(new URL('./src/assets', config.root)),
              },
            },

            // Developed inside Docker bind-mount devcontainers, where native
            // inotify is unreliable (phantom "config changed" events tear down
            // Vite's module runner). Polling avoids that.
            server: {
              watch: {
                usePolling: true,
                interval: 100,
              },
            },
          },
        });
      },
    },
  };

  return [
    core,
    mdx(),
    // i18n option emits hreflang alternates so search engines associate each
    // page with its twin in the other locale (/stack/x/ ↔ /ko/stack/x/).
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', ko: 'ko' },
      },
    }),
  ];
}
