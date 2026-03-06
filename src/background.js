const COLOR_PATHS = {
  '16': chrome.runtime.getURL('icons/icon-16.png'),
  '32': chrome.runtime.getURL('icons/icon-32.png'),
  '48': chrome.runtime.getURL('icons/icon-48.png'),
  '128': chrome.runtime.getURL('icons/icon-128.png'),
};


chrome.runtime.onMessage.addListener((message, sender) => {
  if (sender.tab?.id == null) return;
  if (message.type === 'json-activated') {
    chrome.action.setIcon({ tabId: sender.tab.id, path: COLOR_PATHS }).catch(() => {});
  }
});
