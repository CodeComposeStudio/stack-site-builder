import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHighlighter, type Highlighter } from 'shiki';
import MarkdownIt from 'markdown-it';
import { site } from '@aas-data/site';

const SAMPLES_DIR = 'samples';
const REPO = site.repoUrl;
const THEME = 'github-dark';
const LANGS = [
  'python',
  'typescript',
  'tsx',
  'javascript',
  'jsx',
  'bash',
  'docker',
  'markdown',
  'json',
  'yaml',
  'toml',
  'sql',
  'go',
  'rust',
];

let hlPromise: Promise<Highlighter> | null = null;
function getHighlighter() {
  if (!hlPromise) hlPromise = createHighlighter({ themes: [THEME], langs: LANGS });
  return hlPromise;
}
function highlight(hl: Highlighter, code: string, lang: string): string {
  const l = hl.getLoadedLanguages().includes(lang) ? lang : 'text';
  // Tag the <pre> with its language so CSS can soft-wrap shell/output blocks
  // (bash, text…) while leaving real source code horizontally scrollable.
  return hl
    .codeToHtml(code, { lang: l, theme: THEME })
    .replace(/^<pre/, `<pre data-lang="${l}"`);
}

export interface ProjectFile {
  path: string; // relative to the project folder, e.g. "app.py"
  html: string; // Shiki-highlighted
}
export interface ProjectHeading {
  slug: string;
  text: string;
  depth: number;
}
export interface RenderedProject {
  folder: string;
  name: string;
  date: string; // when the example was written (YYYY-MM-DD)
  readmeHtml?: string;
  headings: ProjectHeading[]; // README h2/h3, for the right-rail TOC
  files: ProjectFile[];
  folderUrl: string;
}

// When each sample was authored. Per-folder overrides go here; anything not
// listed falls back to DEFAULT_SAMPLE_DATE.
const DEFAULT_SAMPLE_DATE = '2026-06-28';
const SAMPLE_DATES: Record<string, string> = {};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N} -]/gu, '')
    .replace(/\s+/g, '-');
}

/**
 * Render a project README to HTML, giving its h2/h3 stable ids (prefixed with
 * the folder so headings stay unique across projects) plus a copy-link anchor,
 * and collecting those headings for the right-rail TOC.
 */
function renderReadme(
  md: MarkdownIt,
  content: string,
  folder: string,
): { html: string; headings: ProjectHeading[]; title?: string } {
  const tokens = md.parse(content, {});
  const headings: ProjectHeading[] = [];
  // The first real h1 is the project's display name. Taken from the parsed
  // tokens (not a regex over the source) so a `# comment` line inside a fenced
  // shell block can't be mistaken for it.
  let title: string | undefined;
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (tk.type === 'heading_open' && tk.tag === 'h1' && title === undefined) {
      title = tokens[i + 1]?.content ?? '';
    }
    if (tk.type === 'heading_open' && (tk.tag === 'h2' || tk.tag === 'h3' || tk.tag === 'h4')) {
      const text = tokens[i + 1]?.content ?? '';
      const slug = `${folder}-${slugify(text)}`;
      tk.attrSet('id', slug);
      // Anchor every level up to h4; the TOC still lists h2/h3 only.
      if (tk.tag !== 'h4') headings.push({ slug, text, depth: tk.tag === 'h2' ? 2 : 3 });
    }
  }
  const html = md.renderer.render(tokens, md.options, {}).replace(
    /<(h[234]) id="([^"]+)">([\s\S]*?)<\/\1>/g,
    (_m, tag, id, inner) =>
      `<${tag} id="${id}">` +
      `<a class="aas-anchor" href="#${id}" aria-label="Copy link to section"></a>${inner}</${tag}>`,
  );
  return { html, headings, title };
}

function langFor(name: string): string {
  if (name === 'Dockerfile' || name.endsWith('.dockerfile')) return 'docker';
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    py: 'python',
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    md: 'markdown',
    toml: 'toml',
    yml: 'yaml',
    yaml: 'yaml',
    json: 'json',
    sh: 'bash',
    bash: 'bash',
    env: 'bash',
    sql: 'sql',
    go: 'go',
    rs: 'rust',
  };
  return map[ext] ?? 'text';
}

// In the file tree: source first, then Dockerfile, then dependency/config files.
function priority(path: string): number {
  const name = path.split('/').pop() ?? path;
  if (name === 'Dockerfile' || name.endsWith('.dockerfile')) return 1;
  if (/^requirements|^package\.json$|^pyproject|^package-lock|lock$/i.test(name)) return 3;
  return 0;
}

// The viewer renders text only — skip images/archives/etc. by extension, and
// anything else that carries NUL bytes (binary content decoded as UTF-8 would
// render as mojibake in the file tree).
const BINARY_RE =
  /\.(png|jpe?g|gif|webp|avif|ico|pdf|zip|gz|tgz|tar|db|sqlite3?|woff2?|ttf|eot|otf|mp[34]|wav|bin|exe|so|dylib|pyc|wasm)$/i;

function walk(dir: string, base: string, out: { path: string; name: string; content: string }[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, base, out);
    else if (!BINARY_RE.test(name)) {
      const buf = readFileSync(full);
      if (buf.subarray(0, 8192).includes(0)) continue;
      out.push({ path: relative(base, full), name, content: buf.toString('utf8') });
    }
  }
}

/**
 * Subset of `paths` (relative to the repo root) that git would ignore, so files
 * like `.env` never leak into the rendered file tree. Respects nested .gitignore
 * files and negations. Falls back to ignoring nothing if git isn't available.
 */
function gitIgnored(paths: string[]): Set<string> {
  if (!paths.length) return new Set();
  try {
    const out = execFileSync('git', ['check-ignore', '--stdin'], {
      input: paths.join('\n'),
      encoding: 'utf8',
    });
    return new Set(out.split('\n').map((s) => s.trim()).filter(Boolean));
  } catch (err) {
    // Exit code 1 ("nothing ignored") still throws; its stdout holds any matches.
    const out = (err as { stdout?: string }).stdout ?? '';
    return new Set(out.split('\n').map((s) => s.trim()).filter(Boolean));
  }
}

/** A README file in the project, with an optional locale suffix:
 *  README.md (default) or README.<lang>.md (e.g. README.ko.md). */
const README_RE = /^readme(?:\.([a-z]{2}))?\.md$/i;

/** All sample folders under samples/, sorted by name. */
export function listSampleFolders(): string[] {
  return readdirSync(SAMPLES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

export interface ProjectSummary {
  folder: string;
  name: string; // README h1 in the requested locale (folder as fallback)
  excerpt: string; // first README paragraph, plain text
  date: string; // when the sample was authored (YYYY-MM-DD)
}

/**
 * Light per-folder metadata for the samples index: the locale-appropriate
 * README's title and first paragraph — parsed, not rendered, and nothing is
 * highlighted, so listing every sample stays cheap.
 */
export function listProjects(lang: string): ProjectSummary[] {
  const md = new MarkdownIt();
  // Markdown inline syntax the excerpt should not carry into a card.
  const plain = (s: string) =>
    s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '');
  return listSampleFolders().map((folder) => {
    const dir = join(SAMPLES_DIR, folder);
    const readmes = readdirSync(dir).filter((n) => README_RE.test(n));
    const pick =
      readmes.find((n) => n.toLowerCase() === `readme.${lang}.md`) ??
      readmes.find((n) => n.toLowerCase() === 'readme.md') ??
      readmes[0];
    let name = folder;
    let excerpt = '';
    if (pick) {
      const tokens = md.parse(readFileSync(join(dir, pick), 'utf8'), {});
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type === 'heading_open' && tokens[i].tag === 'h1' && name === folder)
          name = tokens[i + 1]?.content ?? folder;
        else if (tokens[i].type === 'paragraph_open' && !excerpt)
          excerpt = plain(tokens[i + 1]?.content ?? '').replace(/\s+/g, ' ');
        if (name !== folder && excerpt) break;
      }
    }
    return { folder, name, excerpt, date: SAMPLE_DATES[folder] ?? DEFAULT_SAMPLE_DATE };
  });
}

/**
 * Read + render the sample projects in the given `samples/<folder>/` list.
 * For each project the README is localized: `README.<lang>.md` is used when it
 * exists, otherwise the plain `README.md` is the fallback.
 */
export async function renderProjects(folders: string[], lang: string): Promise<RenderedProject[]> {
  const hl = await getHighlighter();
  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    highlight: (code, info) => {
      const lang = (info || '').trim() || 'text';
      // Hand mermaid blocks to the client-side MermaidLoader instead of Shiki,
      // so README diagrams render as graphics rather than highlighted text.
      if (lang === 'mermaid') return `<pre class="mermaid">${escapeHtml(code)}</pre>`;
      return highlight(hl, code, lang);
    },
  });
  // README links open in a new tab.
  const baseLink = md.renderer.rules.link_open ?? ((t, i, o, _e, s) => s.renderToken(t, i, o));
  md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
    tokens[idx].attrSet('target', '_blank');
    tokens[idx].attrSet('rel', 'noopener noreferrer');
    return baseLink(tokens, idx, opts, env, self);
  };

  const out: RenderedProject[] = [];
  for (const folder of folders) {
    const dir = join(SAMPLES_DIR, folder);
    if (!existsSync(dir)) continue;
    const raw: { path: string; name: string; content: string }[] = [];
    walk(dir, dir, raw);
    if (!raw.length) continue;

    // Hide gitignored files (e.g. a local .env) from the file tree.
    const ignored = gitIgnored(raw.map((f) => join(dir, f.path)));
    const shown = raw.filter((f) => !ignored.has(join(dir, f.path)));
    if (!shown.length) continue;

    // Pick the README for the current language: README.<lang>.md, else the
    // plain README.md. All README variants are kept out of the file tree.
    const readmes = shown.filter((f) => README_RE.test(f.path));
    const readme =
      readmes.find((f) => f.path.toLowerCase() === `readme.${lang}.md`) ??
      readmes.find((f) => f.path.toLowerCase() === 'readme.md') ??
      readmes[0];

    let readmeHtml: string | undefined;
    let headings: ProjectHeading[] = [];
    let name = folder;
    if (readme) {
      let title: string | undefined;
      ({ html: readmeHtml, headings, title } = renderReadme(md, readme.content, folder));
      name = title || folder;
    }

    const files: ProjectFile[] = [];
    for (const f of shown
      .filter((f) => !README_RE.test(f.path))
      .sort((a, b) => priority(a.path) - priority(b.path) || a.path.localeCompare(b.path))) {
      files.push({ path: f.path, html: highlight(hl, f.content, langFor(f.name)) });
    }
    out.push({
      folder,
      name,
      date: SAMPLE_DATES[folder] ?? DEFAULT_SAMPLE_DATE,
      readmeHtml,
      headings,
      files,
      folderUrl: `${REPO}/tree/main/samples/${folder}`,
    });
  }
  return out;
}
