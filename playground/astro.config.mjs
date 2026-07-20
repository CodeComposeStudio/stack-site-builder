// @ts-check
// The playground is a minimal consuming site used to develop the theme —
// site-level config only, everything else comes from stack-site-builder.
import { defineConfig } from 'astro/config';
import aasTheme from 'stack-site-builder';
import { glossary } from './src/data/glossary.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://example.invalid',
  base: '/',

  // Three locales — en (default, served at root), ko and ja (under /ko/, /ja/).
  // The theme reads this list to inject routes and detect content locales; the
  // matching display names / date formats live in src/data/site.ts `locales`.
  i18n: {
    locales: ['en', 'ko', 'ja'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },

  integrations: [aasTheme({ glossary })],
});
