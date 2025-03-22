// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageInfo') {
    sendResponse({
      title: document.title,
      url: window.location.href
    });
  } else if (request.action === 'getSelectedText') {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    sendResponse({ text });
  }
  return true;
});

// Add text selection listener
document.addEventListener('mouseup', () => {
  const selection = window.getSelection();
  if (selection.toString().trim()) {
    chrome.runtime.sendMessage({
      action: 'textSelected',
      text: selection.toString().trim()
    });
  }
}); 