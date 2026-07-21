/**
 * Run a DOM-wiring routine now AND again whenever private content is decrypted
 * and injected (the injected HTML wasn't there when page scripts first ran).
 * Component scripts whose targets can sit inside a private gate wrap their init
 * in this. `fn` must be idempotent or guard against double-wiring itself.
 */
export const PRIVATE_DECRYPTED_EVENT = 'aas:private-decrypted';

export function initOnReady(fn: () => void): void {
  fn();
  document.addEventListener(PRIVATE_DECRYPTED_EVENT, () => fn());
}
