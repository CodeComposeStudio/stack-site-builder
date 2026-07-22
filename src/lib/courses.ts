import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/ui';

export type CourseEntry = CollectionEntry<'courses'>;

/** The url slug of a course, i.e. its id with the `<lang>/` prefix removed. */
export function courseSlugOf(entry: CourseEntry): string {
  return entry.id.replace(/^[a-z]{2}\//, '');
}

/**
 * Published courses for one locale. `order` keys sort highest-first (newer
 * cohorts lead, e.g. "2601-01" before "2512-02") and beat order-less entries;
 * ties fall back to `date` (newest first), then title.
 */
export async function getCourses(lang: Lang): Promise<CourseEntry[]> {
  const all = await getCollection('courses');
  return all
    .filter((e) => e.id.startsWith(`${lang}/`) && !e.data.draft)
    .sort(
      (a, b) =>
        (b.data.order ?? '').localeCompare(a.data.order ?? '') ||
        b.data.date.valueOf() - a.data.date.valueOf() ||
        a.data.title.localeCompare(b.data.title),
    );
}
