chrome.runtime.sendMessage({ type: 'get-status' }, ({ active }) => {
  document.getElementById('dot').classList.toggle('dot--active', active);
  document.getElementById('title').textContent = active ? 'Looks like JSON!' : 'No JSON here';
  document.getElementById('sub').textContent = active
    ? 'Formatted and ready to read'
    : 'Open any JSON URL to get started';
});
