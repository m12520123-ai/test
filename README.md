# Golf AI 即時揮桿分析 v1.0

## 功能
- 直接使用手機前／後鏡頭
- Face-on / Down-the-line 拍攝視角
- 即時 MediaPipe Pose 人體骨架
- 即時計算：
  - 左手肘角度
  - 右手肘角度
  - 左膝角度
  - 右膝角度
  - 軀幹傾角
  - 頭部水平偏移
- 3 秒倒數後同步錄影
- 錄影同時持續 AI 分析
- 錄影結束可直接回放
- 顯示本次錄影角度平均／最小／最大
- 可儲存錄製的影片

## iPhone 使用
1. 將 ZIP 解壓縮。
2. 把 index.html 與 style.css 一起上傳到 GitHub Pages 專案根目錄。
3. 用 Safari 開啟 GitHub Pages 網址。
4. 第一次按「開啟相機」時允許 Safari 使用相機。
5. 建議使用後鏡頭、1x 主鏡頭、手機固定腳架。
6. Face-on / Down-the-line 都要讓全身留在畫面中。

## 建議拍攝
- Face-on：鏡頭約腰～胸高，正對身體中心。
- Down-the-line：鏡頭位於球員後方，沿目標線方向。
- 人物佔畫面高度約 60–80%。
- 避免 0.5x 超廣角。
- 最好使用固定腳架。
- 環境光線要足夠。

## 限制
這是 2D 單鏡頭姿態分析，不等同 3D 動作捕捉。
手機鏡頭本身不能可靠取得 TrackMan 類的：
- Ball Speed
- Club Speed
- Spin
- Carry
- Club Path
- Face Angle

若未來要加入真正的彈道數據，需要另外串接雷達／Launch Monitor／BLE 感測器。

## Safari 注意
此版本使用 MediaPipe classic script，避免先前 iPhone Safari 的 ES Module / dynamic import 錯誤。
MediaPipe 模型仍需網路下載，因此使用時手機要連網。
