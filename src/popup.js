function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

chrome.runtime.sendMessage({ type: 'get-status' }, (data) => {
  const { active, sizeBytes } = data;

  document.getElementById('dot').classList.toggle('dot--active', active);
  document.getElementById('title').textContent = active ? 'Found some JSON!' : 'Nothing here yet';

  if (active) {
    document.getElementById('sub').textContent = "You're good to go!";
    const copyBtn = document.getElementById('copy-btn');
    copyBtn.title = formatSize(sizeBytes);
    copyBtn.classList.add('copy-btn--visible');
    copyBtn.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (!tab) return;
        chrome.tabs.sendMessage(tab.id, { type: 'download-json' });
      });
    });
  } else {
    document.getElementById('sub').textContent = "Open a JSON page and I'll handle it";
  }
});
