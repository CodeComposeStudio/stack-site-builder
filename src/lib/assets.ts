/**
 * Helpers for the `logo` / `logoDark` frontmatter fields, which accept an
 * absolute URL, a /public path, or an emoji/text glyph (e.g. "🚅").
 */

/** True when `ref` is an image reference — an absolute URL or a /public path —
 *  rather than an emoji/text glyph. */
export function isImageRef(ref?: string): ref is string {
  return !!ref && (/^https?:\/\//.test(ref) || ref.startsWith('/'));
}

/** Resolve an image reference to a browser-usable URL: absolute URLs pass
 *  through; /public paths get the deploy base (a GitHub project-page subpath)
 *  prefixed. Call only with image refs — an emoji would resolve to nonsense. */
export function resolveImageUrl(ref?: string): string | undefined {
  if (!ref) return undefined;
  if (/^https?:\/\//.test(ref)) return ref;
  return import.meta.env.BASE_URL.replace(/\/$/, '') + '/' + ref.replace(/^\//, '');
}
