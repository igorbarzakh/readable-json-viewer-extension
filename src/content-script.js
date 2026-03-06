import {
  escapeHtml,
  isJsonDocument,
  parseJsonText,
  toggleCollapsedPath,
  shouldHandleSelectAll,
  getFormattedJsonText,
  extractJsonErrorInfo,
  resolveThemeMode,
  nextThemeMode,
  computeLines,
} from './viewer-core.js';

const VS_LINE_HEIGHT = 19; // must match --code-row-height
const VS_BUFFER = 60;      // lines rendered above/below viewport

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

function themeButtonContent(themeMode) {
  const targetMode = nextThemeMode(themeMode);
  const targetLabel = targetMode[0].toUpperCase() + targetMode.slice(1);
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

function buildShellHtml(content) {
  return `<div class="json-viewer"><div class="json-toolbar"><button type="button" id="toggle-all">${toggleAllButtonContent(
    "collapse"
  )}</button><button type="button" id="copy-json">${copyButtonContent(
    "copy"
  )}</button><button type="button" id="toggle-theme"></button></div><div id="json-search-bar" class="json-search-bar" hidden><input id="json-search-input" type="text" placeholder="Search..." autocomplete="off" spellcheck="false"><span id="json-search-status"></span><button type="button" id="json-search-prev" title="Previous (Shift+Enter)">↑</button><button type="button" id="json-search-next" title="Next (Enter)">↓</button><button type="button" id="json-search-close" title="Close (Escape)">✕</button></div><div id="json-editor"><div id="json-gutter" aria-hidden="true"></div><pre id="json-container" tabindex="0">${content}</pre></div></div>`;
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

  // Compute the full expanded line list once for gutter width and reuse on expand-all.
  const allVsLines = computeLines(parsed.value, new Set());
  const maxDigitsEver = Math.max(3, String(allVsLines[allVsLines.length - 1]?.lineNumber ?? 1).length);

  const collapsedPaths = new Set();
  const formattedJson = getFormattedJsonText(parsed.value);
  const copyStatus = { timer: null };

  // Virtual scroll state
  let vsLines = allVsLines; // {html, lineNumber}[]
  let vsFirst = -1;       // first rendered line index
  let vsLast = -1;        // last rendered line index
  let vsScrollRafId = 0;

  // Search state
  let searchQuery = "";
  let searchMatches = []; // indices into allVsLines
  let searchCurrent = -1;

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

  // Strip HTML tags and decode entities to get plain text from a line's html string.
  const getLineText = (html) =>
    html
      .replace(/<[^>]*>/g, "")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");

  // Wrap occurrences of query inside text nodes (not inside HTML tags) with <mark>.
  // The query is HTML-encoded before matching so that e.g. `"foo"` finds `&quot;foo&quot;`.
  const injectHighlight = (html, query, cls) => {
    const encodedQuery = query
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    const re = new RegExp(
      encodedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "gi"
    );
    return html.replace(/(<[^>]*>)|([^<]+)/g, (match, tag, text) => {
      if (tag !== undefined) return tag;
      return text.replace(re, `<mark class="${cls}">$&</mark>`);
    });
  };

  const updateSearchStatus = () => {
    const el = document.getElementById("json-search-status");
    if (!el) return;
    el.textContent =
      searchMatches.length === 0
        ? searchQuery ? "No results" : ""
        : `${searchCurrent + 1} / ${searchMatches.length}`;
  };

  const buildSearchMatches = (query) => {
    searchQuery = query;
    if (!query) {
      searchMatches = [];
      searchCurrent = -1;
      return;
    }
    const lower = query.toLowerCase();
    searchMatches = [];
    for (let i = 0; i < allVsLines.length; i++) {
      if (getLineText(allVsLines[i].html).toLowerCase().includes(lower)) {
        searchMatches.push(i);
      }
    }
    searchCurrent = searchMatches.length > 0 ? 0 : -1;
  };

  const scrollToCurrentMatch = () => {
    if (searchCurrent < 0 || searchMatches.length === 0) return;
    const targetLn = allVsLines[searchMatches[searchCurrent]].lineNumber;

    let posIdx = vsLines.findIndex((l) => l.lineNumber === targetLn);
    if (posIdx < 0) {
      // Match is in a collapsed section — expand all.
      collapsedPaths.clear();
      vsLines = allVsLines;
      vsFirst = -1;
      vsLast = -1;
      posIdx = vsLines.findIndex((l) => l.lineNumber === targetLn);
      const btn = document.getElementById("toggle-all");
      if (btn) btn.innerHTML = toggleAllButtonContent("collapse");
    }

    if (posIdx < 0) return;

    const editor = document.getElementById("json-editor");
    if (editor) {
      editor.scrollTop = Math.max(
        0,
        posIdx * VS_LINE_HEIGHT - Math.floor((editor.clientHeight || 600) / 2)
      );
    }

    vsFirst = -1;
    vsLast = -1;
    const container = document.getElementById("json-container");
    const gutter = document.getElementById("json-gutter");
    const ed = document.getElementById("json-editor");
    if (container && gutter && ed) renderVirtualWindow(ed, container, gutter);
    updateSearchStatus();
  };

  const hideSearch = () => {
    const bar = document.getElementById("json-search-bar");
    if (!bar || bar.hidden) return;
    bar.hidden = true;
    buildSearchMatches("");
    vsFirst = -1;
    vsLast = -1;
    const container = document.getElementById("json-container");
    const gutter = document.getElementById("json-gutter");
    const editor = document.getElementById("json-editor");
    if (container && gutter && editor) renderVirtualWindow(editor, container, gutter);
  };

  // Render only the lines visible in the current scroll window plus VS_BUFFER above/below.
  // Top and bottom spacer divs maintain the correct total scroll height.
  const renderVirtualWindow = (editor, container, gutter) => {
    if (vsLines.length === 0) {
      return;
    }

    const scrollTop = editor.scrollTop;
    const viewportHeight = editor.clientHeight || 600;
    const total = vsLines.length;

    const first = Math.max(0, Math.floor(scrollTop / VS_LINE_HEIGHT) - VS_BUFFER);
    const last = Math.min(
      total - 1,
      Math.ceil((scrollTop + viewportHeight) / VS_LINE_HEIGHT) + VS_BUFFER
    );

    // Skip re-render if the needed range is already covered.
    if (first >= vsFirst && last <= vsLast) {
      return;
    }

    vsFirst = first;
    vsLast = last;

    const slice = vsLines.slice(first, last + 1);
    const topPx = first * VS_LINE_HEIGHT;
    const bottomPx = Math.max(0, (total - last - 1) * VS_LINE_HEIGHT);

    // Build a set of matching line numbers for highlight rendering.
    const matchLns =
      searchMatches.length > 0
        ? new Set(searchMatches.map((i) => allVsLines[i].lineNumber))
        : null;
    const currentMatchLn =
      searchCurrent >= 0 && searchMatches.length > 0
        ? allVsLines[searchMatches[searchCurrent]].lineNumber
        : -1;
    const getHtml = (l) => {
      if (!matchLns || !matchLns.has(l.lineNumber)) return l.html;
      const cls =
        l.lineNumber === currentMatchLn ? "json-search-hl-current" : "json-search-hl";
      return injectHighlight(l.html, searchQuery, cls);
    };

    container.innerHTML =
      `<div aria-hidden="true" style="height:${topPx}px"></div>` +
      `<div class="json-root">${slice.map(getHtml).join("")}</div>` +
      `<div aria-hidden="true" style="height:${bottomPx}px"></div>`;

    gutter.innerHTML =
      `<div aria-hidden="true" style="height:${topPx}px"></div>` +
      slice.map((l) => `<div class="json-gutter-line">${l.lineNumber}</div>`).join("") +
      `<div aria-hidden="true" style="height:${bottomPx}px"></div>`;
  };

  const rerender = () => {
    const container = document.getElementById("json-container");
    const gutter = document.getElementById("json-gutter");
    const editor = document.getElementById("json-editor");
    const toggleAllBtn = document.getElementById("toggle-all");
    const copyJsonBtn = document.getElementById("copy-json");
    const toggleThemeBtn = document.getElementById("toggle-theme");
    if (!container || !gutter || !editor) {
      return;
    }

    container.classList.remove("json-raw-mode");
    editor.classList.remove("json-editor-raw");

    // Recompute the full line list and reset the virtual window.
    // Reuse the cached allVsLines when nothing is collapsed to avoid redundant work.
    vsLines = collapsedPaths.size === 0 ? allVsLines : computeLines(parsed.value, collapsedPaths);
    vsFirst = -1;
    vsLast = -1;

    renderVirtualWindow(editor, container, gutter);

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

  // Lock gutter width once based on the widest possible line number (full expanded tree).
  // Using "calc(N * 1ch + 20px)" accounts for the 20px of horizontal padding (12px left + 8px right).
  const initGutter = document.getElementById("json-gutter");
  if (initGutter) {
    const w = `calc(${maxDigitsEver} * 1ch + 20px)`;
    initGutter.style.width = w;
    initGutter.style.minWidth = w;
  }

  rerender();

  const jsonContainer = document.getElementById("json-container");
  const jsonEditor = document.getElementById("json-editor");

  // Scroll handler: update virtual window as user scrolls.
  if (jsonEditor) {
    jsonEditor.addEventListener("scroll", () => {
      if (vsScrollRafId !== 0 || vsLines.length === 0) {
        return;
      }
      vsScrollRafId = window.requestAnimationFrame(() => {
        vsScrollRafId = 0;
        const container = document.getElementById("json-container");
        const gutter = document.getElementById("json-gutter");
        const editor = document.getElementById("json-editor");
        if (container && gutter && editor) {
          renderVirtualWindow(editor, container, gutter);
        }
      });
    });
  }

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
        collectPaths(parsed.value, "$", collapsedPaths);
      }
      // Scroll to top so the result of collapse/expand is immediately visible.
      if (jsonEditor) {
        jsonEditor.scrollTop = 0;
      }
      rerender();
    });
  }

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "f") {
      event.preventDefault();
      const bar = document.getElementById("json-search-bar");
      const input = document.getElementById("json-search-input");
      if (bar && input) {
        if (!bar.hidden) {
          hideSearch();
        } else {
          bar.hidden = false;
          input.focus();
          input.select();
        }
      }
      return;
    }

    if (event.key === "Escape") {
      hideSearch();
    }

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

  // Search bar
  const searchInput = document.getElementById("json-search-input");
  const searchPrevBtn = document.getElementById("json-search-prev");
  const searchNextBtn = document.getElementById("json-search-next");
  const searchCloseBtn = document.getElementById("json-search-close");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      buildSearchMatches(searchInput.value);
      if (searchCurrent >= 0) {
        scrollToCurrentMatch();
      } else {
        vsFirst = -1;
        vsLast = -1;
        const container = document.getElementById("json-container");
        const gutter = document.getElementById("json-gutter");
        const editor = document.getElementById("json-editor");
        if (container && gutter && editor) renderVirtualWindow(editor, container, gutter);
        updateSearchStatus();
      }
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (searchMatches.length === 0) return;
        searchCurrent = e.shiftKey
          ? (searchCurrent - 1 + searchMatches.length) % searchMatches.length
          : (searchCurrent + 1) % searchMatches.length;
        scrollToCurrentMatch();
      } else if (e.key === "Escape") {
        hideSearch();
      }
    });
  }

  if (searchPrevBtn) {
    searchPrevBtn.addEventListener("click", () => {
      if (searchMatches.length === 0) return;
      searchCurrent = (searchCurrent - 1 + searchMatches.length) % searchMatches.length;
      scrollToCurrentMatch();
    });
  }

  if (searchNextBtn) {
    searchNextBtn.addEventListener("click", () => {
      if (searchMatches.length === 0) return;
      searchCurrent = (searchCurrent + 1) % searchMatches.length;
      scrollToCurrentMatch();
    });
  }

  if (searchCloseBtn) {
    searchCloseBtn.addEventListener("click", () => hideSearch());
  }

}

function bootJsonViewer() {
  if (!isJsonDocument(window.location.href, document.contentType)) {
    return;
  }

  chrome.runtime.sendMessage({ type: 'json-activated' }).catch(() => {});

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
