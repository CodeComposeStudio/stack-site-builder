import { site } from '@aas-data/site';
import { defaultLang, type Lang } from '../i18n/ui';

/**
 * The data-driven "cards" homepage. By default the theme home is the stack
 * catalog; a site that isn't a catalog (a studio/product site) declares
 * `home: { template: 'cards', … }` in `src/data/site.ts` and gets a
 * hero + card grid + CTA home instead. The catalog routes still build (they
 * are simply empty when the site has no stacks), and the header's Browse
 * link — which anchors into the catalog home — hides itself.
 *
 * Strings are `Localized`: either one string for every locale, or a
 * per-locale record (`{ ko: '…', en: '…' }`) that falls back to the default
 * locale, matching how category labels work.
 */
export type Localized = string | Record<string, string>;

export interface HomeCard {
  /** Locale-less internal path ("/products/foo/", prefixed per locale at
   *  render) or an external URL (set `external`). */
  href: string;
  external?: boolean;
  name: Localized;
  description?: Localized;
  icon?: string; // public/ path
  rounded?: boolean; // app-icon style rounding for the icon
  /** Invert the icon in dark mode — for black line-art icons that would
   *  otherwise vanish on the dark card background. */
  iconInvert?: boolean;
  tags?: string[] | Record<string, string[]>;
}

export interface HomeConfig {
  template: 'cards';
  hero?: {
    icon?: string; // public/ path, shown above the title
    iconInvert?: boolean; // invert the icon in dark mode (black line art)
    title?: Localized; // defaults to site.name
    subtitle?: Localized; // defaults to the site.tagline UI string
  };
  cardsTitle?: Localized;
  cards?: HomeCard[];
  cta?: {
    title?: Localized;
    description?: Localized;
    button?: { label: Localized; href: string; external?: boolean };
  };
}

export const home: HomeConfig | undefined = (site as { home?: HomeConfig }).home;

/** Which homepage the site gets: the catalog (default) or the cards home. */
export const homeTemplate: 'catalog' | 'cards' = home?.template === 'cards' ? 'cards' : 'catalog';

/** Resolve a Localized string for `lang` (default locale, then any, as fallback). */
export function loc(v: Localized | undefined, lang: Lang): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  return v[lang] ?? v[defaultLang] ?? Object.values(v)[0];
}

/** Resolve a per-locale (or shared) string list for `lang`. */
export function locList(v: string[] | Record<string, string[]> | undefined, lang: Lang): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v;
  return v[lang] ?? v[defaultLang] ?? Object.values(v)[0] ?? [];
}
