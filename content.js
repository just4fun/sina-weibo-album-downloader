// Fetch image as blob with credentials (to bypass 403)
async function fetchImageAsBlob(url) {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch image: ' + url);
  return await response.blob();
}

// Download image by sending blob URL to background.js
async function downloadImage(url, filename) {
  try {
    const blob = await fetchImageAsBlob(url);
    const blobUrl = URL.createObjectURL(blob);
    chrome.runtime.sendMessage({ action: 'download_blob', blobUrl, filename });
  } catch (e) {
    console.error('Download failed', url, e);
  }
}

// Get all original image links from Weibo album
function getWeiboAlbumOriginalImages() {
  const imgNodes = Array.from(document.querySelectorAll('img'));
  const links = imgNodes
    .map(img => img.src)
    .filter(src => src && (/large\//.test(src) || /\/orj360\//.test(src) || /\/orj480\//.test(src) || /\/orj960\//.test(src) || /\/orj1920\//.test(src)))
    .map(src => src.replace(/thumb150|thumb180|thumb300|mw690|orj360|orj480|orj960|orj1920|bmiddle|small/g, 'large'));
  return Array.from(new Set(links));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetch_image_links') {
    const links = getWeiboAlbumOriginalImages();
    sendResponse({ links });
  }
  if (message.action === 'batch_download_blob' && Array.isArray(message.links)) {
    (async () => {
      for (let i = 0; i < message.links.length; i++) {
        await downloadImage(message.links[i], `weibo_album/${i + 1}.jpg`);
      }
    })();
    sendResponse({ ok: true });
  }
  return true;
}); 