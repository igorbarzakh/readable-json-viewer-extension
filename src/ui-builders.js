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
      ? '<svg class="theme-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M7.30566 3.67212c0.63864 -0.29382 1.31159 -0.17926 1.81055 0.15234 0.51302 0.34113 0.86535 0.91807 0.92679 1.56934 0.446 4.7344 4.3291 8.6166 9.0634 9.0625 0.6513 0.0614 1.2273 0.4147 1.5684 0.9277 0.3537 0.5322 0.46 1.2612 0.0879 1.9366 -1.7007 3.085 -4.9864 5.1787 -8.7627 5.1787 -5.52285 0 -10 -4.4772 -10 -10 0.00027 -3.77605 2.09383 -7.06219 5.17871 -8.76273z"></path></svg>'
      : '<svg class="theme-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 19.5c0.5523 0 1 0.4477 1 1V22c0 0.5523 -0.4477 1 -1 1s-1 -0.4477 -1 -1v-1.5c0 -0.5523 0.4477 -1 1 -1m-6.71777 -2.1963c0.3905 -0.3905 1.02353 -0.3905 1.41406 0 0.39052 0.3905 0.39052 1.0235 0 1.4141l-1.06055 1.0605c-0.39054 0.3903 -1.02362 0.3905 -1.41406 0 -0.39039 -0.3904 -0.39026 -1.0235 0 -1.414zm12.02147 0c0.3905 -0.3905 1.0236 -0.3905 1.4141 0l1.0605 1.0606c0.3902 0.3905 0.3904 1.0236 0 1.414s-1.0235 0.3902 -1.414 0l-1.0606 -1.0605c-0.3905 -0.3906 -0.3905 -1.0236 0 -1.4141M12 6c3.3137 0 6 2.68629 6 6 0 3.3137 -2.6863 6 -6 6 -3.31371 0 -6 -2.6863 -6 -6 0 -3.31371 2.68629 -6 6 -6m-8.5 5c0.55228 0 1 0.4477 1 1s-0.44772 1 -1 1H2c-0.55228 0 -1 -0.4477 -1 -1s0.44772 -1 1 -1zM22 11c0.5523 0 1 0.4477 1 1s-0.4477 1 -1 1h-1.5c-0.5523 0 -1 -0.4477 -1 -1s0.4477 -1 1 -1zM4.22168 4.22168c0.39044 -0.39044 1.02352 -0.39028 1.41406 0l1.06055 1.06055c0.39052 0.39052 0.39052 1.02353 0 1.41406 -0.39053 0.39052 -1.02354 0.39052 -1.41406 0L4.22168 5.63574c-0.39028 -0.39054 -0.39044 -1.02362 0 -1.41406m14.14262 0c0.3905 -0.3902 1.0236 -0.39037 1.414 0 0.3904 0.39043 0.3902 1.02353 0 1.41406l-1.0605 1.06055c-0.3905 0.3905 -1.0236 0.39046 -1.4141 0 -0.3905 -0.39053 -0.3905 -1.02356 0 -1.41406zM12 1c0.5523 0 1 0.44772 1 1v1.5c0 0.55228 -0.4477 1 -1 1s-1 -0.44772 -1 -1V2c0 -0.55228 0.4477 -1 1 -1"></path></svg>';
  return `${iconSvg}<span class="theme-label">${targetLabel}</span>`;
}

export function copyButtonContent(state) {
  const isDone = state === 'done';
  const safeLabel = 'Copy';
  if (isDone) {
    const doneSvg =
      '<svg class="copy-done-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M14.364 3.407a1 1 0 0 1 0 1.414L6.869 12.317a1.0667 1.0667 0 0 1 -1.509 0L1.636 8.593a1 1 0 1 1 1.414 -1.414l3.064 3.064L12.949 3.407a1 1 0 0 1 1.415 0Z"></path></svg>';
    return `${doneSvg}<span class="copy-label">${safeLabel}</span>`;
  }
  const iconSvg =
    '<svg class="copy-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M15.24 2h-3.8942c-1.76421 -0.00001 -3.16162 -0.00003 -4.25526 0.1476 -1.12553 0.15193 -2.03652 0.47204 -2.75495 1.19336 -0.71842 0.72131 -1.03726 1.63596 -1.18858 2.76601C2.99997 7.205 2.99999 8.60802 3 10.3793v5.8376c0 1.5081 0.91995 2.8005 2.22717 3.3423 -0.06728 -0.9094 -0.06723 -2.1855 -0.06717 -3.2472l0 -4.9144 0 -0.0952c-0.00007 -1.2817 -0.00014 -2.38596 0.11828 -3.27029 0.12691 -0.94773 0.41311 -1.85619 1.14702 -2.59305 0.73391 -0.73687 1.63874 -1.02421 2.58268 -1.15163 0.88079 -0.11889 1.98072 -0.11883 3.25722 -0.11876l0.0948 0.00001h2.88l0.0948 -0.00001c1.2765 -0.00007 2.374 -0.00013 3.2548 0.11876C18.0627 2.94779 16.7616 2 15.24 2Z"></path><path fill="currentColor" d="M6.6001 11.3974c0 -2.72621 0 -4.0893 0.84353 -4.93622 0.84353 -0.84692 2.20118 -0.84692 4.91647 -0.84692h2.88c2.7153 0 4.0729 0 4.9165 0.84692 0.8435 0.84692 0.8435 2.21002 0.8435 4.93622v4.8193c0 2.7262 0 4.0893 -0.8435 4.9362 -0.8436 0.8469 -2.2012 0.8469 -4.9165 0.8469h-2.88c-2.71529 0 -4.07294 0 -4.91647 -0.8469 -0.84353 -0.8469 -0.84353 -2.21 -0.84353 -4.9362v-4.8193Z"></path></svg>';
  return `${iconSvg}<span class="copy-label">${safeLabel}</span>`;
}

export function toggleAllButtonContent(state) {
  const isExpand = state === 'expand';
  const label = isExpand ? 'Expand all' : 'Collapse all';
  const iconSvg = isExpand
    ? '<svg class="toggle-all-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M9.04297 13.5431c0.39052 -0.3905 1.02353 -0.3905 1.41403 0s0.3905 1.0236 0 1.4141l-2.54294 2.5429 1.79297 1.793c0.2648 0.2649 0.35937 0.656 0.24512 1.0127 -0.11444 0.3564 -0.41882 0.6191 -0.78809 0.6807l-6 1c-0.31841 0.0529 -0.64281 -0.0511 -0.87109 -0.2793 -0.22827 -0.2283 -0.33224 -0.5527 -0.2793 -0.8711l1 -6 0.03223 -0.1358c0.09643 -0.3071 0.33659 -0.5522 0.64844 -0.6523 0.3567 -0.1143 0.74783 -0.0198 1.01269 0.2451L6.5 16.0861zM20.8359 2.01379c0.3185 -0.05294 0.6429 0.05104 0.8711 0.2793 0.2282 0.22828 0.3323 0.55269 0.2793 0.87109l-1 6c-0.0615 0.36927 -0.3242 0.67365 -0.6806 0.78809 -0.3567 0.11433 -0.7479 0.01968 -1.0127 -0.24512L17.5 7.91418l-2.543 2.54302c-0.3905 0.3904 -1.0235 0.3904 -1.414 0 -0.3906 -0.3906 -0.3906 -1.02358 0 -1.41411l2.5429 -2.54297 -1.7929 -1.79297c-0.2649 -0.26485 -0.3594 -0.65599 -0.2451 -1.01269 0.1144 -0.35647 0.4187 -0.61911 0.788 -0.68067z"></path></svg>'
    : '<svg class="toggle-all-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M10.3359 12.5138c0.3185 -0.053 0.6429 0.051 0.8711 0.2793 0.2283 0.2283 0.3323 0.5527 0.2793 0.8711l-1 6c-0.0615 0.3693 -0.3242 0.6736 -0.68064 0.7881 -0.35668 0.1143 -0.74782 0.0197 -1.01269 -0.2451L7 18.4142l-2.54297 2.543c-0.3905 0.3905 -1.02353 0.3904 -1.41406 0 -0.39053 -0.3906 -0.39053 -1.0236 0 -1.4141l2.54297 -2.543 -1.79297 -1.7929c-0.26486 -0.2649 -0.35941 -0.656 -0.24512 -1.0127 0.11444 -0.3565 0.41876 -0.6192 0.78809 -0.6807zm9.2071 -9.47071c0.3905 -0.39052 1.0235 -0.39052 1.414 0 0.3905 0.39053 0.3905 1.02356 0 1.41406l-2.5429 2.54297 1.7929 1.79297c0.2648 0.26487 0.3595 0.65601 0.2451 1.0127 -0.1144 0.35641 -0.4188 0.61911 -0.788 0.68071l-6 1c-0.3185 0.0529 -0.6429 -0.0511 -0.8711 -0.2793 -0.2283 -0.2283 -0.3323 -0.5527 -0.2793 -0.8711l1 -6.00004 0.0322 -0.13574c0.0964 -0.30708 0.3366 -0.55224 0.6484 -0.65235 0.3567 -0.11429 0.7479 -0.01974 1.0127 0.24512L17 5.58606z"></path></svg>';
  return `${iconSvg}<span class="toggle-all-label">${label}</span>`;
}

export function buildShellHtml(content) {
  return `<div class="json-viewer"><div class="json-toolbar"><button type="button" id="toggle-all" title="Collapse all (${cmd} + X)">${toggleAllButtonContent(
    'collapse',
  )}</button><button type="button" id="copy-json" title="Copy JSON (${cmd} + C)">${copyButtonContent(
    'copy',
  )}</button><button type="button" id="toggle-theme" title="Switch theme (${cmd} + ${alt} + T)"></button></div><div id="json-search-bar" class="json-search-bar" hidden><input id="json-search-input" type="text" placeholder="Search..." autocomplete="off" spellcheck="false"><span id="json-search-status"></span><button type="button" id="json-search-prev" title="Previous (Shift+Enter)"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="16" width="16" style="transform:rotate(180deg)"><path fill="currentColor" d="M12 2c0.5523 0.00004 1 0.44774 1 1v15.0859l4.043 -4.0429c0.3905 -0.3905 1.0235 -0.3905 1.414 0s0.3905 1.0235 0 1.414l-5.75 5.75c-0.0465 0.0466 -0.0984 0.0874 -0.1533 0.1241 -0.0391 0.0261 -0.0794 0.0493 -0.1211 0.0693 -0.0455 0.0219 -0.0926 0.0408 -0.1416 0.0557 -0.0167 0.005 -0.0338 0.0085 -0.0508 0.0127 -0.0156 0.0038 -0.031 0.0086 -0.0468 0.0117 -0.0071 0.0014 -0.0144 0.0017 -0.0215 0.0029 -0.056 0.0097 -0.1132 0.0166 -0.1719 0.0166 -0.0566 0 -0.1119 -0.0066 -0.166 -0.0156 -0.0104 -0.0018 -0.0209 -0.0028 -0.0313 -0.0049 -0.0115 -0.0023 -0.0228 -0.0051 -0.0341 -0.0078 -0.0206 -0.0049 -0.0413 -0.0094 -0.0616 -0.0156 -0.0486 -0.0149 -0.0954 -0.0339 -0.1406 -0.0557 -0.0398 -0.0192 -0.0787 -0.0407 -0.1162 -0.0654 -0.0567 -0.0374 -0.1094 -0.0802 -0.1572 -0.128l-5.75003 -5.75c-0.39053 -0.3905 -0.39053 -1.0235 0 -1.414s1.02355 -0.3905 1.41406 0L11 18.0859V3c0 -0.55228 0.4477 -1 1 -1" stroke-width="1"></path></svg></button><button type="button" id="json-search-next" title="Next (Enter)"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="16" width="16"><path fill="currentColor" d="M12 2c0.5523 0.00004 1 0.44774 1 1v15.0859l4.043 -4.0429c0.3905 -0.3905 1.0235 -0.3905 1.414 0s0.3905 1.0235 0 1.414l-5.75 5.75c-0.0465 0.0466 -0.0984 0.0874 -0.1533 0.1241 -0.0391 0.0261 -0.0794 0.0493 -0.1211 0.0693 -0.0455 0.0219 -0.0926 0.0408 -0.1416 0.0557 -0.0167 0.005 -0.0338 0.0085 -0.0508 0.0127 -0.0156 0.0038 -0.031 0.0086 -0.0468 0.0117 -0.0071 0.0014 -0.0144 0.0017 -0.0215 0.0029 -0.056 0.0097 -0.1132 0.0166 -0.1719 0.0166 -0.0566 0 -0.1119 -0.0066 -0.166 -0.0156 -0.0104 -0.0018 -0.0209 -0.0028 -0.0313 -0.0049 -0.0115 -0.0023 -0.0228 -0.0051 -0.0341 -0.0078 -0.0206 -0.0049 -0.0413 -0.0094 -0.0616 -0.0156 -0.0486 -0.0149 -0.0954 -0.0339 -0.1406 -0.0557 -0.0398 -0.0192 -0.0787 -0.0407 -0.1162 -0.0654 -0.0567 -0.0374 -0.1094 -0.0802 -0.1572 -0.128l-5.75003 -5.75c-0.39053 -0.3905 -0.39053 -1.0235 0 -1.414s1.02355 -0.3905 1.41406 0L11 18.0859V3c0 -0.55228 0.4477 -1 1 -1" stroke-width="1"></path></svg></button><button type="button" id="json-search-close" title="Close (Escape)"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" height="16" width="16"><path fill="currentColor" d="m8 8.942666666666666 3.771333333333333 3.771333333333333a0.6666666666666666 0.6666666666666666 0 0 0 0.9426666666666665 -0.9426666666666665L8.942666666666666 8l3.771333333333333 -3.771333333333333a0.6666666666666666 0.6666666666666666 0 0 0 -0.9426666666666665 -0.9426666666666665L8 7.057333333333333 4.228666666666666 3.286A0.6666666666666666 0.6666666666666666 0 0 0 3.286666666666666 4.228666666666666L7.057333333333333 8l-3.771333333333333 3.771333333333333a0.6666666666666666 0.6666666666666666 0 1 0 0.9426666666666665 0.9426666666666665L8 8.942666666666666Z" stroke-width="0.6667"></path></svg></button></div><div id="json-editor"><div id="json-gutter" aria-hidden="true"></div><pre id="json-container" tabindex="0">${content}</pre></div></div>`;
}
