const COLOR_PATHS = {
  16: chrome.runtime.getURL('icons/icon-16.png'),
  32: chrome.runtime.getURL('icons/icon-32.png'),
  48: chrome.runtime.getURL('icons/icon-48.png'),
  128: chrome.runtime.getURL('icons/icon-128.png'),
};

function storageKey(tabId) {
  return `tab_${tabId}`;
}

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(storageKey(tabId)).catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === 'loading') {
    chrome.storage.session.remove(storageKey(tabId)).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'get-status') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab) { sendResponse({ active: false }); return; }
      chrome.storage.session.get(storageKey(tab.id)).then((result) => {
        const data = result[storageKey(tab.id)];
        sendResponse(data ? { active: true, ...data } : { active: false });
      }).catch(() => sendResponse({ active: false }));
    });
    return true;
  }

  if (sender.tab?.id == null) return;
  if (message.type === 'json-activated') {
    const key = storageKey(sender.tab.id);
    chrome.storage.session.set({
      [key]: {
        topLevelCount: message.topLevelCount,
        topLevelType: message.topLevelType,
        sizeBytes: message.sizeBytes,
      },
    }).catch(() => {});
    chrome.action.setIcon({ tabId: sender.tab.id, path: COLOR_PATHS }).catch(() => {});
  }
});
