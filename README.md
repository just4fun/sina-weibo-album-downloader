# Sina Weibo Album Downloader (Chrome Extension)

<p align="center">
  <img src="assets/logo.png" alt="archive4fun">
</p>

[简体中文版 README 在此 (README.zh-CN.md)](./README.zh-CN.md)

## Motivation

This extension was created to help me back up nearly 4,000 photos I uploaded to Weibo over 15 years (2011–2025). If you also want to archive your Weibo memories, this tool is for you.

> In the Simplified Chinese-speaking community, many people have gradually moved away from Sina Weibo to platforms like Xiaohongshu (rednote) and others. This shift is a key reason for wanting to back up your Weibo photos and memories.

## Prerequisites

- **Disable Chrome download settings:**
  Go to `chrome://settings/downloads` and turn off both "Ask where to save each file before downloading" and "Show downloads when they're done."

    <p align="center">
     <img src="assets/downloads_settings.png" alt="Downloads Settings" width="470" />
   </p>

- **Why?**
  This allows the extension to automatically save each image to your default download folder without prompting you for every file, enabling smooth and unattended batch downloads.

## How to Use

1. **Navigate to the Weibo user's profile page and open the side panel:**
   - Go to any page of the Weibo user whose photos you want to download (e.g., `weibo.com/u/用户ID`). You do not need to navigate to the album tab specifically.
   - Click the extension icon in the toolbar to open the side panel.

   <p align="center">
     <img src="assets/fetch_not_start.png" alt="Navigate to Weibo Profile Page" width="470" />
   </p>

2. **Click "抓取原图链接" (Fetch Original Image Links):**
   - The extension calls Weibo's API to collect all image links. No scrolling is needed — all photos are fetched directly, including regular photos, GIFs, and Live Photos.

   <p align="center">
     <img src="assets/fetch_in_progress.png" alt="Fetch Original Image Links in Progress" width="470" />
   </p>

3. **Select a date range and click "批量下载" (Batch Download):**
   - After fetching, images are grouped by year and month. Use the "从分组" (From) and "到分组" (To) dropdowns to select the date range you want to download.
   - Unlike the old popup (which would close the moment you clicked anywhere else), the side panel stays open as long as you don't close it — you can freely switch tabs or continue browsing in the main window while downloads run in the background. Note: closing the side panel resets the UI state, so keep it open during your session.

   <p align="center">
     <img src="assets/fetch_done.png" alt="Batch Download Ready" width="500" />
   </p>

4. **Check Your Download Folder:**
   - Go to the folder specified in your Chrome download settings to view the download progress and find your images.
   - Images are saved under a folder named after the Weibo username (prefixed with @), organized into subfolders by year-month (e.g., `@username/2025-06/`).

   <p align="center">
     <img src="assets/grouped_images.png" alt="Grouped Images in Download Folder" width="800" />
   </p>

5. **💡 Tip: Resume Downloads After Page Refresh:**
   - If you accidentally refresh or close the current page, downloads will stop. You can click the fetch button again and use the date range dropdowns to resume from where you left off, avoiding re-downloading previously saved photos.

6. **💡 Tip: Restoring Live Photos on iPhone:**
   - Live Photos are downloaded as **two files with the same filename** — a `.jpg` (still image) and a `.mov` (motion clip). Both files retain the original Apple metadata (Content Identifier UUID), so the Live Photo effect can be fully restored.
   - **To view them as Live Photos on iPhone:**
     1. Import both the `.jpg` and `.mov` files together into the **macOS Photos app** (drag both files in at the same time).
     2. Photos will automatically pair them as a Live Photo based on the matching metadata.
     3. Enable **iCloud Photos** sync, and the Live Photo will appear on your iPhone.
   - Simply AirDropping the two files to iPhone will **not** restore the Live Photo effect — the pairing must go through Photos app.

## Why a Chrome Extension (Not a Desktop App or CLI Tool)?

- **Seamless Authentication:** The extension runs in your browser, automatically using your logged-in session, cookies, and headers—no need to manually copy cookies or simulate requests.
- **Bypass Anti-Hotlinking:** Fetching images as blobs from the Weibo page context avoids server-side anti-leeching (hotlink protection) that blocks direct downloads.
- **User-Friendly:** No programming knowledge or command line required. Just install, click, and download.
- **Safe and Stable:** Downloads are paced and managed by Chrome, reducing the risk of being rate-limited or blocked by Weibo.

## Why Not ZIP Batch Download?

- **Browser Limitations:** Chrome extensions cannot reliably create and download large ZIP files due to memory and security restrictions.
- **Side Panel Lifecycle:** Even with the persistent side panel, ZIP creation in the browser is unreliable for large batches — Chrome may terminate the operation due to memory or security restrictions before it completes.
- **CORS and Anti-Leeching:** Direct downloads from the background script are blocked by Weibo's anti-hotlinking, so all downloads must be initiated from the page context.