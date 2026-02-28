(function () {
  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function isJsonUrl(url) {
    return /\.json(?:$|[?#])/i.test(url);
  }

  function isJsonDocument(url, contentType) {
    if (isJsonUrl(url)) {
      return true;
    }
    const type = String(contentType || "").toLowerCase();
    return (
      type.includes("application/json") ||
      type.includes("text/json") ||
      type.includes("+json")
    );
  }

  function parseJsonText(text) {
    try {
      return { ok: true, value: JSON.parse(text) };
    } catch (error) {
      return { ok: false, error: error.message, raw: text };
    }
  }

  function toggleCollapsedPath(collapsedPaths, path) {
    if (collapsedPaths.has(path)) {
      collapsedPaths.delete(path);
      return;
    }
    collapsedPaths.add(path);
  }

  function shouldHandleSelectAll(
    event,
    activeElement,
    containerElement,
    containsFn,
    selectionAnchorNode
  ) {
    const keyA = String(event?.key || "").toLowerCase() === "a";
    const combo = Boolean(event?.metaKey || event?.ctrlKey);
    if (!keyA || !combo || !containerElement) {
      return false;
    }
    const activeInside = Boolean(activeElement) && containsFn(activeElement);
    const selectionInside = Boolean(selectionAnchorNode) && containsFn(selectionAnchorNode);
    return activeInside || selectionInside;
  }

  function getClipboardJsonText(viewerEnabled, sourceText) {
    if (!viewerEnabled) {
      return null;
    }
    return sourceText;
  }

  function getFormattedJsonText(value) {
    return JSON.stringify(value, null, 2);
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (_) {
        // fallback to execCommand below
      }
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (_) {
      copied = false;
    }
    document.body.removeChild(textarea);
    return copied;
  }

  function extractJsonErrorInfo(rawText, errorMessage) {
    const match = /position\s+(\d+)/i.exec(String(errorMessage || ""));
    if (!match) {
      return {
        message: String(errorMessage || "Invalid JSON"),
        line: null,
        column: null,
        lineText: null,
        prevLineText: null,
        nextLineText: null,
      };
    }

    const position = Number(match[1]);
    const safePos = Number.isFinite(position) ? Math.max(0, Math.min(position, rawText.length)) : 0;
    let line = 1;
    let column = 1;
    let lineStart = 0;

    for (let i = 0; i < safePos; i += 1) {
      if (rawText[i] === "\n") {
        line += 1;
        column = 1;
        lineStart = i + 1;
      } else {
        column += 1;
      }
    }

    let lineEnd = rawText.indexOf("\n", lineStart);
    if (lineEnd === -1) {
      lineEnd = rawText.length;
    }

    const prevLineEnd = Math.max(0, lineStart - 1);
    const prevLineStart = prevLineEnd > 0 ? rawText.lastIndexOf("\n", prevLineEnd - 1) + 1 : 0;
    const prevLineText = lineStart > 0 ? rawText.slice(prevLineStart, prevLineEnd) : null;

    const nextLineStart = lineEnd < rawText.length ? lineEnd + 1 : -1;
    const nextLineEnd = nextLineStart >= 0 ? rawText.indexOf("\n", nextLineStart) : -1;
    const nextLineText =
      nextLineStart >= 0
        ? rawText.slice(nextLineStart, nextLineEnd === -1 ? rawText.length : nextLineEnd)
        : null;

    return {
      message: String(errorMessage || "Invalid JSON"),
      line,
      column,
      lineText: rawText.slice(lineStart, lineEnd),
      prevLineText,
      nextLineText,
    };
  }

  function buildErrorSnippetHtml(rawText, line, column) {
    if (!line) {
      return "";
    }
    const allLines = rawText.split("\n");
    const lineIndex = Math.max(0, line - 1);
    let start = lineIndex;

    for (let i = lineIndex; i >= 0; i -= 1) {
      if (/^\s*"[^"]+"\s*:/.test(allLines[i])) {
        start = i;
        break;
      }
    }

    const snippetLines = allLines.slice(start, lineIndex + 1);
    const nonEmpty = snippetLines.filter((entry) => entry.trim().length > 0);
    const minIndent =
      nonEmpty.length > 0
        ? Math.min(...nonEmpty.map((entry) => (entry.match(/^\s*/) || [""])[0].length))
        : 0;
    const lineNumberWidth = String(line).length;

    return snippetLines
      .map((entry, idx) => {
        const globalLine = start + idx + 1;
        const number = String(globalLine).padStart(lineNumberWidth, " ");
        const trimmed = entry.slice(minIndent);

        if (globalLine === line && column) {
          const markerCol = Math.max(1, column - minIndent);
          const markerIndex = Math.max(0, markerCol - 1);
          const before = escapeHtml(trimmed.slice(0, markerIndex));
          const marked = escapeHtml(trimmed.slice(markerIndex));
          return `${number} | ${before}<span class="json-error-mark">${marked || " "}</span>`;
        }

        return `${number} | ${escapeHtml(trimmed)}`;
      })
      .join("\n");
  }

  function resolveThemeMode(storedValue, prefersDark) {
    if (storedValue === "dark" || storedValue === "light") {
      return storedValue;
    }
    return prefersDark ? "dark" : "light";
  }

  function nextThemeMode(themeMode) {
    return themeMode === "dark" ? "light" : "dark";
  }

  function themeButtonLabel(themeMode) {
    if (themeMode === "dark") {
      return "Theme: Light";
    }
    return "Theme: Dark";
  }

  function buildLineNumbersHtml(linesOrCount) {
    let numbers = [];
    if (Array.isArray(linesOrCount)) {
      numbers = linesOrCount
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0);
    } else {
      const safeCount = Math.max(0, Number(linesOrCount) || 0);
      for (let i = 1; i <= safeCount; i += 1) {
        numbers.push(i);
      }
    }

    if (numbers.length > 0) {
      numbers.push(numbers[numbers.length - 1] + 1);
    }

    return numbers.map((line) => `<div class="json-gutter-line">${line}</div>`).join("");
  }

  function renderPrimitive(value) {
    if (value === null) {
      return '<span class="json-null">null</span>';
    }
    if (typeof value === "string") {
      return renderStringToken(value);
    }
    if (typeof value === "number") {
      return `<span class="json-number">${String(value)}</span>`;
    }
    if (typeof value === "boolean") {
      return `<span class="json-boolean">${String(value)}</span>`;
    }
    return `<span class="json-unknown">${escapeHtml(String(value))}</span>`;
  }

  function renderQuotedToken(valueClass, rawValue, quoteClass = "json-quote") {
    return `<span class="${quoteClass}">"</span><span class="${valueClass}">${escapeHtml(
      rawValue
    )}</span><span class="${quoteClass}">"</span>`;
  }

  function renderStringToken(rawValue) {
    const jsonLiteral = JSON.stringify(rawValue);
    const innerValue = jsonLiteral.slice(1, -1);
    let html = '<span class="json-string-quote">"</span><span class="json-string">';

    for (let index = 0; index < innerValue.length; index += 1) {
      const char = innerValue[index];

      if (char === "\\") {
        const next = innerValue[index + 1];
        if (next === '"') {
          html +=
            '</span><span class="json-quote">\\</span><span class="json-quote">"</span><span class="json-string">';
          index += 1;
          continue;
        }
        if (next === "\\") {
          html +=
            '</span><span class="json-quote">\\</span><span class="json-quote">\\</span><span class="json-string">';
          index += 1;
          continue;
        }
        if (next !== undefined) {
          html += `</span><span class="json-quote">\\</span><span class="json-quote">${escapeHtml(
            next
          )}</span><span class="json-string">`;
          index += 1;
          continue;
        }
        html += '</span><span class="json-quote">\\</span><span class="json-string">';
        continue;
      }

      html += escapeHtml(char);
    }

    html += '</span><span class="json-string-quote">"</span>';
    return html.replaceAll('<span class="json-string"></span>', '');
  }

  function normalizeBraceDepth(depth) {
    const safeDepth = Number.isFinite(depth) ? Math.max(0, depth) : 0;
    return safeDepth % 3;
  }

  function renderBraceToken(token, depth) {
    return `<span class="json-brace json-brace-depth-${normalizeBraceDepth(depth)}">${token}</span>`;
  }

  function renderLineComma(appendComma) {
    return appendComma ? '<span class="json-comma">,</span>' : "";
  }

  function countExpandedLines(value, path, keyLabel) {
    if (typeof value !== "object" || value === null) {
      return 1;
    }

    if (keyLabel === null && path !== "$" && canInlineObjectForArrayItem(value)) {
      return 1;
    }

    const isArray = Array.isArray(value);
    const entries = isArray
      ? value.map((item, index) => [String(index), item])
      : Object.entries(value);

    if (entries.length === 0) {
      return 1;
    }

    if (canInlineCollection(value, path)) {
      return 1;
    }

    let lines = 2;
    for (let index = 0; index < entries.length; index += 1) {
      const [entryKey, entryValue] = entries[index];
      lines += countExpandedLines(entryValue, `${path}.${entryKey}`, isArray ? null : entryKey);
    }
    return lines;
  }

  function isPrimitiveValue(value) {
    return (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    );
  }

  function canInlineObjectForArrayItem(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }
    const entries = Object.entries(value);
    if (entries.length === 0 || entries.length > 2) {
      return false;
    }
    return entries.every(([, nested]) => isPrimitiveValue(nested));
  }

  function renderInlineObject(value, depth) {
    const entries = Object.entries(value);
    const items = entries.map(
      ([key, nested]) =>
        `${renderQuotedToken("json-key", key)}<span class="json-colon">: </span>${renderPrimitive(
          nested
        )}`
    );
    return `${renderBraceToken("{", depth)} ${items.join(
      '<span class="json-comma">, </span>'
    )} ${renderBraceToken("}", depth)}`;
  }

  function renderInlineArray(value, depth) {
    const items = value.map((nested) => {
      if (isPrimitiveValue(nested)) {
        return renderPrimitive(nested);
      }
      return renderInlineObject(nested, depth + 1);
    });
    return `${renderBraceToken("[", depth)}${items.join(
      '<span class="json-comma">, </span>'
    )}${renderBraceToken("]", depth)}`;
  }

  function canInlineCollection(value, path) {
    if (path === "$") {
      return false;
    }
    if (Array.isArray(value)) {
      if (value.length === 0 || value.length > 4) {
        return false;
      }
      const allInlineable = value.every(
        (nested) => isPrimitiveValue(nested) || canInlineObjectForArrayItem(nested)
      );
      if (!allInlineable) {
        return false;
      }
      return JSON.stringify(value).length <= 60;
    }
    return false;
  }

  function renderInlineCollection(value, depth) {
    if (Array.isArray(value)) {
      return renderInlineArray(value, depth);
    }
    return "";
  }

  function inlineContainerWrap(path, keyLabel, contentHtml) {
    const isArrayItem = keyLabel === null && path !== "$";
    if (isArrayItem) {
      return `<span class="json-prefix"></span>${contentHtml}`;
    }
    return contentHtml;
  }

  function renderLine(depth, content, lineNumber) {
    return `<div class="json-line" style="--depth:${depth}" data-line="${lineNumber}">${content}</div>`;
  }

  function withArrayPrefix(path, keyLabel, inner) {
    const isArrayItem = keyLabel === null && path !== "$";
    if (!isArrayItem) {
      return inner;
    }
    return `<span class="json-prefix"></span>${inner}`;
  }

  function withArrayToggle(path, keyLabel, buttonHtml, contentHtml) {
    if (path === "$") {
      return `<span class="root-toggle-wrap">${buttonHtml}</span>${contentHtml}`;
    }
    const isArrayItem = keyLabel === null && path !== "$";
    if (!isArrayItem) {
      return `${buttonHtml}${contentHtml}`;
    }
    return `<span class="json-prefix">${buttonHtml}</span>${contentHtml}`;
  }

  function renderValueLines(value, context) {
    const { path, depth, collapsedPaths, keyLabel, appendComma, lineState } = context;
    const comma = renderLineComma(appendComma);
    const keyPart =
      keyLabel === null
        ? ""
        : `${renderQuotedToken("json-key", keyLabel)}<span class="json-colon">: </span>`;

    if (typeof value !== "object" || value === null) {
      const lineNumber = lineState.current;
      lineState.current += 1;
      return [
        renderLine(
          depth,
          withArrayPrefix(path, keyLabel, `${keyPart}${renderPrimitive(value)}${comma}`),
          lineNumber
        ),
      ];
    }

    if (keyLabel === null && path !== "$" && canInlineObjectForArrayItem(value)) {
      const lineNumber = lineState.current;
      lineState.current += 1;
      return [
        renderLine(
          depth,
          withArrayPrefix(path, keyLabel, `${renderInlineObject(value, depth)}${comma}`),
          lineNumber
        ),
      ];
    }

    const isArray = Array.isArray(value);
    const entries = isArray
      ? value.map((item, index) => [String(index), item])
      : Object.entries(value);
    const open = isArray ? "[" : "{";
    const close = isArray ? "]" : "}";
    const collapsed = collapsedPaths.has(path);

    if (entries.length === 0) {
      const lineNumber = lineState.current;
      lineState.current += 1;
      return [
        renderLine(
          depth,
          withArrayPrefix(
            path,
            keyLabel,
            `${keyPart}${renderBraceToken(open, depth)}${renderBraceToken(close, depth)}${comma}`
          ),
          lineNumber
        ),
      ];
    }

    if (collapsed) {
      const lineNumber = lineState.current;
      const expandedLines = countExpandedLines(value, path, keyLabel);
      lineState.current += expandedLines;
      const collapsedLine = `${keyPart}${withArrayToggle(
        path,
        keyLabel,
        `<button class="toggle-btn" data-path="${escapeHtml(path)}" aria-label="Expand"${
          path === "$" ? ' data-root="1"' : ""
        }>▸</button>`,
        `${renderBraceToken(open, depth)}<span class="json-ellipsis">…</span>${renderBraceToken(close, depth)}`
      )}${comma}`;
      return [renderLine(depth, collapsedLine, lineNumber)];
    }

    if (canInlineCollection(value, path)) {
      const lineNumber = lineState.current;
      lineState.current += 1;
      const inlineLine = `${keyPart}${inlineContainerWrap(
        path,
        keyLabel,
        renderInlineCollection(value, depth)
      )}${comma}`;
      return [renderLine(depth, inlineLine, lineNumber)];
    }

    const lines = [];
    const openLineNumber = lineState.current;
    lineState.current += 1;
    const openLine = `${keyPart}${withArrayToggle(
      path,
      keyLabel,
      `<button class="toggle-btn" data-path="${escapeHtml(path)}" aria-label="Collapse"${
        path === "$" ? ' data-root="1"' : ""
      }>▾</button>`,
      renderBraceToken(open, depth)
    )}`;
    lines.push(renderLine(depth, openLine, openLineNumber));

    for (let index = 0; index < entries.length; index += 1) {
      const [entryKey, entryValue] = entries[index];
      lines.push(
        ...renderValueLines(entryValue, {
          path: `${path}.${entryKey}`,
          depth: depth + 1,
          collapsedPaths,
          keyLabel: isArray ? null : entryKey,
          appendComma: index < entries.length - 1,
          lineState,
        })
      );
    }

    const closeLineNumber = lineState.current;
    lineState.current += 1;
    lines.push(renderLine(depth, `${renderBraceToken(close, depth)}${comma}`, closeLineNumber));
    return lines;
  }

  function renderJsonToHtml(value, collapsedPaths) {
    const lineState = { current: 1 };
    const lines = renderValueLines(value, {
      path: "$",
      depth: 0,
      collapsedPaths,
      keyLabel: null,
      appendComma: false,
      lineState,
    });
    return `<div class="json-root">${lines.join("")}</div>`;
  }

  function collectPaths(value, path, into) {
    if (typeof value !== "object" || value === null) {
      return;
    }
    into.add(path);
    const entries = Array.isArray(value) ? value.entries() : Object.entries(value);
    for (const [key, nested] of entries) {
      collectPaths(nested, `${path}.${key}`, into);
    }
  }

  function buildShellHtml(content) {
    return `<div class="json-viewer"><div class="json-toolbar"><button type="button" id="toggle-viewer">Disable viewer</button><button type="button" id="collapse-all">Collapse all</button><button type="button" id="expand-all">Expand all</button><button type="button" id="copy-json">Copy JSON</button><button type="button" id="toggle-theme">Theme: Dark</button></div><div id="json-editor"><div id="json-gutter" aria-hidden="true"></div><pre id="json-container" tabindex="0">${content}</pre></div></div>`;
  }

  function initJsonViewer() {
    if (!document.body || !isJsonDocument(window.location.href, document.contentType)) {
      return;
    }

    const THEME_KEY = "json-viewer-theme-mode";
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    let themeMode = resolveThemeMode(window.localStorage.getItem(THEME_KEY), mediaQuery.matches);
    const applyTheme = () => {
      document.documentElement.setAttribute("data-theme", themeMode);
      const toggleThemeBtn = document.getElementById("toggle-theme");
      if (toggleThemeBtn) {
        toggleThemeBtn.textContent = themeButtonLabel(themeMode);
      }
    };

    applyTheme();

    const source = document.body.innerText || "";
    const parsed = parseJsonText(source.trim());

    if (!parsed.ok) {
      const errorInfo = extractJsonErrorInfo(source, parsed.error);
      const locationHtml =
        errorInfo.line && errorInfo.column
          ? `<div class="json-error-location">Line ${errorInfo.line}, Column ${errorInfo.column}</div>`
          : "";
      const contextHtml =
        errorInfo.lineText !== null
          ? (() => {
              const snippetHtml = buildErrorSnippetHtml(source, errorInfo.line, errorInfo.column);
              return `<pre class="json-error-context">${snippetHtml}</pre>`;
            })()
          : "";
      document.body.innerHTML = buildShellHtml(
        `<div class="json-error-title">Invalid JSON</div><div class="json-error-message">${escapeHtml(
          errorInfo.message
        )}</div>${locationHtml}${contextHtml}`
      );
      const editor = document.getElementById("json-editor");
      if (editor) {
        editor.classList.add("json-editor-raw");
      }
      const gutter = document.getElementById("json-gutter");
      if (gutter) {
        gutter.innerHTML = "";
      }
      const toolbarButtons = document.querySelectorAll(".json-toolbar button");
      for (const button of toolbarButtons) {
        button.disabled = true;
      }
      applyTheme();
      return;
    }

    const collapsedPaths = new Set();
    const formattedJson = getFormattedJsonText(parsed.value);
    const copyStatus = { timer: null };
    let viewerEnabled = true;

    const showCopyButtonStatus = (copyJsonBtn, label, durationMs, disabled) => {
      if (!copyJsonBtn) {
        return;
      }
      if (copyStatus.timer) {
        window.clearTimeout(copyStatus.timer);
        copyStatus.timer = null;
      }
      const defaultText = "Copy JSON";
      copyJsonBtn.textContent = label;
      copyJsonBtn.disabled = disabled;
      copyStatus.timer = window.setTimeout(() => {
        if (!copyJsonBtn.isConnected) {
          return;
        }
        copyJsonBtn.textContent = defaultText;
        copyJsonBtn.disabled = false;
        copyStatus.timer = null;
      }, durationMs);
    };

    const rerender = () => {
      const container = document.getElementById("json-container");
      const gutter = document.getElementById("json-gutter");
      const editor = document.getElementById("json-editor");
      const toggleViewerBtn = document.getElementById("toggle-viewer");
      const copyJsonBtn = document.getElementById("copy-json");
      const toggleThemeBtn = document.getElementById("toggle-theme");
      const collapseAllBtn = document.getElementById("collapse-all");
      const expandAllBtn = document.getElementById("expand-all");
      if (!container || !gutter || !editor) {
        return;
      }

      if (!viewerEnabled) {
        container.textContent = source;
        container.classList.add("json-raw-mode");
        editor.classList.add("json-editor-raw");
        gutter.innerHTML = "";
        if (toggleViewerBtn) {
          toggleViewerBtn.textContent = "Enable viewer";
        }
        if (toggleThemeBtn) {
          toggleThemeBtn.disabled = false;
        }
        if (copyJsonBtn) {
          copyJsonBtn.disabled = false;
        }
        if (collapseAllBtn) {
          collapseAllBtn.disabled = true;
        }
        if (expandAllBtn) {
          expandAllBtn.disabled = true;
        }
        return;
      }

      container.classList.remove("json-raw-mode");
      editor.classList.remove("json-editor-raw");
      container.innerHTML = renderJsonToHtml(parsed.value, collapsedPaths);
      const lineNumbers = Array.from(container.querySelectorAll(".json-line"), (node) =>
        Number(node.getAttribute("data-line") || 0)
      ).filter((value) => Number.isFinite(value) && value > 0);
      gutter.innerHTML = buildLineNumbersHtml(lineNumbers);
      if (toggleViewerBtn) {
        toggleViewerBtn.textContent = "Disable viewer";
      }
      if (toggleThemeBtn) {
        toggleThemeBtn.disabled = false;
      }
      if (copyJsonBtn) {
        copyJsonBtn.disabled = false;
      }
      if (collapseAllBtn) {
        collapseAllBtn.disabled = false;
      }
      if (expandAllBtn) {
        expandAllBtn.disabled = false;
      }
    };

    document.body.innerHTML = buildShellHtml("");
    applyTheme();
    rerender();

    const jsonContainer = document.getElementById("json-container");

    document.body.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (target.matches(".toggle-btn")) {
        const path = target.dataset.path;
        if (path) {
          toggleCollapsedPath(collapsedPaths, path);
          rerender();
        }
        return;
      }

      if (target.id === "toggle-viewer") {
        viewerEnabled = !viewerEnabled;
        rerender();
        return;
      }

      if (target.id === "toggle-theme") {
        themeMode = nextThemeMode(themeMode);
        window.localStorage.setItem(THEME_KEY, themeMode);
        applyTheme();
        return;
      }

      if (target.id === "copy-json") {
        const copyButton = target;
        void (async () => {
          const copied = await copyTextToClipboard(formattedJson);
          if (copied) {
            showCopyButtonStatus(copyButton, "Copied", 1800, true);
          }
        })();
        return;
      }

      if (target.id === "collapse-all") {
        collapsedPaths.clear();
        collectPaths(parsed.value, "$", collapsedPaths);
        rerender();
        return;
      }

      if (target.id === "expand-all") {
        collapsedPaths.clear();
        rerender();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (!jsonContainer) {
        return;
      }

      const active = document.activeElement;
      const selection = window.getSelection();
      const anchorNode = selection ? selection.anchorNode : null;
      const handle = shouldHandleSelectAll(
        event,
        active,
        jsonContainer,
        (node) => node === jsonContainer || jsonContainer.contains(node),
        anchorNode
      );

      if (!handle) {
        return;
      }

      event.preventDefault();
      const selectionForSelectAll = window.getSelection();
      if (!selectionForSelectAll) {
        return;
      }
      const range = document.createRange();
      range.selectNodeContents(jsonContainer);
      selectionForSelectAll.removeAllRanges();
      selectionForSelectAll.addRange(range);
    });

    document.addEventListener("copy", (event) => {
      if (!jsonContainer || !event.clipboardData) {
        return;
      }
      const selection = window.getSelection();
      const anchorNode = selection ? selection.anchorNode : null;
      const active = document.activeElement;
      const selectionInContainer =
        (anchorNode && (anchorNode === jsonContainer || jsonContainer.contains(anchorNode))) ||
        (active && (active === jsonContainer || jsonContainer.contains(active)));

      if (!selectionInContainer) {
        return;
      }

      const clipboardText = getClipboardJsonText(viewerEnabled, source);
      if (clipboardText === null) {
        return;
      }

      event.preventDefault();
      event.clipboardData.setData("text/plain", clipboardText);
    });
  }

  initJsonViewer();
})();
