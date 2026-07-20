# Release checklist

How to cut a new release of **`stack-site-builder`** (the npm package at the repo
root). The `playground/` workspace is `private` and is never published — it only
exists to build the theme against a renderable site.

Consuming sites track the theme with `pnpm up stack-site-builder`, so a release
is: pick a version, write the changelog, verify the build, tag, and publish.

## 1. Decide the version (SemVer)

The theme is consumed by sites, so judge SemVer from *their* point of view:

| Bump | When | Examples |
| --- | --- | --- |
| **major** (`x.0.0`) | A consuming site must change its content, data, or config to upgrade | renamed/removed export or component prop; changed content schema field; changed route URL; dropped/renamed a locale |
| **minor** (`1.x.0`) | New capability, backward compatible | a new content collection; a new component; a new optional schema field |
| **patch** (`1.1.x`) | Bug fix or internal change, no API change | styling fix, markdown-pipeline fix, a11y fix |

If unsure, prefer the higher bump.

## 2. Update `CHANGELOG.md`

Follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

- Add a new `## [x.y.z] - YYYY-MM-DD` section at the top (below the intro).
- Write a one-paragraph summary of the release's theme, then group entries under
  `### Added` / `### Changed` / `### Fixed` (add `Removed` / `Deprecated` /
  `Security` if needed). Lead each bullet with a **bold label**.
- Add/refresh the compare link at the bottom:
  `[x.y.z]: https://github.com/CodeCompose7/stack-site-builder/compare/vPREV...vx.y.z`
- Cross-check the entries against `git log vPREV..HEAD --oneline` so nothing
  user-facing is missed.

## 3. Bump the version

Edit the **root** `package.json` `version` (not `playground/`). Either:

```bash
# writes package.json, no commit/tag (we do those ourselves)
pnpm version <patch|minor|major> --no-git-tag-version
```

or edit `"version"` by hand. Keep it equal to the new `CHANGELOG.md` heading.

## 4. Verify

```bash
pnpm install          # lockfile in sync
pnpm check            # astro check — 0 errors
pnpm build            # playground builds against the theme (32+ pages)
```

Inspect the publish tarball — confirm it contains only what `files` +
`exports` intend (`index.mjs`, `index.d.ts`, `markdown.mjs`, `src/`, `dev/`,
`CHANGELOG.md`, `README.md`, `LICENSE`) and no stray build output:

```bash
npm pack --dry-run    # lists the tarball contents
# or: pnpm publish --dry-run
```

## 5. Commit & tag

```bash
git add package.json CHANGELOG.md
git commit -m "chore: release x.y.z"
git tag vx.y.z
```

Keep the tag (`vx.y.z`) matching the `package.json` version and the compare
link in `CHANGELOG.md`.

## 6. Publish

The package is public and unscoped. Publish from a clean tree on the release
commit:

```bash
pnpm publish          # runs from the root package; playground is private → skipped
git push && git push --tags
```

Notes:
- `pnpm publish` builds nothing here (the package ships source `.astro`/`.ts` that
  the consuming site's Astro build compiles). Make sure `peerDependencies.astro`
  still covers the versions you tested against.
- If publishing from CI or a fresh shell, `npm whoami` to confirm you're the
  right npm user first.

## 7. After publishing

- Create a GitHub Release from the `vx.y.z` tag; paste that version's
  `CHANGELOG.md` section as the notes.
- In a consuming site, `pnpm up stack-site-builder` and rebuild to smoke-test the
  real upgrade path.

## Quick reference

```bash
git log $(git describe --tags --abbrev=0)..HEAD --oneline   # changes since last tag
pnpm check && pnpm build                                     # gate before release
npm pack --dry-run                                           # what will ship
```
