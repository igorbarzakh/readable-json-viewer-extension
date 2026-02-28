# JSON Viewer Chrome Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chrome extension that only activates on `.json` URLs and renders JSON in a code-editor-like view with collapsible nodes.

**Architecture:** Use Manifest V3 with a content script scoped to `*://*/*.json*`. The content script reads the raw page text, parses JSON, and replaces the page with a custom DOM renderer that supports syntax coloring and node toggling. Core parser/URL logic will live in a small shared module to enable test-first development with Node's built-in test runner.

**Tech Stack:** JavaScript (ES modules), Chrome Extension Manifest V3, Node `node:test` + `assert`.

---

### Task 1: Scaffold extension and test harness

**Files:**
- Create: `manifest.json`
- Create: `src/viewer-core.js`
- Create: `src/content-script.js`
- Create: `src/styles.css`
- Create: `tests/viewer-core.test.js`
- Create: `package.json`

**Step 1: Write failing tests**
- Add tests for URL matching and JSON parse success/failure in `tests/viewer-core.test.js`.

**Step 2: Run tests to verify failure**
- Run: `npm test`
- Expected: FAIL because core module does not exist yet.

**Step 3: Write minimal implementation**
- Add `isJsonUrl` and `parseJsonText` to `src/viewer-core.js`.

**Step 4: Run tests to verify pass**
- Run: `npm test`
- Expected: PASS for created tests.

### Task 2: Add tree rendering with collapsible nodes

**Files:**
- Modify: `src/viewer-core.js`
- Modify: `tests/viewer-core.test.js`

**Step 1: Write failing tests**
- Add tests for rendered tokens and collapsed state toggling helpers.

**Step 2: Run tests to verify failure**
- Run: `npm test`
- Expected: FAIL for missing renderer/toggle behavior.

**Step 3: Write minimal implementation**
- Implement recursive renderer that builds HTML with node wrappers and toggle buttons.

**Step 4: Run tests to verify pass**
- Run: `npm test`
- Expected: PASS for renderer tests.

### Task 3: Wire content script and styles

**Files:**
- Modify: `src/content-script.js`
- Modify: `src/styles.css`
- Modify: `manifest.json`

**Step 1: Write failing test expectations (string-level where possible)**
- Add tests for bootstrapping behavior based on URL and parse result.

**Step 2: Run tests to verify failure**
- Run: `npm test`
- Expected: FAIL for missing bootstrap function.

**Step 3: Write minimal implementation**
- Build page container, inject rendered tree, attach click handlers for node toggles and collapse/expand all, and show parse errors for invalid JSON.

**Step 4: Run tests to verify pass**
- Run: `npm test`
- Expected: PASS.

### Task 4: Final verification

**Files:**
- Verify: all files above

**Step 1: Run tests**
- Run: `npm test`
- Expected: PASS.

**Step 2: Manual extension sanity check instructions**
- Load unpacked extension in Chrome.
- Open any URL ending with `.json`.
- Confirm editor-like styling and per-node collapse works.
- Confirm non-`.json` pages remain unchanged.
