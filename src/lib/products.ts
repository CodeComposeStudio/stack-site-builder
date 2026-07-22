import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/ui';

export type ProductEntry = CollectionEntry<'products'>;

/** The url slug of a product page — its id minus the `<lang>/` prefix. May be
 *  nested (`flowstate-ai/privacy`), which the catch-all route renders at the
 *  matching subpath. */
export function productSlugOf(entry: ProductEntry): string {
  return entry.id.replace(/^[a-z]{2}\//, '');
}

/** Published product pages for one locale, in `order` (then title) order. */
export async function getProducts(lang: Lang): Promise<ProductEntry[]> {
  const all = await getCollection('products');
  return all
    .filter((e) => e.id.startsWith(`${lang}/`) && !e.data.draft)
    .sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
}

/** The subset of {@link getProducts} that opts into a header-nav link. */
export async function getNavProducts(lang: Lang): Promise<ProductEntry[]> {
  return (await getProducts(lang)).filter((e) => e.data.nav);
}

/** Top-level product pages for one locale — what the products index lists
 *  (and what makes the header's Products link appear). Landing and plain
 *  pages both count; nested subpages (privacy/terms) are excluded. */
export async function getTopProducts(lang: Lang): Promise<ProductEntry[]> {
  return (await getProducts(lang)).filter((e) => !productSlugOf(e).includes('/'));
}
