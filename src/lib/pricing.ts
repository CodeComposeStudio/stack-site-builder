/**
 * Pricing tags. The stored `pricing` values are open-source / free-tier / paid /
 * free; on top of those we derive a synthetic "completely free" tag for tools
 * that cost nothing at all — open source with no paid or hosted free-tier
 * gating, or the standalone `free` (non-OSS) marker.
 */
export const COMPLETELY_FREE = 'completely-free';

/** True when a tool is free to use outright, with no paid option. */
export function isCompletelyFree(pricing: string[]): boolean {
  if (pricing.includes('free')) return true;
  return (
    pricing.includes('open-source') &&
    !pricing.includes('paid') &&
    !pricing.includes('free-tier')
  );
}

/** Display/filter tokens for a tool: prepend the 완전 무료 tag when it applies. */
export function pricingTags(pricing: string[]): string[] {
  return isCompletelyFree(pricing) ? [COMPLETELY_FREE, ...pricing] : pricing;
}
