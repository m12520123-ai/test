# Technical references (checked 2026-10-26)

- MediaPipe Pose Landmarker: body landmarks, not a golf-ball/clubhead detector: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js
- MediaStream Recording specification: independent timeslice blobs need not be playable; this release saves complete recorder sessions, not arbitrary chunk splices: https://www.w3.org/TR/mediastream-recording/
- Actual track settings, not requested frame rate: https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/getSettings
- Video frame timestamps and presented-frame callbacks: https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback
- NASA drag equation: https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/
- NASA ballistic model and its limitations: https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ballistic-flight-equations/

## Implemented model
Image points are projected onto the user-marked horizontal reference and its perpendicular. A linear fit of short-window displacement (with a small gravity correction in the vertical coordinate) estimates initial image-plane velocity. It assumes constant depth, known scale and correctly specified constant time ratio. It has no lens calibration, depth recovery, learned golf-ball identification or measured spin.

The forward flight model integrates gravity and quadratic drag using RK4:
`a_x = -k |v| v_x`, `a_z = -g - k |v| v_z`, `k = rho Cd A / (2 m)`.
Cd is a user-selected scenario parameter, not an experimentally fitted golf-ball coefficient. Lift, wind, spin, roll and side curvature are absent. Results are not copied into measured Carry, club speed, face angle or spin fields.
