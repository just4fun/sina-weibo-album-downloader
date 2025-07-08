function getWeiboAlbumOriginalImages() {
  // 新浪微博相册原图链接通常以 large 或原图参数结尾
  const imgNodes = Array.from(document.querySelectorAll('img'));
  const links = imgNodes
    .map(img => img.src)
    .filter(src => src && (/large\//.test(src) || /\/orj360\//.test(src) || /\/orj480\//.test(src) || /\/orj960\//.test(src) || /\/orj1920\//.test(src)))
    .map(src => src.replace(/thumb150|thumb180|thumb300|mw690|orj360|orj480|orj960|orj1920|bmiddle|small/g, 'large'));
  // 去重
  return Array.from(new Set(links));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetch_image_links') {
    const links = getWeiboAlbumOriginalImages();
    sendResponse({ links });
  }
  // 必须返回 true 以支持异步 sendResponse
  return true;
}); 