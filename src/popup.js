chrome.runtime.sendMessage({ type: 'get-status' }, ({ active }) => {
  document.getElementById('dot').textContent = active ? '🟢' : '⚪';
  document.getElementById('title').textContent = active ? 'JSON detected' : 'No JSON detected';
  document.getElementById('sub').textContent = active
    ? 'Formatted for readability'
    : 'Open a page that returns JSON';
});
