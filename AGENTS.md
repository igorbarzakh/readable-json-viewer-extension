# AGENTS.md

Project-level instructions for AI coding agents working in this repository.

## Scope

- Applies to the whole repository.
- If a deeper nested `AGENTS.md` appears in the future, nested rules override this file for that subtree.

## Project Purpose

- Chrome Extension (Manifest V3) that formats `.json` pages into a readable, collapsible, editor-like view.
- Main runtime entrypoint: `src/content-script.js`.
- Core pure logic module: `src/viewer-core.js`.
- Styling: `src/styles.css`.

## Non-Negotiable Rules

1. Preserve behavior for `.json` pages only.
2. Do not add remote code execution or dynamic external script loading.
3. Keep manifest permissions minimal.
4. Do not regress copy behavior:
   - `Copy JSON` copies pretty JSON (`2` spaces).
   - `Cmd/Ctrl+C` in viewer selection keeps current expected behavior.
5. Keep tests green before claiming completion.

## Workflow

1. Understand current behavior from tests first.
2. Make small, focused changes.
3. Run:
   - `npm test`
   - `npm run build` (or `npm run check`)
4. Summarize what changed and why.

## Testing Expectations

- Add/adjust tests for any behavior change.
- Prefer:
  - unit tests for pure functions (`tests/viewer-core.test.js`);
  - integration tests for UI/runtime behavior (`tests/content-script.integration.test.js`).
- Avoid brittle tests when possible; prefer semantic assertions over large HTML regex.

## Build And Packaging

- Production files are generated into `dist/`.
- Use:
  - `npm run build`
  - `npm run package`
- Publish zip output from `artifacts/`.

## Style And UX Constraints

- Keep visual behavior consistent across themes.
- Preserve indentation, folding, and line-number semantics.
- Avoid layout jumps in toolbar/buttons.
- Keep selection/toggle interactions intentional and predictable.

## Out Of Scope Unless Explicitly Requested

- Major architecture rewrites.
- New permissions/API surface in manifest.
- Analytics, tracking, telemetry.
