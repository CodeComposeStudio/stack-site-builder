import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/ui';
import { descendantIds } from '@aas-data/categories';

export type StackEntry = CollectionEntry<'stacks'>;

/** The url slug of an entry, i.e. its id with the `<lang>/` prefix removed. */
export function slugOf(entry: StackEntry): string {
  return entry.id.replace(/^[a-z]{2}\//, '');
}

/** A name → url-safe slug, e.g. "Roo Code" → "roo-code". */
export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Redirect aliases for a locale's stacks: each former name (after a rename)
 * slugifies to an alias that should redirect to the entry's canonical slug.
 * Aliases that collide with a real slug or each other are dropped.
 */
export async function getStackAliases(lang: Lang): Promise<{ alias: string; target: string }[]> {
  const stacks = await getStacks(lang);
  const canonical = new Set(stacks.map(slugOf));
  const seen = new Set<string>();
  const out: { alias: string; target: string }[] = [];
  for (const s of stacks) {
    const target = slugOf(s);
    for (const former of s.data.formerNames) {
      const alias = slugifyName(former);
      if (!alias || alias === target || canonical.has(alias) || seen.has(alias)) continue;
      seen.add(alias);
      out.push({ alias, target });
    }
  }
  return out;
}

/** All stack entries for one locale (entries live in `stacks/<lang>/*.mdx`). */
export async function getStacks(lang: Lang): Promise<StackEntry[]> {
  const all = await getCollection('stacks');
  return all.filter((e) => e.id.startsWith(`${lang}/`));
}

/** Unique, sorted list of tags used by entries in a locale. */
export async function getAllTags(lang: Lang): Promise<string[]> {
  const stacks = await getStacks(lang);
  const set = new Set<string>();
  for (const s of stacks) for (const tag of s.data.tags) set.add(tag);
  return [...set].sort();
}

/** Entries in a locale that carry a given tag. */
export async function getStacksByTag(lang: Lang, tag: string): Promise<StackEntry[]> {
  const stacks = await getStacks(lang);
  return stacks.filter((s) => s.data.tags.includes(tag));
}

/** Unique vendor url-slugs across a locale's stacks (for /vendors/<slug>). */
export async function getAllVendors(lang: Lang): Promise<string[]> {
  const stacks = await getStacks(lang);
  const set = new Set<string>();
  for (const s of stacks) {
    // A vendor with no Latin/digit characters (e.g. a Korean-only name)
    // slugifies to '' — skip it rather than emit a broken /vendors/ route.
    const slug = s.data.vendor ? slugifyName(s.data.vendor) : '';
    if (slug) set.add(slug);
  }
  return [...set].sort();
}

/** Entries in a locale whose vendor slugifies to `slug`, sorted by name. */
export async function getStacksByVendor(lang: Lang, slug: string): Promise<StackEntry[]> {
  const stacks = await getStacks(lang);
  return stacks
    .filter((s) => s.data.vendor && slugifyName(s.data.vendor) === slug)
    .sort((a, b) => a.data.name.localeCompare(b.data.name));
}

/**
 * A tool referenced by slug, resolved for display (avatar + link + flags).
 * Unknown slugs — no matching mdx — carry `registered: false` and only a
 * display name, so the UI can render them as "not in our catalog".
 */
export interface ToolRef {
  slug: string;
  name: string;
  registered: boolean;
  logo?: string;
  logoDark?: string;
  category?: string;
  deprecated?: boolean;
}

/** Build a slug → ToolRef resolver over a locale's stacks (one lookup map,
 *  reused across many slugs — e.g. a project's related-tools lists). */
export async function toolResolver(lang: Lang): Promise<(slug: string) => ToolRef> {
  const stacks = await getStacks(lang);
  const bySlug = new Map(stacks.map((s) => [slugOf(s), s]));
  return (slug) => {
    const e = bySlug.get(slug);
    if (!e) return { slug, name: slug, registered: false };
    return {
      slug,
      name: e.data.name,
      registered: true,
      logo: e.data.logo,
      logoDark: e.data.logoDark,
      category: e.data.category,
      deprecated: e.data.deprecated,
    };
  };
}

/**
 * Entries in a locale that belong to a category node or any of its
 * subcategories (subtree roll-up), sorted alphabetically by name.
 */
export async function getStacksByCategory(lang: Lang, id: string): Promise<StackEntry[]> {
  const ids = new Set(descendantIds(id));
  const stacks = await getStacks(lang);
  return stacks
    .filter((s) => ids.has(s.data.category))
    .sort((a, b) => a.data.name.localeCompare(b.data.name));
}
