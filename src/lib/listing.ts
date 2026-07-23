/**
 * Listing visibility for private entries. A private entry without
 * `listed: true` is "member-only": it still renders in index listings but
 * carries `data-aas-member-only`, and CSS hides it unless the pre-paint
 * script stamped `html[data-aas-member]` (a login session exists). So
 * logged-out visitors don't see it, members do — with no flash either way.
 * `listed: true` shows the locked teaser card to everyone.
 */
export const memberOnlyInIndex = (d: { private?: boolean; listed?: boolean }): boolean =>
  d.private === true && d.listed !== true;

/** Kept for compatibility: whether an entry is visible to logged-out visitors. */
export const listedInIndex = (d: { private?: boolean; listed?: boolean }): boolean =>
  !d.private || d.listed === true;
