import type { AstroIntegration } from 'astro';

/** Optional content sections that a site can turn off. `pages` is the
 *  standalone-pages collection (About/소개, …); `courses` is opt-IN
 *  (default off — enabling it requires site-side course data). */
export type SectionKey =
  | 'concepts'
  | 'articles'
  | 'courses'
  | 'products'
  | 'papers'
  | 'samples'
  | 'slides'
  | 'glossary'
  | 'pages';

export interface AasThemeOptions {
  /** The site's glossary (`src/data/glossary.mjs`) — `[[wikilink]]` targets. */
  glossary: Record<string, unknown>;
  /**
   * Section toggles, e.g. `{ slides: false }`. Every section is on by default
   * except `courses`, which is opt-in (`{ courses: true }`) and additionally
   * requires `src/data/course-categories.ts` on the site. A disabled section's
   * routes aren't injected; pass the same object to `src/data/site.ts`
   * `sections` so its header-nav item is hidden too.
   */
  sections?: Partial<Record<SectionKey, boolean>>;
}

/**
 * The awesome-*-stack theme: injects every route in both locales and wires
 * the markdown pipeline, tailwind and dev middleware. See index.mjs.
 */
export default function aasTheme(opts: AasThemeOptions): AstroIntegration[];
