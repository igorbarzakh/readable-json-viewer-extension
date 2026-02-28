import test from "node:test";
import assert from "node:assert/strict";

import {
  isJsonUrl,
  isJsonDocument,
  parseJsonText,
  renderJsonToHtml,
  toggleCollapsedPath,
  shouldHandleSelectAll,
  getClipboardJsonText,
  getFormattedJsonText,
  extractJsonErrorInfo,
  resolveThemeMode,
  nextThemeMode,
  buildLineNumbersHtml,
} from "../src/viewer-core.js";

test("isJsonUrl matches only .json urls", () => {
  assert.equal(isJsonUrl("https://example.com/data.json"), true);
  assert.equal(isJsonUrl("https://example.com/data.json?x=1"), true);
  assert.equal(isJsonUrl("https://example.com/data.json#top"), true);
  assert.equal(isJsonUrl("https://example.com/data.txt"), false);
  assert.equal(isJsonUrl("https://example.com/json"), false);
});

test("isJsonDocument matches json url suffix and json content-type", () => {
  assert.equal(isJsonDocument("https://example.com/data.json", "text/html"), true);
  assert.equal(
    isJsonDocument("https://jsonplaceholder.typicode.com/posts", "application/json; charset=utf-8"),
    true
  );
  assert.equal(isJsonDocument("https://example.com/api", "application/problem+json"), true);
  assert.equal(isJsonDocument("https://example.com/page", "text/html"), false);
});

test("parseJsonText parses valid JSON", () => {
  const parsed = parseJsonText('{"name":"john","age":30}');
  assert.deepEqual(parsed, { ok: true, value: { name: "john", age: 30 } });
});

test("parseJsonText returns error payload for invalid JSON", () => {
  const parsed = parseJsonText("{");
  assert.equal(parsed.ok, false);
  assert.equal(typeof parsed.error, "string");
  assert.equal(parsed.raw, "{");
});

test("renderJsonToHtml marks object and value classes", () => {
  const html = renderJsonToHtml({
    user: { id: 1, active: true, tags: ["a"], none: null },
  });

  assert.match(html, /json-key/);
  assert.match(html, /json-number/);
  assert.match(html, /json-boolean/);
  assert.match(html, /json-null/);
  assert.match(html, /toggle-btn/);
});

test("nested object opener stays on the same line as object key", () => {
  const html = renderJsonToHtml({ meta: { id: 1 } });
  assert.match(
    html,
    /<span class="json-key">meta<\/span><span class="json-quote">"<\/span><span class="json-colon">: <\/span><button class="toggle-btn" data-path="\$\.meta" aria-label="Collapse">▾<\/button><span class="json-brace [^"]+">{<\/span>/
  );
});

test("depth sequence is stable for nested objects", () => {
  const html = renderJsonToHtml({ meta: { id: 1 } });
  const depths = [...html.matchAll(/--depth:(\d+)/g)].map((match) => Number(match[1]));
  assert.deepEqual(depths, [0, 1, 2, 1, 0]);
});

test("array primitives and collapsed complex items share alignment prefix", () => {
  const html = renderJsonToHtml(
    [1, "string", true, null, { a: 1 }, [1, 2]],
    new Set(["$.5"])
  );

  assert.match(
    html,
    /<div class="json-line" style="--depth:1"[^>]*><span class="json-prefix"><\/span><span class="json-number">1<\/span><span class="json-comma">,<\/span><\/div>/
  );
  assert.match(
    html,
    /<span class="json-prefix"><\/span><span class="json-brace [^"]+">{<\/span> <span class="json-quote">"<\/span><span class="json-key">a<\/span><span class="json-quote">"<\/span><span class="json-colon">: <\/span><span class="json-number">1<\/span> <span class="json-brace [^"]+">}<\/span><span class="json-comma">,<\/span>/
  );
  assert.match(
    html,
    /<span class="json-prefix"><\/span><span class="json-brace [^"]+">\[<\/span><span class="json-number">1<\/span><span class="json-comma">, <\/span><span class="json-number">2<\/span><span class="json-brace [^"]+">\]<\/span>/
  );
});

test("short arrays with primitives render inline", () => {
  const html = renderJsonToHtml({
    features: ["search", "analytics", "notifications"],
  });

  assert.match(
    html,
    /<span class="json-key">features<\/span><span class="json-quote">"<\/span><span class="json-colon">: <\/span><span class="json-brace [^"]+">\[<\/span><span class="json-string-quote">"<\/span><span class="json-string">search<\/span><span class="json-string-quote">"<\/span><span class="json-comma">, <\/span><span class="json-string-quote">"<\/span><span class="json-string">analytics<\/span><span class="json-string-quote">"<\/span><span class="json-comma">, <\/span><span class="json-string-quote">"<\/span><span class="json-string">notifications<\/span><span class="json-string-quote">"<\/span><span class="json-brace [^"]+">\]<\/span>/
  );
  assert.doesNotMatch(
    html,
    /data-path="\$\.features"/
  );
});

test("long arrays with objects stay multiline", () => {
  const html = renderJsonToHtml({
    versions: [
      { version: "1.0.0", stable: true },
      { version: "1.1.0-beta", stable: false },
    ],
  });

  const depths = [...html.matchAll(/--depth:(\d+)/g)].map((match) => Number(match[1]));
  assert.deepEqual(depths, [0, 1, 2, 2, 1, 0]);
});

test("short objects inside multiline arrays render in one line each", () => {
  const html = renderJsonToHtml({
    items: [
      { type: "text", content: "hello" },
      { type: "number", content: 42 },
    ],
  });

  assert.match(
    html,
    /<div class="json-line" style="--depth:2"[^>]*><span class="json-prefix"><\/span><span class="json-brace [^"]+">{<\/span> <span class="json-quote">"<\/span><span class="json-key">type<\/span><span class="json-quote">"<\/span><span class="json-colon">: <\/span><span class="json-string-quote">"<\/span><span class="json-string">text<\/span><span class="json-string-quote">"<\/span><span class="json-comma">, <\/span><span class="json-quote">"<\/span><span class="json-key">content<\/span><span class="json-quote">"<\/span><span class="json-colon">: <\/span><span class="json-string-quote">"<\/span><span class="json-string">hello<\/span><span class="json-string-quote">"<\/span> <span class="json-brace [^"]+">}<\/span><span class="json-comma">,<\/span><\/div>/
  );
});

test("very short nested arrays with short objects can stay inline", () => {
  const html = renderJsonToHtml({
    mixed: [[{ subItem: "A" }, { subItem: "B" }]],
  });

  assert.match(
    html,
    /<span class="json-brace [^"]+">\[<\/span><span class="json-brace [^"]+">{<\/span> <span class="json-quote">"<\/span><span class="json-key">subItem<\/span><span class="json-quote">"<\/span><span class="json-colon">: <\/span><span class="json-string-quote">"<\/span><span class="json-string">A<\/span><span class="json-string-quote">"<\/span> <span class="json-brace [^"]+">}<\/span><span class="json-comma">, <\/span><span class="json-brace [^"]+">{<\/span> <span class="json-quote">"<\/span><span class="json-key">subItem<\/span><span class="json-quote">"<\/span><span class="json-colon">: <\/span><span class="json-string-quote">"<\/span><span class="json-string">B<\/span><span class="json-string-quote">"<\/span> <span class="json-brace [^"]+">}<\/span><span class="json-brace [^"]+">\]<\/span>/
  );
});

test("inline collections stay expanded even if their path is marked collapsed", () => {
  const html = renderJsonToHtml(
    {
      meta: {
        features: ["search", "analytics", "notifications"],
      },
    },
    new Set(["$.meta.features"])
  );

  assert.match(
    html,
    /<span class="json-key">features<\/span><span class="json-quote">"<\/span><span class="json-colon">: <\/span><span class="json-brace [^"]+">\[<\/span>/
  );
  assert.doesNotMatch(html, /data-path="\$\.meta\.features"/);
  assert.doesNotMatch(html, /json-ellipsis/);
});

test("quotes use dedicated token class", () => {
  const html = renderJsonToHtml({ key: "value" });
  assert.match(html, /class="json-quote">"/);
});

test('escaped quote inside string keeps quote punctuation color', () => {
  const html = renderJsonToHtml({ key: 'some "string' });
  assert.match(
    html,
    /<span class="json-string">some <\/span><span class="json-quote">\\<\/span><span class="json-quote">"<\/span><span class="json-string">string<\/span>/,
  );
});

test("backslash inside string uses quote punctuation color", () => {
  const html = renderJsonToHtml({ key: "C:\\temp\\file.txt" });
  assert.match(html, /<span class="json-quote">\\<\/span>/);
});

test("newline escape in string highlights both slash and marker", () => {
  const html = renderJsonToHtml({ key: "a\nb" });
  assert.match(html, /<span class="json-quote">\\<\/span><span class="json-quote">n<\/span>/);
});

test("mixed escapes are rendered without duplicated backslashes", () => {
  const html = renderJsonToHtml({ email: "a\\nna'@'ex\\\"am\\\\ple.com" });
  assert.doesNotMatch(
    html,
    /<span class="json-string"><\/span><span class="json-string-quote">\\<\/span><span class="json-string"><\/span>/,
  );
  assert.match(
    html,
    /<span class="json-string">a<\/span><span class="json-quote">\\<\/span><span class="json-quote">\\<\/span><span class="json-string">nna'@'ex<\/span>/,
  );
  assert.match(
    html,
    /<span class="json-quote">\\<\/span><span class="json-quote">\\<\/span><span class="json-quote">\\<\/span><span class="json-quote">"<\/span><span class="json-string">am<\/span>/,
  );
});

test("braces include depth-based classes", () => {
  const html = renderJsonToHtml({ a: { b: [1] } });
  assert.match(html, /json-brace-depth-0/);
  assert.match(html, /json-brace-depth-1/);
  assert.match(html, /json-brace-depth-2/);
});

test("collapsed blocks preserve virtual line numbers with jumps", () => {
  const html = renderJsonToHtml(
    { a: { b: 1, c: 2 }, d: 3 },
    new Set(["$.a"])
  );
  const lines = [...html.matchAll(/data-line="(\d+)"/g)].map((match) => Number(match[1]));
  assert.deepEqual(lines, [1, 2, 6, 7]);
});

test("toggleCollapsedPath flips path state", () => {
  const state = new Set();
  toggleCollapsedPath(state, "$.a");
  assert.equal(state.has("$.a"), true);
  toggleCollapsedPath(state, "$.a");
  assert.equal(state.has("$.a"), false);
});

test("shouldHandleSelectAll handles only cmd/ctrl+a inside json container", () => {
  const createEvent = (key, metaKey, ctrlKey) => ({ key, metaKey, ctrlKey });
  const container = {};
  const inside = { id: "inside" };
  const outside = { id: "outside" };
  const isInside = (node) => node === inside;

  assert.equal(
    shouldHandleSelectAll(createEvent("a", true, false), inside, container, isInside, null),
    true
  );
  assert.equal(
    shouldHandleSelectAll(createEvent("A", false, true), inside, container, isInside, null),
    true
  );
  assert.equal(
    shouldHandleSelectAll(createEvent("a", true, false), outside, container, isInside, null),
    false
  );
  assert.equal(
    shouldHandleSelectAll(createEvent("x", true, false), inside, container, isInside, null),
    false
  );
  assert.equal(
    shouldHandleSelectAll(createEvent("a", true, false), outside, container, isInside, inside),
    true
  );
});

test("getClipboardJsonText returns source json only when viewer is enabled", () => {
  const source = '{\n    "a": 1,\n  "nested": { "b": true }\n}';
  assert.equal(getClipboardJsonText(true, source), source);
  assert.equal(getClipboardJsonText(false, source), null);
});

test("getFormattedJsonText returns pretty JSON with two-space indent", () => {
  const text = getFormattedJsonText({ a: 1, nested: { b: true } });
  assert.equal(text, '{\n  "a": 1,\n  "nested": {\n    "b": true\n  }\n}');
});

test("theme helpers resolve mode from storage/system and toggle dark-light", () => {
  assert.equal(resolveThemeMode("x", true), "dark");
  assert.equal(resolveThemeMode("x", false), "light");
  assert.equal(resolveThemeMode("dark", false), "dark");
  assert.equal(resolveThemeMode("light", true), "light");
  assert.equal(nextThemeMode("dark"), "light");
  assert.equal(nextThemeMode("light"), "dark");
});

test("extractJsonErrorInfo returns line and column from parse position", () => {
  const raw = '{\n  "a": 1,\n  "b":,\n  "c": 3\n}';
  const info = extractJsonErrorInfo(raw, "Unexpected token , in JSON at position 18");
  assert.equal(info.line, 3);
  assert.equal(info.column, 7);
  assert.equal(info.lineText, '  "b":,');
  assert.equal(info.prevLineText, '  "a": 1,');
  assert.equal(info.nextLineText, '  "c": 3');
});

test("buildLineNumbersHtml returns sequential gutter lines", () => {
  assert.equal(
    buildLineNumbersHtml(3),
    '<div class="json-gutter-line">1</div><div class="json-gutter-line">2</div><div class="json-gutter-line">3</div><div class="json-gutter-line">4</div>'
  );
  assert.equal(
    buildLineNumbersHtml([1, 2, 6, 7]),
    '<div class="json-gutter-line">1</div><div class="json-gutter-line">2</div><div class="json-gutter-line">6</div><div class="json-gutter-line">7</div><div class="json-gutter-line">8</div>'
  );
  assert.equal(buildLineNumbersHtml(0), "");
});
