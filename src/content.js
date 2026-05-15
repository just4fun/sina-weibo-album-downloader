// Fetch image as blob with credentials (to bypass 403)
async function fetchImageAsBlob(url) {
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch image: ' + url);
    return await response.blob();
  } catch (e) {
    const response = await fetch(url, {
      credentials: 'include',
      mode: 'no-cors'
    });
    return await response.blob();
  }
}

// Get user info from API (running in page context)
async function getUserInfo(uid) {
  try {
    const response = await fetch(`/ajax/profile/info?uid=${uid}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.ok && data.data && data.data.user) {
      return {
        success: true,
        user: data.data.user
      };
    } else {
      return {
        success: false,
        error: '获取用户信息失败，请检查页面是否正确加载'
      };
    }
  } catch (error) {
    console.error('Failed to get user info:', error);
    return {
      success: false,
      error: '获取用户信息失败，请检查网络连接'
    };
  }
}

// Download image by sending blob URL to background.js
async function downloadImage(url, filename) {
  try {
    const blob = await fetchImageAsBlob(url);
    let finalFilename = filename;
    if (!filename.match(/\.\w{2,4}$/)) {
      const ext = (blob.type && blob.type.startsWith('image/'))
        ? blob.type.split('/')[1].replace('jpeg', 'jpg')
        : 'jpg';
      finalFilename = filename + '.' + ext;
    }
    const blobUrl = URL.createObjectURL(blob);
    chrome.runtime.sendMessage({ action: 'download_blob', blobUrl, filename: finalFilename });
  } catch (e) {
    console.error('Download failed', url, e);
  }
}

// Construct original image URL from pid
function pidToImageUrl(pid) {
  return `https://wx1.sinaimg.cn/large/${pid}`;
}

async function fetchPageWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await fetch(url, { credentials: 'include' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// Fetch all album images via getImageWall API, grouped by year-month
async function fetchAllImagesViaAPI(uid) {
  const groupData = {};   // "YYYY-MM" → { images: url[], liveVideos: { imageUrl: movUrl } }
  const groupOrder = [];

  let sinceid = '';
  let currentYear = new Date().getFullYear().toString();
  let currentMonth = '01';
  let partial = false;

  while (true) {
    const params = `uid=${uid}&has_album=1${sinceid ? '&sinceid=' + encodeURIComponent(sinceid) : ''}`;
    let data;
    try {
      data = await fetchPageWithRetry(`/ajax/profile/getImageWall?${params}`);
    } catch (e) {
      partial = true;
      break;
    }

    if (!data.ok || !data.data) break;

    const items = data.data.list || [];
    for (const item of items) {
      if (item.timeline_year) currentYear = item.timeline_year;
      if (item.timeline_month) currentMonth = item.timeline_month;
      if (!item.pid) continue;

      const key = `${currentYear}-${currentMonth.padStart(2, '0')}`;
      if (!groupData[key]) {
        groupData[key] = { images: [], liveVideos: {} };
        groupOrder.push(key);
      }

      const imageUrl = pidToImageUrl(item.pid);
      groupData[key].images.push(imageUrl);

      if (item.type === 'livephoto' && item.video) {
        groupData[key].liveVideos[imageUrl] = item.video;
      }
    }

    const totalImages = groupOrder.reduce((sum, k) => sum + groupData[k].images.length, 0);
    chrome.runtime.sendMessage({
      action: 'fetch_progress',
      count: totalImages,
      groupCount: groupOrder.length
    });

    const nextSinceid = data.data.since_id;
    if (!nextSinceid || nextSinceid === '0' || nextSinceid === 0 || nextSinceid === sinceid) break;
    sinceid = nextSinceid;
  }

  const groups = groupOrder.reverse().map(key => {
    const [year, month] = key.split('-');
    return {
      year,
      month: `${parseInt(month)}月`,
      images: groupData[key].images,
      liveVideos: groupData[key].liveVideos
    };
  });
  return { groups, partial };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetch_album_images' && message.uid) {
    fetchAllImagesViaAPI(message.uid).then(({ groups, partial }) => {
      sendResponse({ groupedImages: groups, partial });
    });
    return true;
  }
  if (message.action === 'get_user_info' && message.uid) {
    getUserInfo(message.uid).then(result => {
      sendResponse(result);
    });
    return true;
  }
  if (message.action === 'batch_download_grouped' && Array.isArray(message.groupedImages)) {
    const username = message.username || 'weibo_user';
    (async () => {
      for (const group of message.groupedImages) {
        const folderName = `${group.year}-${group.month.replace('月', '').padStart(2, '0')}`;
        for (let i = 0; i < group.images.length; i++) {
          const url = group.images[i];
          const pid = url.split('/').pop();
          await downloadImage(url, `${username}/${folderName}/${pid}`);

          const movUrl = group.liveVideos && group.liveVideos[url];
          if (movUrl) {
            chrome.runtime.sendMessage({
              action: 'download_url',
              url: movUrl,
              filename: `${username}/${folderName}/${pid}.mov`
            });
          }
        }
      }
    })();
    sendResponse({ ok: true });
  }
  return true;
});
