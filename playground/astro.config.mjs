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

  i18n: {
    locales: ['en', 'ko'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },

  integrations: [aasTheme({ glossary })],
});
