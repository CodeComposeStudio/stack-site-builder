import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/ui';

export type AppEntry = CollectionEntry<'apps'>;

/** The url slug of an app page — its id minus the `<lang>/` prefix. May be
 *  nested (`flowstate-ai/privacy`), which the catch-all route renders at the
 *  matching subpath. */
export function appSlugOf(entry: AppEntry): string {
  return entry.id.replace(/^[a-z]{2}\//, '');
}

/** Published app pages for one locale, in `order` (then title) order. */
export async function getApps(lang: Lang): Promise<AppEntry[]> {
  const all = await getCollection('apps');
  return all
    .filter((e) => e.id.startsWith(`${lang}/`) && !e.data.draft)
    .sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
}

/** The subset of {@link getApps} that opts into a header-nav link. */
export async function getNavApps(lang: Lang): Promise<AppEntry[]> {
  return (await getApps(lang)).filter((e) => e.data.nav);
}
