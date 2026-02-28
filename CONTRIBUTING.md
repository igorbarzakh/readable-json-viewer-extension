# Contributing

## Requirements

- Node.js LTS
- npm

Install dependencies:

```bash
npm install
```

## Development Commands

- Tests: `npm test`
- Production build: `npm run build`
- Full local check: `npm run check`
- Package zip: `npm run package`

## Branch / Commit Guidance

- Use focused commits with clear intent.
- Prefer small PRs over large mixed changes.
- Commit message style:
  - `<scope>: <what changed>`
  - or short imperative style (e.g. `Fix line-number folding offsets`).

## Code Change Rules

1. Keep extension scope limited to JSON documents only:
   - `.json` URLs
   - and pages with JSON `Content-Type` (`application/json`, `text/json`, `+json`)
2. Minimize manifest permission changes.
3. Add/adjust tests for behavior changes.
4. Do not break existing toolbar UX and copy flows.
5. Keep `src/viewer-core.js` pure where possible; put DOM/browser specifics in `src/content-script.js`.

## Test Policy

Before PR/merge:

```bash
npm run check
```

If behavior changed, ensure corresponding tests were updated:
- `tests/viewer-core.test.js`
- `tests/content-script.integration.test.js`

## Release Readiness

Before publishing, follow [docs/release.md](docs/release.md).
