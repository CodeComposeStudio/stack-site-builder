/**
 * The playground's identity, consumed by the theme via the `@aas-data/site`
 * alias. UI string overrides use the same keys as the theme's src/i18n/ui.ts.
 */
export const site = {
  /** Shown in the header and as the homepage title. */
  name: 'stack-site-builder playground',
  /** The repo that hosts this site's content — sample folder links point here. */
  repoUrl: 'https://github.com/CodeCompose7/stack-site-builder',
  /** User-Agent for build-time GitHub API calls (stars/latest release). */
  buildUserAgent: 'stack-site-builder-playground',
  /**
   * The locales this site ships, in language-switcher order. The FIRST entry is
   * the default locale and must match `i18n.defaultLocale` in astro.config; every
   * `code` must also appear in `i18n.locales` there and have a matching content
   * folder (`src/content/stacks/<code>/…`). Omit this to accept the theme's
   * en/ko default. `dateLocale` is the BCP-47 tag used for date formatting.
   */
  locales: [
    { code: 'en', label: 'English', dateLocale: 'en-US' },
    { code: 'ko', label: '한국어', dateLocale: 'ko-KR' },
    { code: 'ja', label: '日本語', dateLocale: 'ja-JP' },
  ] as { code: string; label: string; dateLocale?: string }[],
  /** Per-locale overrides for the theme's UI strings; empty = theme defaults.
   *  A locale beyond the theme's en/ko (add it to `locales` above) supplies its
   *  whole string table here; any key it omits falls back to the default locale.
   *  `ja` below shows a partial table — the rest of the chrome falls back to en. */
  ui: {
    ja: {
      'site.tagline':
        'AIシステムの構築に実際に使うツールとサービスのキュレーション — 各項目に詳細ページと実行可能なサンプルコード付き。',
      'nav.browse': '一覧',
      'nav.concepts': 'コンセプト',
      'nav.blog': '記事',
      'nav.samples': 'サンプル',
      'nav.slides': 'スライド',
      'nav.glossary': '用語集',
      'nav.language': '言語',
      'nav.menu': 'メニュー',
      'code.copy': 'コードをコピー',
      'code.copied': 'コピーしました',
    },
  } as Record<string, Record<string, string>>,
};

export type SiteConfig = typeof site;
