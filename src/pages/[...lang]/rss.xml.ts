import rss from '@astrojs/rss';
import type { APIContext, GetStaticPaths } from 'astro';
import { getRelativeLocaleUrl } from 'astro:i18n';
import { site } from '@aas-data/site';
import { getArticles, articleSlugOf } from '../../lib/articles';
import { allLocales, langParam } from '../../lib/locales';
import { useTranslations } from '../../i18n/ui';

// Per-locale RSS feed of the articles collection: /rss.xml (default locale)
// and /<code>/rss.xml. Injected with the `articles` section, so a site that
// turns the blog off has no feed either.
export const getStaticPaths = (() =>
  allLocales.map((lang) => ({
    params: { lang: langParam(lang) },
    props: { lang },
  }))) satisfies GetStaticPaths;

export async function GET(context: APIContext) {
  const { lang } = context.props as { lang: string };
  const t = useTranslations(lang);
  if (!context.site) {
    throw new Error('RSS needs `site` set in astro.config (it already powers the sitemap).');
  }
  // getArticles drops drafts; private entries stay out of the feed entirely,
  // mirroring the sitemap's private-page filter.
  const articles = (await getArticles(lang)).filter((a) => !a.data.private);
  return rss({
    title: `${site.name} — ${t('blog.title')}`,
    description: t('blog.tagline'),
    site: context.site,
    customData: `<language>${lang}</language>`,
    items: articles.map((a) => ({
      title: a.data.title,
      description: a.data.description,
      pubDate: a.data.date,
      // Locale-relative and base-aware; rss() resolves it against `site`.
      link: getRelativeLocaleUrl(lang, `article/${articleSlugOf(a)}/`),
    })),
  });
}
