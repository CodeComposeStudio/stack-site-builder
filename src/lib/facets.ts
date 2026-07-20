import { pricingTags } from './pricing';
import { pricingLabel, licenseLabel, useTranslations, type Lang } from '../i18n/ui';
import type { StackEntry } from './stacks';

export interface FacetOption {
  value: string;
  label: string;
}
export interface Facet {
  key: string;
  label: string;
  options: FacetOption[];
}

/**
 * Filter facet options (pricing / license / language), derived from a locale's
 * stack entries. Shared by the homepage and the category pages — both feed it
 * the WHOLE catalog so the controls are identical everywhere and a sort/filter
 * carried in from another page can always be restored.
 */
export function deriveFacets(entries: StackEntry[], lang: Lang): Facet[] {
  const t = useTranslations(lang);

  const pricingOrder = ['completely-free', 'open-source', 'free-tier', 'paid', 'free'];
  const usedPricing = new Set<string>(entries.flatMap((e) => pricingTags(e.data.pricing)));

  const langSet = new Set(
    entries.flatMap((e) =>
      (e.data.language ?? '')
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );

  return [
    {
      key: 'pricing',
      label: t('detail.pricing'),
      options: pricingOrder
        .filter((p) => usedPricing.has(p))
        .map((p) => ({ value: p, label: pricingLabel(lang, p) })),
    },
    {
      key: 'license',
      label: t('detail.license'),
      options: [...new Set(entries.map((e) => e.data.license).filter(Boolean))]
        .sort()
        .map((l) => ({ value: l as string, label: licenseLabel(lang, l as string) })),
    },
    {
      key: 'language',
      label: t('detail.language'),
      options: [...langSet].sort().map((l) => ({ value: l, label: l })),
    },
  ];
}
