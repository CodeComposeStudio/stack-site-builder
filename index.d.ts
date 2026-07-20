import type { AstroIntegration } from 'astro';

export interface AasThemeOptions {
  /** The site's glossary (`src/data/glossary.mjs`) — `[[wikilink]]` targets. */
  glossary: Record<string, unknown>;
}

/**
 * The awesome-*-stack theme: injects every route in both locales and wires
 * the markdown pipeline, tailwind and dev middleware. See index.mjs.
 */
export default function aasTheme(opts: AasThemeOptions): AstroIntegration[];
