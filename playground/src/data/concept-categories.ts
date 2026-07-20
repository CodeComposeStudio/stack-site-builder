import { buildTree, type Category } from 'stack-site-builder/lib/category-tree';

/** Taxonomy for the `concepts` collection. */
export const conceptCategories: Category[] = [
  {
    id: 'concept-uncategorized',
    label: { en: 'Uncategorized', ko: '미분류' },
    description: {
      en: 'Concepts not yet sorted into a category',
      ko: '아직 분류에 들어가지 않은 개념',
    },
  },
];

export const conceptTree = buildTree(conceptCategories);

/** Id of the fallback category that holds concepts without a real category. */
export const UNCATEGORIZED_CONCEPT = 'concept-uncategorized';

/** Resolve a concept's `category` to a real tree id (unknown → uncategorized). */
export const conceptCatOf = (category?: string | null): string =>
  category && conceptTree.map.has(category) ? category : UNCATEGORIZED_CONCEPT;
