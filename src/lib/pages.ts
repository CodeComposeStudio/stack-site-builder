import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/ui';

export type PageEntry = CollectionEntry<'pages'>;

/** The url slug of a page, i.e. its id with the `<lang>/` prefix removed. */
export function pageSlugOf(entry: PageEntry): string {
  return entry.id.replace(/^[a-z]{2}\//, '');
}

/** Standalone pages for one locale, in `order` (then title) order. */
export async function getPages(lang: Lang): Promise<PageEntry[]> {
  const all = await getCollection('pages');
  return all
    .filter((e) => e.id.startsWith(`${lang}/`) && !e.data.draft)
    .sort(
      (a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title),
    );
}

/** The subset of {@link getPages} that opts into a header-nav link. */
export async function getNavPages(lang: Lang): Promise<PageEntry[]> {
  return (await getPages(lang)).filter((e) => e.data.nav);
}
