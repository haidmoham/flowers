# Clustered ivory bouquet validation

## Light level adjustment

Checked on 2026-09-05. Deployment: `dpl_HKcHawJRt65RjBsaKfKUxQftQhy9`.
At the user's request, petal emission was reduced by 28 percent and bloom
strength changed from 0.38 to 0.30. Palette, geometry, motion, and controls
are unchanged. The desktop render and live phone render were inspected.
The fallback image was updated. Syntax and diff checks pass. All ten active
production assets return HTTP 200 and match local bytes.

## Romantic diffused light

Checked on 2026-09-05. Deployment: `dpl_HNiF7AJNAda9uhY9RGer517Ev6ik`.
Tracking: [issue 10](https://github.com/haidmoham/flowers/issues/10).

The default bouquet now pairs rose with lilac. Continuous petal rims emit
colored light through soft edge gradients. HDR bloom produces the surrounding
halo. Dim warm pollen and low specular reflection retain the flower centers
and petal folds. The palette controls still own independent complete meshes.

The visual review compared the previous and new desktop and phone renders.
It also covered the rose-lilac, mint-blue, and amber-rose pairings, a side view,
the phone picker, and the bloom sequence. The new renders have visible colored
halos and continuous luminous edges. The previous renders had mostly dark
surfaces and fine veins. This is a visual judgment; romantic mood remains a
matter of user taste.

Local and live scene and bloom checks pass at desktop and phone sizes with no
runtime errors or overflow. The full scene remains within 80 draw calls
and 140,586 triangles. Geometry and bloom timing are unchanged. The fallback
image was regenerated. All ten active production assets return HTTP 200 and
match local bytes. Syntax and diff checks pass. Git landing remains paused.

## Gradual bloom and softer light

Checked on 2026-09-05. Deployment: `dpl_C9Z9hn8XfWATzqawkKywETRCAR7L`.
Tracking: [issue 9](https://github.com/haidmoham/flowers/issues/9).

The bouquet grows curved stems, then opens eight buds in sequence. All petals
settle by fifteen seconds of active playback. The new wordless replay control
retains colors and camera angle. Lower pollen emission, quieter veins, less
specular reflection, and a wider low-strength bloom soften the light.

`check-bloom.cjs` passes locally and on the live custom domain. Six measured
stages at 0, 2, 4, 7, 11, and 15 seconds confirm stem growth, staggered opening,
and independent mesh morph weights. Replay resets growth and resumes motion.
Pause freezes growth. Camera reset preserves growth. Opening the picker shows
the complete bouquet. Replay retains the selected palette.

Local and live scene checks pass at 1440 by 1000, 390 by 844, and 320 by 568. Front,
side, phone, picker, and six bloom-stage screenshots were inspected. The
settled render uses at most 80 draw calls and 140,586 triangles. No runtime
errors occurred. The scene remains wordless, with independent palette roles,
bounded texture memory, no horizontal overflow, and a WebGL fallback.

All ten active deployed assets return HTTP 200 and match local bytes. The
fallback image was regenerated from the softer, fully open bouquet. Syntax
and diff checks pass. Git landing remains paused; no commit or push was made.

## Wordless 3D celestial scene

Checked on 2026-09-05. Deployment: `dpl_J9NQNLRAPmAtGYv2PT7zgT1FwPWT`.
Tracking: [issue 8](https://github.com/haidmoham/flowers/issues/8).

The active scene now uses original 3D petal geometry, curved stems, instanced
pollen, emissive veins, HDR bloom, spatial stars, floating light, and orbital
paths. The previous ivory scene is preserved in `studies/ivory-botanical/`.
The user cancelled the pending Git landing before this redesign. No commit,
push, or merge was performed.

`studies/celestial/check-scene.cjs` passes locally and on production at
1440 by 1000, 390 by 844, and 320 by 568.

- Every visible control is wordless. Accessible names and selected states remain.
- Geometry depth spans 0.767 units within the main bloom. The eight flowers
  occupy several distinct depths. Front and side screenshots were inspected.
- Pointer and keyboard rotation change the rendered image. Reset, touch
  response, motion pause/resume, and Escape focus restoration pass.
- Both palette roles change complete meshes independently. Presets and custom
  shades pass. The fixed specimen cache stays at sixteen after both roles
  have been used. Custom shades do not grow texture memory.
- The picker fits every tested viewport with no horizontal overflow. The
  flower-role controls stay visible during scrolling. Reopening resets scroll.
- Runtime errors: zero in normal rendering. Disabling WebGL 2 produces the
  wordless still-image fallback and hides unavailable controls.
- Full-frame rendering uses at most 80 draw calls and 136,426 triangles in
  these checks, including post-processing. No device-independent FPS claim
  is made. Pixel ratio is bounded and hidden tabs stop their animation loop.
- All ten active runtime, fallback, and license assets return HTTP 200 and
  match local bytes. No third-party runtime requests or flat bouquet image
  requests occur in the 3D scene. Syntax and diff checks pass.

The [rendering research](celestial-rendering-research.md) records primary
sources, the WebGL 2 versus WebGPU decision, and the visual effect boundaries.

## Petal region isolation

Checked on 2026-09-05. Deployment: `dpl_7N3xm4iVYTSurbn1gz3Se6LXFhgs`.
Tracking: [issue 7](https://github.com/haidmoham/flowers/issues/7).

The source-aligned `petal-mask.png` replaces overlapping colour ellipses and
the lower-petal fade. The mask is 65,403 bytes. Each texel has at most one
nonzero palette channel. The generator asserts this invariant.

- A repeatable browser check covers 32 source-anchored pixels across main
  petals, companion petals, touching blooms, low flowers, buds, and native
  material. It changes each role independently with high-contrast colours.
  Opposite-role and native samples change by at most one RGB step; selected
  petal samples change by more than twenty. This passes locally and live.
- Separate 5 by 5 peony and cosmos centre patches stay pixel-identical when
  both selected colours change.
- Contrast screenshots and the normal desktop and phone layouts were inspected.
  Both reveal modes still settle on pixel-identical artwork at 21 seconds.
- Live desktop and phone tests pass for palette, custom shade, keyboard mode
  selection, replay, dismissal, and fallback. No runtime errors or horizontal
  overflow were found. All eight specimen previews load.
- JavaScript syntax and diff checks pass. All ten deployed assets return
  HTTP 200 and exactly match their local contents.

The mask is specific to this botanical source. A material change requires
new contours and another visual boundary check.

## Real flower inspiration

Checked on 2026-09-05. Deployment: `dpl_BHztvCTgi6K49NDr6A16KKSEhAfn`.
Tracking: [issue 6](https://github.com/haidmoham/flowers/issues/6).

The active generated material now uses peony, ranunculus, cosmos, and dahlia
forms. The previous material remains a separate asset. The renderer, preload,
picker specimens, and fallback use `material-botanical.webp` (220,240 bytes).

- Desktop and phone palette, custom shade, mode, replay, and dismissal checks
  pass without runtime errors or horizontal overflow.
- Peony and cosmos centre samples remain pixel-identical when both petal
  colours change. Foliage retention was inspected in the rendered bouquet.
- Fixed-time ripple stages were inspected. Both reveal modes settle on
  pixel-identical artwork at 21 seconds.
- Forced no-WebGL displays the static botanical artwork and hides the picker.
- JavaScript syntax and diff checks pass. The image size remains 1122 × 1402.
- All nine deployed assets return HTTP 200 and match local SHA-256 hashes.
  Live mode, keyboard, palette, and specimen-selection checks pass.

## Reference palette and ripple reveal

Checked on 2026-09-05. Deployment: `dpl_HZZGtLD8hAcySq6yLVqrT1k8CmzW`.
Tracking: [issue 5](https://github.com/haidmoham/flowers/issues/5).

The live reference supplied eight exact pigment values and the expanding
pigment motif. Ripple is the default. The mode switch also retains the original
bloom reveal. Neither mode changes `dye()` or the material texture.

- Fixed-time visual checks cover 4, 6, 9, 13, and 21 seconds.
- Canvas screenshots at 21 seconds are pixel-identical between modes with
  controls hidden. Overlapping fronts have no hard region boundaries.
- Mode buttons work with pointer and keyboard input. Exactly one mode is selected.
- Palette, custom shade, preset, replay, and dismissal checks pass at 1440 × 1000,
  390 × 844, 320 × 568, and 844 × 390. No horizontal overflow or runtime errors.
- Forced no-WebGL keeps the static artwork and hides the unavailable picker.
- JavaScript syntax and diff checks pass. The ripple field is skipped after
  18 seconds to avoid its ongoing fragment cost.
- All eight deployed assets return HTTP 200 and match local SHA-256 hashes.
  Live checks confirm both modes, keyboard selection, exact palette values,
  and specimen selection without runtime errors.

## Richer pigment and responsive flower controls

Checked on 2026-09-04. Deployment: `dpl_2oigE8e7jHwHkkkBydjhXsWZDUT6`.
The user found the previous revision too muted and stale. Eight stronger shades
and less cream in the shared shader preserve colour in the flowers. The counter
uses berry ink, fresh ivory, and accents from the selected flower. Changed
specimens lift and settle once. Reduced motion disables that response.

Desktop and phone selection, custom shades, pairings, replay, keyboard dismissal,
and fallback checks pass. The selection animation runs with normal preferences
and does not run with reduced motion. JavaScript syntax and diff checks pass.

## Bouquet flower counter and autumn frame

Checked on 2026-09-04. Production deployment: `dpl_D1q8D2BiUYEFaq4dhHX3e1tgk6sQ`.
Tracking: [issue 4](https://github.com/haidmoham/flowers/issues/4).

- JavaScript syntax and `git diff --check` pass.
- Live browser checks pass at 1440 × 1000, 390 × 844, 320 × 568, and 844 × 390.
- Selecting a specimen changes only the active main or companion colour value.
  The rendered canvas changes, and selected-state labels match the chosen shade.
- All three pairings set both colour values. Custom shades clear preset selection.
- Enter opens the counter. Escape closes it and restores trigger focus.
  Outside press, the close control, and the return control dismiss it.
- Replay closes the counter and restarts the animation clock. Opening the counter
  shows the complete bouquet for colour comparison.
- All eight specimen images render. The counter fits each viewport without
  horizontal overflow. Short screens scroll. Browser error collections are empty.
- Forced no-WebGL displays the static artwork and hides the unavailable controls.
- All eight live HTML, JavaScript, CSS, SVG, image, and metadata assets return
  HTTP 200 and match local SHA-256 hashes.
- Original root artwork files have no diff. No build step or dependency was added.

Browser checks use a temporary Playwright diagnostic script. Viewports are
simulated on this Windows machine. Physical phone testing and user taste approval
remain outside this verification. The two design-library captures are candidates.

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
