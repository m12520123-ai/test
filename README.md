# 高爾夫揮桿分析 v0.5

## 這版修正的錯誤
v0.4 顯示：
Failed to fetch dynamically imported module:
https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm

原因是 Safari 無法成功抓取 jsDelivr 的 `+esm` 轉譯端點。

## v0.5 改法
改成 MediaPipe 官方瀏覽器 bundle：
https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/vision_bundle.mjs

Google 官方文件目前也建議以 `vision_bundle.mjs` 載入 MediaPipe Tasks Vision。

## 更新方式
只要用本版的 index.html 覆蓋 GitHub Pages 原本的 index.html。
重新整理後頁面上方應顯示：
v0.5｜MediaPipe CDN 修正版
