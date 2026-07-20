import type { Lang } from 'stack-site-builder/i18n/ui';

/**
 * A category node, nestable into subcategories to any depth. Reused for several
 * taxonomies (tools, concepts, articles): each builds its own tree of these and
 * runs it through `buildTree` for the lookup helpers. `id` must be unique within
 * its own tree (it keys the category URL and the content's `category` field).
 */
export interface Category {
  id: string;
  label: Record<Lang, string>;
  /** Short one-liner for cards / section headers / subcategory summaries. */
  description: Record<Lang, string>;
  /** Longer blurb for the category's own page (falls back to `description`). */
  detail?: Record<Lang, string>;
  children?: Category[];
}

export interface CategoryTree {
  roots: Category[];
  map: Map<string, Category>;
  allIds: string[];
  /** Root → node chain for an id (its breadcrumb path). Empty if unknown. */
  pathOf(id: string): Category[];
  /** Direct children of a node (empty for leaves). */
  childrenOf(id: string): Category[];
  /** A node's id plus all descendant ids (for subtree roll-up). */
  descendantIds(id: string): string[];
}

/** Index a category tree into id/parent maps + path/children/descendant helpers. */
export function buildTree(roots: Category[]): CategoryTree {
  const map = new Map<string, Category>();
  const parentOf = new Map<string, string | null>();
  (function index(nodes: Category[], parent: string | null) {
    for (const c of nodes) {
      map.set(c.id, c);
      parentOf.set(c.id, parent);
      if (c.children) index(c.children, c.id);
    }
  })(roots, null);

  const pathOf = (id: string): Category[] => {
    const out: Category[] = [];
    let cur: string | null = id;
    while (cur) {
      const c = map.get(cur);
      if (!c) break;
      out.unshift(c);
      cur = parentOf.get(cur) ?? null;
    }
    return out;
  };
  const childrenOf = (id: string): Category[] => map.get(id)?.children ?? [];
  const descendantIds = (id: string): string[] => {
    const node = map.get(id);
    if (!node) return [id];
    const out = [id];
    for (const child of node.children ?? []) out.push(...descendantIds(child.id));
    return out;
  };

  return { roots, map, allIds: [...map.keys()], pathOf, childrenOf, descendantIds };
}
