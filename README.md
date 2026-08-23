# 手機高爾夫揮桿分析 v0.1

這是第一版原型：
- 手機選擇／上傳揮桿影片
- MediaPipe Pose 人體骨架
- 左右手肘角度
- 左右膝角度
- 軀幹相對垂直線傾角
- 頭部水平偏移量

## 使用方式
由於瀏覽器模型需要網路載入，建議將 index.html 部署到 GitHub Pages、Netlify 或其他 HTTPS 靜態網站。
部署後直接用 iPhone Safari / Android Chrome 開啟網址即可。

注意：目前角度是 2D 影像估算值，會受拍攝角度影響，不能等同專業 3D 動作捕捉或醫療判讀。
