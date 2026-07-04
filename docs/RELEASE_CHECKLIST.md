# Release Checklist

## Pre-release

- [ ] Review `PLAN.md` for completed and remaining scope.
- [ ] Run `npm ci` on a clean checkout.
- [ ] Run `npm run verify`.
- [ ] Run `npm run test:browser` if Playwright browsers are installed.
- [ ] Complete `docs/MANUAL_QA.md`.
- [ ] Confirm no API keys, `.env` files, browser profiles, `dist/`, or `node_modules/` are staged.
- [ ] Review `git status` and `git diff`.

## Versioning

- [ ] Update `package.json` version if needed.
- [ ] Update `public/manifest.json` version to match.
- [ ] Update README notes if behavior changed.
- [ ] Commit with a concise release-prep message.

## Packaging

- [ ] Run `npm run build`.
- [ ] Load `dist/` into Chrome and smoke test the release build.
- [ ] Create a Git tag, for example `v0.1.0`.
- [ ] Push commits and tags.

## Post-release

- [ ] Check GitHub Actions status.
- [ ] Create GitHub release notes if publishing a tag.
- [ ] Document any known limitations or follow-up tasks.
