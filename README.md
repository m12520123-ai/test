# v0.4 修正重點

前版最可能的問題不是 MOV/MP4，而是 Safari 在頁面一開始載入 MediaPipe ES module 時失敗。
一旦最上方 import 失敗，後面的「選檔事件」也完全不會執行，所以會出現：
- iPhone 看得到檔名
- 但按鈕仍然灰色
- 狀態文字完全不改

v0.4 已改成：
1. 一般 JavaScript 先啟動。
2. 選檔事件不依賴 MediaPipe。
3. 選到任何影片後立即啟用按鈕。
4. 只有按「開始分析」時才動態載入 MediaPipe。
5. 新增「系統狀態」方便直接判斷卡在哪一步。

GitHub Pages：用新版 index.html 覆蓋舊檔即可。
