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
import { existsSync } from 'node:fs';
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
  // Product pages (the `products` collection): a category-grouped index, plus
  // the landings/pages and their nested subpages (privacy/terms) via one
  // catch-all.
  'products/index.astro',
  'products/[...id].astro',
  // Per-locale RSS feed of the articles collection (an endpoint, not a page).
  'rss.xml.ts',
  'article/index.astro',
  'article/[...id].astro',
  'article/category/[id].astro',
  'categories/[id].astro',
  'concept/index.astro',
  'concept/[...id].astro',
  'concept/category/[id].astro',
  'course/index.astro',
  'paper/index.astro',
  'paper/[...id].astro',
  'paper/category/[id].astro',
  'course/[...id].astro',
  'course/category/[id].astro',
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
 *  `[...lang]/index.astro` → `/[...lang]`,
 *  `[...lang]/rss.xml.ts` → `/[...lang]/rss.xml` (endpoints keep their name). */
/** @param {string} file */
function patternOf(file) {
  const p = file.replace(/\.(astro|ts)$/, '').replace(/\/?index$/, '');
  return `/${p}`.replace(/\/$/, '') || '/';
}

// Which optional section each page belongs to (null = always-on core route).
// Mirrors SectionKey in src/lib/sections.ts.
/** @param {string} file @returns {string | null} */
function sectionOf(file) {
  if (file.startsWith('concept/')) return 'concepts';
  if (file.startsWith('article/')) return 'articles';
  if (file.startsWith('course/')) return 'courses';
  if (file.startsWith('paper/')) return 'papers';
  if (file.startsWith('products/')) return 'products';
  if (file.startsWith('sample/')) return 'samples';
  if (file.startsWith('slides/')) return 'slides';
  if (file === 'glossary.astro') return 'glossary';
  if (file === '[page].astro') return 'pages';
  if (file === 'rss.xml.ts') return 'articles'; // the feed is the blog's
  return null;
}

// Sections that are opt-IN rather than opt-out: their routes are injected only
// when the site passes `{ <key>: true }`. Both need site-side data
// (src/data/{course,product}-categories.ts), so a theme upgrade alone must
// not enable them.
const OPT_IN_SECTIONS = new Set(['courses', 'products', 'papers']);

/**
 * @param {object} opts
 * @param {Record<string, any>} opts.glossary — the site's glossary
 *   (`src/data/glossary.mjs`), used by `[[wikilink]]` resolution.
 * @param {Partial<Record<string, boolean>>} [opts.sections] — optional-section
 *   toggles (`{ slides: false }`); a disabled section's routes are not injected.
 *   `courses` is opt-IN (`{ courses: true }`) — it needs site-side course data.
 *   Keep it in sync with `src/data/site.ts` `sections` (which hides the nav item).
 * @returns {import('astro').AstroIntegration[]}
 */
export default function aasTheme({ glossary, sections = {} }) {
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
        // Skip a page whose optional section the site turned off (`{ slides: false }`).
        for (const file of PAGES) {
          const section = sectionOf(file);
          if (section && sections[section] === false) continue;
          if (section && OPT_IN_SECTIONS.has(section) && sections[section] !== true) continue;
          injectRoute({
            pattern: patternOf(`[...lang]/${file}`),
            entrypoint: `stack-site-builder/pages/[...lang]/${file}`,
          });
        }

        // Global (locale-less) login user table for the header login control —
        // `{ enabled: false }` on sites without private-content env config.
        injectRoute({
          pattern: '/aas-auth.json',
          entrypoint: 'stack-site-builder/pages/aas-auth.json.ts',
        });

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
              // Private entries stay out of the sitemap. PrivateGate records each
              // private pathname (via globalThis — it lives in a different module
              // graph) while pages render; @astrojs/sitemap runs this after.
              filter: (page) => {
                const paths = globalThis.__aasPrivatePaths;
                if (!paths) return true;
                const p = new URL(page).pathname.replace(/\/?$/, '/');
                return !paths.has(p);
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
                // Footers are site identity, not theme chrome: when the site
                // ships `src/components/Footer.astro`, BaseLayout renders it
                // (via this alias) instead of the theme's stock footer.
                '@aas-footer': (() => {
                  const siteFooter = fileURLToPath(
                    new URL('./src/components/Footer.astro', config.root),
                  );
                  return existsSync(siteFooter)
                    ? siteFooter
                    : fileURLToPath(new URL('./src/components/DefaultFooter.astro', import.meta.url));
                })(),
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
