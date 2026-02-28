# Readable JSON Viewer (Chrome Extension)

Chrome extension that formats `.json` pages into a readable code-editor-like view with:
- syntax highlighting
- collapse/expand for objects and arrays
- line numbers with folding-aware jumps
- light/dark themes
- one-click `Copy JSON`

## Development

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Run full local validation (`test` + production build):

```bash
npm run check
```

## Production Build

Create minified extension files in `dist/`:

```bash
npm run build
```

`dist/` contains:
- `manifest.json`
- `src/content-script.js` (minified)
- `src/styles.css` (minified)

## Package For Chrome Web Store

Create publish-ready zip in `artifacts/`:

```bash
npm run package
```

## Load Unpacked In Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Choose project folder for development, or `dist/` for release-candidate verification

## Pre-publish Checklist

1. Bump `manifest.json` version
2. Run `npm run check`
3. Run `npm run package`
4. Verify extension from `dist/` in a clean Chrome profile
5. Upload `artifacts/readable-json-viewer-extension-v<version>.zip` to Chrome Web Store
