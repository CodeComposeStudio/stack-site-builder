import { site } from '@aas-data/site';

/**
 * Optional content sections a site can turn off. The core catalog (home, stack
 * detail, categories, tags, vendors) is always on; these are opt-out. Disabling
 * one removes both its routes and its header-nav item (routes are skipped in the
 * integration, the nav link in BaseLayout).
 *
 * `pages` is the standalone-pages collection (About/소개, contact, …); turning it
 * off drops every page and its nav item at once — finer control is per-page via
 * the `nav` / `draft` frontmatter, or by not authoring the page.
 *
 * A site sets overrides in `src/data/site.ts` (`sections`), which astro.config
 * also forwards to the theme integration for route filtering. Omitted = enabled —
 * except `courses`, which is opt-IN (`{ courses: true }`): enabling it requires
 * site-side data (`src/data/course-categories.ts`), so it must never switch on
 * by a theme upgrade alone.
 */
export type SectionKey =
  | 'concepts'
  | 'articles'
  | 'courses'
  | 'apps'
  | 'samples'
  | 'slides'
  | 'glossary'
  | 'pages';

const DEFAULTS: Record<SectionKey, boolean> = {
  concepts: true,
  articles: true,
  courses: false, // opt-in: needs src/data/course-categories.ts on the site
  apps: true, // no site data needed; an empty collection builds zero pages
  samples: true,
  slides: true,
  glossary: true,
  pages: true,
};

/** Whether each optional section is enabled, after applying the site's overrides. */
export const sections: Record<SectionKey, boolean> = {
  ...DEFAULTS,
  ...((site as { sections?: Partial<Record<SectionKey, boolean>> }).sections ?? {}),
};

/** True unless the site explicitly turned `key` off. */
export const sectionEnabled = (key: SectionKey): boolean => sections[key];
