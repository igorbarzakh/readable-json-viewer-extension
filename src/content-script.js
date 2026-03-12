import {
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
import {
  buildShellHtml,
  buildEmptyJsonHtml,
  buildInvalidJsonHtml,
  themeButtonContent,
  copyButtonContent,
  toggleAllButtonContent,
  isMac,
} from './ui-builders.js';

const cmd = isMac ? '⌘' : 'Ctrl';
import { copyTextToClipboard } from './clipboard.js';
import { createVirtualScroll } from './virtual-scroll.js';
import { createSearch } from './search.js';

const _THEME_KEY = 'json-viewer-theme-mode';
const VS_LINE_HEIGHT = 19; // must match --code-row-height
const VS_BUFFER = 60; // lines rendered above/below viewport

// All document_start side-effects are gated on isJsonDocument so we don't
// touch non-JSON pages at all.
if (isJsonDocument(window.location.href, document.contentType)) {
  // Apply theme synchronously to prevent flash.
  // localStorage is per-origin but available instantly; system preference is the fallback.
  try {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute(
      'data-theme',
      resolveThemeMode(localStorage.getItem(_THEME_KEY), prefersDark),
    );
  } catch (_) {
    document.documentElement.setAttribute(
      'data-theme',
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    );
  }
}

// Kick off extension storage read immediately; will be used to sync cross-origin.
// Only needed on JSON pages, but the cost of an early resolve is negligible.
// Errors (e.g. extension context invalidated) are caught inside initJsonViewer.
const _themePromise = isJsonDocument(window.location.href, document.contentType)
  ? chrome.storage.local.get(_THEME_KEY)
  : null;

// Hide the page body immediately (document_start) to prevent flash of the
// browser's raw JSON view before our viewer takes over. Removed synchronously
// inside initJsonViewer() right after the single async pause, so the browser
// batches the unhide with the body replacement — no visible intermediate state.
const _flashGuard = (() => {
  if (!isJsonDocument(window.location.href, document.contentType)) return null;
  const meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'width=device-width, initial-scale=1, maximum-scale=1';
  (document.head || document.documentElement).appendChild(meta);
  const s = document.createElement('style');
  s.textContent = 'body{visibility:hidden!important}';
  (document.head || document.documentElement).appendChild(s);
  return s;
})();

function collectPaths(value, path, into) {
  if (typeof value !== 'object' || value === null) return;
  into.add(path);
  const entries = Array.isArray(value) ? value.entries() : Object.entries(value);
  for (const [key, nested] of entries) {
    collectPaths(nested, `${path}.${key}`, into);
  }
}

async function initJsonViewer() {
  if (!document.body || !isJsonDocument(window.location.href, document.contentType)) {
    return;
  }

  const persistThemeMode = (mode) => {
    try {
      localStorage.setItem(_THEME_KEY, mode);
    } catch (_) {}
    chrome.storage.local.set({ [_THEME_KEY]: mode }).catch(() => {});
  };

  const storedResult = await _themePromise;
  // Unhide synchronously — everything below this line runs in the same
  // microtask continuation, so no repaint occurs between removing the guard
  // and replacing document.body.innerHTML with the viewer shell.
  _flashGuard?.remove();

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const fromExtStorage = storedResult[_THEME_KEY];
  let fromLocal = null;
  try {
    fromLocal = localStorage.getItem(_THEME_KEY);
  } catch (_) {}

  let themeMode;
  if (fromExtStorage === 'dark' || fromExtStorage === 'light') {
    themeMode = fromExtStorage;
  } else {
    themeMode = resolveThemeMode(fromLocal, prefersDark);
    // chrome.storage was empty — write resolved value so other origins
    // pick it up on their next reload.
    chrome.storage.local.set({ [_THEME_KEY]: themeMode }).catch(() => {});
  }
  // Always keep localStorage in sync with the final resolved value.
  try {
    localStorage.setItem(_THEME_KEY, themeMode);
  } catch (_) {}

  const applyTheme = () => {
    document.documentElement.setAttribute('data-theme', themeMode);
    const btn = document.getElementById('toggle-theme');
    if (btn) btn.innerHTML = themeButtonContent(themeMode);
  };
  applyTheme();

  const source = document.body.innerText || '';
  const trimmedSource = source.trim();

  if (trimmedSource.length === 0) {
    document.body.innerHTML = buildEmptyJsonHtml();
    document.getElementById('json-editor')?.classList.add('json-editor-raw');
    const toggleAllBtn = document.getElementById('toggle-all');
    const copyJsonBtn = document.getElementById('copy-json');
    if (toggleAllBtn) toggleAllBtn.disabled = true;
    if (copyJsonBtn) copyJsonBtn.disabled = true;
    applyTheme();
    return;
  }

  const parsed = parseJsonText(trimmedSource);

  if (!parsed.ok) {
    const errorInfo = extractJsonErrorInfo(source, parsed.error);
    document.body.innerHTML = buildInvalidJsonHtml(errorInfo, source);
    document.getElementById('json-editor')?.classList.add('json-editor-raw');
    for (const btn of document.querySelectorAll('.json-toolbar button')) {
      btn.disabled = true;
    }
    applyTheme();
    return;
  }

  const collapsedPaths = new Set();
  const formattedJson = getFormattedJsonText(parsed.value);

  // Send activation message with JSON stats after successful parse.
  const topLevelType = Array.isArray(parsed.value) ? 'array' : 'object';
  const topLevelCount = Array.isArray(parsed.value)
    ? parsed.value.length
    : Object.keys(parsed.value).length;
  const sendActivated = () => {
    chrome.runtime.sendMessage({
      type: 'json-activated',
      topLevelCount,
      topLevelType,
      sizeBytes: formattedJson.length,
    }).catch(() => {});
  };
  if (document.prerendering) {
    document.addEventListener('prerenderingchange', sendActivated, { once: true });
  } else {
    sendActivated();
  }

  // Re-register when page is restored from bfcache (back/forward navigation).
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) sendActivated();
  });

  // Allow popup to trigger JSON download.
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'download-json') {
      const blob = new Blob([formattedJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = window.location.pathname.split('/').pop() || 'data';
      a.href = url;
      a.download = filename.endsWith('.json') ? filename : filename + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  });

  // Compute the full expanded line list once; reused on expand-all and for search.
  const allVsLines = computeLines(parsed.value, new Set());
  const maxDigitsEver = Math.max(
    3,
    String(allVsLines[allVsLines.length - 1]?.lineNumber ?? 1).length,
  );

  const vscroll = createVirtualScroll(VS_LINE_HEIGHT, VS_BUFFER);
  const search = createSearch(allVsLines);
  const copyStatus = { timer: null };

  // --- helpers ---

  const showCopyButtonStatus = (btn, label, durationMs, disabled) => {
    if (!btn) return;
    if (copyStatus.timer) {
      clearTimeout(copyStatus.timer);
      copyStatus.timer = null;
    }
    btn.innerHTML = copyButtonContent(label === 'Copied' ? 'done' : 'copy');
    btn.disabled = disabled;
    copyStatus.timer = setTimeout(() => {
      if (!btn.isConnected) return;
      btn.innerHTML = copyButtonContent('copy');
      btn.disabled = false;
      copyStatus.timer = null;
    }, durationMs);
  };

  const rerender = () => {
    const container = document.getElementById('json-container');
    const gutter = document.getElementById('json-gutter');
    const editor = document.getElementById('json-editor');
    if (!container || !gutter || !editor) return;

    container.classList.remove('json-raw-mode');
    editor.classList.remove('json-editor-raw');

    vscroll.setLines(
      collapsedPaths.size === 0 ? allVsLines : computeLines(parsed.value, collapsedPaths),
    );
    vscroll.render(editor, container, gutter, search.getDecorator());

    document.getElementById('toggle-theme')?.removeAttribute('disabled');
    document.getElementById('copy-json')?.removeAttribute('disabled');
    const toggleAllBtn = document.getElementById('toggle-all');
    if (toggleAllBtn) {
      toggleAllBtn.disabled = false;
      const toggleState = collapsedPaths.size > 0 ? 'expand' : 'collapse';
      toggleAllBtn.innerHTML = toggleAllButtonContent(toggleState);
      toggleAllBtn.title = `${toggleState === 'expand' ? 'Expand' : 'Collapse'} all (${cmd} + X)`;
    }
  };

  const updateSearchStatus = () => {
    const el = document.getElementById('json-search-status');
    if (el) el.textContent = search.getStatusText();
  };

  const scrollToCurrentMatch = () => {
    const targetLn = search.getCurrentLineNumber();
    if (targetLn < 0) return;

    let posIdx = vscroll.findLineIndex(targetLn);
    if (posIdx < 0) {
      // Match is in a collapsed section — expand all.
      collapsedPaths.clear();
      vscroll.setLines(allVsLines);
      posIdx = vscroll.findLineIndex(targetLn);
      const btn = document.getElementById('toggle-all');
      if (btn) {
        btn.innerHTML = toggleAllButtonContent('collapse');
        btn.title = `Collapse all (${cmd}+X)`;
      }
    }
    if (posIdx < 0) return;

    const editor = document.getElementById('json-editor');
    if (editor) {
      editor.scrollTop = Math.max(
        0,
        posIdx * VS_LINE_HEIGHT - Math.floor((editor.clientHeight || 600) / 2),
      );
    }

    vscroll.resetWindow();
    const container = document.getElementById('json-container');
    const gutter = document.getElementById('json-gutter');
    if (editor && container && gutter) {
      vscroll.render(editor, container, gutter, search.getDecorator());
    }
    updateSearchStatus();
  };

  const hideSearch = () => {
    const bar = document.getElementById('json-search-bar');
    if (!bar || bar.hidden) return;
    bar.hidden = true;
    const searchInput = document.getElementById('json-search-input');
    if (searchInput) searchInput.value = '';
    search.clear();
    vscroll.resetWindow();
    const container = document.getElementById('json-container');
    const gutter = document.getElementById('json-gutter');
    const editor = document.getElementById('json-editor');
    if (container && gutter && editor) vscroll.render(editor, container, gutter);
  };

  // --- initial render ---

  document.body.innerHTML = buildShellHtml('');
  applyTheme();

  // Lock gutter width once based on the widest possible line number.
  const initGutter = document.getElementById('json-gutter');
  if (initGutter) {
    const w = `calc(${maxDigitsEver} * 1ch + 20px)`;
    initGutter.style.width = w;
    initGutter.style.minWidth = w;
  }

  rerender();

  // --- event listeners ---

  const jsonEditor = document.getElementById('json-editor');
  const jsonContainer = document.getElementById('json-container');

  if (jsonEditor) {
    jsonEditor.addEventListener(
      'scroll',
      vscroll.createScrollHandler(
        () => document.getElementById('json-editor'),
        () => document.getElementById('json-container'),
        () => document.getElementById('json-gutter'),
        () => search.getDecorator(),
      ),
    );
  }

  document.body.addEventListener('click', (event) => {
    const eventTarget = event.target;
    const target =
      eventTarget instanceof Element
        ? eventTarget
        : eventTarget instanceof Node
          ? eventTarget.parentElement
          : null;
    if (!(target instanceof Element)) return;

    const toggleBtn = target.closest('button.toggle-btn');
    if (toggleBtn) {
      const path = toggleBtn.dataset.path;
      if (path) {
        toggleCollapsedPath(collapsedPaths, path);
        rerender();
      }
    }
  });

  document.getElementById('toggle-theme')?.addEventListener('click', () => {
    themeMode = nextThemeMode(themeMode);
    applyTheme();
    persistThemeMode(themeMode);
  });

  document.getElementById('copy-json')?.addEventListener('click', () => {
    void (async () => {
      const copyJsonBtn = document.getElementById('copy-json');
      const copied = await copyTextToClipboard(formattedJson);
      if (copied) showCopyButtonStatus(copyJsonBtn, 'Copied', 1800, true);
    })();
  });

  document.getElementById('toggle-all')?.addEventListener('click', () => {
    if (collapsedPaths.size > 0) {
      collapsedPaths.clear();
    } else {
      collectPaths(parsed.value, '$', collapsedPaths);
    }
    if (jsonEditor) jsonEditor.scrollTop = 0;
    rerender();
  });

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
      event.preventDefault();
      const bar = document.getElementById('json-search-bar');
      const input = document.getElementById('json-search-input');
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

    if (event.key === 'Escape') {
      hideSearch();
      return;
    }

    const isCmd = event.metaKey || event.ctrlKey;
    const inSearchInput = document.activeElement?.id === 'json-search-input';

    if (isCmd && event.key === 'c' && !inSearchInput) {
      const hasSelection = window.getSelection()?.toString().length > 0;
      if (!hasSelection) {
        event.preventDefault();
        void (async () => {
          const copyJsonBtn = document.getElementById('copy-json');
          const copied = await copyTextToClipboard(formattedJson);
          if (copied) showCopyButtonStatus(copyJsonBtn, 'Copied', 1800, true);
        })();
      }
      return;
    }

    if (isCmd && event.key === 'x' && !inSearchInput) {
      event.preventDefault();
      if (collapsedPaths.size > 0) {
        collapsedPaths.clear();
      } else {
        collectPaths(parsed.value, '$', collapsedPaths);
      }
      if (jsonEditor) jsonEditor.scrollTop = 0;
      rerender();
      return;
    }

    if (isCmd && event.altKey && event.code === 'KeyT') {
      event.preventDefault();
      themeMode = nextThemeMode(themeMode);
      applyTheme();
      persistThemeMode(themeMode);
      return;
    }

    if (!jsonContainer) return;
    const active = document.activeElement;
    const selection = window.getSelection();
    const handle = shouldHandleSelectAll(
      event,
      active,
      jsonContainer,
      (node) => node === jsonContainer || jsonContainer.contains(node),
      selection ? selection.anchorNode : null,
    );
    if (!handle) return;

    event.preventDefault();
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(jsonContainer);
    sel.removeAllRanges();
    sel.addRange(range);
  });

  // Search bar controls
  document.getElementById('json-search-input')?.addEventListener('input', (e) => {
    search.build(e.target.value);
    if (search.getCurrentLineNumber() >= 0) {
      scrollToCurrentMatch();
    } else {
      vscroll.resetWindow();
      const container = document.getElementById('json-container');
      const gutter = document.getElementById('json-gutter');
      const editor = document.getElementById('json-editor');
      if (container && gutter && editor)
        vscroll.render(editor, container, gutter, search.getDecorator());
      updateSearchStatus();
    }
  });

  document.getElementById('json-search-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (search.getState().matches.length === 0) return;
      e.shiftKey ? search.prev() : search.next();
      scrollToCurrentMatch();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (search.getState().matches.length === 0) return;
      search.prev();
      scrollToCurrentMatch();
    } else if (e.key === 'Escape') {
      hideSearch();
    }
  });

  document.getElementById('json-search-prev')?.addEventListener('click', () => {
    if (search.getState().matches.length === 0) return;
    search.prev();
    scrollToCurrentMatch();
  });

  document.getElementById('json-search-next')?.addEventListener('click', () => {
    if (search.getState().matches.length === 0) return;
    search.next();
    scrollToCurrentMatch();
  });

  document.getElementById('json-search-close')?.addEventListener('click', () => hideSearch());
}

function bootJsonViewer() {
  if (!isJsonDocument(window.location.href, document.contentType)) {
    return;
  }

  const run = () => {
    initJsonViewer().catch(() => {});
  };

  if (document.body) {
    run();
    return;
  }

  document.addEventListener('DOMContentLoaded', run, { once: true });
}

bootJsonViewer();
