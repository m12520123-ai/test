# 技術依據與第三方依賴

這些來源用於 API 與量測定義查證，不表示原廠認證本程式。

- Google MediaPipe Pose 官方原始文件（Legacy JavaScript、33 個關鍵點、Pose/onResults API）：
  https://github.com/google-ai-edge/mediapipe/blob/master/docs/solutions/pose.md
- Google MediaPipe Tasks Web 姿態文件（新版 API；本程式沒有假裝使用新版 Tasks）：
  https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js
- npm 官方套件頁，固定版本 @mediapipe/pose 0.5.1675469404：
  https://www.npmjs.com/package/@mediapipe/pose
- MDN：MediaRecorder API 與 MIME type 能力檢查：
  https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
- MDN：HTMLMediaElement seeked 事件：
  https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/seeked_event
- MDN：IndexedDB 可保存結構化資料與 Blob：
  https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- MDN：Web Bluetooth 支援有限，Safari / iOS Safari 目前未支援：
  https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API
- Trackman：擊球參數定義：
  https://support.trackmangolf.com/hc/en-us/articles/5089892383515-Practice-Trackman-Data-Parameter-Definitions
- Trackman：Smash Factor = Ball Speed / Club Speed：
  https://www.trackman.com/blog/smash-factor

## 依賴與權利
本包不含 MediaPipe 模型／二進位檔案，按分析功能時才從 CDN 載入。
MediaPipe Pose 套件以 Apache-2.0 發佈，其授權與聲明以原套件為準。
介面、圖表、圖示及網站控制程式為此次新撰寫內容，沒有複製產品廣告照片或品牌標誌。
字型使用使用者裝置的系統字型，本包不含字型檔。
資料圖表不是經驗驗證的高爾夫飛行物理模型。
