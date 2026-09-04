# Flowers

A fleeting, wordless gestural watercolor encounter. It is an open medium rather
than a pre-authored bouquet: movement leaves a little graphite, water arrives
first, and delayed pigment settles into warm folded paper before returning to it.

## Run locally

From this directory:

```sh
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173`. Camera access needs a secure context, so
`localhost` works in modern browsers; use local HTTPS when testing from another
device. There is no backend, upload, recording, or deployment path.

Click the small wax/fingerprint mark to optionally request a local camera.
Camera motion is processed in the browser at 64×48. Its private analysis canvas
and current/previous grayscale frames exist only in volatile memory while capture
is active; all three are cleared when capture stops. Nothing is uploaded,
recorded, persisted, or exposed by the experience. If permission is unavailable
or declined, draw directly with pointer or touch instead. The exact p5.js CDN
asset is version- and integrity-pinned before it executes.

The encounter warms, paints, settles, fades, leaves a brief residue, then returns
to paper over roughly 55 seconds. The next encounter uses a related new seed.

## Prototype QA

Telemetry is hidden by default. Open `?telemetry=1` or press `Option` + `Shift`
+ `T` to show its five prototype controls and metrics. They tune local perception,
water spread, pigment, drying, and memory/fade behavior only. The console-safe
`window.__watercolorExperience` hook exposes a small state snapshot, reset, and
synthetic-sample helper for deterministic local QA; it never exposes camera data.

Branch status: `cv-extension` prototype work only; no production deployment.
