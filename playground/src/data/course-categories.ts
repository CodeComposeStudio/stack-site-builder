import { buildTree, type Category } from 'stack-site-builder/lib/category-tree';

/** Taxonomy for the `courses` collection. */
export const courseCategories: Category[] = [
  {
    id: 'ai-basics',
    label: { en: 'AI Basics', ko: 'AI 기초', ja: 'AI基礎' },
    description: {
      en: 'Foundational courses on building with AI',
      ko: 'AI 활용의 기초를 다지는 강의',
      ja: 'AI活用の基礎を固める講義',
    },
  },
  {
    id: 'course-uncategorized',
    label: { en: 'Uncategorized', ko: '미분류', ja: '未分類' },
    description: {
      en: 'Courses not yet sorted into a category',
      ko: '아직 분류에 들어가지 않은 강의',
      ja: 'まだ分類されていない講義',
    },
  },
];

export const courseTree = buildTree(courseCategories);

/** Validation map for content.config.ts (strict category ids at build time). */
export const courseCategoryMap = courseTree.map;

/** Id of the fallback category that holds courses without a real category. */
export const UNCATEGORIZED_COURSE = 'course-uncategorized';

/** Resolve a course's `category` to a real tree id (unknown → uncategorized). */
export const courseCatOf = (category?: string | null): string =>
  category && courseTree.map.has(category) ? category : UNCATEGORIZED_COURSE;
