import { site } from '@aas-data/site';
/**
 * Build-time GitHub stats. Given a repo URL, fetch star count and the latest
 * release/tag from the GitHub API so cards/detail reflect the project's real
 * state as of the last build — no manual entry.
 *
 * Results are memoized per repo for the process, so the same repo is fetched
 * once even though it appears across locales and on both card + detail. Any
 * failure (offline, rate limit, no repo) degrades gracefully to `null`.
 *
 * In CI, set GITHUB_TOKEN to lift the unauthenticated 60 req/hour limit.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export interface RepoStats {
  stars: number;
  version?: string;
  releasedAt?: string; // ISO date of the latest release (YYYY-MM-DD usable via slice)
}

const cache = new Map<string, Promise<RepoStats | null>>();

// On-disk cache so values survive rate-limited builds and so we only hit the
// API ~once a day per repo. A fresh entry (< TTL) is used as-is without
// fetching; a stale entry is refreshed but kept as a fallback on failure.
type CachedStats = RepoStats & { fetchedAt: number };
const ONE_DAY = 24 * 60 * 60 * 1000;
const CACHE_DIR = '.aas-cache';
const CACHE_FILE = `${CACHE_DIR}/github.json`;
let disk: Record<string, CachedStats> = {};
try {
  disk = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
} catch {
  /* no cache yet */
}
function strip(c: CachedStats): RepoStats {
  return { stars: c.stars, version: c.version, releasedAt: c.releasedAt };
}
function persist() {
  try {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(disk));
  } catch {
    /* read-only fs — skip */
  }
}

function parseRepo(url?: string): { owner: string; repo: string } | null {
  if (!url) return null;
  const m = url.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': site.buildUserAgent,
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/** Normalize a tag like "0.2.1" or "v0.2.1" to a displayed "v0.2.1". */
function normalizeVersion(tag?: string): string | undefined {
  if (!tag) return undefined;
  const t = tag.trim();
  return /^v\d/i.test(t) ? t : /^\d/.test(t) ? `v${t}` : t;
}

type FetchedStats = RepoStats & {
  // False when the release/tag lookups errored (rate limit, network) — the
  // version fields are then *unknown*, not known-absent, and must not
  // overwrite a previously cached version.
  versionResolved: boolean;
};

async function fetchStats(owner: string, repo: string): Promise<FetchedStats | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: headers() });
    if (!res.ok) return null;
    const data = (await res.json()) as { stargazers_count?: number };
    const stars = typeof data.stargazers_count === 'number' ? data.stargazers_count : 0;

    let version: string | undefined;
    let releasedAt: string | undefined;
    let versionResolved = false;
    const rel = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
      headers: headers(),
    });
    if (rel.ok) {
      const data = await rel.json();
      version = normalizeVersion(data.tag_name);
      releasedAt = data.published_at; // e.g. "2026-05-12T09:00:00Z"
      versionResolved = true;
    } else if (rel.status === 404) {
      // 404 = the repo genuinely has no releases — fall back to the most
      // recent tag. Anything else (403 rate limit, 5xx) means we don't know,
      // so skip the fallback and leave versionResolved false.
      // Tags carry no date, so fetch the commit they point to for the date.
      const tags = await fetch(`https://api.github.com/repos/${owner}/${repo}/tags?per_page=1`, {
        headers: headers(),
      });
      if (tags.ok) {
        versionResolved = true;
        const tag = (await tags.json())[0];
        version = normalizeVersion(tag?.name);
        if (tag?.commit?.url) {
          const commit = await fetch(tag.commit.url, { headers: headers() });
          if (commit.ok) {
            const c = await commit.json();
            releasedAt = c.commit?.committer?.date ?? c.commit?.author?.date;
          }
        }
      }
    }
    return { stars, version, releasedAt, versionResolved };
  } catch {
    return null;
  }
}

export function getRepoStats(repoUrl?: string): Promise<RepoStats | null> {
  const slug = parseRepo(repoUrl);
  if (!slug) return Promise.resolve(null);
  const key = `${slug.owner}/${slug.repo}`;
  if (!cache.has(key)) {
    const cached = disk[key];
    if (cached && Date.now() - cached.fetchedAt < ONE_DAY) {
      // Fresh enough — use the cache, skip the network (refreshes ~daily).
      cache.set(key, Promise.resolve(strip(cached)));
    } else {
      cache.set(
        key,
        fetchStats(slug.owner, slug.repo).then((stats) => {
          if (stats) {
            const { versionResolved, ...fresh } = stats;
            if (!versionResolved && cached?.version) {
              // Partial refresh (stars OK, release lookup rate-limited):
              // keep the last known release info instead of clobbering it.
              fresh.version = cached.version;
              fresh.releasedAt = cached.releasedAt;
            }
            disk[key] = { ...fresh, fetchedAt: Date.now() };
            persist();
            return fresh;
          }
          return cached ? strip(cached) : null; // rate-limited/offline → last known
        }),
      );
    }
  }
  return cache.get(key)!;
}

const SIX_MONTHS = 182 * ONE_DAY;
const ONE_YEAR = 365 * ONE_DAY;

/** How long since a project's last release: fresh, aging (6m+), or stale (1y+). */
export type Staleness = 'fresh' | 'aging' | 'stale';

/**
 * Tier the given date by age — a "no recent updates" signal. Fed the latest
 * release/tag date (the same date shown in the UI), so the warning is
 * consistent with what users see: `stale` past a year (stronger), `aging` past
 * six months (milder). Unknown or unparseable dates are treated as fresh.
 */
export function stalenessOf(date?: string): Staleness {
  if (!date) return 'fresh';
  const t = Date.parse(date);
  if (Number.isNaN(t)) return 'fresh';
  const age = Date.now() - t;
  if (age > ONE_YEAR) return 'stale';
  if (age > SIX_MONTHS) return 'aging';
  return 'fresh';
}

/** Compact star count, one decimal: 1234 → "1.2k", 35456 → "35.5k",
 *  1200000 → "1.2M". The k→M cutover sits where k would round to "1000.0k". */
export function formatStars(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  if (k < 999.95) return k.toFixed(1) + 'k';
  return (n / 1_000_000).toFixed(1) + 'M';
}
