function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function isJsonUrl(url) {
  return /\.json(?:$|[?#])/i.test(url);
}

export function isJsonDocument(url, contentType) {
  if (isJsonUrl(url)) {
    return true;
  }
  const type = String(contentType || '').toLowerCase();
  return type.includes('application/json') || type.includes('text/json') || type.includes('+json');
}

export function parseJsonText(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error: error.message, raw: text };
  }
}

export function toggleCollapsedPath(collapsedPaths, path) {
  if (collapsedPaths.has(path)) {
    collapsedPaths.delete(path);
    return;
  }
  collapsedPaths.add(path);
}

export function shouldHandleSelectAll(
  event,
  activeElement,
  containerElement,
  containsFn,
  selectionAnchorNode,
) {
  const keyA = String(event?.key || '').toLowerCase() === 'a';
  const combo = Boolean(event?.metaKey || event?.ctrlKey);
  if (!keyA || !combo || !containerElement) {
    return false;
  }
  const activeInside = Boolean(activeElement) && containsFn(activeElement);
  const selectionInside = Boolean(selectionAnchorNode) && containsFn(selectionAnchorNode);
  return activeInside || selectionInside;
}

export function getClipboardJsonText(viewerEnabled, sourceText) {
  if (!viewerEnabled) {
    return null;
  }
  return sourceText;
}

export function getFormattedJsonText(value) {
  return JSON.stringify(value, null, 2);
}

export function extractJsonErrorInfo(rawText, errorMessage) {
  const match = /position\s+(\d+)/i.exec(String(errorMessage || ''));
  if (!match) {
    return {
      message: String(errorMessage || 'Invalid JSON'),
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
    if (rawText[i] === '\n') {
      line += 1;
      column = 1;
      lineStart = i + 1;
    } else {
      column += 1;
    }
  }

  let lineEnd = rawText.indexOf('\n', lineStart);
  if (lineEnd === -1) {
    lineEnd = rawText.length;
  }

  const prevLineEnd = Math.max(0, lineStart - 1);
  const prevLineStart = prevLineEnd > 0 ? rawText.lastIndexOf('\n', prevLineEnd - 1) + 1 : 0;
  const prevLineText = lineStart > 0 ? rawText.slice(prevLineStart, prevLineEnd) : null;

  const nextLineStart = lineEnd < rawText.length ? lineEnd + 1 : -1;
  const nextLineEnd = nextLineStart >= 0 ? rawText.indexOf('\n', nextLineStart) : -1;
  const nextLineText =
    nextLineStart >= 0
      ? rawText.slice(nextLineStart, nextLineEnd === -1 ? rawText.length : nextLineEnd)
      : null;

  return {
    message: String(errorMessage || 'Invalid JSON'),
    line,
    column,
    lineText: rawText.slice(lineStart, lineEnd),
    prevLineText,
    nextLineText,
  };
}

export function resolveThemeMode(storedValue, prefersDark) {
  if (storedValue === 'dark' || storedValue === 'light') {
    return storedValue;
  }
  return prefersDark ? 'dark' : 'light';
}

export function nextThemeMode(themeMode) {
  return themeMode === 'dark' ? 'light' : 'dark';
}

export function buildLineNumbersHtml(linesOrCount) {
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

  return numbers.map((line) => `<div class="json-gutter-line">${line}</div>`).join('');
}

function renderPrimitive(value) {
  if (value === null) {
    return '<span class="json-null">null</span>';
  }
  if (typeof value === 'string') {
    return renderStringToken(value);
  }
  if (typeof value === 'number') {
    return `<span class="json-number">${String(value)}</span>`;
  }
  if (typeof value === 'boolean') {
    return `<span class="json-boolean">${String(value)}</span>`;
  }
  return `<span class="json-unknown">${escapeHtml(String(value))}</span>`;
}

function renderQuotedToken(valueClass, rawValue, quoteClass = 'json-quote') {
  return `<span class="${quoteClass}">"</span><span class="${valueClass}">${escapeHtml(
    rawValue,
  )}</span><span class="${quoteClass}">"</span>`;
}

function renderStringToken(rawValue) {
  const jsonLiteral = JSON.stringify(rawValue);
  const innerValue = jsonLiteral.slice(1, -1);
  let html = '<span class="json-string-quote">"</span><span class="json-string">';

  for (let index = 0; index < innerValue.length; index += 1) {
    const char = innerValue[index];

    if (char === '\\') {
      const next = innerValue[index + 1];
      if (next === '"') {
        html +=
          '</span><span class="json-quote">\\</span><span class="json-quote">"</span><span class="json-string">';
        index += 1;
        continue;
      }
      if (next === '\\') {
        html +=
          '</span><span class="json-quote">\\</span><span class="json-quote">\\</span><span class="json-string">';
        index += 1;
        continue;
      }
      if (next !== undefined) {
        html += `</span><span class="json-quote">\\</span><span class="json-quote">${escapeHtml(
          next,
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
  return appendComma ? '<span class="json-comma">,</span>' : '';
}

function countExpandedLines(value, path, keyLabel) {
  if (typeof value !== 'object' || value === null) {
    return 1;
  }

  if (keyLabel === null && path !== '$' && canInlineObjectForArrayItem(value)) {
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
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function canInlineObjectForArrayItem(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
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
      `${renderQuotedToken('json-key', key)}<span class="json-colon">: </span>${renderPrimitive(
        nested,
      )}`,
  );
  return `${renderBraceToken('{', depth)} ${items.join(
    '<span class="json-comma">, </span>',
  )} ${renderBraceToken('}', depth)}`;
}

function renderInlineArray(value, depth) {
  const items = value.map((nested) => {
    if (isPrimitiveValue(nested)) {
      return renderPrimitive(nested);
    }
    return renderInlineObject(nested, depth + 1);
  });
  return `${renderBraceToken('[', depth)}${items.join(
    '<span class="json-comma">, </span>',
  )}${renderBraceToken(']', depth)}`;
}

function canInlineCollection(value, path) {
  if (path === '$') {
    return false;
  }
  if (Array.isArray(value)) {
    if (value.length === 0 || value.length > 4) {
      return false;
    }
    const allInlineable = value.every(
      (nested) => isPrimitiveValue(nested) || canInlineObjectForArrayItem(nested),
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
  return '';
}

function inlineContainerWrap(path, keyLabel, contentHtml) {
  const isArrayItem = keyLabel === null && path !== '$';
  if (isArrayItem) {
    return `<span class="json-prefix"></span>${contentHtml}`;
  }
  return contentHtml;
}

function renderLine(depth, content, lineNumber) {
  return `<div class="json-line" style="--depth:${depth}" data-line="${lineNumber}">${content}</div>`;
}

function withArrayPrefix(path, keyLabel, inner) {
  const isArrayItem = keyLabel === null && path !== '$';
  if (!isArrayItem) {
    return inner;
  }
  return `<span class="json-prefix"></span>${inner}`;
}

function withArrayToggle(path, keyLabel, buttonHtml, contentHtml) {
  if (path === '$') {
    return `<span class="root-toggle-wrap">${buttonHtml}</span>${contentHtml}`;
  }
  const isArrayItem = keyLabel === null && path !== '$';
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
      ? ''
      : `${renderQuotedToken('json-key', keyLabel)}<span class="json-colon">: </span>`;

  if (typeof value !== 'object' || value === null) {
    const lineNumber = lineState.current;
    lineState.current += 1;
    return [
      renderLine(
        depth,
        withArrayPrefix(path, keyLabel, `${keyPart}${renderPrimitive(value)}${comma}`),
        lineNumber,
      ),
    ];
  }

  if (keyLabel === null && path !== '$' && canInlineObjectForArrayItem(value)) {
    const lineNumber = lineState.current;
    lineState.current += 1;
    return [
      renderLine(
        depth,
        withArrayPrefix(path, keyLabel, `${renderInlineObject(value, depth)}${comma}`),
        lineNumber,
      ),
    ];
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value);
  const open = isArray ? '[' : '{';
  const close = isArray ? ']' : '}';
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
          `${keyPart}${renderBraceToken(open, depth)}${renderBraceToken(close, depth)}${comma}`,
        ),
        lineNumber,
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
        path === '$' ? ' data-root="1"' : ''
      }>▸</button>`,
      `${renderBraceToken(open, depth)}<span class="json-ellipsis">…</span>${renderBraceToken(close, depth)}`,
    )}${comma}`;
    return [renderLine(depth, collapsedLine, lineNumber)];
  }

    if (canInlineCollection(value, path)) {
      const lineNumber = lineState.current;
      lineState.current += 1;
      const inlineLine = `${keyPart}${inlineContainerWrap(
        path,
        keyLabel,
        renderInlineCollection(value, depth),
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
      path === '$' ? ' data-root="1"' : ''
    }>▾</button>`,
    renderBraceToken(open, depth),
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
      }),
    );
  }

  const closeLineNumber = lineState.current;
  lineState.current += 1;
  lines.push(renderLine(depth, `${renderBraceToken(close, depth)}${comma}`, closeLineNumber));
  return lines;
}

export function renderJsonToHtml(value, collapsedPaths = new Set()) {
  const lineState = { current: 1 };
  const lines = renderValueLines(value, {
    path: '$',
    depth: 0,
    collapsedPaths,
    keyLabel: null,
    appendComma: false,
    lineState,
  });
  return `<div class="json-root">${lines.join('')}</div>`;
}
