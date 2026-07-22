import { site } from '@aas-data/site';

/**
 * The site's browser icons (`site.ts` `icons`), resolved once with the theme
 * default. Shared by every layout that owns a `<head>` (BaseLayout, DeckView)
 * so a site's custom favicon applies everywhere.
 */
export interface SiteIcons {
  favicon: string;
  faviconType?: string;
  appleTouch?: string;
  manifest?: string;
}

const cfg =
  (site as { icons?: { favicon?: string; appleTouch?: string; manifest?: string } }).icons ?? {};
const favicon = cfg.favicon ?? '/favicon.svg';

export const siteIcons: SiteIcons = {
  favicon,
  faviconType: favicon.endsWith('.svg')
    ? 'image/svg+xml'
    : favicon.endsWith('.png')
      ? 'image/png'
      : favicon.endsWith('.ico')
        ? 'image/x-icon'
        : undefined,
  appleTouch: cfg.appleTouch,
  manifest: cfg.manifest,
};
