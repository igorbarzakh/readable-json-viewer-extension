/** Strip HTML tags and decode entities to get plain text from a line's html string. */
function getLineText(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * Wrap occurrences of `query` inside text nodes (not inside HTML tags) with
 * <mark>. The query is HTML-encoded before matching so that e.g. `"foo"` finds
 * `&quot;foo&quot;`.
 */
function injectHighlight(html, query, cls) {
  const encodedQuery = query
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const re = new RegExp(
    encodedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'gi'
  );
  return html.replace(/(<[^>]*>)|([^<]+)/g, (_match, tag, text) => {
    if (tag !== undefined) return tag;
    return text.replace(re, `<mark class="${cls}">$&</mark>`);
  });
}

/**
 * createSearch — manages in-page search state against a fixed set of lines.
 *
 * @param {Array<{html: string, lineNumber: number}>} allLines
 *   The full expanded line list (allVsLines). Search always runs against this
 *   even when some paths are collapsed.
 */
export function createSearch(allLines) {
  let searchQuery = '';
  let searchMatches = []; // indices into allLines
  let searchCurrent = -1;

  return {
    /** Build the match list for `query` and reset navigation to the first result. */
    build(query) {
      searchQuery = query;
      if (!query) {
        searchMatches = [];
        searchCurrent = -1;
        return;
      }
      const lower = query.toLowerCase();
      searchMatches = [];
      for (let i = 0; i < allLines.length; i++) {
        if (getLineText(allLines[i].html).toLowerCase().includes(lower)) {
          searchMatches.push(i);
        }
      }
      searchCurrent = searchMatches.length > 0 ? 0 : -1;
    },

    next() {
      if (searchMatches.length === 0) return;
      searchCurrent = (searchCurrent + 1) % searchMatches.length;
    },

    prev() {
      if (searchMatches.length === 0) return;
      searchCurrent = (searchCurrent - 1 + searchMatches.length) % searchMatches.length;
    },

    clear() {
      searchQuery = '';
      searchMatches = [];
      searchCurrent = -1;
    },

    getState() {
      return { query: searchQuery, matches: searchMatches, current: searchCurrent };
    },

    getStatusText() {
      if (searchMatches.length === 0) return searchQuery ? 'No results' : '';
      return `${searchCurrent + 1} / ${searchMatches.length}`;
    },

    /** lineNumber of the current match, or -1 if none. */
    getCurrentLineNumber() {
      if (searchCurrent < 0 || searchMatches.length === 0) return -1;
      return allLines[searchMatches[searchCurrent]].lineNumber;
    },

    /**
     * Returns a `decorateLine` function for the current search state, ready to
     * be passed to virtualScroll.render(). A new function is returned each call
     * so the Sets are computed once per render, not once per line.
     */
    getDecorator() {
      if (searchMatches.length === 0) return (l) => l.html;
      const matchLns = new Set(searchMatches.map((i) => allLines[i].lineNumber));
      const currentMatchLn =
        searchCurrent >= 0 ? allLines[searchMatches[searchCurrent]].lineNumber : -1;
      return (l) => {
        if (!matchLns.has(l.lineNumber)) return l.html;
        const cls =
          l.lineNumber === currentMatchLn ? 'json-search-hl-current' : 'json-search-hl';
        return injectHighlight(l.html, searchQuery, cls);
      };
    },
  };
}
