# 高爾夫揮桿分析 v0.6

這版不再使用：
- ES Module
- dynamic import()
- @mediapipe/tasks-vision

改成舊版但成熟的 MediaPipe Pose classic script：
- @mediapipe/pose
- @mediapipe/drawing_utils

目的：避開 iPhone Safari 出現
`Importing a module script failed.`

## 更新方式
將 ZIP 解壓縮後，把 index.html 覆蓋 GitHub Pages 原本的 index.html。

畫面上方應顯示：
v0.6｜iPhone Safari 非 Module 版

如果仍失敗，請把「系統狀態」那一行一起截圖。
