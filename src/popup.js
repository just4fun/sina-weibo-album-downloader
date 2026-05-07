document.addEventListener('DOMContentLoaded', function () {
  const fetchBtn = document.getElementById('fetch-btn');
  const downloadBtn = document.getElementById('download-btn');
  const imgLinksUl = document.getElementById('img-links');
  const startGroupSelect = document.getElementById('start-group');
  const endGroupSelect = document.getElementById('end-group');
  const userInfoDiv = document.getElementById('user-info');
  const userInfoText = document.getElementById('user-info-text');
  const dateRangeErrorDiv = document.getElementById('date-range-error');
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
  let currentUid = '';

  // Check current page and get user info
  function checkCurrentPage() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const url = tabs[0].url;
      const albumMatch = url.match(/weibo\.com\/u\/(\d+)/);

      if (albumMatch) {
        const uid = albumMatch[1];
        currentUid = uid;
        getUserInfo(uid);
      } else {
        showError('请先访问用户的主页 (如: weibo.com/u/用户ID)');
        disableAllButtons();
      }
    });
  }

  // Get user info from API
  function getUserInfo(uid) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'get_user_info', uid: uid }, function (response) {
        if (chrome.runtime.lastError) {
          console.error('Failed to send message to content script:', chrome.runtime.lastError);
          showError('无法与页面通信，请刷新页面后重试');
          disableAllButtons();
          return;
        }

        if (response && response.success) {
          const user = response.user;
          currentUsername = '@' + user.screen_name;
          showUserInfo(`准备抓取用户 <b>${currentUsername}</b> 的相册`);
          // Only enable fetch button, keep dropdowns and download button disabled until fetch completes
          fetchBtn.disabled = false;
        } else {
          const errorMsg = response ? response.error : '无法获取用户信息';
          showError(errorMsg);
          disableAllButtons();
        }
      });
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
    endGroupSelect.disabled = true;
  }

  // Validate date range and update UI accordingly
  function validateDateRange() {
    const startIndex = parseInt(startGroupSelect.value);
    const endIndex = parseInt(endGroupSelect.value);

    // Check if both selections are valid
    if (isNaN(startIndex) || isNaN(endIndex)) {
      downloadBtn.disabled = true;
      return false;
    }

    // Check if start month is later than end month
    if (startIndex > endIndex) {
      dateRangeErrorDiv.textContent = '结束月份不能早于开始月份';
      dateRangeErrorDiv.style.display = 'block';
      downloadBtn.disabled = true;
      return false;
    } else {
      dateRangeErrorDiv.style.display = 'none';
      // Only enable download button if not currently fetching and both dropdowns are enabled
      downloadBtn.disabled = isFetching || startGroupSelect.disabled || endGroupSelect.disabled;
      return true;
    }
  }

  // Add event listeners for date range validation
  startGroupSelect.addEventListener('change', validateDateRange);
  endGroupSelect.addEventListener('change', validateDateRange);

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
    endGroupSelect.disabled = true;
    startGroupSelect.innerHTML = '';
    endGroupSelect.innerHTML = '';
    downloadStatusDiv.textContent = '';
    dateRangeErrorDiv.style.display = 'none';
    document.getElementById('reward-section').style.display = 'none';
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'auto_scroll_and_fetch', uid: currentUid }, function (response) {
        fetchBtn.disabled = false;
        isFetching = false;
        imgLinksUl.innerHTML = '';
        if (response && response.groupedImages && response.groupedImages.length > 0) {
          groupedImages = response.groupedImages;
          const totalImages = groupedImages.reduce((sum, group) => sum + group.images.length, 0);
          fetchStatusSpan.textContent = `已成功抓取到 ${totalImages} 张原图，共 ${groupedImages.length} 个分组。`;

          // Populate dropdowns with groups
          startGroupSelect.innerHTML = '';
          endGroupSelect.innerHTML = '';
          groupedImages.forEach((group, groupIndex) => {
            const option = document.createElement('option');
            option.value = groupIndex;
            option.textContent = `${group.year}-${group.month} (${group.images.length} 张)`;
            startGroupSelect.appendChild(option);

            const endOption = document.createElement('option');
            endOption.value = groupIndex;
            endOption.textContent = `${group.year}-${group.month} (${group.images.length} 张)`;
            endGroupSelect.appendChild(endOption);
          });
          startGroupSelect.disabled = false;
          endGroupSelect.disabled = false;
          startGroupSelect.value = '0'; // Default to first group (oldest)
          endGroupSelect.value = (groupedImages.length - 1).toString(); // Default to last group (newest)

          // Validate initial date range
          validateDateRange();

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
          imgLinksUl.innerHTML = '';
          checkCurrentPage();
        }
      });
    });
  });

  // Batch download: let content.js handle blob fetching and downloading
  downloadBtn.addEventListener('click', async () => {
    if (groupedImages.length > 0) {
      // Validate date range before proceeding
      if (!validateDateRange()) {
        return;
      }

      const startGroupIndex = parseInt(startGroupSelect.value, 10);
      const endGroupIndex = parseInt(endGroupSelect.value, 10);

      if (isNaN(startGroupIndex) || isNaN(endGroupIndex) ||
          startGroupIndex < 0 || endGroupIndex < 0 ||
          startGroupIndex >= groupedImages.length || endGroupIndex >= groupedImages.length) {
        downloadStatusDiv.textContent = '请选择有效的分组范围。';
        return;
      }

      // Create filtered groups from start to end (inclusive)
      const filteredGroups = groupedImages.slice(startGroupIndex, endGroupIndex + 1);

      const totalDownloadImages = filteredGroups.reduce((sum, group) => sum + group.images.length, 0);
      const startGroup = groupedImages[startGroupIndex];
      const endGroup = groupedImages[endGroupIndex];
      const startGroupName = `${startGroup.year}-${startGroup.month}`;
      const endGroupName = `${endGroup.year}-${endGroup.month}`;
      downloadStatusDiv.innerHTML = `图片正在后台进行下载，将从分组 ${startGroupName} 到 ${endGroupName}，共 ${totalDownloadImages} 张图片。<br><br>请在 chrome://settings/downloads 设置的文件夹中查看。`;

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