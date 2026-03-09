const COLOR_PATHS = {
  16: chrome.runtime.getURL('icons/icon-16.png'),
  32: chrome.runtime.getURL('icons/icon-32.png'),
  48: chrome.runtime.getURL('icons/icon-48.png'),
  128: chrome.runtime.getURL('icons/icon-128.png'),
};

const activeTabs = new Set();

chrome.tabs.onRemoved.addListener((tabId) => activeTabs.delete(tabId));
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === 'loading') activeTabs.delete(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'get-status') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      sendResponse({ active: tab ? activeTabs.has(tab.id) : false });
    });
    return true;
  }

  if (sender.tab?.id == null) return;
  if (message.type === 'json-activated') {
    activeTabs.add(sender.tab.id);
    chrome.action.setIcon({ tabId: sender.tab.id, path: COLOR_PATHS }).catch(() => {});
  }
});
