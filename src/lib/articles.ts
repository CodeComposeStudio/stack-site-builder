import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/ui';

export type ArticleEntry = CollectionEntry<'articles'>;

/** The url slug of an article, i.e. its id with the `<lang>/` prefix removed. */
export function articleSlugOf(entry: ArticleEntry): string {
  return entry.id.replace(/^[a-z]{2}\//, '');
}

/** Published articles for one locale, newest first. */
export async function getArticles(lang: Lang): Promise<ArticleEntry[]> {
  const all = await getCollection('articles');
  return all
    .filter((e) => e.id.startsWith(`${lang}/`) && !e.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/**
 * Backlinks: articles in the given locale that reference `toolSlug` in their
 * `tools` frontmatter. Astro has no native backlinks — we compute the reverse
 * lookup here so a tool's detail page can list the writing that mentions it.
 */
export async function getArticlesForTool(lang: Lang, toolSlug: string): Promise<ArticleEntry[]> {
  const articles = await getArticles(lang);
  return articles.filter((a) => a.data.tools.includes(toolSlug));
}
