# Clustered ivory bouquet validation

## Carnation colour correction

Checked on 2026-09-04. Deployment: `dpl_DPseHx2RQ4hAEQmUrZmXv9YZL7sh`.
The user rejected the harsh colours and lens-flare treatment. `sis1` now uses
apricot and carnation pink. All tinted presets are softer. Source shading drives
the pigment, with cream highlights. Spectral sheen and flare rays are removed.
The aura, traces, and dust are reduced. Browser inspection confirms the softer
petals and a working shader. JavaScript syntax and diff checks pass.

## Wordless astral palette revision

Checked and deployed on 2026-09-04 after explicit approval for both domains.
Vercel deployment: `dpl_5qEepL2bMAqgb8733qR7S7dtD3MD`.
Cloudflare routing version: `b3f69552-9cec-4589-8ad5-4516ca9d62b2`.
Tracking: <https://github.com/haidmoham/flowers/issues/2>.

- JavaScript syntax and `git diff --check` pass.
- The original p5.js source files have no diff.
- Desktop browser inspection confirms orange/pink flower groups and retained veins.
- Preset selection, cycling, wraparound to `sis1`, and custom green/violet colours work.
- Replay returns to the beginning. Escape closes the panel and restores summary focus.
- Phone inspection at 390 × 844 confirms a working renderer, zero horizontal overflow,
  no visible words, and accessible control names. The panel fits the viewport.
- No browser warning or error was reported on the checked page.
- Both custom domains render the new artwork and wordless controls in the browser.
- The five checked HTML, script, stylesheet, material, and arrival assets on
  `astralflowers.shin86.dev` return HTTP 200 and match local SHA-256 hashes.
- Plain Python requests to the Cloudflare hostname receive error 1010. Browser
  requests succeed. No Cloudflare security setting was changed for this check.
- The no-WebGL path retains the static source artwork and hides the palette by source
  inspection. Failure injection and physical-phone performance were not tested here.

The image itself is unchanged. Palette mapping, orbital traces, ambient light, and
three peripheral buds are runtime shader operations. User taste remains the final
judge of the astral treatment.

## Previous deployed revision

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
