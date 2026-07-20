import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/ui';

export type SlideDeck = CollectionEntry<'slides'>;

/**
 * The url slug of a deck: its id with the `<lang>/` prefix removed, plus a
 * trailing `/index` dropped so a folder deck (`<name>/index.mdx`, used when a
 * deck co-locates images) shares the same `<name>` slug as a flat `<name>.mdx`.
 */
export function deckSlugOf(entry: SlideDeck): string {
  return entry.id.replace(/^[a-z]{2}\//, '').replace(/\/index$/, '');
}

/** Published slide decks for one locale, by `order` then title. */
export async function getDecks(lang: Lang): Promise<SlideDeck[]> {
  const all = await getCollection('slides');
  return all
    .filter((e) => e.id.startsWith(`${lang}/`) && !e.data.draft)
    .sort(
      (a, b) =>
        (a.data.order ?? 999) - (b.data.order ?? 999) ||
        a.data.title.localeCompare(b.data.title),
    );
}
