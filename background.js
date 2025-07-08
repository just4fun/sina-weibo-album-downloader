chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'batch_download' && Array.isArray(message.links)) {
    message.links.forEach((url, idx) => {
      chrome.downloads.download({
        url,
        filename: `weibo_album/${idx + 1}.jpg`,
        saveAs: false
      });
    });
  }
}); 