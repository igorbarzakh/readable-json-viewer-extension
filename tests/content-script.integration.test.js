import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const scriptSource = readFileSync(new URL("../src/content-script.js", import.meta.url), "utf8");

function createDom(sourceText, url, contentType = "text/html") {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url,
    runScripts: "dangerously",
    pretendToBeVisual: true,
  });
  const { window } = dom;

  Object.defineProperty(window.document.body, "innerText", {
    configurable: true,
    get() {
      return this.textContent || "";
    },
    set(value) {
      this.textContent = value;
    },
  });

  window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });

  Object.defineProperty(window.document, "contentType", {
    configurable: true,
    get() {
      return contentType;
    },
  });

  window.document.body.innerText = sourceText;
  return dom;
}

test("copy button copies pretty JSON and restores label after timeout", async () => {
  const raw = '{"a":1,"nested":{"b":true}}';
  const dom = createDom(raw, "https://example.com/data.json");
  const { window } = dom;

  let copied = null;
  Object.defineProperty(window.navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (value) => {
        copied = value;
      },
    },
  });

  const timeouts = [];
  Object.defineProperty(window, "setTimeout", {
    configurable: true,
    value: (fn, ms) => {
      timeouts.push({ fn, ms });
      return timeouts.length;
    },
  });
  Object.defineProperty(window, "clearTimeout", {
    configurable: true,
    value: () => {},
  });

  window.eval(scriptSource);

  const copyBtn = window.document.getElementById("copy-json");
  assert.ok(copyBtn);
  assert.ok(copyBtn.querySelector(".copy-icon"));
  assert.equal(copyBtn.querySelector(".copy-label")?.textContent, "Copy");
  copyBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

  for (let i = 0; i < 12 && copyBtn.textContent !== "Copied"; i += 1) {
    await Promise.resolve();
  }

  assert.equal(copied, JSON.stringify(JSON.parse(raw), null, 2));
  assert.equal(copyBtn.textContent, "Copy");
  assert.equal(copyBtn.disabled, true);
  assert.equal(copyBtn.querySelector(".copy-icon"), null);
  assert.ok(copyBtn.querySelector(".copy-done-icon"));
  assert.equal(timeouts.length, 1);
  assert.equal(timeouts[0].ms, 1800);

  timeouts[0].fn();
  assert.equal(copyBtn.textContent, "Copy");
  assert.equal(copyBtn.disabled, false);
  assert.ok(copyBtn.querySelector(".copy-icon"));
  assert.equal(copyBtn.querySelector(".copy-done-icon"), null);

  dom.window.close();
});

test("invalid JSON renders editor without gutter column", () => {
  const dom = createDom('{"a":1,}', "https://example.com/broken.json");
  const { window } = dom;

  window.eval(scriptSource);

  const editor = window.document.getElementById("json-editor");
  const gutter = window.document.getElementById("json-gutter");
  assert.ok(editor);
  assert.ok(gutter);
  assert.equal(editor.classList.contains("json-editor-raw"), true);
  assert.equal(gutter.innerHTML, "");

  dom.window.close();
});

test("empty JSON response shows friendly empty state", () => {
  const dom = createDom("", "https://example.com/empty.json");
  const { window } = dom;

  window.eval(scriptSource);

  const title = window.document.querySelector(".json-error-title");
  const message = window.document.querySelector(".json-error-message");
  const editor = window.document.getElementById("json-editor");
  const gutter = window.document.getElementById("json-gutter");
  const toggleAllBtn = window.document.getElementById("toggle-all");
  const copyJsonBtn = window.document.getElementById("copy-json");

  assert.ok(title);
  assert.equal(title.textContent, "Empty JSON");
  assert.ok(message);
  assert.equal(message.textContent, "Response body is empty.");
  assert.ok(editor);
  assert.equal(editor.classList.contains("json-editor-raw"), true);
  assert.ok(gutter);
  assert.equal(gutter.innerHTML, "");
  assert.equal(toggleAllBtn?.disabled, true);
  assert.equal(copyJsonBtn?.disabled, true);

  dom.window.close();
});

test("activates on json content-type even when url has no .json suffix", () => {
  const raw = '[{"id":1,"title":"post"}]';
  const dom = createDom(raw, "https://jsonplaceholder.typicode.com/posts", "application/json");
  const { window } = dom;

  window.eval(scriptSource);

  const container = window.document.getElementById("json-container");
  assert.ok(container);
  assert.match(container.innerHTML, /json-key/);

  dom.window.close();
});

test("theme button renders icon and label", () => {
  const raw = '{"a":1}';
  const dom = createDom(raw, "https://example.com/data.json");
  const { window } = dom;

  window.eval(scriptSource);

  const themeBtn = window.document.getElementById("toggle-theme");
  assert.ok(themeBtn);
  const icon = themeBtn.querySelector(".theme-icon");
  const label = themeBtn.querySelector(".theme-label");
  assert.ok(icon);
  assert.equal(icon.tagName, "svg");
  assert.ok(label);
  assert.equal(label.textContent, "Dark");

  dom.window.close();
});

test("copy button renders icon and Copy label", () => {
  const raw = '{"a":1}';
  const dom = createDom(raw, "https://example.com/data.json");
  const { window } = dom;

  window.eval(scriptSource);

  const copyBtn = window.document.getElementById("copy-json");
  assert.ok(copyBtn);
  const icon = copyBtn.querySelector(".copy-icon");
  const label = copyBtn.querySelector(".copy-label");
  assert.ok(icon);
  assert.equal(icon.tagName, "svg");
  assert.ok(label);
  assert.equal(label.textContent, "Copy");

  dom.window.close();
});

test("theme toggles when clicking svg icon inside theme button", () => {
  const raw = '{"a":1}';
  const dom = createDom(raw, "https://example.com/data.json");
  const { window } = dom;

  window.eval(scriptSource);

  const themeBtn = window.document.getElementById("toggle-theme");
  assert.ok(themeBtn);
  assert.equal(window.document.documentElement.getAttribute("data-theme"), "light");

  const iconPath = themeBtn.querySelector("svg path");
  assert.ok(iconPath);
  iconPath.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

  assert.equal(window.document.documentElement.getAttribute("data-theme"), "dark");
  const label = themeBtn.querySelector(".theme-label");
  assert.equal(label?.textContent, "Light");

  dom.window.close();
});

test("theme toggles when clicking label text inside theme button", () => {
  const raw = '{"a":1}';
  const dom = createDom(raw, "https://example.com/data.json");
  const { window } = dom;

  window.eval(scriptSource);

  const themeBtn = window.document.getElementById("toggle-theme");
  const label = themeBtn?.querySelector(".theme-label");
  assert.ok(themeBtn);
  assert.ok(label);
  assert.equal(window.document.documentElement.getAttribute("data-theme"), "light");

  label.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

  assert.equal(window.document.documentElement.getAttribute("data-theme"), "dark");

  dom.window.close();
});

test("gutter width is locked from initial expanded render", () => {
  const raw = JSON.stringify(
    {
      meta: { id: 1, tags: ["a", "b"] },
      users: [{ id: 1 }, { id: 2 }],
    },
    null,
    2
  );
  const dom = createDom(raw, "https://example.com/data.json");
  const { window } = dom;

  Object.defineProperty(window.HTMLElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value() {
      if (this.id === "json-gutter") {
        const lineCount = (this.innerHTML.match(/json-gutter-line/g) || []).length;
        const width = 10 + lineCount * 3;
        return {
          width,
          height: 0,
          top: 0,
          left: 0,
          right: width,
          bottom: 0,
          x: 0,
          y: 0,
          toJSON() {
            return {};
          },
        };
      }
      return {
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON() {
          return {};
        },
      };
    },
  });

  window.eval(scriptSource);

  const gutter = window.document.getElementById("json-gutter");
  const toggleAll = window.document.getElementById("toggle-all");
  assert.ok(gutter);
  assert.ok(toggleAll);
  const initialWidth = gutter.style.width;
  const initialMinWidth = gutter.style.minWidth;
  assert.notEqual(initialWidth, "");
  assert.equal(initialMinWidth, initialWidth);

  toggleAll.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

  assert.equal(gutter.style.width, initialWidth);
  assert.equal(gutter.style.minWidth, initialMinWidth);

  dom.window.close();
});

test("viewer toggle button is not rendered in toolbar", () => {
  const raw = '{"meta":{"id":1},"users":[{"id":1},{"id":2}]}';
  const dom = createDom(raw, "https://example.com/data.json");
  const { window } = dom;

  window.eval(scriptSource);

  const toggleViewerBtn = window.document.getElementById("toggle-viewer");
  assert.equal(toggleViewerBtn, null);

  dom.window.close();
});

test("toggle all button collapses and expands tree", () => {
  const raw = '{"meta":{"id":1,"active":true},"users":[{"id":1},{"id":2}],"tags":["a","b","c"]}';
  const dom = createDom(raw, "https://example.com/data.json");
  const { window } = dom;

  window.eval(scriptSource);

  const container = window.document.getElementById("json-container");
  const toggleAllBtn = window.document.getElementById("toggle-all");
  assert.ok(container);
  assert.ok(toggleAllBtn);
  const initialLabel = toggleAllBtn.querySelector(".toggle-all-label");
  assert.ok(initialLabel);
  assert.equal(initialLabel.textContent, "Collapse all");
  assert.ok(toggleAllBtn.querySelector(".toggle-all-icon"));

  const expandedLineCount = container.querySelectorAll(".json-line").length;
  assert.ok(expandedLineCount > 3);

  toggleAllBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  const collapsedLineCount = container.querySelectorAll(".json-line").length;
  assert.ok(collapsedLineCount < expandedLineCount);
  const collapsedLabel = toggleAllBtn.querySelector(".toggle-all-label");
  assert.ok(collapsedLabel);
  assert.equal(collapsedLabel.textContent, "Expand all");
  assert.ok(toggleAllBtn.querySelector(".toggle-all-icon"));

  toggleAllBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  const restoredLineCount = container.querySelectorAll(".json-line").length;
  assert.equal(restoredLineCount, expandedLineCount);
  const restoredLabel = toggleAllBtn.querySelector(".toggle-all-label");
  assert.ok(restoredLabel);
  assert.equal(restoredLabel.textContent, "Collapse all");
  assert.ok(toggleAllBtn.querySelector(".toggle-all-icon"));

  dom.window.close();
});
