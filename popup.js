document.addEventListener('DOMContentLoaded', function () {
  const fetchBtn = document.getElementById('fetch-btn');
  const downloadBtn = document.getElementById('download-btn');
  const imgLinksUl = document.getElementById('img-links');
  const startIndexInput = document.getElementById('start-index');
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
  let isFetching = false;

  // Listen for progress updates from content.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'scroll_progress' && typeof message.count === 'number' && isFetching) {
      fetchStatusSpan.textContent = `正在加载所有原图链接（已找到 ${message.count} 张）...`;
    }
  });

  fetchBtn.addEventListener('click', async () => {
    fetchBtn.disabled = true;
    isFetching = true;
    fetchStatusSpan.textContent = '正在加载所有原图链接（已找到 0 张）...';
    imgLinksUl.innerHTML = '';
    links = [];
    downloadBtn.disabled = true;
    downloadStatusDiv.textContent = '';
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'auto_scroll_and_fetch' }, function (response) {
        fetchBtn.disabled = false;
        isFetching = false;
        imgLinksUl.innerHTML = '';
        if (response && response.links && response.links.length > 0) {
          links = response.links;
          fetchStatusSpan.textContent = `已成功抓取到 ${response.links.length} 张原图。`;
          response.links.forEach((link, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${link}`;
            imgLinksUl.appendChild(li);
          });
          downloadBtn.disabled = false;
        } else {
          fetchStatusSpan.textContent = '未找到原图链接';
          imgLinksUl.innerHTML = '<li>未找到原图链接</li>';
        }
      });
    });
  });

  // Batch download: let content.js handle blob fetching and downloading
  downloadBtn.addEventListener('click', async () => {
    if (links.length > 0) {
      let startIndex = parseInt(startIndexInput.value, 10);
      if (isNaN(startIndex) || startIndex < 1) startIndex = 1;
      console.log('Debug: links.length =', links.length, 'startIndex =', startIndex);
      if (startIndex > links.length) {
        downloadStatusDiv.textContent = '起始序号超出范围，请重新输入。';
        return;
      }
      const slicedLinks = links.slice(startIndex - 1);
      console.log('Debug: slicedLinks.length =', slicedLinks.length);
      downloadStatusDiv.innerHTML = `图片下载正在后台进行，将下载第 ${startIndex} 张到第 ${links.length} 张，共 ${slicedLinks.length} 张图片。<br><br>请在 chrome://settings/downloads 设置的文件夹中查看。`;
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'batch_download_blob', links: slicedLinks });
      });
    }
  });
}); 