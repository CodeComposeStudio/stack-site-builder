import { codeToHtml } from 'shiki';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: false, linkify: true });

export interface SampleHeading {
  slug: string;
  text: string;
  depth: number;
}

export interface RenderedSample {
  version: string;
  lang: string;
  codeHtml: string;
  descHtml?: string;
  diagram?: string;
  note?: string;
  headings: SampleHeading[];
}

interface RawSample {
  version: string;
  lang?: string;
  description?: string;
  diagram?: string;
  code: string;
  note?: string;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N} -]/gu, '')
    .replace(/\s+/g, '-');
}

/**
 * Render code samples for the detail "Code" tab: highlight code with Shiki,
 * render each Markdown `description` to HTML (giving its h2/h3 stable ids), and
 * return the per-sample headings so the right-rail TOC can list a version's
 * internal sections (not the version itself).
 */
export async function renderSamples(samples: RawSample[]): Promise<RenderedSample[]> {
  return Promise.all(
    samples.map(async (s, idx) => {
      let codeHtml: string;
      try {
        codeHtml = await codeToHtml(s.code, { lang: s.lang ?? 'ts', theme: 'github-dark' });
      } catch {
        codeHtml = await codeToHtml(s.code, { lang: 'text', theme: 'github-dark' });
      }

      let descHtml: string | undefined;
      const headings: SampleHeading[] = [];
      if (s.description) {
        const tokens = md.parse(s.description, {});
        for (let i = 0; i < tokens.length; i++) {
          const tk = tokens[i];
          if (tk.type === 'heading_open' && (tk.tag === 'h2' || tk.tag === 'h3' || tk.tag === 'h4')) {
            const text = tokens[i + 1]?.content ?? '';
            const slug = `s${idx}-${slugify(text)}`;
            tk.attrSet('id', slug);
            // Anchor every level up to h4; the TOC still lists h2/h3 only.
            if (tk.tag !== 'h4') headings.push({ slug, text, depth: tk.tag === 'h2' ? 2 : 3 });
          }
        }
        descHtml = md.renderer.render(tokens, md.options, {}).replace(
          /<(h[234]) id="([^"]+)">([\s\S]*?)<\/\1>/g,
          (_m, tag, id, inner) =>
            `<${tag} id="${id}">` +
            `<a class="aas-anchor" href="#${id}" aria-label="Copy link to section"></a>${inner}</${tag}>`,
        );
      }

      return {
        version: s.version,
        lang: s.lang ?? 'ts',
        codeHtml,
        descHtml,
        diagram: s.diagram,
        note: s.note,
        headings,
      };
    }),
  );
}
