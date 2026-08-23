# 高爾夫揮桿分析 v0.3

## 本版修正
- 改善 iPhone Safari 選取 MOV 後按鈕仍為灰色的問題
- 額外支援 .mov / video/quicktime
- 增加 loadedmetadata / error 狀態判斷
- 顯示影片名稱、大小、長度
- MediaPipe 模型載入失敗會顯示原因
- 顯示「已偵測到人體／未偵測到人體」
- 新增上一格／下一格逐格分析
- 保留左右手肘、左右膝、軀幹傾角、頭部偏移

## GitHub Pages 更新方式
1. 解壓縮 ZIP。
2. 將原 Repository 裡的 index.html 刪除或直接用新版覆蓋。
3. 上傳本 ZIP 裡的 index.html。
4. GitHub Pages 通常數十秒到數分鐘後更新。
5. iPhone Safari 若仍顯示舊版，可重新整理，必要時關閉分頁後重開。

## 注意
iPhone 的 MOV 可能使用不同編碼。Safari 通常能播放 iPhone 自己拍的 MOV，
但若影片經其他 App 重新編碼，仍可能發生無法解碼。最穩定格式為 H.264 + AAC 的 MP4。
