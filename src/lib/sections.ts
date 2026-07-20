import { site } from '@aas-data/site';

/**
 * Optional content sections a site can turn off. The core catalog (home, stack
 * detail, categories, tags, vendors) and standalone `pages` are always on; these
 * five are opt-out. Disabling one removes both its routes and its header-nav item
 * (routes are skipped in the integration, the nav link in BaseLayout).
 *
 * A site sets overrides in `src/data/site.ts` (`sections`), which astro.config
 * also forwards to the theme integration for route filtering. Omitted = enabled.
 */
export type SectionKey = 'concepts' | 'articles' | 'samples' | 'slides' | 'glossary';

const DEFAULTS: Record<SectionKey, boolean> = {
  concepts: true,
  articles: true,
  samples: true,
  slides: true,
  glossary: true,
};

/** Whether each optional section is enabled, after applying the site's overrides. */
export const sections: Record<SectionKey, boolean> = {
  ...DEFAULTS,
  ...((site as { sections?: Partial<Record<SectionKey, boolean>> }).sections ?? {}),
};

/** True unless the site explicitly turned `key` off. */
export const sectionEnabled = (key: SectionKey): boolean => sections[key];
