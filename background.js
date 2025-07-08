let batchDownloadState = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'batch_download_with_names' && Array.isArray(message.images)) {
    // Start a new batch download state (clear previous state)
    batchDownloadState = {
      total: message.images.length,
      completed: 0,
      downloadIds: new Set(),
      finished: false
    };
    console.log('Received batch_download_with_names:', message.images);
    message.images.forEach((img, idx) => {
      chrome.downloads.download({
        url: img.url,
        filename: `weibo_album/${img.filename}`,
        saveAs: false
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Download failed:', img.filename, chrome.runtime.lastError);
        } else {
          batchDownloadState.downloadIds.add(downloadId);
        }
      });
    });
  }
  if (message.action === 'clear_batch_download_state') {
    batchDownloadState = null;
  }
  if (message.action === 'get_batch_download_state') {
    sendResponse(batchDownloadState ? {
      total: batchDownloadState.total,
      completed: batchDownloadState.completed,
      finished: batchDownloadState.finished
    } : null);
    return true;
  }
  if (message.action === 'download_blob' && message.blobUrl && message.filename) {
    chrome.downloads.download({
      url: message.blobUrl,
      filename: message.filename,
      saveAs: false
    });
  }
});

chrome.downloads.onChanged.addListener(function (delta) {
  if (!batchDownloadState) return;
  if (delta.state && delta.state.current === 'complete' && batchDownloadState.downloadIds.has(delta.id)) {
    batchDownloadState.completed++;
    if (batchDownloadState.completed >= batchDownloadState.total) {
      batchDownloadState.finished = true;
      chrome.runtime.sendMessage({ action: 'batch_download_complete', total: batchDownloadState.total });
      // Do not clear batchDownloadState here; keep it for popup state recovery
    }
  }
}); 