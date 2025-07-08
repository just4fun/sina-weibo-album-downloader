chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'batch_download' && Array.isArray(message.links)) {
    // Legacy batch download (not recommended)
    message.links.forEach((url, idx) => {
      chrome.downloads.download({
        url,
        filename: `weibo_album/${idx + 1}.jpg`,
        saveAs: false
      });
    });
  }
  if (message.action === 'download_blob' && message.blobUrl && message.filename) {
    // Download image from blob URL
    chrome.downloads.download({
      url: message.blobUrl,
      filename: message.filename,
      saveAs: false
    });
  }
}); 