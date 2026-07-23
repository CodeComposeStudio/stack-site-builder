import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * The shared content model for awesome-*-stack sites: `stacks` (the tool
 * catalog), `articles`, `concepts`, `courses` (opt-in), `slides` and `pages`.
 * A site's content.config.ts stays thin:
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
export function defineAasCollections({
  categoryMap,
  courseCategoryMap,
  productCategoryMap,
  paperCategoryMap,
}: {
  categoryMap: Map<string, unknown>;
  /** The site's course category tree (`src/data/course-categories.ts`). Optional
   *  because `courses` is an opt-in section; when provided, course `category`
   *  ids are validated against it at build time (like stacks). */
  courseCategoryMap?: Map<string, unknown>;
  /** The site's product category tree (`src/data/product-categories.ts`).
   *  Optional like `courseCategoryMap` — `products` is opt-in too. */
  productCategoryMap?: Map<string, unknown>;
  /** The site's paper category tree (`src/data/paper-categories.ts`).
   *  Optional like the others — `papers` is opt-in too. */
  paperCategoryMap?: Map<string, unknown>;
}) {
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
      // Login-gated entry: the body ships encrypted and listings show only the
      // title (+ `teaser`, an explicitly PUBLIC one-liner written for the gate).
      // See docs/private-content-design.md. Requires the AAS_PRIVATE_* env vars.
      private: z.boolean().default(false),
      teaser: z.string().optional(),
      // Show this PRIVATE entry on index listings as a locked teaser card.
      // Default: private entries stay OUT of listings and are reached via
      // direct links / the related sections on detail pages.
      listed: z.boolean().default(false),
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
        // Login-gated entry (encrypted body; listings show title + optional
        // PUBLIC `teaser`). See docs/private-content-design.md.
        private: z.boolean().default(false),
        teaser: z.string().optional(),
        // Show this PRIVATE entry on index listings as a locked teaser card.
        // Default: private entries stay OUT of listings and are reached via
        // direct links / the related sections on detail pages.
        listed: z.boolean().default(false),
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
        // Login-gated entry (encrypted body; listings show title + optional
        // PUBLIC `teaser`). See docs/private-content-design.md.
        private: z.boolean().default(false),
        teaser: z.string().optional(),
        // Show this PRIVATE entry on index listings as a locked teaser card.
        // Default: private entries stay OUT of listings and are reached via
        // direct links / the related sections on detail pages.
        listed: z.boolean().default(false),
      }),
  });

  /**
   * The `courses` collection holds structured lessons/lectures — an opt-in
   * section (`sections: { courses: true }`) for sites that teach rather than
   * catalog. Each course is one MDX file: frontmatter powers the course cards
   * (difficulty, duration, category), the body is the course page itself. Paid
   * courses use `private` + `teaser` like every other collection.
   *
   * Locale-partitioned like the others: `courses/<lang>/<slug>.mdx`.
   */
  const courses = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/courses' }),
    schema: ({ image }) =>
      z.object({
        title: z.string(),
        description: z.string(),
        // Short one-liner for tight card layouts; falls back to `description`.
        summary: z.string().optional(),
        date: z.coerce.date(), // first published
        // Living-doc metadata, mirroring concepts: bump on meaningful edits.
        version: z.string().optional(), // e.g. "1.0"
        updated: z.coerce.date().optional(), // last meaningful update (YYYY-MM-DD)
        image: image().optional(), // hero / card image (optimized; relative to the file)
        imageAlt: z.string().optional(),
        // Leaf id from the site's src/data/course-categories.ts. Validated when the
        // site passes `courseCategoryMap` (strict, like stacks); otherwise resolved
        // at render time with an uncategorized fallback (loose, like concepts).
        category: (courseCategoryMap
          ? z.string().refine((id) => courseCategoryMap.has(id), {
              message:
                'unknown course category id — must match a node in the site data course category tree',
            })
          : z.string()
        ).optional(),
        tags: z.array(z.string()).default([]),
        // Difficulty, 1 (beginner) … 5 (expert) — rendered as stars on cards
        // and the detail header; localized labels live in src/i18n/ui.ts.
        level: z.number().int().min(1).max(5).optional(),
        // Human-readable duration, e.g. "1:30" or "8주" — displayed verbatim.
        hours: z.string().optional(),
        // Manual sort key, highest first (e.g. "2601-01" = YYMM-seq, so newer
        // cohorts lead). Courses without one sort by `date`, newest first.
        order: z.string().optional(),
        // Free-form kind tag a site can style/filter on (e.g. "special-lecture").
        type: z.string().optional(),
        related: z.array(z.string()).default([]), // related course slugs
        // Decks in the `slides` collection that belong to this course
        // (linked from the course detail header).
        slides: z.array(z.string()).default([]),
        draft: z.boolean().default(false),
        // Login-gated course (encrypted body; listings show title + optional
        // PUBLIC `teaser`). See docs/private-content-design.md.
        private: z.boolean().default(false),
        teaser: z.string().optional(),
        // Show this PRIVATE entry on index listings as a locked teaser card.
        // Default: private entries stay OUT of listings and are reached via
        // direct links / the related sections on detail pages.
        listed: z.boolean().default(false),
      }),
  });

  /**
   * The `papers` collection is the reading room — one entry per academic
   * paper, an opt-in section (`sections: { papers: true }`) for sites that
   * review the literature behind their stack. Frontmatter powers the cards
   * (authors, venue/year, open-source availability, links); the body is the
   * site's own reading/review of the paper. Locale-partitioned:
   * `papers/<lang>/<slug>.mdx`.
   */
  const papers = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/papers' }),
    schema: ({ image }) =>
      z.object({
        title: z.string(),
        // The full author list, in publication order. Cards abbreviate to the
        // first names + "et al."; the detail page shows everyone.
        authors: z.array(z.string()).default([]),
        year: z.number().int().optional(),
        venue: z.string().optional(), // NeurIPS, ICML, arXiv, JMLR, …
        description: z.string(), // one-line takeaway, shown on cards
        // Leaf id from the site's src/data/paper-categories.ts. Validated when
        // the site passes `paperCategoryMap`; otherwise resolved at render
        // with an uncategorized fallback.
        category: (paperCategoryMap
          ? z.string().refine((id) => paperCategoryMap.has(id), {
              message:
                'unknown paper category id — must match a node in the site data paper category tree',
            })
          : z.string()
        ).optional(),
        image: image().optional(), // key figure / teaser image
        imageAlt: z.string().optional(),
        arxiv: z.string().url().optional(),
        paperUrl: z.string().url().optional(), // publisher / DOI page
        // Has the paper's code been released? Shown as a badge and filterable
        // at a glance; `repo` links the released implementation.
        openSource: z.boolean().default(false),
        repo: z.string().url().optional(),
        tools: z.array(z.string()).default([]), // catalog stacks this paper underpins
        related: z.array(z.string()).default([]), // related paper slugs
        tags: z.array(z.string()).default([]),
        // Living-doc metadata for the review itself, mirroring concepts.
        version: z.string().optional(),
        updated: z.coerce.date().optional(),
        draft: z.boolean().default(false),
        // Login-gated entry (encrypted body; see docs/private-content-design.md).
        private: z.boolean().default(false),
        teaser: z.string().optional(),
        // Show this PRIVATE entry on index listings as a locked teaser card.
        // Default: private entries stay OUT of listings and are reached via
        // direct links / the related sections on detail pages.
        listed: z.boolean().default(false),
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
      // Login-gated deck (encrypted body; the slides index shows title +
      // optional PUBLIC `teaser`). See docs/private-content-design.md.
      private: z.boolean().default(false),
      teaser: z.string().optional(),
      // Show this PRIVATE entry on index listings as a locked teaser card.
      // Default: private entries stay OUT of listings and are reached via
      // direct links / the related sections on detail pages.
      listed: z.boolean().default(false),
    }),
  });

  /**
   * The `products` collection is the "what we offer" section — an opt-in
   * umbrella (`sections: { products: true }`) whose entries are grouped by a
   * mini-taxonomy (apps, services, education, …) on the `/products/` index.
   * Each entry is either a Things-style marketing landing
   * (`template: 'landing'`) or a plain prose page (`template: 'page'`, the
   * default — an outsourcing pitch, a legal subpage). Entries are
   * locale-partitioned and may nest: `products/<lang>/<slug>.mdx` renders at
   * `/products/<slug>/`, `products/<lang>/<slug>/privacy.mdx` at
   * `/products/<slug>/privacy/`.
   *
   * Landing visuals (icons, screenshots, videos, the phone-frame art) are
   * plain `public/` paths — videos can't go through the image pipeline, so
   * the whole landing keeps one convention instead of two.
   */
  const products = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/products' }),
    schema: z.object({
      title: z.string(),
      description: z.string().optional(), // meta description
      // 'landing' renders the structured marketing page below; 'page' renders
      // the markdown body like a standalone page (pitches, legal subpages).
      template: z.enum(['landing', 'page']).default('page'),
      // Mini-category on the site's src/data/product-categories.ts tree —
      // groups the index. Validated when the site passes `productCategoryMap`;
      // unknown/missing ids fall back to uncategorized at render.
      category: (productCategoryMap
        ? z.string().refine((id) => productCategoryMap.has(id), {
            message:
              'unknown product category id — must match a node in the site data product category tree',
          })
        : z.string()
      ).optional(),
      // Header-nav placement, like the `pages` collection (default off —
      // products are usually reached from the index or the home cards).
      nav: z.boolean().default(false),
      navLabel: z.string().optional(),
      order: z.number().default(0),

      // ---- hero ----
      subtitle: z.string().optional(),
      icon: z.string().optional(), // app icon (public/ path)
      // Invert the icon in dark mode — for black line-art icons that would
      // otherwise vanish on the dark card background.
      iconInvert: z.boolean().default(false),
      // Free-form key a site can target from its CSS (`.aas-hero-bg-<key>`)
      // for a custom hero background.
      heroBg: z.string().optional(),
      tagline: z.string().optional(), // small print under the store buttons (may contain <br>)
      productHunt: z
        .object({ url: z.string().url(), image: z.string().url(), alt: z.string() })
        .optional(),
      // Store links; "#" renders the button disabled (not yet released), the
      // label is small print under a button (e.g. "5월 출시 예정").
      stores: z
        .object({
          appstore: z.string().optional(),
          appstoreLabel: z.string().optional(),
          playstore: z.string().optional(),
          playstoreLabel: z.string().optional(),
        })
        .optional(),

      // ---- alternating feature rows ----
      // Device-frame art that screenshots render inside when `phoneFrame` is
      // set (one per page; features opt in individually).
      phoneFrameImage: z.string().optional(),
      features: z
        .array(
          z.object({
            label: z.string().optional(), // small eyebrow above the title
            title: z.string(),
            description: z.string(), // may contain <br>
            image: z.string().optional(),
            images: z.array(z.string()).default([]), // 2+ → auto-rotating carousel
            phoneFrame: z.boolean().default(false),
          }),
        )
        .default([]),

      // ---- highlights grid (icon cards) ----
      highlightsTitle: z.string().optional(),
      highlights: z
        .array(
          z.object({
            icon: z.string().optional(), // public/ path
            title: z.string(),
            description: z.string(),
          }),
        )
        .default([]),

      // ---- themes showcase (video tabs, auto-rotating) ----
      themesTitle: z.string().optional(),
      themesSubtitle: z.string().optional(),
      themes: z
        .array(
          z.object({
            name: z.string(),
            description: z.string(),
            tabDesc: z.string().optional(),
            video: z.string(), // public/ path (mp4)
            poster: z.string().optional(),
            icon: z.string().optional(), // emoji or short text on the tab button
          }),
        )
        .default([]),
      themesLandscape: z
        .object({ title: z.string(), description: z.string(), image: z.string() })
        .optional(),

      // ---- pricing ----
      pricingTitle: z.string().optional(),
      pricingSubtitle: z.string().optional(),
      pricingBadge: z.string().optional(), // ribbon on the featured tier
      pricingNotes: z.array(z.string()).default([]),
      pricing: z
        .array(
          z.object({
            name: z.string(),
            price: z.string(),
            period: z.string().optional(), // "/월", "일회성", …
            featured: z.boolean().default(false),
            items: z.array(z.string()).default([]),
          }),
        )
        .default([]),

      // ---- closing CTA + legal links ----
      ctaTitle: z.string().optional(),
      ctaDescription: z.string().optional(),
      // Localized labels; privacy/terms link to the sibling subpages, support
      // opens mailto site.email.
      legal: z
        .object({
          privacy: z.string().optional(),
          terms: z.string().optional(),
          support: z.string().optional(),
        })
        .optional(),

      draft: z.boolean().default(false),
      // Login-gated page (encrypted body; see docs/private-content-design.md).
      private: z.boolean().default(false),
      teaser: z.string().optional(),
      // Show this PRIVATE entry on index listings as a locked teaser card.
      // Default: private entries stay OUT of listings and are reached via
      // direct links / the related sections on detail pages.
      listed: z.boolean().default(false),
    }),
  });

  /**
   * The `pages` collection holds standalone top-level pages — an About/소개, a
   * contact page, terms, etc. Unlike the other collections there's no index or
   * taxonomy: each entry renders on its own at the site root (`/<slug>/`), and
   * (when `nav` is set) shows up as its own item in the header navigation. This
   * is how a site adds a first-class section that is just one page.
   *
   * Locale-partitioned like the rest: `pages/en/about.mdx`, `pages/ko/about.mdx`.
   */
  const pages = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
    schema: ({ image }) =>
      z.object({
        title: z.string(),
        description: z.string().optional(),
        image: image().optional(), // hero image (optimized; relative to the file)
        imageAlt: z.string().optional(),
        // Header-nav placement. `nav` toggles the link; `navLabel` overrides the
        // link's accessible label (defaults to `title`); `order` sorts the page
        // links among themselves (lower first). A page with `nav: false` still
        // renders at its URL but isn't linked from the header.
        nav: z.boolean().default(true),
        navLabel: z.string().optional(),
        order: z.number().default(0),
        draft: z.boolean().default(false),
        // Login-gated page (encrypted body; the nav/meta show title + optional
        // PUBLIC `teaser`). See docs/private-content-design.md.
        private: z.boolean().default(false),
        teaser: z.string().optional(),
        // Show this PRIVATE entry on index listings as a locked teaser card.
        // Default: private entries stay OUT of listings and are reached via
        // direct links / the related sections on detail pages.
        listed: z.boolean().default(false),
      }),
  });

  return { stacks, articles, concepts, courses, papers, slides, products, pages };
}
