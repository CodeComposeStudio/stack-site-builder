import { languages, defaultLang, type Lang } from '../i18n/ui';

/**
 * Helpers for the single `src/pages/[...lang]/` route tree. Every page's
 * getStaticPaths walks {@link allLocales} and emits one path per locale, using
 * {@link langParam} for the `[...lang]` rest param: `undefined` for the default
 * locale (so it renders at the site root) and the code otherwise (so it renders
 * under `/<code>/`). Adding a locale is a site-config change, not a new file.
 */

/** All locale codes the site ships, in switcher order (default first). */
export const allLocales = Object.keys(languages) as Lang[];

/** The `[...lang]` param for a locale: `undefined` for the default, else the code. */
export const langParam = (lang: Lang): string | undefined =>
  lang === defaultLang ? undefined : lang;
