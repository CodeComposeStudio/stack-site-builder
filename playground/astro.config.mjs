// @ts-check
// The playground is a minimal consuming site used to develop the theme —
// site-level config only, everything else comes from stack-site-builder.
import { defineConfig } from 'astro/config';
import aasTheme from 'stack-site-builder';
import { glossary } from './src/data/glossary.mjs';
import { site } from './src/data/site';

// Demo credentials for the playground's private-content entries, so it builds
// out of the box. `??=` means a real .env / CI secret always wins. A real site
// must NEVER hardcode these — see .env.sample.
process.env.AAS_PRIVATE_USERS ??= 'demo:demo-passphrase-1';
process.env.AAS_PRIVATE_MASTER_SECRET ??= 'playground-demo-master-secret';

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

  // `sections` is forwarded from site.ts so the theme skips the routes of any
  // section the site turned off; site.ts also hides its header-nav item.
  integrations: [aasTheme({ glossary, sections: site.sections })],
});
