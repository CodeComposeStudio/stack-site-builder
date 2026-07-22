# stack-site-builder

> 이 문서는 [README.md](../README.md)의 한국어판입니다. 내용이 다를 경우 영어판이
> 기준입니다.

큐레이션형 "awesome 스택" 카탈로그 사이트를 위한 [Astro](https://astro.build)
테마입니다 — 항목별 상세 페이지를 갖춘 도구 카탈로그, 개념, 글, 프레젠테이션
슬라이드, 실행 가능한 샘플, `[[위키링크]]` 용어집, 그리고 완전한 다국어(i18n)
지원. 이 테마가 자라난 사이트:
[awesome-ai-stack](https://github.com/codecompose7/awesome-ai-stack).

사이트는 콘텐츠와 데이터만 공급하고, 라우트·컴포넌트·스타일·마크다운
파이프라인은 전부 테마가 제공합니다.

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import aasTheme from 'stack-site-builder';
import { glossary } from './src/data/glossary.mjs';

export default defineConfig({
  site: 'https://example.github.io',
  base: '/my-stack',
  i18n: { locales: ['en', 'ko'], defaultLocale: 'en', routing: { prefixDefaultLocale: false } },
  integrations: [aasTheme({ glossary })],
});
```

```ts
// src/content.config.ts
import { defineAasCollections } from 'stack-site-builder/content';
import { categoryMap } from './data/categories';

export const collections = defineAasCollections({ categoryMap });
```

## 사이트가 공급하는 것

| 위치 | 내용 |
| --- | --- |
| `src/data/site.ts` | 사이트 정체성: 이름, 저장소 URL(`repoNav: false`면 헤더 GitHub 링크 숨김), 제공 `locales`, 선택적 `sections` 토글, 브라우저 아이콘(`icons: { favicon, appleTouch, manifest }`), `home` 템플릿, 로케일별 UI 문자열 오버라이드 |
| `src/data/categories.ts` | 도구 카탈로그 카테고리 트리 (콘텐츠와 대조 검증됨) |
| `src/data/concept-categories.ts` · `article-categories.ts` · `course-categories.ts` · `product-categories.ts` (옵트인) | 개념 / 글 / 강의 / 제품의 분류 체계 |
| `src/data/glossary.mjs` | `[[용어]]` 위키링크 대상 |
| `src/content/{stacks,concepts,courses,products,articles,slides}/` | 콘텐츠 — 로케일당 MDX 파일 하나 |
| `src/content/pages/` | 독립 최상위 페이지 (예: 소개/About). `/<slug>/`로 렌더되고 헤더 네비에 연결 가능 |
| `public/` · `samples/` | 로고/파비콘과 실행 가능한 샘플 프로젝트 |

테마는 integration이 설정하는 `@aas-data/*` 별칭으로 사이트의 데이터에
접근하므로, 위의 모든 것은 사이트마다 교체 가능합니다.

## 로케일

테마 기본값은 영어(루트)와 한국어(`/ko/`)지만, 로케일 구성은 사이트가
정합니다 — 설정된 각 로케일에 대해 하나의 소스에서 모든 라우트를 렌더합니다.
언어(예: 일본어)를 추가하려면:

1. astro.config의 `i18n.locales`에 추가합니다 (라우팅을 결정):
   `i18n: { locales: ['en', 'ko', 'ja'], defaultLocale: 'en', routing: { prefixDefaultLocale: false } }`.
   첫 번째/`defaultLocale`은 루트에서, 나머지는 `/<코드>/` 아래에서 서빙됩니다.
2. `src/data/site.ts`의 `locales`에 `{ code, label, dateLocale? }`을 추가해
   언어 전환기에 이름이 표시되고 날짜가 올바르게 포맷되게 합니다.
3. `src/data/site.ts`의 `site.ui.<코드>`에 UI 문자열을 공급합니다. 생략한
   키는 기본 로케일로 폴백됩니다. 콘텐츠
   (`src/content/<컬렉션>/<코드>/…`)·용어집·카테고리 라벨도 기존 로케일과
   같은 방식으로 번역을 추가합니다.

테마 파일은 하나도 바뀌지 않습니다 — 로케일 추가는 순전히 사이트 설정과
콘텐츠의 일입니다.

## 섹션

코어 카탈로그(홈, 도구 상세, 카테고리, 태그, 벤더)는 항상 켜져 있습니다.
나머지 — **개념, 글, 샘플, 슬라이드, 용어집**과 독립 **pages** 컬렉션(소개
등) — 는 끌 수 있어서, 사이트는 필요한 것만 담아 배포할 수 있습니다. 하나를
끄면 그 라우트와 헤더 네비 항목이 함께 사라집니다. (`pages`는 더 세밀한
제어도 가능: 각 페이지의 `nav` / `draft` 프런트매터, 또는 그냥 안 쓰기.)
**courses**만 유일하게 옵트인 섹션입니다 — 아래 참고.

토글은 `src/data/site.ts`에 한 번 선언하고, astro.config에서 테마로
전달합니다(라우트 주입을 건너뛰는 데 필요). 테마의 `SectionKey`를 import하면
`satisfies`가 입력 중에 유효한 키를 알려줍니다:

```ts
// src/data/site.ts
import type { SectionKey } from 'stack-site-builder';
export const site = {
  /* … */
  sections: { slides: false } satisfies Partial<Record<SectionKey, boolean>>,
};
```

```js
// astro.config.mjs
import { site } from './src/data/site';
integrations: [aasTheme({ glossary, sections: site.sections })];
```

## 강의 (옵트인)

가르치는 사이트를 위한 강의 섹션: 난이도 별점(`level` 1–5)·수강 시간(`hours`)
카드, 기수 정렬(`order`, 큰 값 우선 — 예: `"2601-01"`), 카테고리 탐색 페이지,
그리고 비공개 콘텐츠 장치를 그대로 쓰는 유료 강의(`private` + `teaser`)까지.
사이트 데이터가 필요하므로 기본은 꺼져 있고, 켜려면:

1. `src/data/site.ts`에 `sections: { courses: true }` (위처럼 `aasTheme`으로 전달).
2. `courseTree` / `courseCatOf`를 export하는 `src/data/course-categories.ts`
   추가 (`playground/src/data/course-categories.ts`를 복사해 트리만 수정).
3. 선택: `defineAasCollections({ categoryMap, courseCategoryMap })`으로 맵을
   넘기면 강의 카테고리 id가 빌드 시점에 검증됩니다.

콘텐츠는 `src/content/courses/<lang>/<slug>.mdx`. 라우트는 개념과 동일한
구조: `/course/`, `/course/<slug>/`, `/course/category/<id>/`.

## 제품 (옵트인)

`products` 컬렉션은 "우리가 제공하는 것"의 우산입니다 — 사이트측 미니
분류(앱, 서비스, 교육…)로 그룹핑되는 `/products/` 인덱스 아래에, 각 항목이
Things 스타일 마케팅 랜딩(`template: 'landing'`: 스토어 버튼·Product Hunt
배지 히어로, 디바이스 프레임·자동 회전 캐러셀의 교차 기능 소개, 비디오 테마
쇼케이스, 하이라이트 그리드, 가격표, CTA, 법적 링크 — 미디어는 `public/`
경로) 또는 일반 프로즈 페이지(외주 소개, 법적 서브페이지)로 렌더됩니다.
항목은 중첩 가능: `products/<lang>/flowstate.mdx` → `/products/flowstate/`,
`products/<lang>/flowstate/privacy.mdx` → `/products/flowstate/privacy/`.
로케일에 제품이 하나라도 있으면 헤더에 제품 링크가 자동으로 생기고,
`nav: true`면 개별 항목도 헤더에 노출됩니다.

켜려면 `sections: { products: true }`와 함께 `productTree` / `productCatOf`를
export하는 `src/data/product-categories.ts`가 필요하고(playground 것을 복사),
선택적으로 `defineAasCollections`에 `productCategoryMap`을 넘기면 카테고리
id가 빌드 시점에 검증됩니다. 전체 예시는 `playground/src/content/products/`
참고.

## 홈

기본 홈은 스택 카탈로그입니다. 카탈로그가 아닌 사이트는
`src/data/site.ts`에서 데이터 주도 홈으로 교체할 수 있습니다:

```ts
home: {
  template: 'cards',
  hero: { icon: '/img/logo.png', subtitle: { ko: '…', en: '…' } },
  cardsTitle: { ko: '앱', en: 'Apps' },
  cards: [{ href: '/products/flowstate/', name: 'FlowState', icon: '/img/icon.png',
            rounded: true, description: { ko: '…', en: '…' }, tags: ['iOS'] }],
  cta: { title: { … }, description: { … }, button: { label: { … }, href: '/course/' } },
},
```

로컬라이즈 값은 문자열 하나 또는 로케일별 레코드(기본 로케일 폴백)를
씁니다. cards 홈에서는 카탈로그로 앵커되는 헤더의 둘러보기 링크가 자동으로
숨겨집니다.

## 본문 컴포넌트

어느 컬렉션의 MDX 본문에서든 import해 쓰는 컴포넌트: `Bookmark`(링크 카드),
`Embed`(데모/영상용 반응형 iframe — `ratio`/`height`/`sandbox`),
`Lead`(리드 문단).

```mdx
import Bookmark from 'stack-site-builder/components/Bookmark.astro';

<Bookmark url="https://…" title="…" description="…" />
```

## RSS

articles 컬렉션의 피드가 `/rss.xml`(기본 로케일)과 `/<코드>/rss.xml`로
생성되고 `<link rel="alternate">`로 광고됩니다. 초안과 비공개 항목은
사이트맵과 마찬가지로 제외되며, `articles` 섹션이 켜져 있을 때만 주입됩니다.

## 비공개 콘텐츠

어떤 항목이든(도구, 개념, 글, 슬라이드, pages) 로그인을 요구할 수 있습니다:

```yaml
private: true
teaser: 카드와 로그인 폼 위에 표시되는 공개 한 줄 소개. # 선택
```

본문은 **암호화되어** 배포되고(AES-256-GCM, 사용자별 PBKDF2 키 래핑) 로그인
후 브라우저에서 복호화됩니다 — 서버가 필요 없어 어떤 정적 호스팅에서도
동작합니다. 목록에는 제목 + 🔒 (+ teaser)만 표시되고, 비공개 URL은
`noindex`가 붙고 사이트맵에서 제외됩니다. 사용자와 키는 환경변수로
관리합니다(`playground/.env.sample` 참고): `AAS_PRIVATE_USERS`
(`id:비밀번호,…`), `AAS_PRIVATE_MASTER_SECRET`(회전하면 모든 기기가
로그아웃됨), `AAS_PRIVATE_SESSION_DAYS`. 로컬은 `.env`, CI는 secrets로
설정합니다.

규칙 두 가지: **소스 저장소는 반드시 private**이어야 하고(`.mdx` 파일은
평문 — 암호화되는 건 빌드 산출물뿐), 사용자를 제거할 때는 마스터 시크릿도
함께 회전해야 합니다. 전체 설계: `private-content-design.md`.

## 배포 (secrets는 어디에 두나)

암호화는 `astro build`가 도는 곳에서 `process.env`를 읽어 수행됩니다 — 값의
출처만 환경마다 다를 뿐입니다:

| 빌드하는 곳 | `AAS_PRIVATE_*` 값의 위치 |
| --- | --- |
| 내 컴퓨터 (`pnpm build`, `firebase deploy`) | `.env` 파일 (gitignore — `.env.sample` 복사) |
| GitHub Actions (push 시 자동 배포) | **저장소 secrets**: Settings → Secrets and variables → Actions |

`.env`는 GitHub에 절대 올라가지 않습니다. CI에서는 워크플로가 저장소
secrets를 빌드 스텝의 환경변수로 매핑합니다:

```yaml
- name: Build
  run: pnpm install && pnpm build # 암호화는 이 시점에 수행됩니다
  env:
    AAS_PRIVATE_USERS: ${{ secrets.AAS_PRIVATE_USERS }}
    AAS_PRIVATE_MASTER_SECRET: ${{ secrets.AAS_PRIVATE_MASTER_SECRET }}
    AAS_PRIVATE_SESSION_DAYS: '30'
```

사이트가 복사해 쓸 수 있는 완성된 GitHub Pages 워크플로가
[`playground/.github/workflows/deploy.yml`](../playground/.github/workflows/deploy.yml)에
있습니다(playground 안에서는 실행되지 않는 견본 — 워크플로는 저장소 루트의
`.github/`에서만 동작합니다). 이후 사용자/키 관리는 git을 건드리지 않습니다:
secrets를 수정하고 워크플로를 재실행하면 끝. 비공개 콘텐츠가 없는 사이트는
이 설정이 전혀 필요 없습니다.
