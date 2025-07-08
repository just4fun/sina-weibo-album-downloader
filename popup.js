document.addEventListener('DOMContentLoaded', function () {
  const fetchBtn = document.getElementById('fetch-btn');
  const downloadBtn = document.getElementById('download-btn');
  const imgLinksUl = document.getElementById('img-links');
  // Place fetchStatusSpan above the image list
  let fetchStatusSpan = document.getElementById('fetch-status');
  if (!fetchStatusSpan) {
    fetchStatusSpan = document.createElement('div');
    fetchStatusSpan.id = 'fetch-status';
    imgLinksUl.parentNode.insertBefore(fetchStatusSpan, imgLinksUl);
  }
  // Place downloadStatusDiv below the download button
  let downloadStatusDiv = document.getElementById('download-status');
  if (!downloadStatusDiv) {
    downloadStatusDiv = document.createElement('div');
    downloadStatusDiv.id = 'download-status';
    downloadStatusDiv.style.marginTop = '5px';
    downloadBtn.parentNode.appendChild(downloadStatusDiv);
  }
  let links = [];

  // Listen for progress updates from content.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'scroll_progress' && typeof message.count === 'number') {
      fetchStatusSpan.textContent = `正在加载所有原图链接（第 ${message.count} 张）...`;
    }
  });

  fetchBtn.addEventListener('click', async () => {
    fetchBtn.disabled = true;
    fetchStatusSpan.textContent = '正在加载所有原图链接（第 0 张）...';
    imgLinksUl.innerHTML = '';
    links = [];
    downloadBtn.disabled = true;
    downloadStatusDiv.textContent = '';
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'auto_scroll_and_fetch' }, function (response) {
        fetchBtn.disabled = false;
        fetchStatusSpan.textContent = '';
        imgLinksUl.innerHTML = '';
        if (response && response.links && response.links.length > 0) {
          links = response.links;
          response.links.forEach((link, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${link}`;
            imgLinksUl.appendChild(li);
          });
          downloadBtn.disabled = false;
        } else {
          imgLinksUl.innerHTML = '<li>未找到原图链接</li>';
        }
      });
    });
  });

  // Batch download: let content.js handle blob fetching and downloading
  downloadBtn.addEventListener('click', async () => {
    if (links.length > 0) {
      // Do not disable the button here, since downloads are handled in the background
      downloadStatusDiv.textContent = '图片下载正在后台进行，请在 chrome://settings/downloads 设置的文件夹中查看。';
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'batch_download_blob', links });
      });
    }
  });
}); 