# v2.2 Test report

Browser: Chromium 144.0.7559.96 (Playwright).
Passed checks: 84 / 84.

## Verified
- Real synthetic H.264 MP4 loaded through a file input and decoded in the browser.
- Touch-style pointer events placed ball/club/reference/direction marks on the canvas.
- Current-clip path, interval speed, direction plots and summary cards updated together.
- Known geometry: 100 cm reference = 320 px; club displacement = 64 px over 0.1 s gives 7.2 km/h (2D). A 4x slow-motion correction gives 28.8 km/h.
- Missing calibration does not generate a speed. Direction uses the original image aspect ratio.
- Point replacement, deletion and undo; CSV/JSON/annotated PNG downloads.
- Single-frame and scan failures leave manual tools usable. Scan cancellation releases the UI immediately.
- AI input is a frozen decoded frame rather than a mutable video element.
- 30 responsive layout checks: 6 routes at 375/390/430/768/1440 px.
- Save/reopen UI wiring restores analysis, without copying projected speed into radar fields.

## Not verified / test adapters
Save/reopen tests used an in-memory adapter for the media store and localStorage because the browser content test harness has no persistent web origin. These tests do NOT certify native browser IndexedDB persistence, storage quota, or reload recovery. Native storage failure was separately injected to ensure no false success.
AI failure and pending-work tests used a mocked pose model. They do NOT certify model loading or pose detection accuracy.
No physical iPhone, Safari camera, real golf clip, radar or Bluetooth device was used.
The supplied synthetic test video is not included in the application, and no synthetic measurements are automatically generated for user videos.

## Distribution
The deployed index.html is self-contained for UI/styles/application logic. Only on-demand MediaPipe assets still use a network connection. The source/ directory is for development, not required deployment.
