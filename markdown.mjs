// @ts-check
// The shared Markdown/MDX pipeline for awesome-*-stack sites: heading ids +
// copy-link anchors, mermaid fences, slide directives, and [[wikilink]]
// resolution against the site's glossary. Sites get the whole pipeline from
// the theme integration (index.mjs); `aasMarkdown({ glossary })` is also
// exported for direct use.
import rehypeExternalLinks from 'rehype-external-links';
import rehypeSlug from 'rehype-slug';
import remarkDirective from 'remark-directive';

// Prepend a "#" copy-link anchor to h2/h3/h4 headings (a global click handler
// in BaseLayout copies the section URL). The "#" count per level is drawn via
// CSS (h2 → #, h3 → ##, h4 → ###). The TOC still lists h2/h3 only. Runs after
// rehype-slug adds the ids.
function rehypeHeadingAnchors() {
  /** @param {any} node */
  const walk = (node) => {
    if (!node.children) return;
    for (const child of node.children) {
      if (
        child.type === 'element' &&
        (child.tagName === 'h2' || child.tagName === 'h3' || child.tagName === 'h4') &&
        child.properties &&
        child.properties.id
      ) {
        // Empty anchor — the visible "#" is drawn via CSS ::before so it does
        // not leak into Astro's extracted heading text (used by the TOC).
        child.children.unshift({
          type: 'element',
          tagName: 'a',
          properties: {
            className: ['aas-anchor'],
            href: '#' + child.properties.id,
            'aria-label': 'Copy link to section',
          },
          children: [],
        });
      } else {
        walk(child);
      }
    }
  };
  return (/** @type {any} */ tree) => walk(tree);
}

// Support explicit, stable heading ids written as `## Heading {#custom-id}`. The
// id is stripped from the visible text and set on the heading, so rehype-slug
// won't override it. Lets every locale share one anchor and keeps the anchor (and
// any external link to it) stable even when the heading wording changes.
function remarkHeadingIds() {
  const re = /\s*\{#([\w-]+)\}\s*$/;
  /** @param {any} node */
  const walk = (node) => {
    if (!node.children) return;
    for (const child of node.children) {
      if (child.type === 'heading' && child.children.length) {
        const last = child.children[child.children.length - 1];
        if (last && last.type === 'text') {
          const m = last.value.match(re);
          if (m) {
            last.value = last.value.replace(re, '');
            child.data = child.data || {};
            child.data.hProperties = { ...(child.data.hProperties || {}), id: m[1] };
          }
        }
      } else {
        walk(child);
      }
    }
  };
  return (/** @type {any} */ tree) => walk(tree);
}

// Turn ```mermaid fenced blocks into <pre class="mermaid"> (raw, un-highlighted)
// so the client-side mermaid loader can render them. Runs at the remark stage,
// before syntax highlighting, so Shiki leaves these blocks alone.
function remarkMermaid() {
  /** @param {string} s */
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  /** @param {any} node */
  const walk = (node) => {
    if (!node.children) return;
    node.children.forEach((/** @type {any} */ child, /** @type {number} */ i) => {
      if (child.type === 'code' && child.lang === 'mermaid') {
        node.children[i] = {
          type: 'html',
          value: `<div class="aas-diagram"><pre class="mermaid">${esc(child.value)}</pre></div>`,
        };
      } else {
        walk(child);
      }
    });
  };
  return (/** @type {any} */ tree) => walk(tree);
}

// Slide directives (needs remarkDirective, which runs first). Two are handled:
//
//   :::cols          columns, separated by `---`:
//   ### Left           :::cols
//   ---                ### Left
//   ### Right          ---
//   :::                ### Right
//                      :::
//   ::sub[짧은 부제]  a small subtitle line under a slide title
//
// `cols` renders as <div class="cols"> (one <div> per column); `sub` renders as
// <p class="aas-subtitle"> (styled in global.css). Crucially, any OTHER
// directive is reclaimed back to its literal text — remark-directive parses
// every `:name` as a directive, so without this a colon in prose ("50:50",
// "12:00") would be silently eaten. Keeps the source pure Markdown.
function remarkSlideDirectives() {
  /** @param {any[]} nodes @returns {string} */
  const inlineText = (nodes) =>
    (nodes || []).map((n) => (n.value != null ? n.value : inlineText(n.children))).join('');

  /** Split a directive's children into groups on `---` (thematic breaks). */
  /** @param {any[]} children @returns {any[][]} */
  const splitOnRule = (children) => {
    /** @type {any[][]} */
    const groups = [[]];
    for (const c of children) {
      if (c.type === 'thematicBreak') groups.push([]);
      else groups[groups.length - 1].push(c);
    }
    return groups;
  };

  const CALLOUTS = ['note', 'tip', 'warning', 'info'];

  /** @param {any} node */
  const walk = (node) => {
    if (!node.children) return;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.type === 'containerDirective' && child.name === 'cols') {
        child.data = { hName: 'div', hProperties: { className: ['cols'] } };
        child.children = splitOnRule(child.children).map((g) => ({
          type: 'columnGroup',
          data: { hName: 'div' },
          children: g,
        }));
        walk(child);
      } else if (child.type === 'containerDirective' && child.name === 'stats') {
        // Big-number cards. Each heading starts a new card (its number), and the
        // following lines are its label — no `---` needed (and a `---` right under
        // a label line would be eaten as a Setext underline anyway).
        /** @type {any[][]} */
        const groups = [];
        for (const c of child.children) {
          if (c.type === 'heading' || groups.length === 0) groups.push([c]);
          else groups[groups.length - 1].push(c);
        }
        child.data = { hName: 'div', hProperties: { className: ['aas-stats'] } };
        child.children = groups.map((g) => ({
          type: 'statCard',
          data: { hName: 'div', hProperties: { className: ['aas-stat'] } },
          children: g,
        }));
        walk(child);
      } else if (child.type === 'containerDirective' && child.name === 'compare') {
        // Side-by-side comparison cards, split by `---`.
        child.data = { hName: 'div', hProperties: { className: ['aas-compare'] } };
        child.children = splitOnRule(child.children).map((g) => ({
          type: 'compareCol',
          data: { hName: 'div', hProperties: { className: ['aas-compare-col'] } },
          children: g,
        }));
        walk(child);
      } else if (child.type === 'containerDirective' && child.name === 'steps') {
        // Step-reveal container: each direct block becomes a step; a list inside
        // makes each <li> a step, so bullets reveal one at a time.
        child.data = { hName: 'div', hProperties: { className: ['aas-steps'] } };
        /** @type {any[]} */
        const out = [];
        for (const c of child.children) {
          if (c.type === 'list') {
            for (const li of c.children) {
              li.data = { hProperties: { className: ['aas-step'] } };
            }
            out.push(c);
          } else {
            out.push({
              type: 'stepItem',
              data: { hName: 'div', hProperties: { className: ['aas-step'] } },
              children: [c],
            });
          }
        }
        child.children = out;
        walk(child);
      } else if (child.type === 'containerDirective' && child.name === 'step') {
        // A single reveal step for scroll+text walkthroughs. Optionally tied to a
        // scroll position (`:::step{scroll=40}` = 40%, or `scroll=120px`) or, for
        // a code walkthrough, a line range to highlight (`:::step{lines="5-9"}`).
        /** @type {Record<string, any>} */
        const props = { className: ['aas-step'] };
        const attrs = child.attributes || {};
        if (attrs.scroll != null && attrs.scroll !== '') props['data-scroll'] = String(attrs.scroll);
        if (attrs.lines != null && attrs.lines !== '') props['data-lines'] = String(attrs.lines);
        child.data = { hName: 'div', hProperties: props };
        walk(child);
      } else if (child.type === 'containerDirective' && CALLOUTS.includes(child.name)) {
        // Callout box (note / tip / warning / info).
        child.data = {
          hName: 'div',
          hProperties: { className: ['aas-callout', `aas-callout-${child.name}`] },
        };
        walk(child);
      } else if (child.type === 'leafDirective' && child.name === 'sub') {
        child.data = { hName: 'p', hProperties: { className: ['aas-subtitle'] } };
        walk(child);
      } else if (
        child.type === 'textDirective' ||
        child.type === 'leafDirective' ||
        child.type === 'containerDirective'
      ) {
        // Unintended directive (e.g. `:50` inside "50:50") — restore its source.
        const marker =
          child.type === 'containerDirective' ? ':::' : child.type === 'leafDirective' ? '::' : ':';
        const label = child.children && child.children.length ? `[${inlineText(child.children)}]` : '';
        node.children[i] = { type: 'text', value: `${marker}${child.name || ''}${label}` };
      } else {
        walk(child);
      }
    }
  };
  return (/** @type {any} */ tree) => walk(tree);
}

// Turn `[[Term]]` (and `[[Term|display text]]`) wikilinks into links, resolving
// each against the site's central glossary (passed as an option). Internal targets
// emit the `../../stack|concept/<slug>/` relative form (locale- and base-agnostic
// on the depth-3 detail routes); external `href` entries pass through and get
// target="_blank" from rehype-external-links downstream. An unknown term throws,
// failing the build so a typo can't silently degrade to plain text. Code spans
// and fenced blocks are untouched (mdast `inlineCode`/`code` carry no children).
function remarkGlossary({ glossary }) {
  const RE = /\[\[\s*([^\]|]+?)\s*(?:\|\s*([^\]]+?)\s*)?\]\]/g;
  /** @param {string} s */
  const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, '-');
  // Reverse index: an entry's id and each of its labels (any locale) all resolve
  // to that entry, so authors can write the natural word in either language —
  // [[도구]] / [[Tools]] — or the id ([[agent-tools]]). Ambiguity fails the build.
  /** @type {Record<string, string>} */
  const lookup = {};
  /** @param {string} name @param {string} id */
  const register = (name, id) => {
    const k = norm(name);
    if (lookup[k] && lookup[k] !== id)
      throw new Error(`[glossary] ambiguous term "${k}" maps to both "${lookup[k]}" and "${id}"`);
    lookup[k] = id;
  };
  for (const [id, e] of Object.entries(glossary)) {
    register(id, id);
    if (typeof e.label === 'string') register(e.label, id);
    else {
      register(e.label.ko, id);
      register(e.label.en, id);
    }
  }
  /** @param {any} tree @param {any} file */
  return (tree, file) => {
    const path = (file && (file.path || (file.history && file.history[0]))) || '';
    const lang = /[/\\]ko[/\\]/.test(path) ? 'ko' : 'en';
    /** @param {any} l */
    const labelOf = (l) => (typeof l === 'string' ? l : l[lang]);
    // Same-document section links ([[#anchor]]) resolve their display text to
    // the target heading's own title. Collect id -> title up front from this
    // file's tree. remarkHeadingIds ran earlier, so explicit \{#id} headings
    // already carry their id on data.hProperties and have the \{#id} stripped
    // from the visible text. Auto-slugged headings (no explicit id) have no id
    // at this stage and are intentionally not indexed — an unknown anchor fails
    // the build, nudging authors to add an explicit \{#id}.
    /** @param {any} node @returns {string} */
    const headingText = (node) =>
      (node.children || [])
        .map((/** @type {any} */ c) => (c.value != null ? c.value : headingText(c)))
        .join('');
    /** @type {Record<string, string>} */
    const headingTitles = {};
    /** @param {any} node */
    const collectHeadings = (node) => {
      if (!node.children) return;
      for (const c of node.children) {
        if (c.type === 'heading') {
          const hid = c.data && c.data.hProperties && c.data.hProperties.id;
          if (hid) headingTitles[hid] = headingText(c);
        } else collectHeadings(c);
      }
    };
    collectHeadings(tree);
    /** @param {any} node */
    const walk = (node) => {
      if (!node.children) return;
      /** @type {any[]} */
      const out = [];
      for (const child of node.children) {
        if (child.type === 'text' && child.value.includes('[[')) {
          let last = 0;
          let m;
          RE.lastIndex = 0;
          while ((m = RE.exec(child.value))) {
            if (m.index > last) out.push({ type: 'text', value: child.value.slice(last, m.index) });
            // Obsidian-style section link: [[term#anchor|text]] targets a
            // heading id on the term's page (anchors are the stable \{#id}s,
            // shared across locales).
            const hashAt = m[1].indexOf('#');
            const name = hashAt === -1 ? m[1] : m[1].slice(0, hashAt);
            const anchor = hashAt === -1 ? '' : m[1].slice(hashAt + 1).trim();
            // Same-document section link: [[#anchor]] / [[#anchor|text]] points
            // at a heading in THIS file (no glossary term before the #). The
            // display text defaults to the heading's own title.
            if (name === '') {
              if (!anchor) throw new Error(`[glossary] empty wikilink "[[${m[1]}]]" in ${path}`);
              const title = headingTitles[anchor];
              if (!title)
                throw new Error(
                  `[glossary] "[[${m[1]}]]" — no heading with an explicit \{#${anchor}} in ${path}`,
                );
              const text = m[2] ? m[2].trim() : title;
              out.push({ type: 'link', url: `#${anchor}`, children: [{ type: 'text', value: text }] });
              last = m.index + m[0].length;
              continue;
            }
            const id = lookup[norm(name)];
            const entry = glossary[id];
            if (!entry) throw new Error(`[glossary] unknown term "[[${m[1]}]]" in ${path}`);
            const def = entry.def ? labelOf(entry.def) : undefined;
            // A def-only term (no page) links to its entry on the glossary page.
            let url = entry.stack
              ? `../../stack/${entry.stack}/`
              : entry.concept
                ? `../../concept/${entry.concept}/`
                : entry.article
                  ? `../../article/${entry.article}/`
                  : entry.href
                    ? entry.href
                    : def
                      ? `../../glossary/#${id}`
                      : null;
            if (!url)
              throw new Error(
                `[glossary] term "[[${m[1]}]]" needs one of stack/concept/article/href/def`,
              );
            if (anchor) {
              // A def-only target already carries its own hash — an extra
              // anchor is a mistake, so fail the build like an unknown term.
              if (!entry.stack && !entry.concept && !entry.article && !entry.href)
                throw new Error(
                  `[glossary] "[[${m[1]}]]" — a definition-only term can't take a #anchor`,
                );
              url += `#${anchor}`;
            }
            const text = m[2] ? m[2].trim() : labelOf(entry.label);
            /** @type {any} */
            const link = { type: 'link', url, children: [{ type: 'text', value: text }] };
            if (def) link.data = { hProperties: { title: def } };
            out.push(link);
            last = m.index + m[0].length;
          }
          if (last < child.value.length) out.push({ type: 'text', value: child.value.slice(last) });
        } else {
          walk(child);
          out.push(child);
        }
      }
      node.children = out;
    };
    walk(tree);
  };
}

/**
 * The full markdown config for `defineConfig({ markdown })`.
 * @param {{ glossary: Record<string, any> }} opts — the site's glossary
 *   (wikilink targets); pass `{}` for a site without wikilinks.
 */
export function aasMarkdown({ glossary }) {
  return {
    remarkPlugins: [
      remarkHeadingIds,
      remarkMermaid,
      remarkDirective,
      remarkSlideDirectives,
      [remarkGlossary, { glossary }],
    ],
    rehypePlugins: [
      rehypeSlug,
      rehypeHeadingAnchors,
      [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
    ],
  };
}
