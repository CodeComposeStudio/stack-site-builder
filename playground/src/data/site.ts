/**
 * The playground's identity, consumed by the theme via the `@aas-data/site`
 * alias. UI string overrides use the same keys as the theme's src/i18n/ui.ts.
 */
export const site = {
  /** Shown in the header and as the homepage title. */
  name: 'stack-site-builder playground',
  /** The repo that hosts this site's content — sample folder links point here. */
  repoUrl: 'https://github.com/CodeCompose7/stack-site-builder',
  /** User-Agent for build-time GitHub API calls (stars/latest release). */
  buildUserAgent: 'stack-site-builder-playground',
  /** Per-locale overrides for the theme's UI strings; empty = theme defaults. */
  ui: {
    en: {} as Record<string, string>,
    ko: {} as Record<string, string>,
  },
};

export type SiteConfig = typeof site;
