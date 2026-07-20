import { buildTree, type Category } from 'stack-site-builder/lib/category-tree';

export type { Category } from 'stack-site-builder/lib/category-tree';

/**
 * A tiny demo taxonomy — enough tree shape (nested children included) to
 * exercise the homepage sections, category pages and breadcrumbs.
 */
const categories: Category[] = [
  {
    id: 'demo-tools',
    label: { en: 'Demo Tools', ko: '데모 도구', ja: 'デモツール' },
    description: {
      en: 'Sample entries that exercise the catalog features',
      ko: '카탈로그 기능을 확인하는 샘플 항목',
      ja: 'カタログ機能を確認するサンプル項目',
    },
    children: [
      {
        id: 'demo-pipelines',
        label: { en: 'Pipelines', ko: '파이프라인', ja: 'パイプライン' },
        description: {
          en: 'Workflow engines and node editors',
          ko: '워크플로 엔진과 노드 에디터',
          ja: 'ワークフローエンジンとノードエディタ',
        },
      },
    ],
  },
];

/** Top-level categories (homepage sections), in display order. */
export const rootCategories = categories;

const tree = buildTree(categories);

/** Every node by id (top-level and nested). */
export const categoryMap = tree.map;

/** All category ids, for static path generation. */
export const allCategoryIds = tree.allIds;

/** Root → node chain for an id (its breadcrumb path). Empty if unknown. */
export const pathOf = tree.pathOf;

/** Direct children of a node (empty for leaves). */
export const childrenOf = tree.childrenOf;

/** A node's id plus all of its descendants' ids (for subtree roll-up). */
export const descendantIds = tree.descendantIds;

/** The top-level ancestor id of a node (itself if already top-level). */
export function rootIdOf(id: string): string {
  const path = pathOf(id);
  return path.length ? path[0].id : id;
}
