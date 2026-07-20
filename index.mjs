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

// Every page the theme provides, relative to the `src/pages/[...lang]/` tree.
// Each is injected once at `/[...lang]/…`; its getStaticPaths enumerates the
// site's locales, emitting the default at the root and others under `/<code>/`.
const PAGES = [
  'index.astro',
  // Standalone top-level pages (the `pages` collection), e.g. an About/소개
  // page. A single dynamic route per locale renders every entry at `/<slug>/`.
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

/** `[...lang]/article/[...id].astro` → `/[...lang]/article/[...id]`,
 *  `[...lang]/index.astro` → `/[...lang]` */
/** @param {string} file */
function patternOf(file) {
  const p = file.replace(/\.astro$/, '').replace(/\/?index$/, '');
  return `/${p}`.replace(/\/$/, '') || '/';
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
        // Locales the site configured (astro.config `i18n`). Everything locale
        // aware derives from here — route injection, wikilink detection, and the
        // sitemap hreflang — so a site adds a language by editing its config, not
        // the theme. `locales` entries may be strings or `{ path }` objects.
        const rawLocales = config.i18n?.locales ?? ['en'];
        const locales = rawLocales.map((l) => (typeof l === 'string' ? l : l.path));
        const defaultLocale = config.i18n?.defaultLocale ?? locales[0];

        // A single physical page tree under `[...lang]/` serves every locale: the
        // default at the root, each other under `/<code>/`. Each page's
        // getStaticPaths enumerates the locales, so adding one needs no new files.
        for (const file of PAGES) {
          injectRoute({
            pattern: patternOf(`[...lang]/${file}`),
            entrypoint: `stack-site-builder/pages/[...lang]/${file}`,
          });
        }

        updateConfig({
          markdown: aasMarkdown({ glossary, locales, defaultLocale }),

          // Bind the dev server to 0.0.0.0 so it's reachable from a browser on
          // the host (outside the Docker container).
          server: { host: true },

          // hreflang alternates so search engines pair each page with its twin in
          // the other locales. Built from the site's configured locales (added
          // here rather than in the returned array, where `config` isn't known).
          integrations: [
            sitemap({
              i18n: {
                defaultLocale,
                locales: Object.fromEntries(locales.map((l) => [l, l])),
              },
            }),
          ],

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

  // The sitemap integration is added from the core hook's updateConfig (above),
  // where the site's configured locales are known.
  return [core, mdx()];
}
