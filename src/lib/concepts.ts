import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/ui';

export type ConceptEntry = CollectionEntry<'concepts'>;

/** The url slug of a concept, i.e. its id with the `<lang>/` prefix removed. */
export function conceptSlugOf(entry: ConceptEntry): string {
  return entry.id.replace(/^[a-z]{2}\//, '');
}

/** Published concepts for one locale, by `order` then title. */
export async function getConcepts(lang: Lang): Promise<ConceptEntry[]> {
  const all = await getCollection('concepts');
  return all
    .filter((e) => e.id.startsWith(`${lang}/`) && !e.data.draft)
    .sort(
      (a, b) =>
        (a.data.order ?? 999) - (b.data.order ?? 999) ||
        a.data.title.localeCompare(b.data.title),
    );
}

/** Every tool slug a concept references, flattened across its role groups. */
export function conceptToolSlugs(entry: ConceptEntry): string[] {
  return entry.data.tools.flatMap((g) => g.tools);
}

/**
 * Backlinks: concepts in a locale that use `toolSlug` (in any role group), so a
 * tool's detail page can list the patterns it appears in.
 */
export async function getConceptsForTool(lang: Lang, toolSlug: string): Promise<ConceptEntry[]> {
  const concepts = await getConcepts(lang);
  return concepts.filter((c) => conceptToolSlugs(c).includes(toolSlug));
}
