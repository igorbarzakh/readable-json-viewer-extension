# Release Guide

This document describes the release flow for Chrome Web Store publication.

## 1) Prepare Version

Update extension version in:
- `manifest.json` (`version`)
- optionally `package.json` (if you track release version there too)

## 2) Validate

Run full checks:

```bash
npm run check
```

Expected:
- tests pass
- `dist/` is generated successfully

## 3) Build Release Artifact

Create zip:

```bash
npm run package
```

Output:
- `artifacts/readable-json-viewer-extension-v<version>.zip`

## 4) Manual Smoke Test From `dist/`

1. Open `chrome://extensions`
2. Enable Developer mode
3. Load unpacked `dist/`
4. Verify:
   - valid `.json` renders correctly
   - collapse/expand works
   - line numbers fold-aware jumps are correct
   - `Copy JSON` works and button status resets
   - error mode hides gutter and displays parse message
   - light/dark theme behavior is correct

## 5) Publish To Chrome Web Store

Upload zip from `artifacts/`.

Before final submit, confirm:
- extension name/description are final
- icons/screenshots/listing text are up to date
- no unnecessary permissions were added

## 6) Post-Release

- Tag commit (recommended)
- Push branch and tags
- Keep release notes in PR/commit for traceability
