# Design: private content (login-gated entries)

Status: **design final — not implemented yet.** All decisions settled; see
"Decisions" at the bottom. Target: a minor release after v1.13.0.

## Goal

Any collection entry (stacks, concepts, articles, slides, pages) can be marked
`private: true` in frontmatter. Visitors see it in listings as **title + lock**;
opening it shows a login form instead of the body. Users are managed in `.env`
(no server, no signup flow) so the site keeps deploying to any static host —
GitHub Pages, Firebase Hosting, anything.

```yaml
---
title: 레이아웃 샘플
private: true # ← the whole feature, from the author's side
---
```

```bash
# .env.sample
# Users allowed to read private entries — "id:password", comma-separated.
# Real values go in .env (gitignored); in CI, set this as a secret.
AAS_PRIVATE_USERS="alice:use-a-long-passphrase,bob:another-long-one"
```

## The constraint that shapes everything

A static host has no server: every byte we deploy is publicly fetchable. A
JS-only "hide unless logged in" gate is not protection — the body would sit in
the HTML source. The only honest options are (a) don't ship the content at all,
or (b) **ship it encrypted and decrypt in the browser**. We do (b), the
StatiCrypt approach: real cryptography, zero infrastructure.

## Threat model (what this does and doesn't protect)

Protected:

- Body confidentiality against anyone who can fetch the **deployed** files —
  the built output contains ciphertext only, so the public site URL is safe on
  any host.

**The source repository must be private.** Encryption happens at build time;
the `.mdx` sources stay plaintext in the repo (that's also how you edit — see
"Authoring workflow"). A public repo would expose every private entry's source
regardless of what the deployed site does — and anything once pushed to a
public repo stays in its git history. The intended setup is a private repo
deploying to a public URL (Firebase Hosting, or GitHub Pages on a paid plan).
The build should print a reminder when private entries exist.

Deliberately public (by the chosen listing mode):

- The **title** and existence of each private entry (listings show title + 🔒).
  Description, body, headings, images referenced only from the body: private.

Not protected (inherent to any scheme without a server):

- A registered user sharing the password or the decrypted content.
- Revocation: removing a user or rotating keys requires rebuild + redeploy.
  That's acceptable at ".env user list" scale.
- Weak passwords: the wrapped key can be brute-forced offline. The build should
  refuse passwords shorter than ~10 chars.

## Authoring workflow

Nothing changes for the author. Sources are plaintext `.mdx`, edited and
previewed as usual; only the **build output** is encrypted:

```text
src/content/slides/ko/secret/index.mdx   ← plaintext, in the (private) repo
        │  astro build (encrypts with the .env-derived key)
        ▼
dist/ko/slides/secret/index.html         ← ciphertext, deployed
```

In `astro dev` the gate is skipped: the entry renders as plaintext with a
visible "🔒 private" banner, so authors preview without logging in (dev is
localhost; the banner prevents forgetting an entry is private).

## Cryptography

One content key per build; per-user wrapping; standard WebCrypto primitives.

- **Content key `K`**: 32 random bytes, generated at build (Node `crypto`).
- **Page body**: rendered HTML → AES-256-GCM with `K`, fresh IV per page →
  base64 ciphertext embedded in the page.
- **Per user**: `KEK = PBKDF2-SHA256(password, salt_user, 600k iters)`;
  `wrappedK = AES-GCM(KEK, K)`. Published record:
  `{ idHash, salt_user, iv, wrappedK }` where
  `idHash = SHA-256(build_salt + lowercase(id))` — so the deployed site doesn't
  expose the raw user list.
- **Login (browser)**: enter id + password → find record by `idHash` → derive
  KEK (WebCrypto PBKDF2, same params) → unwrap `K` → cache `K` in
  `localStorage` (`aas:pk`, stored with a login timestamp) → decrypt this and
  every other private page without re-login. Logout button clears it.
- **Session expiry**: configurable via `AAS_PRIVATE_SESSION_DAYS` (default 30).
  The client compares the stored timestamp on each page load and drops the key
  past the limit → the login form reappears. This is client-side UX/hygiene for
  shared machines, not enforcement (the ciphertext never changes until a
  rebuild); `0` = no expiry.
- The user records are **inlined into each private page** (~120 bytes/user) —
  no extra manifest fetch, no ordering problems.

One `K` for the whole site is intentional: any registered user may read all
private entries (no per-user ACL in v1), and one login unlocks everything.

## What exactly is public vs private on a private entry

| Surface | Treatment |
| --- | --- |
| Listing cards (home, index, category, tags, vendors, related-*) | Title + 🔒 badge; description and other card meta omitted. If the entry authors a `teaser`, it shows in the description's place — `teaser` is **explicitly public** copy, written for the gate |
| Client-side search/filter | Runs over the rendered cards, so it can only match the title (+ teaser) — nothing to do |
| Detail page `<head>` | `<title>` keeps the entry title; meta description only from `teaser` (if any); `noindex` robots meta |
| Detail page body | Ciphertext + login form (site chrome — header/nav/footer — stays) |
| TOC rail | Headings would leak: not server-rendered; rebuilt client-side after decryption |
| Sitemap | Private URLs excluded |
| Wikilinks pointing at a private entry | Resolve normally (target title is public); the reader hits the login gate on arrival |
| Glossary | **Out of scope in v1** — terms are data on one shared page, not entries; a private glossary term has no clean unit to encrypt |

## Build-time flow

1. **Schema**: add to all five collections in `src/content.ts`:
   `private: z.boolean().default(false)` and `teaser: z.string().optional()`
   (public one-liner for cards/meta on a private entry; ignored when the entry
   is public — `description` already serves that role). The gate page also
   shows the teaser above the login form so visitors know what they're
   unlocking.
2. **`PrivateGate.astro`** (theme component): detail components wrap their body
   in it when `entry.data.private`. It calls `await Astro.slots.render('default')`
   (Astro 5 API) to get the body HTML as a string server-side, encrypts it with
   `K`, and emits: ciphertext + user records + the login form + the client
   script. If the visitor already has `K` cached, the script decrypts on load
   with no flash of the form.
3. **Users/keys**: read `AAS_PRIVATE_USERS` from `process.env` (the site loads
   `.env` however it likes; document `.env` + CI secret). Module-level singleton
   in the theme derives `K` and the records once per build.
4. **Fail loud**: if any entry is `private: true` and `AAS_PRIVATE_USERS` is
   unset/empty → **build error** (not a silently locked-forever page). Password
   under the minimum length → build error naming the user id, not the password.
5. **Cards/sitemap**: card components receive the `private` flag (lock badge,
   omit description); sitemap filter drops private URLs.

## Client runtime

One small script (loaded only by pages/cards that need it):

- Login submit → WebCrypto PBKDF2 → AES-GCM unwrap → decrypt → inject HTML →
  dispatch **`aas:private-decrypted`** on `document`.
- Re-init hooks listen for that event, because the injected HTML missed the
  initial page scripts: mermaid render, copy-button mounting (BaseLayout), and
  the slide deck engine (DeckView queries `[data-deck]`/`.aas-slide` at load —
  its init must be wrapped in a function and re-invoked). This is the riskiest
  part of the implementation; slides especially.
- Wrong id/password → inline error (`private.error` string); no lockout
  (offline attackers aren't slowed by UI anyway — password strength is the
  defense).

## i18n

New UI strings (en/ko in theme; sites add others via `site.ui`):
`private.locked`, `private.login`, `private.id`, `private.password`,
`private.submit`, `private.error`, `private.logout`, `private.badge`.

## Decisions (all settled — design final)

- **Hosting model**: private repo + public deploy URL; the build warns when
  private entries exist (see threat model).
- **Session expiry**: configurable `AAS_PRIVATE_SESSION_DAYS`, default 30,
  `0` disables (see Cryptography).
- **Slides included in v1**. The theme can't assume which sections a site
  uses, so every collection gets the flag from the start. Cost: DeckView's
  inline init must be refactored into a re-invokable function driven by the
  `aas:private-decrypted` event — the implementation's main risk, planned as
  its own step with its own verification.
- **`teaser` field included in v1** (public card/meta copy for a private
  entry), same reasoning — both behaviors must exist for site builders to
  choose from. No teaser → title + lock only.

## Non-goals (v1)

- Per-user or per-entry permissions (groups, roles).
- Server-verified auth, rate limiting, audit logs — impossible statically.
- Encrypting images/assets referenced by private bodies (they ship as normal
  files; guessable only by URL. Documented limitation; a determined site can
  put private images in the body as embedded data if needed).
- Glossary terms.
