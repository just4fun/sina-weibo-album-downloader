// Fetch image as blob with credentials (to bypass 403)
async function fetchImageAsBlob(url) {
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch image: ' + url);
    return await response.blob();
  } catch (e) {
    // If CORS fails, try with no-cors mode
    console.log('CORS failed, trying no-cors mode for:', url);
    const response = await fetch(url, {
      credentials: 'include',
      mode: 'no-cors'
    });
    return await response.blob();
  }
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
  // Find all divs containing ProfileAlbum_box class
  const albumBoxes = document.querySelectorAll('div[class*="ProfileAlbum_box"]');
  const links = [];

  albumBoxes.forEach(box => {
    // Find img with woo-picture-img class within each box
    const imgs = box.querySelectorAll('img.woo-picture-img');
    imgs.forEach(img => {
      if (img.src && (/large\//.test(img.src) || /\/orj360\//.test(img.src) || /\/orj480\//.test(img.src) || /\/orj960\//.test(img.src) || /\/orj1920\//.test(img.src))) {
        const originalUrl = img.src.replace(/thumb150|thumb180|thumb300|mw690|orj360|orj480|orj960|orj1920|bmiddle|small/g, 'large');
        links.push(originalUrl);
      }
    });
  });

  return Array.from(new Set(links));
}

// Auto scroll to bottom and fetch all image links
async function autoScrollAndFetchAllLinks() {
  return new Promise((resolve) => {
    let lastImgCount = 0;
    let lastScrollHeight = 0;
    let stableCount = 0;
    const maxStable = 5; // how many times to check for no new images/height before stopping
    const interval = 2000; // ms

    function getImgCount() {
      return document.querySelectorAll('img').length;
    }
    function getScrollHeight() {
      return document.body.scrollHeight;
    }

    function sendProgress(count) {
      // Report original image links count instead of total image count
      const originalLinks = getWeiboAlbumOriginalImages();
      chrome.runtime.sendMessage({ action: 'scroll_progress', count: originalLinks.length });
    }

    function scrollAndCheck() {
      window.scrollTo(0, document.body.scrollHeight);
      const curImgCount = getImgCount();
      const curScrollHeight = getScrollHeight();
      sendProgress(curImgCount);
      if (curImgCount === lastImgCount && curScrollHeight === lastScrollHeight) {
        stableCount++;
      } else {
        stableCount = 0;
      }
      lastImgCount = curImgCount;
      lastScrollHeight = curScrollHeight;
      if (stableCount >= maxStable) {
        // Considered loaded
        const links = getWeiboAlbumOriginalImages();
        resolve(links);
      } else {
        setTimeout(scrollAndCheck, interval);
      }
    }
    scrollAndCheck();
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetch_image_links') {
    const links = getWeiboAlbumOriginalImages();
    sendResponse({ links });
  }
  if (message.action === 'auto_scroll_and_fetch') {
    autoScrollAndFetchAllLinks().then(links => {
      sendResponse({ links });
    });
    return true;
  }
  if (message.action === 'batch_download_blob' && Array.isArray(message.links)) {
    console.log('Debug: content.js received', message.links.length, 'links to download');
    (async () => {
      for (let i = 0; i < message.links.length; i++) {
        const url = message.links[i];
        console.log('Debug: downloading', i + 1, 'of', message.links.length, ':', url);
        const filename = url.split('/').pop().split('?')[0];
        await downloadImage(url, `weibo_album/${filename}`);
      }
    })();
    sendResponse({ ok: true });
  }
  return true;
}); 