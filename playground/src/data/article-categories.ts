import { buildTree, type Category } from 'stack-site-builder/lib/category-tree';

/** Taxonomy for the `articles` collection. */
export const articleCategories: Category[] = [
  {
    id: 'article-uncategorized',
    label: { en: 'Uncategorized', ko: '미분류', ja: '未分類' },
    description: {
      en: 'Writing not yet sorted into a category',
      ko: '아직 분류에 들어가지 않은 글',
      ja: 'まだ分類されていない記事',
    },
  },
];

export const articleTree = buildTree(articleCategories);

/** Id of the fallback category that holds articles without a real category. */
export const UNCATEGORIZED_ARTICLE = 'article-uncategorized';

/** Resolve an article's `category` to a real tree id (unknown → uncategorized). */
export const articleCatOf = (category?: string | null): string =>
  category && articleTree.map.has(category) ? category : UNCATEGORIZED_ARTICLE;
