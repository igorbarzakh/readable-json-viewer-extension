import { escapeHtml, nextThemeMode } from './viewer-core.js';

export const isMac = navigator.platform.startsWith('Mac');
const cmd = isMac ? '⌘' : 'Ctrl';
const alt = isMac ? '⌥' : 'Alt';

export function buildErrorSnippetHtml(rawText, line, column) {
  if (!line) return '';

  const allLines = rawText.split('\n');
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
      ? Math.min(...nonEmpty.map((entry) => (entry.match(/^\s*/) || [''])[0].length))
      : 0;
  const lineNumberWidth = String(line).length;

  return snippetLines
    .map((entry, idx) => {
      const globalLine = start + idx + 1;
      const number = String(globalLine).padStart(lineNumberWidth, ' ');
      const trimmed = entry.slice(minIndent);

      if (globalLine === line && column) {
        const markerCol = Math.max(1, column - minIndent);
        const markerIndex = Math.max(0, markerCol - 1);
        const before = escapeHtml(trimmed.slice(0, markerIndex));
        const marked = escapeHtml(trimmed.slice(markerIndex));
        return `${number} | ${before}<span class="json-error-mark">${marked || ' '}</span>`;
      }

      return `${number} | ${escapeHtml(trimmed)}`;
    })
    .join('\n');
}

export function buildEmptyJsonHtml() {
  return buildShellHtml(
    '<div class="json-error-title">Empty JSON</div><div class="json-error-message">Response body is empty.</div>',
  );
}

export function buildInvalidJsonHtml(errorInfo, rawSource) {
  const locationHtml =
    errorInfo.line && errorInfo.column
      ? `<div class="json-error-location">Line ${errorInfo.line}, Column ${errorInfo.column}</div>`
      : '';
  const contextHtml =
    errorInfo.lineText !== null
      ? `<pre class="json-error-context">${buildErrorSnippetHtml(rawSource, errorInfo.line, errorInfo.column)}</pre>`
      : '';
  return buildShellHtml(
    `<div class="json-error-title">Invalid JSON</div><div class="json-error-message">${escapeHtml(errorInfo.message)}</div>${locationHtml}${contextHtml}`,
  );
}

export function themeButtonContent(themeMode) {
  const targetMode = nextThemeMode(themeMode);
  const targetLabel = targetMode[0].toUpperCase() + targetMode.slice(1);
  const iconSvg =
    targetMode === 'dark'
      ? '<svg class="theme-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>'
      : '<svg class="theme-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
  return `${iconSvg}<span class="theme-label">${targetLabel}</span>`;
}

export function copyButtonContent(state) {
  const isDone = state === 'done';
  const safeLabel = 'Copy';
  if (isDone) {
    const doneSvg =
      '<svg class="copy-done-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>';
    return `${doneSvg}<span class="copy-label">${safeLabel}</span>`;
  }
  const iconSvg =
    '<svg class="copy-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>';
  return `${iconSvg}<span class="copy-label">${safeLabel}</span>`;
}

export function toggleAllButtonContent(state) {
  const isExpand = state === 'expand';
  const label = isExpand ? 'Expand all' : 'Collapse all';
  const iconSvg = isExpand
    ? '<svg class="toggle-all-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M15 3h6v6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/><path d="M9 21H3v-6"/></svg>'
    : '<svg class="toggle-all-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m14 10 7-7"/><path d="M20 10h-6V4"/><path d="m3 21 7-7"/><path d="M4 14h6v6"/></svg>';
  return `${iconSvg}<span class="toggle-all-label">${label}</span>`;
}

export function buildShellHtml(content) {
  return `<div class="json-viewer"><div class="json-toolbar"><button type="button" id="toggle-all" title="Collapse all (${cmd} + X)">${toggleAllButtonContent(
    'collapse',
  )}</button><button type="button" id="copy-json" title="Copy JSON (${cmd} + C)">${copyButtonContent(
    'copy',
  )}</button><button type="button" id="toggle-theme" title="Switch theme (${cmd} + ${alt} + T)"></button></div><div id="json-search-bar" class="json-search-bar" hidden><input id="json-search-input" type="text" placeholder="Search..." autocomplete="off" spellcheck="false"><span id="json-search-status"></span><div class="json-search-buttons"><button type="button" id="json-search-prev" title="Previous (Shift+Enter)"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg></button><button type="button" id="json-search-next" title="Next (Enter)"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg></button><button type="button" id="json-search-close" title="Close (Escape)"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></div></div><div id="json-editor"><div id="json-gutter" aria-hidden="true"></div><pre id="json-container" tabindex="-1">${content}</pre></div></div>`;
}
