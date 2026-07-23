/**
 * Whether an entry belongs on index listings. Public entries always do;
 * PRIVATE entries only when they opt in with `listed: true` (shown as a
 * locked teaser card). Unlisted private entries still build and stay
 * reachable via direct links and the related-entry sections on detail pages —
 * that's the discovery path for gated content.
 */
export const listedInIndex = (d: { private?: boolean; listed?: boolean }): boolean =>
  !d.private || d.listed === true;
