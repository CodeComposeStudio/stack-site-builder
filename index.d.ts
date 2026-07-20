import type { AstroIntegration } from 'astro';

/** Optional content sections that a site can turn off. */
export type SectionKey = 'concepts' | 'articles' | 'samples' | 'slides' | 'glossary';

export interface AasThemeOptions {
  /** The site's glossary (`src/data/glossary.mjs`) — `[[wikilink]]` targets. */
  glossary: Record<string, unknown>;
  /**
   * Turn optional sections off (all on by default), e.g. `{ slides: false }`.
   * A disabled section's routes aren't injected; pass the same object to
   * `src/data/site.ts` `sections` so its header-nav item is hidden too.
   */
  sections?: Partial<Record<SectionKey, boolean>>;
}

/**
 * The awesome-*-stack theme: injects every route in both locales and wires
 * the markdown pipeline, tailwind and dev middleware. See index.mjs.
 */
export default function aasTheme(opts: AasThemeOptions): AstroIntegration[];
