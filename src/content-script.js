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

  function themeButtonContent(themeMode) {
    const targetMode = themeMode === "dark" ? "light" : "dark";
    const targetLabel = targetMode === "dark" ? "Dark" : "Light";
    const iconSvg =
      targetMode === "dark"
        ? '<svg class="theme-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M7.30566 3.67212c0.63864 -0.29382 1.31159 -0.17926 1.81055 0.15234 0.51302 0.34113 0.86535 0.91807 0.92679 1.56934 0.446 4.7344 4.3291 8.6166 9.0634 9.0625 0.6513 0.0614 1.2273 0.4147 1.5684 0.9277 0.3537 0.5322 0.46 1.2612 0.0879 1.9366 -1.7007 3.085 -4.9864 5.1787 -8.7627 5.1787 -5.52285 0 -10 -4.4772 -10 -10 0.00027 -3.77605 2.09383 -7.06219 5.17871 -8.76273z"></path></svg>'
        : '<svg class="theme-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 19.5c0.5523 0 1 0.4477 1 1V22c0 0.5523 -0.4477 1 -1 1s-1 -0.4477 -1 -1v-1.5c0 -0.5523 0.4477 -1 1 -1m-6.71777 -2.1963c0.3905 -0.3905 1.02353 -0.3905 1.41406 0 0.39052 0.3905 0.39052 1.0235 0 1.4141l-1.06055 1.0605c-0.39054 0.3903 -1.02362 0.3905 -1.41406 0 -0.39039 -0.3904 -0.39026 -1.0235 0 -1.414zm12.02147 0c0.3905 -0.3905 1.0236 -0.3905 1.4141 0l1.0605 1.0606c0.3902 0.3905 0.3904 1.0236 0 1.414s-1.0235 0.3902 -1.414 0l-1.0606 -1.0605c-0.3905 -0.3906 -0.3905 -1.0236 0 -1.4141M12 6c3.3137 0 6 2.68629 6 6 0 3.3137 -2.6863 6 -6 6 -3.31371 0 -6 -2.6863 -6 -6 0 -3.31371 2.68629 -6 6 -6m-8.5 5c0.55228 0 1 0.4477 1 1s-0.44772 1 -1 1H2c-0.55228 0 -1 -0.4477 -1 -1s0.44772 -1 1 -1zM22 11c0.5523 0 1 0.4477 1 1s-0.4477 1 -1 1h-1.5c-0.5523 0 -1 -0.4477 -1 -1s0.4477 -1 1 -1zM4.22168 4.22168c0.39044 -0.39044 1.02352 -0.39028 1.41406 0l1.06055 1.06055c0.39052 0.39052 0.39052 1.02353 0 1.41406 -0.39053 0.39052 -1.02354 0.39052 -1.41406 0L4.22168 5.63574c-0.39028 -0.39054 -0.39044 -1.02362 0 -1.41406m14.14262 0c0.3905 -0.3902 1.0236 -0.39037 1.414 0 0.3904 0.39043 0.3902 1.02353 0 1.41406l-1.0605 1.06055c-0.3905 0.3905 -1.0236 0.39046 -1.4141 0 -0.3905 -0.39053 -0.3905 -1.02356 0 -1.41406zM12 1c0.5523 0 1 0.44772 1 1v1.5c0 0.55228 -0.4477 1 -1 1s-1 -0.44772 -1 -1V2c0 -0.55228 0.4477 -1 1 -1"></path></svg>';
    return `${iconSvg}<span class="theme-label">${targetLabel}</span>`;
  }

  function copyButtonContent(state) {
    const isDone = state === "done";
    const safeLabel = "Copy";
    if (isDone) {
      const doneSvg =
        '<svg class="copy-done-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M14.364 3.407a1 1 0 0 1 0 1.414L6.869 12.317a1.0667 1.0667 0 0 1 -1.509 0L1.636 8.593a1 1 0 1 1 1.414 -1.414l3.064 3.064L12.949 3.407a1 1 0 0 1 1.415 0Z"></path></svg>';
      return `${doneSvg}<span class="copy-label">${safeLabel}</span>`;
    }
    const iconSvg =
      '<svg class="copy-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M15.24 2h-3.8942c-1.76421 -0.00001 -3.16162 -0.00003 -4.25526 0.1476 -1.12553 0.15193 -2.03652 0.47204 -2.75495 1.19336 -0.71842 0.72131 -1.03726 1.63596 -1.18858 2.76601C2.99997 7.205 2.99999 8.60802 3 10.3793v5.8376c0 1.5081 0.91995 2.8005 2.22717 3.3423 -0.06728 -0.9094 -0.06723 -2.1855 -0.06717 -3.2472l0 -4.9144 0 -0.0952c-0.00007 -1.2817 -0.00014 -2.38596 0.11828 -3.27029 0.12691 -0.94773 0.41311 -1.85619 1.14702 -2.59305 0.73391 -0.73687 1.63874 -1.02421 2.58268 -1.15163 0.88079 -0.11889 1.98072 -0.11883 3.25722 -0.11876l0.0948 0.00001h2.88l0.0948 -0.00001c1.2765 -0.00007 2.374 -0.00013 3.2548 0.11876C18.0627 2.94779 16.7616 2 15.24 2Z"></path><path fill="currentColor" d="M6.6001 11.3974c0 -2.72621 0 -4.0893 0.84353 -4.93622 0.84353 -0.84692 2.20118 -0.84692 4.91647 -0.84692h2.88c2.7153 0 4.0729 0 4.9165 0.84692 0.8435 0.84692 0.8435 2.21002 0.8435 4.93622v4.8193c0 2.7262 0 4.0893 -0.8435 4.9362 -0.8436 0.8469 -2.2012 0.8469 -4.9165 0.8469h-2.88c-2.71529 0 -4.07294 0 -4.91647 -0.8469 -0.84353 -0.8469 -0.84353 -2.21 -0.84353 -4.9362v-4.8193Z"></path></svg>';
    return `${iconSvg}<span class="copy-label">${safeLabel}</span>`;
  }

  function toggleAllButtonContent(state) {
    const isExpand = state === "expand";
    const label = isExpand ? "Expand all" : "Collapse all";
    const iconSvg = isExpand
      ? '<svg class="toggle-all-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M9.04297 13.5431c0.39052 -0.3905 1.02353 -0.3905 1.41403 0s0.3905 1.0236 0 1.4141l-2.54294 2.5429 1.79297 1.793c0.2648 0.2649 0.35937 0.656 0.24512 1.0127 -0.11444 0.3564 -0.41882 0.6191 -0.78809 0.6807l-6 1c-0.31841 0.0529 -0.64281 -0.0511 -0.87109 -0.2793 -0.22827 -0.2283 -0.33224 -0.5527 -0.2793 -0.8711l1 -6 0.03223 -0.1358c0.09643 -0.3071 0.33659 -0.5522 0.64844 -0.6523 0.3567 -0.1143 0.74783 -0.0198 1.01269 0.2451L6.5 16.0861zM20.8359 2.01379c0.3185 -0.05294 0.6429 0.05104 0.8711 0.2793 0.2282 0.22828 0.3323 0.55269 0.2793 0.87109l-1 6c-0.0615 0.36927 -0.3242 0.67365 -0.6806 0.78809 -0.3567 0.11433 -0.7479 0.01968 -1.0127 -0.24512L17.5 7.91418l-2.543 2.54302c-0.3905 0.3904 -1.0235 0.3904 -1.414 0 -0.3906 -0.3906 -0.3906 -1.02358 0 -1.41411l2.5429 -2.54297 -1.7929 -1.79297c-0.2649 -0.26485 -0.3594 -0.65599 -0.2451 -1.01269 0.1144 -0.35647 0.4187 -0.61911 0.788 -0.68067z"></path></svg>'
      : '<svg class="toggle-all-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M10.3359 12.5138c0.3185 -0.053 0.6429 0.051 0.8711 0.2793 0.2283 0.2283 0.3323 0.5527 0.2793 0.8711l-1 6c-0.0615 0.3693 -0.3242 0.6736 -0.68064 0.7881 -0.35668 0.1143 -0.74782 0.0197 -1.01269 -0.2451L7 18.4142l-2.54297 2.543c-0.3905 0.3905 -1.02353 0.3904 -1.41406 0 -0.39053 -0.3906 -0.39053 -1.0236 0 -1.4141l2.54297 -2.543 -1.79297 -1.7929c-0.26486 -0.2649 -0.35941 -0.656 -0.24512 -1.0127 0.11444 -0.3565 0.41876 -0.6192 0.78809 -0.6807zm9.2071 -9.47071c0.3905 -0.39052 1.0235 -0.39052 1.414 0 0.3905 0.39053 0.3905 1.02356 0 1.41406l-2.5429 2.54297 1.7929 1.79297c0.2648 0.26487 0.3595 0.65601 0.2451 1.0127 -0.1144 0.35641 -0.4188 0.61911 -0.788 0.68071l-6 1c-0.3185 0.0529 -0.6429 -0.0511 -0.8711 -0.2793 -0.2283 -0.2283 -0.3323 -0.5527 -0.2793 -0.8711l1 -6.00004 0.0322 -0.13574c0.0964 -0.30708 0.3366 -0.55224 0.6484 -0.65235 0.3567 -0.11429 0.7479 -0.01974 1.0127 0.24512L17 5.58606z"></path></svg>';
    return `${iconSvg}<span class="toggle-all-label">${label}</span>`;
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

  function renderToggleButton(path, ariaLabel) {
    const stateClass = ariaLabel === "Expand" ? "is-collapsed" : "is-expanded";
    return `<button class="toggle-btn ${stateClass}" data-path="${escapeHtml(path)}" aria-label="${ariaLabel}"${
      path === "$" ? ' data-root="1"' : ""
    }><svg class="toggle-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19.543 7.54309c0.3905 -0.39052 1.0235 -0.39052 1.414 0 0.3905 0.39053 0.3905 1.02356 0 1.41406l-8.25 8.25005c-0.3661 0.366 -0.9451 0.3886 -1.3379 0.0683l-0.0761 -0.0683 -8.25003 -8.25005c-0.39053 -0.39052 -0.39053 -1.02353 0 -1.41406 0.39052 -0.39052 1.02354 -0.39052 1.41406 0L12 15.0861z"></path></svg></button>`;
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

  function renderGuides(activeGuides, guideStarts) {
    if (!Array.isArray(activeGuides) || activeGuides.length === 0) {
      return "";
    }
    return `<span class="json-guides" aria-hidden="true">${activeGuides
      .map(
        (guideDepth) =>
          `<span class="json-guide json-guide-depth-${normalizeBraceDepth(
            guideDepth
          )}${guideStarts.has(guideDepth) ? " json-guide-start" : ""}" style="--depth:${guideDepth + 1}"></span>`
      )
      .join("")}</span>`;
  }

  function markGuideClassOnLine(lineHtml, guideDepth, className) {
    const depthValue = guideDepth + 1;
    return lineHtml.replace(
      new RegExp(
        `<span class="json-guide([^"]*)" style="--depth:${depthValue}"><\\/span>`
      ),
      `<span class="json-guide$1 ${className}" style="--depth:${depthValue}"></span>`
    );
  }

  function renderLine(
    depth,
    content,
    lineNumber,
    activeGuides = [],
    guideStarts = new Set(),
    toggleHtml = ""
  ) {
    const toggleClass = toggleHtml ? "json-line-toggle has-toggle" : "json-line-toggle";
    return `<div class="json-line" style="--depth:${depth}" data-line="${lineNumber}">${renderGuides(
      activeGuides,
      guideStarts
    )}<span class="${toggleClass}">${toggleHtml}</span><span class="json-line-content">${content}</span></div>`;
  }

  function renderValueLines(value, context) {
    const { path, depth, collapsedPaths, keyLabel, appendComma, lineState, activeGuides, guideStarts } = context;
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
          `${keyPart}${renderPrimitive(value)}${comma}`,
          lineNumber,
          activeGuides,
          guideStarts
        ),
      ];
    }

    if (keyLabel === null && path !== "$" && canInlineObjectForArrayItem(value)) {
      const lineNumber = lineState.current;
      lineState.current += 1;
      return [
        renderLine(
          depth,
          `${renderInlineObject(value, depth)}${comma}`,
          lineNumber,
          activeGuides,
          guideStarts
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
          `${keyPart}${renderBraceToken(open, depth)}${renderBraceToken(close, depth)}${comma}`,
          lineNumber,
          activeGuides,
          guideStarts
        ),
      ];
    }

    if (canInlineCollection(value, path)) {
      const lineNumber = lineState.current;
      lineState.current += 1;
      const inlineLine = `${keyPart}${renderInlineCollection(value, depth)}${comma}`;
      return [renderLine(depth, inlineLine, lineNumber, activeGuides, guideStarts)];
    }

    if (collapsed) {
      const lineNumber = lineState.current;
      const expandedLines = countExpandedLines(value, path, keyLabel);
      lineState.current += expandedLines;
      const toggleButton = renderToggleButton(path, "Expand");
      const collapsedLine = `${keyPart}${renderBraceToken(open, depth)}<span class="json-ellipsis">…</span>${renderBraceToken(close, depth)}${comma}`;
      return [renderLine(depth, collapsedLine, lineNumber, [], new Set(), toggleButton)];
    }

    const lines = [];
    const openLineNumber = lineState.current;
    lineState.current += 1;
    const toggleButton = renderToggleButton(path, "Collapse");
    const openLine = `${keyPart}${renderBraceToken(open, depth)}`;
    lines.push(renderLine(depth, openLine, openLineNumber, activeGuides, guideStarts, toggleButton));

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
          activeGuides: [...activeGuides, depth],
          guideStarts: index === 0 ? new Set([depth]) : new Set(),
        })
      );
    }

    if (lines.length > 0) {
      lines[lines.length - 1] = markGuideClassOnLine(lines[lines.length - 1], depth, "json-guide-end");
    }

    const closeLineNumber = lineState.current;
    lineState.current += 1;
    lines.push(
      renderLine(
        depth,
        `${renderBraceToken(close, depth)}${comma}`,
        closeLineNumber,
        activeGuides,
        new Set()
      )
    );
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
      activeGuides: [],
      guideStarts: new Set(),
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
    return `<div class="json-viewer"><div class="json-toolbar"><button type="button" id="toggle-all">${toggleAllButtonContent(
      "collapse"
    )}</button><button type="button" id="copy-json">${copyButtonContent(
      "copy"
    )}</button><button type="button" id="toggle-theme">Theme: Dark</button></div><div id="json-editor"><div id="json-gutter" aria-hidden="true"></div><pre id="json-container" tabindex="0">${content}</pre></div></div>`;
  }

  function initJsonViewer() {
    if (!document.body || !isJsonDocument(window.location.href, document.contentType)) {
      return;
    }

    const THEME_KEY = "json-viewer-theme-mode";
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const readStoredThemeMode = () => {
      try {
        return window.localStorage.getItem(THEME_KEY);
      } catch (_) {
        return null;
      }
    };
    const persistThemeMode = (mode) => {
      try {
        window.localStorage.setItem(THEME_KEY, mode);
      } catch (_) {
        // ignore storage failures (restricted origins/privacy modes)
      }
    };
    let themeMode = resolveThemeMode(readStoredThemeMode(), mediaQuery.matches);
    const applyTheme = () => {
      document.documentElement.setAttribute("data-theme", themeMode);
      const toggleThemeBtn = document.getElementById("toggle-theme");
      if (toggleThemeBtn) {
        toggleThemeBtn.innerHTML = themeButtonContent(themeMode);
      }
    };

    applyTheme();

    const source = document.body.innerText || "";
    const trimmedSource = source.trim();

    if (trimmedSource.length === 0) {
      document.body.innerHTML = buildShellHtml(
        '<div class="json-error-title">Empty JSON</div><div class="json-error-message">Response body is empty.</div>'
      );
      const editor = document.getElementById("json-editor");
      if (editor) {
        editor.classList.add("json-editor-raw");
      }
      const gutter = document.getElementById("json-gutter");
      if (gutter) {
        gutter.innerHTML = "";
      }
      const toggleAllBtn = document.getElementById("toggle-all");
      const copyJsonBtn = document.getElementById("copy-json");
      if (toggleAllBtn) {
        toggleAllBtn.disabled = true;
      }
      if (copyJsonBtn) {
        copyJsonBtn.disabled = true;
      }
      applyTheme();
      return;
    }

    const parsed = parseJsonText(trimmedSource);

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
    let lockedGutterWidthPx = null;
    let gutterLockAttempts = 0;
    let gutterLockRafId = 0;

    const showCopyButtonStatus = (copyJsonBtn, label, durationMs, disabled) => {
      if (!copyJsonBtn) {
        return;
      }
      if (copyStatus.timer) {
        window.clearTimeout(copyStatus.timer);
        copyStatus.timer = null;
      }
      const state = label === "Copied" ? "done" : "copy";
      copyJsonBtn.innerHTML = copyButtonContent(state);
      copyJsonBtn.disabled = disabled;
      copyStatus.timer = window.setTimeout(() => {
        if (!copyJsonBtn.isConnected) {
          return;
        }
        copyJsonBtn.innerHTML = copyButtonContent("copy");
        copyJsonBtn.disabled = false;
        copyStatus.timer = null;
      }, durationMs);
    };

    const cancelPendingGutterLock = () => {
      if (gutterLockRafId !== 0) {
        window.cancelAnimationFrame(gutterLockRafId);
        gutterLockRafId = 0;
      }
    };

    const applyLockedGutterWidth = (gutter) => {
      if (lockedGutterWidthPx === null) {
        return;
      }
      const widthValue = `${lockedGutterWidthPx}px`;
      gutter.style.width = widthValue;
      gutter.style.minWidth = widthValue;
    };

    const tryLockGutterWidth = (gutter, editor) => {
      if (lockedGutterWidthPx !== null) {
        applyLockedGutterWidth(gutter);
        return true;
      }

      gutter.style.width = "";
      gutter.style.minWidth = "";
      const measuredWidth = Math.ceil(gutter.getBoundingClientRect().width);
      const maxReasonableWidth = Math.max(56, Math.min(160, Math.floor(window.innerWidth * 0.2)));
      if (measuredWidth > 0 && measuredWidth <= maxReasonableWidth) {
        lockedGutterWidthPx = measuredWidth;
        applyLockedGutterWidth(gutter);
        return true;
      }
      return false;
    };

    const scheduleGutterWidthLock = () => {
      if (lockedGutterWidthPx !== null || gutterLockRafId !== 0 || gutterLockAttempts >= 8) {
        return;
      }
      gutterLockRafId = window.requestAnimationFrame(() => {
        gutterLockRafId = 0;
        const gutter = document.getElementById("json-gutter");
        const editor = document.getElementById("json-editor");
        if (!viewerEnabled || !gutter || !editor) {
          return;
        }
        gutterLockAttempts += 1;
        if (!tryLockGutterWidth(gutter, editor)) {
          scheduleGutterWidthLock();
        }
      });
    };

    const rerender = () => {
      const container = document.getElementById("json-container");
      const gutter = document.getElementById("json-gutter");
      const editor = document.getElementById("json-editor");
      const toggleViewerBtn = document.getElementById("toggle-viewer");
      const toggleAllBtn = document.getElementById("toggle-all");
      const copyJsonBtn = document.getElementById("copy-json");
      const toggleThemeBtn = document.getElementById("toggle-theme");
      if (!container || !gutter || !editor) {
        return;
      }

      if (!viewerEnabled) {
        cancelPendingGutterLock();
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
        if (toggleAllBtn) {
          toggleAllBtn.disabled = true;
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
      if (!tryLockGutterWidth(gutter, editor)) {
        scheduleGutterWidthLock();
      }
      if (toggleViewerBtn) {
        toggleViewerBtn.textContent = "Disable viewer";
      }
      if (toggleThemeBtn) {
        toggleThemeBtn.disabled = false;
      }
      if (copyJsonBtn) {
        copyJsonBtn.disabled = false;
      }
      if (toggleAllBtn) {
        toggleAllBtn.disabled = false;
        toggleAllBtn.innerHTML = toggleAllButtonContent(collapsedPaths.size > 0 ? "expand" : "collapse");
      }
    };

    document.body.innerHTML = buildShellHtml("");
    applyTheme();
    rerender();

    const jsonContainer = document.getElementById("json-container");

    document.body.addEventListener("click", (event) => {
      const eventTarget = event.target;
      const target =
        eventTarget instanceof Element
          ? eventTarget
          : eventTarget instanceof Node
            ? eventTarget.parentElement
            : null;
      if (!(target instanceof Element)) {
        return;
      }

      const toggleBtn = target.closest("button.toggle-btn");
      if (toggleBtn) {
        const path = toggleBtn.dataset.path;
        if (path) {
          toggleCollapsedPath(collapsedPaths, path);
          rerender();
        }
      }
    });

    const toggleViewerBtn = document.getElementById("toggle-viewer");
    if (toggleViewerBtn) {
      toggleViewerBtn.addEventListener("click", () => {
        viewerEnabled = !viewerEnabled;
        rerender();
      });
    }

    const toggleThemeBtn = document.getElementById("toggle-theme");
    if (toggleThemeBtn) {
      toggleThemeBtn.addEventListener("click", () => {
        themeMode = nextThemeMode(themeMode);
        applyTheme();
        persistThemeMode(themeMode);
      });
    }

    const copyJsonBtn = document.getElementById("copy-json");
    if (copyJsonBtn) {
      copyJsonBtn.addEventListener("click", () => {
        void (async () => {
          const copied = await copyTextToClipboard(formattedJson);
          if (copied) {
            showCopyButtonStatus(copyJsonBtn, "Copied", 1800, true);
          }
        })();
      });
    }

    const toggleAllBtn = document.getElementById("toggle-all");
    if (toggleAllBtn) {
      toggleAllBtn.addEventListener("click", () => {
        if (collapsedPaths.size > 0) {
          collapsedPaths.clear();
        } else {
          collapsedPaths.clear();
          collectPaths(parsed.value, "$", collapsedPaths);
        }
        rerender();
      });
    }

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

  function bootJsonViewer() {
    if (!isJsonDocument(window.location.href, document.contentType)) {
      return;
    }

    const run = () => {
      initJsonViewer();
    };

    if (document.body) {
      run();
      return;
    }

    document.addEventListener("DOMContentLoaded", run, { once: true });
  }

  bootJsonViewer();
})();
