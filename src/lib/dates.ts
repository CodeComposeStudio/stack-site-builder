import { dateLocaleOf, type Lang } from '../i18n/ui';

/**
 * Human-facing date in the reader's locale (e.g. "June 28, 2026" / "2026년 6월
 * 28일"). Use UTC so a YYYY-MM-DD in frontmatter renders as that exact calendar
 * day regardless of the build machine's timezone. Pair with an ISO `datetime`
 * attribute on the surrounding `<time>` for machines.
 */
export function formatDate(d: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(dateLocaleOf(lang), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

/** ISO YYYY-MM-DD, for `datetime` attributes. */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
