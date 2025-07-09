document.addEventListener('DOMContentLoaded', function () {
  const fetchBtn = document.getElementById('fetch-btn');
  const downloadBtn = document.getElementById('download-btn');
  const imgLinksUl = document.getElementById('img-links');
  const startGroupSelect = document.getElementById('start-group');
  const userInfoDiv = document.getElementById('user-info');
  const userInfoText = document.getElementById('user-info-text');
  // Place fetchStatusSpan above the image list
  let fetchStatusSpan = document.getElementById('fetch-status');
  if (!fetchStatusSpan) {
    fetchStatusSpan = document.createElement('div');
    fetchStatusSpan.id = 'fetch-status';
    imgLinksUl.parentNode.insertBefore(fetchStatusSpan, imgLinksUl);
  }
  // Place downloadStatusDiv below the download button
  const downloadStatusDiv = document.getElementById('download-status');
  let links = [];
  let groupedImages = [];
  let isFetching = false;
  let currentUsername = '';

  // Check current page and get user info
  function checkCurrentPage() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const url = tabs[0].url;
      const albumMatch = url.match(/weibo\.com\/u\/(\d+)\?tabtype=album/);

      if (albumMatch) {
        const uid = albumMatch[1];
        getUserInfo(uid);
      } else {
        showError('请先访问用户的相册页面 (如: weibo.com/u/用户ID?tabtype=album)');
        disableAllButtons();
      }
    });
  }

  // Get user info from API
  function getUserInfo(uid) {
    fetch(`https://weibo.com/ajax/profile/info?uid=${uid}`, {
      credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
      if (data.ok && data.data && data.data.user) {
        const user = data.data.user;
        currentUsername = '@' + user.screen_name;
        showUserInfo(`准备抓取用户 <b>${currentUsername}</b> 的相册`);
        enableAllButtons();
      } else {
        showError('无法获取用户信息，请确保已登录微博');
        disableAllButtons();
      }
    })
    .catch(error => {
      console.error('Failed to get user info:', error);
      showError('获取用户信息失败，请检查网络连接');
      disableAllButtons();
    });
  }

  // Show user info
  function showUserInfo(text) {
    userInfoText.innerHTML = text; // Use innerHTML to allow bold tags
    userInfoDiv.style.display = 'block';
    userInfoDiv.classList.remove('error');
  }

  // Show error message
  function showError(text) {
    userInfoText.textContent = text;
    userInfoDiv.style.display = 'block';
    userInfoDiv.classList.add('error');
  }

  // Disable all buttons
  function disableAllButtons() {
    fetchBtn.disabled = true;
    downloadBtn.disabled = true;
    startGroupSelect.disabled = true;
  }

  // Enable all buttons
  function enableAllButtons() {
    fetchBtn.disabled = false;
    downloadBtn.disabled = false;
    startGroupSelect.disabled = false;
  }

  // Initialize page check
  checkCurrentPage();

  // Listen for progress updates from content.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'scroll_progress' && typeof message.count === 'number' && isFetching) {
      fetchStatusSpan.textContent = `正在抓取所有原图链接（已找到第 ${message.count} 张，第 ${message.groupCount || 0} 个分组）...`;
    }
  });

  fetchBtn.addEventListener('click', async () => {
    fetchBtn.disabled = true;
    isFetching = true;
    fetchStatusSpan.textContent = '正在抓取所有原图链接（已找到第 0 张，第 0 个分组）...';
    imgLinksUl.innerHTML = '';
    links = [];
    groupedImages = [];
    downloadBtn.disabled = true;
    startGroupSelect.disabled = true;
    startGroupSelect.innerHTML = '';
    downloadStatusDiv.textContent = '';
    document.getElementById('reward-section').style.display = 'none';
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'auto_scroll_and_fetch' }, function (response) {
        fetchBtn.disabled = false;
        isFetching = false;
        imgLinksUl.innerHTML = '';
        if (response && response.groupedImages && response.groupedImages.length > 0) {
          groupedImages = response.groupedImages;
          const totalImages = groupedImages.reduce((sum, group) => sum + group.images.length, 0);
          fetchStatusSpan.textContent = `已成功抓取到 ${totalImages} 张原图，共 ${groupedImages.length} 个分组。`;

          // Populate dropdown with groups
          startGroupSelect.innerHTML = '';
          groupedImages.forEach((group, groupIndex) => {
            const option = document.createElement('option');
            option.value = groupIndex;
            option.textContent = `${group.year}-${group.month} (${group.images.length} 张)`;
            startGroupSelect.appendChild(option);
          });
          startGroupSelect.disabled = false;
          startGroupSelect.value = '0'; // Default to first group

          // Display grouped images
          groupedImages.forEach((group, groupIndex) => {
            const groupLi = document.createElement('li');
            groupLi.textContent = `${group.year}-${group.month} (${group.images.length} 张)`;
            groupLi.style.fontWeight = 'bold';
            imgLinksUl.appendChild(groupLi);

            group.images.forEach((link, imageIndex) => {
              const li = document.createElement('li');
              li.textContent = `  ${imageIndex + 1}. ${link}`;
              li.style.marginLeft = '20px';
              imgLinksUl.appendChild(li);
            });
          });
          downloadBtn.disabled = false;

          // Re-show user info after successful fetch
          checkCurrentPage();
        } else {
          fetchStatusSpan.textContent = '未找到原图链接';
          imgLinksUl.innerHTML = '<li>未找到原图链接</li>';
          checkCurrentPage();
        }
      });
    });
  });

  // Batch download: let content.js handle blob fetching and downloading
  downloadBtn.addEventListener('click', async () => {
    if (groupedImages.length > 0) {
      const selectedGroupIndex = parseInt(startGroupSelect.value, 10);
      if (isNaN(selectedGroupIndex) || selectedGroupIndex < 0 || selectedGroupIndex >= groupedImages.length) {
        downloadStatusDiv.textContent = '请选择起始分组。';
        return;
      }

      // Create filtered groups starting from the selected group
      const filteredGroups = groupedImages.slice(selectedGroupIndex);

      const totalDownloadImages = filteredGroups.reduce((sum, group) => sum + group.images.length, 0);
      const totalImages = groupedImages.reduce((sum, group) => sum + group.images.length, 0);
      const startGroup = groupedImages[selectedGroupIndex];
      const startGroupName = `${startGroup.year}-${startGroup.month}`;
      downloadStatusDiv.innerHTML = `图片正在后台进行下载，将从分组 ${startGroupName} 开始下载，共 ${totalDownloadImages} 张图片。<br><br>请在 chrome://settings/downloads 设置的文件夹中查看。`;

      // Show reward section
      const rewardSection = document.getElementById('reward-section');
      rewardSection.style.display = 'block';
      
      // Smooth scroll to bottom to show reward code
      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);

      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'batch_download_grouped',
          groupedImages: filteredGroups,
          username: currentUsername
        });
      });
    }
  });
}); 