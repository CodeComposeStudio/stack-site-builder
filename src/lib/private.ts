/**
 * Build-side half of private (login-gated) content. Runs only during
 * `astro build` / `astro dev` (Node): derives the site content key, wraps it
 * per user, and encrypts rendered HTML. The browser half (login + decrypt)
 * lives in ./private-client.ts; the whole design is documented in
 * docs/private-content-design.md.
 *
 * Env contract (see .env.sample in a consuming site):
 *   AAS_PRIVATE_USERS         "id:password,id2:password2" (plaintext passwords)
 *   AAS_PRIVATE_MASTER_SECRET stable secret K derives from; rotate = global logout
 *   AAS_PRIVATE_SESSION_DAYS  client session lifetime in days (0 = never; default 30)
 */
import { createCipheriv, createHash, hkdfSync, pbkdf2Sync, randomBytes } from 'node:crypto';

/** Must match private-client.ts. */
export const KDF_ITERATIONS = 600_000;
const HKDF_INFO = 'aas-private-v1';
const MIN_PASSWORD_LENGTH = 10;

export interface PrivateUserRecord {
  /** SHA-256(buildSalt + lowercase(id)), hex — the deployed site never carries raw ids. */
  h: string;
  /** PBKDF2 salt, base64. */
  s: string;
  /** AES-GCM IV for the wrapped key, base64. */
  iv: string;
  /** wrappedK = AES-256-GCM(KEK, K) with auth tag appended, base64. */
  w: string;
}

const b64 = (b: Buffer | Uint8Array) => Buffer.from(b).toString('base64');

interface PrivateConfig {
  key: Buffer; // K — the site content key
  users: PrivateUserRecord[];
  buildSalt: string; // base64; used by the client to hash the entered id
  sessionDays: number;
}

let cached: PrivateConfig | null = null;

/**
 * Parse env + derive keys, once per build. Throws (failing the build loudly)
 * when private entries exist but the env contract isn't met — a misconfigured
 * build must not ship silently locked-forever pages.
 */
function getConfig(): PrivateConfig {
  if (cached) return cached;

  const secret = process.env.AAS_PRIVATE_MASTER_SECRET?.trim();
  const usersRaw = process.env.AAS_PRIVATE_USERS?.trim();
  if (!secret || !usersRaw) {
    throw new Error(
      '[private] this site has `private: true` entries, but AAS_PRIVATE_MASTER_SECRET ' +
        'and/or AAS_PRIVATE_USERS is not set. Set both in .env (locally) or as CI ' +
        'secrets — see docs/private-content-design.md.',
    );
  }

  // K derives from the master secret (not random): ordinary redeploys keep
  // logged-in devices working; rotating the secret is the global-logout switch.
  const key = Buffer.from(hkdfSync('sha256', secret, 'aas-private', HKDF_INFO, 32));

  const buildSaltBytes = randomBytes(16);
  const users: PrivateUserRecord[] = [];
  const seen = new Set<string>();
  for (const pair of usersRaw.split(',')) {
    const idx = pair.indexOf(':');
    if (idx < 1) throw new Error(`[private] AAS_PRIVATE_USERS entry is not "id:password": "${pair.trim()}"`);
    const id = pair.slice(0, idx).trim().toLowerCase();
    const password = pair.slice(idx + 1).trim();
    if (seen.has(id)) throw new Error(`[private] duplicate user id "${id}" in AAS_PRIVATE_USERS`);
    seen.add(id);
    if (password.length < MIN_PASSWORD_LENGTH)
      throw new Error(
        `[private] password for user "${id}" is shorter than ${MIN_PASSWORD_LENGTH} chars — ` +
          'wrapped keys can be brute-forced offline, use a long passphrase',
      );
    const salt = randomBytes(16);
    const kek = pbkdf2Sync(password, salt, KDF_ITERATIONS, 32, 'sha256');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', kek, iv);
    const wrapped = Buffer.concat([cipher.update(key), cipher.final(), cipher.getAuthTag()]);
    users.push({
      h: createHash('sha256').update(Buffer.concat([buildSaltBytes, Buffer.from(id)])).digest('hex'),
      s: b64(salt),
      iv: b64(iv),
      w: b64(wrapped),
    });
  }

  const daysRaw = process.env.AAS_PRIVATE_SESSION_DAYS?.trim();
  const sessionDays = daysRaw === undefined || daysRaw === '' ? 30 : Number(daysRaw);
  if (!Number.isFinite(sessionDays) || sessionDays < 0)
    throw new Error(`[private] AAS_PRIVATE_SESSION_DAYS must be a number ≥ 0 (got "${daysRaw}")`);

  console.warn(
    '[private] this build contains private entries — remember: the SOURCE repo must be ' +
      'private (the .mdx files are plaintext); only the built output is encrypted.',
  );

  cached = { key, users, buildSalt: b64(buildSaltBytes), sessionDays };
  return cached;
}

/** Everything PrivateGate embeds for the client (records are ~120 bytes/user). */
export function privateClientData(): { users: PrivateUserRecord[]; salt: string; days: number } {
  const { users, buildSalt, sessionDays } = getConfig();
  return { users, salt: buildSalt, days: sessionDays };
}

/** AES-256-GCM encrypt rendered HTML with the site content key. */
export function encryptHtml(html: string): { iv: string; ct: string } {
  const { key } = getConfig();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(html, 'utf8'), cipher.final(), cipher.getAuthTag()]);
  return { iv: b64(iv), ct: b64(ct) };
}

/**
 * Pathname registry for the sitemap filter: PrivateGate records every private
 * page it renders; index.mjs (a separate module graph — hence globalThis) reads
 * it in the sitemap `filter`, which @astrojs/sitemap runs after the pages built.
 */
export function registerPrivatePath(pathname: string): void {
  const g = globalThis as { __aasPrivatePaths?: Set<string> };
  (g.__aasPrivatePaths ??= new Set()).add(pathname.replace(/\/?$/, '/'));
}
