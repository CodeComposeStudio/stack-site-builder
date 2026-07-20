import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * The shared content model for awesome-*-stack sites: `stacks` (the tool
 * catalog), `articles`, `concepts` and `slides`. A site's content.config.ts
 * stays thin:
 *
 *   import { defineAasCollections } from 'stack-site-builder/content';
 *   import { categoryMap } from './data/categories';
 *   export const collections = defineAasCollections({ categoryMap });
 *
 * Content lives in the site's `src/content/<collection>/` (the glob bases
 * below resolve against the site root). `categoryMap` is the site's category
 * tree — stack entries are validated against it so an unknown category id
 * fails the build instead of silently dropping the entry from every listing.
 */
export function defineAasCollections({ categoryMap }: { categoryMap: Map<string, unknown> }) {
  /**
   * The `stacks` collection holds one entry per tool/service used to build
   * AI agents. Each entry is an MDX file: frontmatter powers the listing and
   * cards, while the body is the per-service detail page (overview + sample code).
   *
   * Entries are locale-partitioned: `stacks/en/<slug>.mdx`, `stacks/ko/<slug>.mdx`.
   */
  const stacks = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/stacks' }),
    schema: z.object({
      name: z.string(),
      // Prior names after a rename/rebrand, newest first. The card shows just the
      // most recent (formerNames[0]); the detail page shows all of them.
      formerNames: z.array(z.string()).default([]),
      // Living-doc metadata for THIS catalog entry's writeup — bump on edits.
      // Distinct from the tool's own software `version` (further below): docVersion
      // tracks our article, `version` tracks the tool's release.
      docVersion: z.string().optional(), // e.g. "1.0"
      updated: z.coerce.date().optional(), // when the writeup was last revised (YYYY-MM-DD)
      // The organization / company / person that makes and maintains the tool
      // (e.g. "Microsoft"). Powers the per-vendor browse pages at /vendors/<slug>.
      vendor: z.string().optional(),
      // Must be a node id from the tree in the site's src/data/categories.ts. Validated here
      // because an unknown id would not error anywhere downstream — the entry
      // would just silently drop out of the homepage and every category page.
      category: z.string().refine((id) => categoryMap.has(id), {
        message: 'unknown category id — must match a node in the site data category tree',
      }),
      description: z.string(),
      logo: z.string().optional(), // optional image URL/path; otherwise a monogram is shown
      logoDark: z.string().optional(), // optional dark-theme variant of `logo`
      website: z.string().url().optional(),
      repo: z.string().url().optional(),
      docs: z.string().url().optional(),
      tags: z.array(z.string()).default([]),
      language: z.string().optional(),
      license: z.string().optional(),
      version: z.string().optional(), // manual fallback; GitHub release/tag is used when available

      // Composable pricing/hosting model tags (a tool can be several at once):
      //   open-source = source is open / free to self-host
      //   free-tier   = vendor-hosted free tier
      //   paid        = paid plans exist
      //   free        = entirely free to use (non-OSS)
      pricing: z.array(z.enum(['open-source', 'free-tier', 'paid', 'free'])).default([]),
      // Human-readable pricing summary shown on the detail page, with its source
      // and the date it was last checked. `pricingNote` is localized per file.
      pricingNote: z.string().optional(), // short intro shown above the tiers table
      pricingTiers: z
        .array(z.object({ plan: z.string(), price: z.string(), note: z.string().optional() }))
        .default([]), // localized plan / price / note rows
      pricingSource: z.string().url().optional(),
      pricingCheckedAt: z.string().optional(), // YYYY-MM-DD
      deprecated: z.boolean().default(false), // maintenance-only / superseded
      related: z.array(z.string()).default([]), // slugs of related tools (same collection)
      // Sample project folders under samples/. Either a bare folder name, or an
      // object pairing the folder with the tools that project uses (slugs of other
      // stacks; unknown slugs render as "not in our catalog").
      //   projects: [langgraph_1]
      //   projects:
      //     - folder: langgraph_1
      //       related: [langgraph, langchain]
      projects: z
        .array(
          z.union([
            z.string(),
            z.object({
              folder: z.string(),
              related: z.array(z.string()).default([]),
            }),
          ]),
        )
        .default([]),



      // Versioned code samples for the "Code" tab. Each can carry a Mermaid
      // diagram explaining the structure plus a highlighted code snippet.
      samples: z
        .array(
          z.object({
            version: z.string(), // label shown in the version selector
            lang: z.string().default('ts'), // language id for syntax highlighting
            description: z.string().optional(), // Markdown explanation, shown above the code
            diagram: z.string().optional(), // Mermaid source
            code: z.string(),
            note: z.string().optional(), // short caption below the code
          }),
        )
        .default([]),
      featured: z.boolean().default(false),
    }),
  });

  /**
   * The `articles` collection is the writing space — long-form posts kept
   * separate from the tool catalog. `tools` lists the stack slugs an article
   * references; it powers both forward links (article → tool) and backlinks
   * (tool → article, computed in src/lib/articles.ts).
   *
   * Locale-partitioned like stacks: `articles/en/<slug>.mdx`, `articles/ko/...`.
   */
  const articles = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
    schema: ({ image }) =>
      z.object({
        title: z.string(),
        description: z.string(),
        date: z.coerce.date(), // first published
        // Living-doc metadata, mirroring concepts: bump on meaningful edits.
        version: z.string().optional(), // e.g. "1.0"
        updated: z.coerce.date().optional(), // last meaningful update (YYYY-MM-DD)
        image: image().optional(), // hero / card image (optimized; relative to the file)
        imageAlt: z.string().optional(),
        // Leaf id from the site's src/data/article-categories.ts (powers the breadcrumb +
        // category browse pages + grouped index, like a stack's category).
        category: z.string().optional(),
        tools: z.array(z.string()).default([]),
        related: z.array(z.string()).default([]), // related article slugs (mutual cross-links)
        // Optional runnable sample (samples/<folder>/) the article walks through.
        // Embed its viewer in the body with <SampleProject folder="…"/>; this
        // field powers the right-rail file list + related tools (like a stack's
        // implementation tab). A bare folder name, or { folder, related: [slugs] }.
        project: z
          .union([
            z.string(),
            z.object({ folder: z.string(), related: z.array(z.string()).default([]) }),
          ])
          .optional(),
        tags: z.array(z.string()).default([]),
        draft: z.boolean().default(false),
      }),
  });

  /**
   * The `concepts` collection explains higher-level patterns that compose several
   * catalog tools into a working setup (e.g. "harness engineering"). Each concept
   * groups the tools it uses by the role they play, and links related articles.
   *
   * Locale-partitioned like the others: `concepts/<lang>/<slug>.mdx`.
   */
  const concepts = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/concepts' }),
    schema: ({ image }) =>
      z.object({
        title: z.string(),
        description: z.string(),
        image: image().optional(), // hero / card image (optimized; relative to the file)
        imageAlt: z.string().optional(),
        // Leaf id from the site's src/data/concept-categories.ts (powers the breadcrumb +
        // category browse pages + grouped index, like a stack's category).
        category: z.string().optional(),
        // A concept is living documentation: bump `version` and `updated` on edits.
        version: z.string().optional(), // e.g. "1.0"
        updated: z.coerce.date().optional(), // last meaningful update (YYYY-MM-DD)
        // Tools grouped by the role they play in the pattern. `role` is content, so
        // it's written per-locale (e.g. "메모리" / "Memory"); `tools` are stack slugs.
        tools: z
          .array(z.object({ role: z.string(), tools: z.array(z.string()).default([]) }))
          .default([]),
        articles: z.array(z.string()).default([]), // related article slugs
        related: z.array(z.string()).default([]), // related concept slugs
        tags: z.array(z.string()).default([]),
        order: z.number().optional(), // manual sort on the index (lower first)
        draft: z.boolean().default(false),
      }),
  });

  /**
   * The `slides` collection holds presentation decks — one MDX file per deck, with
   * each slide wrapped in a <Slide> component (see src/components/Slide.astro). The
   * deck renders as a fullscreen scroll-snap presentation at /slides/<name>/.
   *
   * Decks are self-contained and language-agnostic (flat, not locale-partitioned):
   * a deck's prose carries its own language, and both locale indexes link to the
   * same deck. Add per-locale folders later if decks need translating.
   */
  const slides = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/slides' }),
    schema: z.object({
      title: z.string(),
      description: z.string(),
      // Concept slug this deck summarizes (links back to /concept/<slug>/).
      related: z.string().optional(),
      order: z.number().optional(), // manual sort on the index (lower first)
      // Slide-change animation: 'slide' animates the scroll between slides,
      // 'none' cuts instantly. (Reduced-motion users always get an instant cut.)
      transition: z.enum(['slide', 'none']).default('slide'),
      // Visual style theme (typography / accent / spacing). Light vs dark still
      // follows the site's color-scheme preference; this only picks the look.
      theme: z.enum(['default', 'simple', 'calm', 'bold']).default('default'),
      // Content aspect ratio: the content area's width tracks this ratio × height,
      // so 16:9/16:10/4:3 give a proportioned (wider) content column; 'fill' uses
      // the full slide width.
      aspect: z.enum(['16:9', '16:10', '4:3', 'fill']).default('16:9'),
      // Optional footer (bottom-left): presenter name and a date/version string.
      presenter: z.string().optional(),
      date: z.string().optional(),
      // In-deck table of contents (top-right). `toc` toggles it; `toc_level` is the
      // deepest heading level it includes (2 = ## only … up to 4 = ## ### ####);
      // `toc_open` starts it expanded. Exclude a whole slide with <Slide toc={false}>.
      toc: z.boolean().default(true),
      toc_level: z.number().int().min(2).max(4).default(2),
      toc_open: z.boolean().default(true),
      draft: z.boolean().default(false),
    }),
  });

  return { stacks, articles, concepts, slides };
}
