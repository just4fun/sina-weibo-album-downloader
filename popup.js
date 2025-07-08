document.addEventListener('DOMContentLoaded', function () {
  const fetchBtn = document.getElementById('fetch-btn');
  const downloadBtn = document.getElementById('download-btn');
  const imgLinksUl = document.getElementById('img-links');
  let links = [];

  fetchBtn.addEventListener('click', async () => {
    imgLinksUl.innerHTML = '<li>正在抓取，请稍候...</li>';
    links = [];
    downloadBtn.disabled = true;
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'fetch_image_links' }, function (response) {
        imgLinksUl.innerHTML = '';
        if (response && response.links && response.links.length > 0) {
          links = response.links;
          response.links.forEach(link => {
            const li = document.createElement('li');
            li.textContent = link;
            imgLinksUl.appendChild(li);
          });
          downloadBtn.disabled = false;
        } else {
          imgLinksUl.innerHTML = '<li>未找到原图链接</li>';
        }
      });
    });
  });

  downloadBtn.addEventListener('click', () => {
    if (links.length > 0) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'batch_download_blob', links });
      });
    }
  });
}); 