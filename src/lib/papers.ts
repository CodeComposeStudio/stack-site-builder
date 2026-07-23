import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/ui';

export type PaperEntry = CollectionEntry<'papers'>;

/** The url slug of a paper, i.e. its id with the `<lang>/` prefix removed. */
export function paperSlugOf(entry: PaperEntry): string {
  return entry.id.replace(/^[a-z]{2}\//, '');
}

/** Published papers for one locale — newest publication year first, then title. */
export async function getPapers(lang: Lang): Promise<PaperEntry[]> {
  const all = await getCollection('papers');
  return all
    .filter((e) => e.id.startsWith(`${lang}/`) && !e.data.draft)
    .sort(
      (a, b) => (b.data.year ?? 0) - (a.data.year ?? 0) || a.data.title.localeCompare(b.data.title),
    );
}

/** Cards abbreviate the author list: first `max` names, then "et al.". */
export function shortAuthors(authors: string[], max = 3): string {
  if (authors.length === 0) return '';
  return authors.length <= max ? authors.join(', ') : `${authors.slice(0, max).join(', ')} et al.`;
}
