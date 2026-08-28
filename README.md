Golf AI v1.2

三個分頁：
1. index.html：手機鏡頭即時分析＋同步錄影
2. video.html：既有影片姿態分析
3. trajectory.html：手部揮桿速度估算＋手部軌跡＋球路手動標示

重要：
- 揮桿速度頁的速度是手腕中點的 2D 估算，不是雷達真正的 Club Head Speed。
- 球路採逐幀手動點球位置後連線，避免手機單鏡頭產生假的彈道數據。
- 120/240 FPS 慢動作影片最適合做球路標記。

GitHub Pages：
把 index.html、video.html、trajectory.html、style.css 一起上傳／覆蓋到專案根目錄。
