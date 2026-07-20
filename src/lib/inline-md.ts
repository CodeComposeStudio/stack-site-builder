/**
 * Render a *tiny* inline-Markdown subset to safe HTML, for short strings shown
 * outside the Markdown pipeline — frontmatter `description` fields in detail
 * headers and cards. Supports `` `code` ``, `**bold**`, and `*italic*` only;
 * everything else (including any HTML in the source) is escaped.
 *
 * Keep `<meta>`/OG tags on the raw string — those must stay plain text.
 */
const ESCAPE: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const OPEN = '';
const CLOSE = '';

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ESCAPE[c]);
}

export function inlineMd(input: string): string {
  // Pull inline code out first — escape it and shield it from bold/italic with
  // private-use sentinels that can't occur in prose.
  const codes: string[] = [];
  let s = input.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(`<code>${escapeHtml(code)}</code>`);
    return `${OPEN}${codes.length - 1}${CLOSE}`;
  });
  s = escapeHtml(s);
  // Bold before italic so `**` isn't consumed by the single-`*` rule.
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(?<!\*)\*(?!\s)([^*]+?)(?<!\s)\*(?!\*)/g, '<em>$1</em>');
  return s.replace(new RegExp(`${OPEN}(\\d+)${CLOSE}`, 'g'), (_, i) => codes[Number(i)]);
}
