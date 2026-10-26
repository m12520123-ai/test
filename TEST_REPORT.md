# V2.4 test report

48 assertions passed in the final runs. These are engineering checks, not validation of launch-monitor accuracy.

## Tested
- 17 pure logic assertions: address/swing/settle segmentation, quiet scenes, tracking loss, slow-motion timing, scale and aspect geometry, invalid or unconfirmed tracks, analytic no-drag comparison and drag behavior.
- 10 browser shell assertions: six routes, three viewport widths (390 / 768 / 1440), no JavaScript exceptions.
- 13 uploaded-video assertions: an H.264 synthetic white-ball clip, calibration and candidate confirmation gates, high-rate search, known synthetic velocity and angle, model view switching, saving/restoring the model through an in-memory storage double, and clearing stale results after a new upload.
- 8 continuous-practice assertions: synthetic pose events and a real MediaRecorder encoding a generated Canvas stream, two independent recordings, clip bounds, replay decoding and per-swing cards.

## Test environment and limits
Chromium under Playwright. The app was inserted into an in-memory document because network navigation is restricted in the test environment. Browser persistence was substituted with an in-memory store. Camera permission, getUserMedia hardware capture, iPhone Safari codecs/storage quotas, MediaPipe CDN/model execution and real golf-video accuracy were NOT validated. Continuous segmentation uses generated pose samples, not a real golf-action recognition benchmark. Optical tracking uses an ideal synthetic white circle on a static background; this does NOT establish real-world accuracy or robustness.

The UI will reject insufficient evidence instead of fabricating measurements. A user confirmation is required before treating a bright-object track as a ball.

## Reproduce
The tests/ directory includes Node and Python test programs and the small synthetic H.264 fixture. Run `node tests/core.test.cjs` for pure logic. Browser tests require Python Playwright and an available Chromium browser. They intentionally use in-memory storage doubles and do not contact the user's accounts or websites.
