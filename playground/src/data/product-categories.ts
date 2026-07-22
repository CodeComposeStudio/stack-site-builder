import { buildTree, type Category } from 'stack-site-builder/lib/category-tree';

/** Mini-taxonomy for the `products` collection (groups the /products/ index). */
export const productCategories: Category[] = [
  {
    id: 'product-apps',
    label: { en: 'Apps', ko: '앱', ja: 'アプリ' },
    description: {
      en: 'The apps we build and ship',
      ko: '우리가 만들어 출시하는 앱',
      ja: '私たちが作って公開するアプリ',
    },
  },
  {
    id: 'product-services',
    label: { en: 'Services', ko: '서비스', ja: 'サービス' },
    description: {
      en: 'Work we do for clients',
      ko: '클라이언트를 위한 작업',
      ja: 'クライアント向けの仕事',
    },
  },
  {
    id: 'product-uncategorized',
    label: { en: 'Uncategorized', ko: '미분류', ja: '未分類' },
    description: {
      en: 'Products not yet sorted into a category',
      ko: '아직 분류에 들어가지 않은 제품',
      ja: 'まだ分類されていない製品',
    },
  },
];

export const productTree = buildTree(productCategories);

/** Validation map for content.config.ts (strict category ids at build time). */
export const productCategoryMap = productTree.map;

/** Id of the fallback category that holds products without a real category. */
export const UNCATEGORIZED_PRODUCT = 'product-uncategorized';

/** Resolve a product's `category` to a real tree id (unknown → uncategorized). */
export const productCatOf = (category?: string | null): string =>
  category && productTree.map.has(category) ? category : UNCATEGORIZED_PRODUCT;
