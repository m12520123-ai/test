# SwingLab V2.3 verification scope

## Passed
- 10 pure logic checks: aspect-ratio-correct wrist projection, slow-motion scaling, low-confidence rejection, missing-pose gaps, stationary/empty cases, experimental bright-object candidates, no radar fields.
- 22 Chromium flow assertions: auto-first default, upload auto-start, decoded synthetic-video analysis, charts, cancel/unlock, save-payload handoff, camera-to-recorded-clip handoff, and explicit model-download failure.
- JavaScript syntax check for every production source file.
- Mobile 390 x 844 overflow check and visual review. Desktop flow rendered at 1440 x 1000.

## How the browser tests ran
Browser navigation was blocked by the environment. The bundled HTML was executed using Playwright set_content on a blank document. Pose outputs, camera input, localStorage and media persistence were test doubles. The camera double supplied a real CanvasCaptureMediaStream to MediaRecorder, so recording and recorded-video decoding were exercised, but this was not a phone camera. Video input was a generated white-object fixture, not the user's footage.

## NOT verified
- Real MediaPipe network download or inference in this environment.
- Actual iPhone/Safari camera permissions, recording performance or frame rate.
- Production IndexedDB persistence (only the save payload and callback flow were exercised).
- Golf-ball identification accuracy, clubhead tracking, radar-like ball flight, true clubhead speed or face angle.

The experimental tracker only associates small bright components. Its candidates must not be presented as confirmed golf-ball tracks. Production code contains no test-pose or camera stubs.
