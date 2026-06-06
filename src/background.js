chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'download_blob' && message.blobUrl && message.filename) {
    chrome.downloads.download({
      url: message.blobUrl,
      filename: message.filename,
      saveAs: false
    });
  }
  if (message.action === 'download_url' && message.url && message.filename) {
    chrome.downloads.download({
      url: message.url,
      filename: message.filename,
      saveAs: false
    });
  }
});
