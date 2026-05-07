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

// Get user info from API (running in page context)
async function getUserInfo(uid) {
  try {
    const response = await fetch(`https://weibo.com/ajax/profile/info?uid=${uid}`, {
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

// Fetch all album images via getImageWall API, grouped by year-month
async function fetchAllImagesViaAPI(uid) {
  const groupMap = {};   // "YYYY-MM" → url[]
  const groupOrder = []; // ordered keys

  let sinceid = '';
  let currentYear = new Date().getFullYear().toString();
  let currentMonth = '01';

  while (true) {
    const params = `uid=${uid}&has_album=1${sinceid ? '&sinceid=' + encodeURIComponent(sinceid) : ''}`;
    const resp = await fetch(`https://weibo.com/ajax/profile/getImageWall?${params}`, {
      credentials: 'include'
    });
    const data = await resp.json();

    if (!data.ok || !data.data) break;

    const items = data.data.list || [];
    for (const item of items) {
      if (item.timeline_year) currentYear = item.timeline_year;
      if (item.timeline_month) currentMonth = item.timeline_month;
      if (!item.pid) continue;

      const key = `${currentYear}-${currentMonth.padStart(2, '0')}`;
      if (!groupMap[key]) {
        groupMap[key] = [];
        groupOrder.push(key);
      }
      groupMap[key].push(pidToImageUrl(item.pid));
    }

    const totalImages = groupOrder.reduce((sum, k) => sum + groupMap[k].length, 0);
    chrome.runtime.sendMessage({
      action: 'scroll_progress',
      count: totalImages,
      groupCount: groupOrder.length
    });

    const nextSinceid = data.data.since_id;
    if (!nextSinceid || nextSinceid === '0' || nextSinceid === 0 || nextSinceid === sinceid) break;
    sinceid = nextSinceid;
  }

  return groupOrder.reverse().map(key => {
    const [year, month] = key.split('-');
    return {
      year,
      month: `${parseInt(month)}月`,
      images: groupMap[key]
    };
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'auto_scroll_and_fetch' && message.uid) {
    fetchAllImagesViaAPI(message.uid).then(groupedImages => {
      sendResponse({ groupedImages });
    });
    return true;
  }
  if (message.action === 'get_user_info' && message.uid) {
    getUserInfo(message.uid).then(result => {
      sendResponse(result);
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
        await downloadImage(url, `${username}/${filename}`);
      }
    })();
    sendResponse({ ok: true });
  }

  if (message.action === 'batch_download_grouped' && Array.isArray(message.groupedImages)) {
    console.log('Debug: content.js received', message.groupedImages.length, 'groups to download');
    const username = message.username || 'weibo_user';
    (async () => {
      for (const group of message.groupedImages) {
        const folderName = `${group.year}-${group.month.replace('月', '').padStart(2, '0')}`;
        console.log('Debug: downloading group', folderName, 'with', group.images.length, 'images');

        for (let i = 0; i < group.images.length; i++) {
          const url = group.images[i];
          const filename = url.split('/').pop().split('?')[0];
          await downloadImage(url, `${username}/${folderName}/${filename}`);
        }
      }
    })();
    sendResponse({ ok: true });
  }
  return true;
});
