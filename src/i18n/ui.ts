/**
 * Central place for everything language-related.
 *
 * Locale routing (configured in astro.config.mjs): `en` is the default and is
 * served at the root, `ko` is served under `/ko/`. Tool content lives in
 * `src/content/stacks/<lang>/`. Use `astro:i18n`'s `getRelativeLocaleUrl` to
 * build locale-aware links so the base path and `/ko` prefix are handled for us.
 */
import { site } from '@aas-data/site';

/** One locale the site ships. `code` matches the astro.config `i18n` locale and
 *  the content folder (`stacks/<code>/…`); `label` names it in the switcher;
 *  `dateLocale` is the BCP-47 tag for date formatting (defaults to `code`). */
export interface LocaleDef {
  code: string;
  label: string;
  dateLocale?: string;
}

// The theme ships English + Korean. A consuming site overrides this list via
// `site.locales` to rename them, reorder them, or add its own (e.g. `ja`). The
// list is authoritative and ordered: it drives the language switcher, and its
// FIRST entry is the default locale (must match astro.config `i18n.defaultLocale`).
const themeLocales: LocaleDef[] = [
  { code: 'en', label: 'English', dateLocale: 'en-US' },
  { code: 'ko', label: '한국어', dateLocale: 'ko-KR' },
];
// Read defensively: a site that hasn't opted into custom locales simply has no
// `locales` field, and should keep the theme's en/ko default (not a type error).
const siteLocales = (site as { locales?: LocaleDef[] }).locales;
const localeList: LocaleDef[] =
  Array.isArray(siteLocales) && siteLocales.length ? siteLocales : themeLocales;

/** Display names keyed by code — the language switcher iterates this. */
export const languages: Record<string, string> = Object.fromEntries(
  localeList.map((l) => [l.code, l.label]),
);

// Locales are site-configurable, so `Lang` can't be a fixed union of codes.
export type Lang = string;

export const defaultLang: Lang = localeList[0].code;

/** BCP-47 tag for `Intl` date/number formatting in `lang` (falls back to the
 *  bare code, then the default locale). */
export function dateLocaleOf(lang: Lang): string {
  return (
    localeList.find((l) => l.code === lang)?.dateLocale ??
    localeList.find((l) => l.code === defaultLang)?.dateLocale ??
    lang
  );
}

/** UI chrome strings, keyed by a dotted id. */
export const ui = {
  en: {
    'site.tagline':
      'A curated stack of the tools and services you actually use to build AI systems — each with a detail page and runnable sample code.',
    'nav.browse': 'Browse',
    'nav.concepts': 'Concepts',
    'nav.blog': 'Writing',
    'nav.samples': 'Samples',
    'nav.slides': 'Slides',
    'nav.backToTop': 'Back to top',
    'nav.glossary': 'Glossary',
    'nav.language': 'Language',
    'nav.menu': 'Menu',
    'code.copy': 'Copy code',
    'code.copied': 'Copied',
    'private.badge': 'Private',
    'private.locked': 'This content is private. Log in to view it.',
    'private.id': 'ID',
    'private.password': 'Password',
    'private.submit': 'Unlock',
    'private.error': 'Wrong ID or password.',
    'private.logout': 'Log out',
    'slides.title': 'Slides',
    'slides.tagline': 'Concept decks — the same ideas as the concept pages, in slide form.',
    'slides.deck': 'Deck',
    'slides.open': 'Open deck',
    'slides.readConcept': 'Read the concept',
    'slides.prev': 'Previous slide',
    'slides.next': 'Next slide',
    'slides.contents': 'Contents',
    'slides.menu': 'Menu',
    'slides.print': 'Print / PDF',
    'slides.fullscreen': 'Fullscreen',
    'slides.zoom': 'Enlarge',
    'slides.close': 'Close',
    'slides.overview': 'Overview',
    'sample.title': 'Samples',
    'sample.tagline':
      'The runnable mini-projects behind the catalog — download a folder and run it with Docker.',
    'sample.usedBy': 'Used by',
    'sample.related': 'Related sample',
    'sample.search': 'Search samples…',
    'sample.searchAll': 'Title + body',
    'sample.searchTitle': 'Title',
    'sample.searchBody': 'Body',
    'sample.tools': 'Source tools',
    'sample.noResults': 'No matching samples.',
    'glossary.title': 'Glossary',
    'glossary.tagline': 'Terms used across the catalog and concepts, each linked to its page.',
    'glossary.tool': 'Tools',
    'glossary.concept': 'Concepts',
    'glossary.article': 'Writing',
    'glossary.term': 'Terms',
    'glossary.external': 'External',
    'glossary.search': 'Search terms…',
    'glossary.noResults': 'No matching terms.',
    'search.placeholder': 'Search tools…',
    'concept.title': 'Concepts',
    'concept.tagline': 'Patterns that compose catalog tools into a working AI stack.',
    'concept.empty': 'No concepts yet.',
    'concept.usedTools': 'Tools it uses',
    'concept.relatedConcepts': 'Related concepts',
    'concept.learnMore': 'Learn more',
    'concept.backToConcepts': 'All concepts',
    'concept.updated': 'Updated',
    'detail.usedInConcepts': 'Used in concepts',
    'sort.label': 'Sort',
    'sort.alpha': 'A–Z',
    'sort.recent': 'Recently updated',
    'sort.stars': 'Stars',
    'list.seeAll': 'See all {n}',
    'filter.clear': 'Clear',
    'view.label': 'View',
    'view.standard': 'Standard',
    'view.gallery': 'Gallery',
    'filter.updated': 'Last updated',
    'updated.all': 'Show all',
    'updated.6m': 'Within 6 months',
    'updated.1y': 'Within 1 year',
    'updated.2y': 'Within 2 years',
    'results.none': 'No tools match.',
    'detail.allTools': 'All tools',
    'detail.website': 'Website',
    'detail.repository': 'Repository',
    'detail.docs': 'Docs',
    'detail.language': 'Language',
    'detail.license': 'License',
    'detail.pricing': 'Pricing',
    'detail.source': 'Source',
    'detail.asOf': 'as of',
    'detail.plan': 'Plan',
    'detail.price': 'Price',
    'detail.notes': 'Notes',
    'pricing.stale': 'Prices not checked in 1+ year',
    'pricing.staleHint': 'Pricing was last verified more than a year ago — may be out of date',
    'pricing.aging': 'Prices not checked in 6+ months',
    'pricing.agingHint': 'Pricing was last verified more than six months ago — may be out of date',
    'detail.relatedWriting': 'Related writing',
    'detail.relatedTools': 'Related tools',
    'blog.title': 'Writing',
    'blog.tagline': 'Notes and comparisons on building AI systems, linked to the tools they discuss.',
    'blog.empty': 'No posts yet.',
    'article.backToBlog': 'All writing',
    'article.referencedTools': 'Tools in this article',
    'theme.label': 'Theme',
    'theme.system': 'System',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'tab.overview': 'Overview',
    'tab.pricing': 'Pricing',
    'tab.code': 'Code samples',
    'tab.impl': 'Implementation',
    'project.intro': 'A real, runnable mini-project. Download it and run with Docker.',
    // Rendered around the folder path: "View samples/<folder> on GitHub".
    'project.viewOnGitHubPre': 'View',
    'project.viewOnGitHubPost': 'on GitHub',
    // Dev-only twin: "View samples/<folder> locally".
    'project.viewLocallyPre': 'View',
    'project.viewLocallyPost': 'locally',
    'project.example': 'Example',
    'project.files': 'Files',
    'project.relatedTools': 'Related tools',
    'project.unregistered': 'Not in our catalog',
    'project.readmeExpand': 'Show README',
    'project.readmeCollapse': 'Hide README',
    'sample.example': 'Example',
    'sample.diagram': 'Structure',
    'tag.heading': 'Tag',
    'tag.allTools': 'All tools',
    'detail.vendor': 'Vendor',
    'vendor.heading': 'By',
    'toc.onThisPage': 'On this page',
    'toc.collapseAll': 'Collapse all',
    'toc.expandAll': 'Expand all',
    'toc.versions': 'Versions',
    'meta.released': 'Last release',
    'meta.updated': 'Updated',
    'meta.docVersion': 'Doc version',
    'collapse.more': '+{n} more',
    'collapse.less': 'Show less',
    'meta.deprecated': 'Maintenance only',
    'meta.stale': 'No updates in 1+ year',
    'meta.staleHint': 'The latest release is more than a year old',
    'meta.formerly': 'Formerly',
    'meta.aging': 'No updates in 6+ months',
    'meta.agingHint': 'The latest release is more than six months old',
    'top.label': 'Back to top',
    'footer.builtWith': 'Built with',
    'footer.contribute': 'Contributions welcome — add a tool by dropping an MDX file.',
  },
  ko: {
    'site.tagline':
      'AI 시스템을 만들 때 실제로 쓰는 도구와 서비스를 모았습니다 — 각 항목마다 상세 페이지와 바로 실행 가능한 샘플 코드를 제공합니다.',
    'nav.browse': '둘러보기',
    'nav.concepts': '개념',
    'nav.blog': '글',
    'nav.samples': '샘플',
    'nav.slides': '슬라이드',
    'nav.backToTop': '맨 위로',
    'nav.glossary': '용어집',
    'nav.language': '언어',
    'nav.menu': '메뉴',
    'code.copy': '코드 복사',
    'code.copied': '복사됨',
    'private.badge': '비공개',
    'private.locked': '비공개 콘텐츠입니다. 로그인 후 볼 수 있습니다.',
    'private.id': '아이디',
    'private.password': '비밀번호',
    'private.submit': '잠금 해제',
    'private.error': '아이디 또는 비밀번호가 올바르지 않습니다.',
    'private.logout': '로그아웃',
    'slides.title': '슬라이드',
    'slides.tagline': '개념 덱 — 개념 페이지와 같은 내용을 슬라이드로 옮겼습니다.',
    'slides.deck': '덱',
    'slides.open': '덱 열기',
    'slides.readConcept': '개념 문서 보기',
    'slides.prev': '이전 슬라이드',
    'slides.next': '다음 슬라이드',
    'slides.contents': '목차',
    'slides.menu': '메뉴',
    'slides.print': '인쇄 / PDF',
    'slides.fullscreen': '전체화면',
    'slides.zoom': '크게 보기',
    'slides.close': '닫기',
    'slides.overview': '한눈에 보기',
    'sample.title': '샘플',
    'sample.tagline': '카탈로그 뒤의 실행 가능한 미니 프로젝트 — 폴더를 받아 Docker로 실행해 보세요.',
    'sample.usedBy': '이 샘플을 쓰는 곳',
    'sample.related': '관련 샘플',
    'sample.search': '샘플 검색…',
    'sample.searchAll': '제목+내용',
    'sample.searchTitle': '제목',
    'sample.searchBody': '내용',
    'sample.tools': '사용 도구',
    'sample.noResults': '일치하는 샘플이 없습니다.',
    'glossary.title': '용어집',
    'glossary.tagline': '카탈로그와 개념 전반에서 쓰는 용어, 그리고 각 용어가 가리키는 페이지.',
    'glossary.tool': '도구',
    'glossary.concept': '개념',
    'glossary.article': '글',
    'glossary.term': '용어',
    'glossary.external': '외부',
    'glossary.search': '용어 검색…',
    'glossary.noResults': '일치하는 용어가 없습니다.',
    'search.placeholder': '도구 검색…',
    'concept.title': '개념',
    'concept.tagline': '카탈로그의 도구를 엮어 동작하는 AI 스택을 구성하는 패턴.',
    'concept.empty': '아직 개념이 없습니다.',
    'concept.usedTools': '쓰는 도구',
    'concept.relatedConcepts': '관련 개념',
    'concept.learnMore': '더 알아보기',
    'concept.backToConcepts': '개념 전체',
    'concept.updated': '업데이트',
    'detail.usedInConcepts': '이 도구가 쓰이는 개념',
    'sort.label': '정렬',
    'sort.alpha': '이름순',
    'sort.recent': '최근 업데이트순',
    'list.seeAll': '전체 {n}개',
    'sort.stars': 'Star순',
    'filter.clear': '초기화',
    'view.label': '보기',
    'view.standard': '표준',
    'view.gallery': '갤러리',
    'filter.updated': '최신 업데이트',
    'updated.all': '전체보기',
    'updated.6m': '최근 6개월 이내',
    'updated.1y': '최근 1년 이내',
    'updated.2y': '최근 2년 이내',
    'results.none': '조건에 맞는 도구가 없습니다.',
    'detail.allTools': '전체 도구',
    'detail.website': '웹사이트',
    'detail.repository': '저장소',
    'detail.docs': '문서',
    'detail.language': '언어',
    'detail.license': '라이선스',
    'detail.pricing': '가격',
    'detail.source': '출처',
    'detail.asOf': '기준일',
    'detail.plan': '플랜',
    'detail.price': '가격',
    'detail.notes': '비고',
    'pricing.stale': '가격 1년 이상 미확인',
    'pricing.staleHint': '가격을 마지막으로 확인한 지 1년이 지나, 현재가와 다를 수 있습니다',
    'pricing.aging': '가격 6개월 이상 미확인',
    'pricing.agingHint': '가격을 마지막으로 확인한 지 6개월이 지나, 현재가와 다를 수 있습니다',
    'detail.relatedWriting': '관련 글',
    'detail.relatedTools': '관련 도구',
    'blog.title': '글',
    'blog.tagline': 'AI 시스템 구축에 관한 노트와 비교 — 다루는 도구로 바로 연결됩니다.',
    'blog.empty': '아직 글이 없습니다.',
    'article.backToBlog': '전체 글',
    'article.referencedTools': '이 글에서 다루는 도구',
    'theme.label': '테마',
    'theme.system': '시스템',
    'theme.light': '라이트',
    'theme.dark': '다크',
    'tab.overview': '설명',
    'tab.pricing': '가격',
    'tab.code': '코드 샘플',
    'tab.impl': '구현 샘플',
    'project.intro': '실제로 실행 가능한 미니 프로젝트입니다. 받아서 Docker로 실행해 보세요.',
    // 폴더 경로를 감싸 렌더됨: "GitHub에서 samples/<folder> 보기".
    'project.viewOnGitHubPre': 'GitHub에서',
    'project.viewOnGitHubPost': '보기',
    // dev 전용 쌍둥이: "로컬에서 samples/<folder> 보기".
    'project.viewLocallyPre': '로컬에서',
    'project.viewLocallyPost': '보기',
    'project.example': '예제',
    'project.files': '파일',
    'project.relatedTools': '관련 도구',
    'project.unregistered': '목록에 없는 도구',
    'project.readmeExpand': '본문 펼치기',
    'project.readmeCollapse': '본문 접기',
    'sample.example': '예제',
    'sample.diagram': '구조',
    'tag.heading': '태그',
    'tag.allTools': '전체 도구',
    'detail.vendor': '만든 곳',
    'vendor.heading': '만든 곳',
    'toc.onThisPage': '목차',
    'toc.collapseAll': '모두 접기',
    'toc.expandAll': '모두 펼치기',
    'toc.versions': '버전',
    'meta.released': '최신 릴리스',
    'meta.updated': '업데이트',
    'meta.docVersion': '문서버전',
    'collapse.more': '+{n}개 더 보기',
    'collapse.less': '접기',
    'meta.deprecated': '유지보수 전용',
    'meta.stale': '1년 이상 업데이트 없음',
    'meta.staleHint': '최신 릴리스가 1년 이상 지났습니다',
    'meta.formerly': '이전',
    'meta.aging': '6개월 이상 업데이트 없음',
    'meta.agingHint': '최신 릴리스가 6개월 이상 지났습니다',
    'top.label': '맨 위로',
    'footer.builtWith': '제작 도구:',
    'footer.contribute': '기여를 환영합니다 — MDX 파일 하나만 추가하면 도구가 등록됩니다.',
  },
} as const;

export type UIKey = keyof (typeof ui)['en'];

/**
 * Returns a `t(key)` translator bound to the given language. Lookup order:
 * the site's override for this locale, the theme string for this locale, then
 * the same two for the default locale, then the key itself. The default-locale
 * fallback is what lets a site add a locale (e.g. `ja`) and supply only some
 * strings via `site.ui.ja` — the rest degrade to the default locale instead of
 * throwing on a locale the theme doesn't ship.
 */
export function useTranslations(lang: Lang) {
  return function t(key: UIKey): string {
    return (
      site.ui?.[lang]?.[key] ??
      (ui as Record<string, Partial<Record<UIKey, string>>>)[lang]?.[key] ??
      site.ui?.[defaultLang]?.[key] ??
      (ui as Record<string, Partial<Record<UIKey, string>>>)[defaultLang]?.[key] ??
      key
    );
  };
}

/** Localized label for a `pricing` enum value, falling back to the default
 *  locale then the raw value (so a site-added locale never crashes). */
export function pricingLabel(lang: Lang, value: string): string {
  return pricingLabels[lang]?.[value] ?? pricingLabels[defaultLang]?.[value] ?? value;
}

/** Human labels for the `pricing` frontmatter enum, per locale. */
export const pricingLabels: Record<string, Record<string, string>> = {
  en: {
    'completely-free': 'Completely free',
    'open-source': 'Open source',
    'free-tier': 'Free tier',
    paid: 'Paid',
    free: 'Free',
  },
  ko: {
    'completely-free': '완전 무료',
    'open-source': '오픈소스',
    'free-tier': '무료 티어',
    paid: '유료',
    free: '무료',
  },
};

/** Descriptive (non-name) licenses get localized; real license names pass through. */
const licenseLabels: Record<string, Record<string, string>> = {
  en: { proprietary: 'Proprietary' },
  ko: { proprietary: '독점' },
};
export function licenseLabel(lang: Lang, value: string): string {
  return licenseLabels[lang]?.[value] ?? licenseLabels[defaultLang]?.[value] ?? value;
}
