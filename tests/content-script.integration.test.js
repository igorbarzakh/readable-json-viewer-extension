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
  copyBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

  for (let i = 0; i < 12 && copyBtn.textContent !== "Copied"; i += 1) {
    await Promise.resolve();
  }

  assert.equal(copied, JSON.stringify(JSON.parse(raw), null, 2));
  assert.equal(copyBtn.textContent, "Copied");
  assert.equal(copyBtn.disabled, true);
  assert.equal(timeouts.length, 1);
  assert.equal(timeouts[0].ms, 1800);

  timeouts[0].fn();
  assert.equal(copyBtn.textContent, "Copy JSON");
  assert.equal(copyBtn.disabled, false);

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
