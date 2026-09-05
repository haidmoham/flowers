# Clustered ivory bouquet validation

Checked on 2026-09-04. Production deployment: `dpl_B48NVS7CMfMhxPfkbxnpCeXydouV`.

Desktop (1440 × 1000) and simulated phone (390 × 844, DPR 2) completed
the eighteen-second reveal with reduced motion enabled. Both returned HTTP 200,
with no runtime errors or overflow. The final frame remained unchanged after
playback stopped. Screenshots at early, middle, and final stages were inspected.
The arrival field has no polygon cutoffs. The shader suppresses source paper
shading so that tan bands do not appear around stems during the reveal.

Commands for this revision:

```powershell
node --check astral/garden.js
git diff --check
git diff --exit-code -- sketch.js index.html style.css
node "$env:TEMP/flowers-cluster-check.cjs" http://127.0.0.1:4187/studies/clustered-exposure/ flowers-cluster-clean
node "$env:TEMP/flowers-fallback-check.cjs" http://127.0.0.1:4187/astral/
node "$env:TEMP/flowers-live-verify.cjs"
node "$env:TEMP/flowers-live-routing-check.cjs"
```

The tested study files were copied to `astral/`. No-WebGL, context-loss, and
missing-map fallbacks passed without runtime errors. All seven live assets
returned HTTP 200 and matched local SHA-256 hashes. The original p5.js files
remain unchanged. Browser checks use local temporary diagnostic scripts.

## Previous pair study

Checked on 2026-09-04. Production deployment: `dpl_B71H6xYFvRLwxjca9aSh8V23sDtW`.

The owner subsequently requested full playback regardless of reduced-motion
settings. The live override was verified with `flowers-force-motion-check.cjs`:
the animation clock advanced from 1.05 to 1.68 seconds while reduced motion was
enabled and toggled. No runtime errors occurred. Syntax and all seven live asset
hash checks passed. The reduced-motion behavior described below is historical.

## Commands

From the repository root:

```powershell
node --check astral/garden.js
git diff --check
git diff --exit-code -- sketch.js index.html style.css
node "$env:TEMP/flowers-new-qa.cjs" http://127.0.0.1:4187/astral/ flowers-exposure-final
node "$env:TEMP/flowers-fallback-check.cjs" http://127.0.0.1:4187/astral/
node "$env:TEMP/flowers-live-verify.cjs"
node "$env:TEMP/flowers-live-routing-check.cjs"
```

The temporary scripts are local diagnostics, not repository dependencies.

## Baseline results before the explicit motion override

Desktop, phone, landscape, reduced-motion, and resize checks returned HTTP 200 with no runtime errors or overflow. The first stem is visible at 0.5 seconds. The sequence finishes in eighteen seconds. The normal phone final and reduced-motion image matched. Reduced motion produced identical pixels and no animation callbacks during a 1.5-second observation. Resize preserved the partial reveal.

Instrumented frame-interval 95th percentiles were 16.7 ms on desktop and 16.8 ms on phone and landscape. These use simulated viewports on this Windows machine, not physical phone benchmarks. WebGL readback was preserved for diagnostic regional sampling. Canvas backing memory alone was approximately 5–5.5 MiB; this excludes textures and driver allocations.

Forced no-WebGL, context loss, and a missing arrival map each displayed the static artwork without runtime exceptions. Actual hidden-tab behavior could not be checked because headless Chromium kept both tabs visible; cancellation and active-time preservation were inspected in source.

All seven public assets returned HTTP 200 from `astralflowers.shin86.dev`. SHA-256 hashes matched the local files. A fresh browser rendered the new photographic material with no errors. The original p5.js source files remain unchanged.
