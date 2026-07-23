import { buildTree, type Category } from 'stack-site-builder/lib/category-tree';

/** Taxonomy for the `papers` collection. */
export const paperCategories: Category[] = [
  {
    id: 'paper-architecture',
    label: { en: 'Architectures', ko: '아키텍처', ja: 'アーキテクチャ' },
    description: {
      en: 'Model architectures and training methods',
      ko: '모델 아키텍처와 학습 방법',
      ja: 'モデルアーキテクチャと学習方法',
    },
  },
  {
    id: 'paper-uncategorized',
    label: { en: 'Uncategorized', ko: '미분류', ja: '未分類' },
    description: {
      en: 'Papers not yet sorted into a category',
      ko: '아직 분류에 들어가지 않은 논문',
      ja: 'まだ分類されていない論文',
    },
  },
];

export const paperTree = buildTree(paperCategories);

/** Validation map for content.config.ts (strict category ids at build time). */
export const paperCategoryMap = paperTree.map;

/** Id of the fallback category that holds papers without a real category. */
export const UNCATEGORIZED_PAPER = 'paper-uncategorized';

/** Resolve a paper's `category` to a real tree id (unknown → uncategorized). */
export const paperCatOf = (category?: string | null): string =>
  category && paperTree.map.has(category) ? category : UNCATEGORIZED_PAPER;
