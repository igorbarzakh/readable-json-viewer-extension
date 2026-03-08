/**
 * createVirtualScroll — manages efficient windowed rendering of large line lists.
 *
 * @param {number} lineHeight  px height of a single line (must match --code-row-height)
 * @param {number} buffer      extra lines rendered above/below the viewport
 */
export function createVirtualScroll(lineHeight, buffer) {
  let vsLines = [];
  let vsFirst = -1;
  let vsLast = -1;
  let vsScrollRafId = 0;

  /**
   * Render only the lines visible in the current scroll window plus `buffer`
   * lines above/below. Top and bottom spacer divs maintain the correct total
   * scroll height. Skips re-render when the needed range is already covered.
   *
   * @param {Element} editor
   * @param {Element} container  <pre id="json-container">
   * @param {Element} gutter
   * @param {function} decorateLine  (line: {html, lineNumber}) => string
   */
  const render = (editor, container, gutter, decorateLine = (l) => l.html) => {
    if (vsLines.length === 0) return;

    const scrollTop = editor.scrollTop;
    const viewportHeight = editor.clientHeight || 600;
    const total = vsLines.length;

    const first = Math.max(0, Math.floor(scrollTop / lineHeight) - buffer);
    const last = Math.min(
      total - 1,
      Math.ceil((scrollTop + viewportHeight) / lineHeight) + buffer
    );

    if (first >= vsFirst && last <= vsLast) return;

    vsFirst = first;
    vsLast = last;

    const slice = vsLines.slice(first, last + 1);
    const topPx = first * lineHeight;
    const bottomPx = Math.max(0, (total - last - 1) * lineHeight);

    container.innerHTML =
      `<div aria-hidden="true" style="height:${topPx}px"></div>` +
      `<div class="json-root">${slice.map(decorateLine).join('')}</div>` +
      `<div aria-hidden="true" style="height:${bottomPx}px"></div>`;

    gutter.innerHTML =
      `<div aria-hidden="true" style="height:${topPx}px"></div>` +
      slice.map((l) => `<div class="json-gutter-line">${l.lineNumber}</div>`).join('') +
      `<div aria-hidden="true" style="height:${bottomPx}px"></div>`;
  };

  return {
    /** Replace the line list and reset the rendered window. */
    setLines(lines) {
      vsLines = lines;
      vsFirst = -1;
      vsLast = -1;
    },

    /** Force a full re-render on the next render() call (e.g. after scrollTop change). */
    resetWindow() {
      vsFirst = -1;
      vsLast = -1;
    },

    render,

    /** Find the index of a line by its lineNumber within the current vsLines. */
    findLineIndex(lineNumber) {
      return vsLines.findIndex((l) => l.lineNumber === lineNumber);
    },

    /**
     * Create a scroll event handler that throttles renders via rAF.
     * `getDecorateLine` is called on each frame so it always reflects the
     * latest search state without needing to re-attach the listener.
     */
    createScrollHandler(getEditor, getContainer, getGutter, getDecorateLine) {
      return () => {
        if (vsScrollRafId !== 0 || vsLines.length === 0) return;
        vsScrollRafId = window.requestAnimationFrame(() => {
          vsScrollRafId = 0;
          const editor = getEditor();
          const container = getContainer();
          const gutter = getGutter();
          if (editor && container && gutter) {
            render(editor, container, gutter, getDecorateLine?.());
          }
        });
      };
    },
  };
}
