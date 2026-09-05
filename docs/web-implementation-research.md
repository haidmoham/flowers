# Web implementation research

2026-09-04. Source review of `sketch.js` and the in-progress `astral/garden.js`. Visual inspection of the supplied MOV frame at 11.5 seconds. This report proposes changes. It does not claim runtime validation of the revised artwork.

## Recommendation

Keep Canvas 2D. Build the animation around an authored sequence of ink marks and pigment deposits. Cache the material, but animate the act that exposes it. Use retained, imperfect contours and a few independent washes that cross their boundaries. The reference frame has transparent color, open petals, overlapping construction lines, and strong paper visibility. Its intimacy comes from these relationships. A more elaborate 3D renderer does not directly address them.

Canvas 2D already supports the needed composition. Pre-render repeated material to cropped canvases; use an opaque main context. These follow [Mozilla's Canvas optimization guidance](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas).

| Option | Useful capability | Decision for this piece |
| --- | --- | --- |
| Canvas 2D | Fine sampled marks, cached wash images, explicit compositing | Recommended. Existing code already has this structure. |
| SVG | Editable curves and normalized stroke reveals | Viable for an ink-only study. Dense layered pigment still needs raster treatment. |
| WebGL | Per-pixel arrival fields and many simultaneous material effects | Reserve for a measured Canvas bottleneck or a clear aesthetic need. More machinery alone does not improve the drawing. |

SVG `pathLength` calibrates distance calculations, including stroke operations. It can make a stroke reveal easier to author. It does not supply expressive pressure or pigment behavior by itself. See the [SVG 2 path specification](https://www.w3.org/TR/SVG2/paths.html).

## Concrete findings in the current source

These findings describe the dark material study preserved in `studies/sol-herbarium/garden-nervous-dark.js`. They identify issues to avoid in the next implementation.

1. **Whole-petal brightness can still jump.** `drawMaterialGrowth` draws three overlapping source-over passes with alpha weights 0.76, 0.19, and 0.05. It switches to a single full-alpha image at progress 0.995. Overlapping source-over alpha is not additive. For an opaque input and unit outer alpha, the combined coverage is about 0.815, not 1. The switch can brighten the already visible body. Actual magnitude depends on texture alpha. Use one feathered mask and one material composite, with the same limit at progress 1. This is a mathematical source finding; perceptual size is not yet measured.
2. **The drawing erases its own hesitation.** `drawPetal` reduces most contours to zero as pigment completes. Its retrace exists only while outline progress is between 0.28 and 0.96. The reference retains the searching line. Keep a selected broken contour and a short displaced correction in the final image. Do not retrace every petal.
3. **The wash front is a moving cut.** `clipToPigmentFront` sweeps a wavy vertical boundary across the local texture bounds. It is spatial, but it is not pigment spreading from a deposited mark. Use two or three irregular deposit origins per flower, with different onset times and radial profiles. The original `drawBloomWash` already contains an economical version of this idea.
4. **Surface structure still favors rendered cloth.** `makeMaterialPetal` uses diffuse/specular normals, dozens of near-parallel strands, and periodic cross threads. Lowering their alpha can soften this material, but preserves its regular organization. For watercolor, replace much of that structure with sparse edge pooling, uneven translucent coverage, and paper gaps. This is an aesthetic inference from source and reference, not a rendering defect.
5. **Readiness affects composition timing.** `bloomAt = max(delay, materialReadyAt + 0.18)` prevents late cache pop-in, but lets slow hardware change the score. The cache builds a whole petal per timeout; one expensive petal can still block a frame. Measure cold-load tasks. Prefer small work chunks that finish before the next authored reveal.
6. **Stroke speed is parameter based.** `strokeSampled` reveals by sample index. Samples taken uniformly in a Bezier parameter are not uniformly spaced in distance. Build cumulative lengths once, then advance by distance. Add intentional pauses after this correction so accidental speed changes do not stand in for expression.
7. **Low frame rates extend the score.** `frame` caps each elapsed delta at 50 ms. At sustained frame times above 50 ms, the animation runs slower than wall time. Decide this policy deliberately. A visibility-aware active clock preserves the intended duration; a capped clock preserves every drawing beat. Test the chosen behavior under throttling.

## Proposed pigment mechanism

Keep each flower in stable local coordinates. Generate all irregularity once from a seed. Store ink paths, pressure samples, pigment deposits, and timing as separate data. Avoid fresh random values in the frame loop.

For each active flower, clear a cropped scratch canvas, draw its cached wash, and apply an alpha mask with `destination-in`. Build the mask from expanding irregular deposits with feathered edges. Composite the result once onto the scene. Reuse scratch storage across flowers when drawing is sequential. At completion, use a cached settled image whose pixels match the mask endpoint. The Canvas compositing operations are specified in [Mozilla's compositing reference](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation).

Use two slow deposit fronts and one late, smaller stain rather than many equal ripples. Offset a few deposits from their ink enclosure. Keep one paper gap near a tip. Let one correction remain slightly darker where the hand returned. These are authored proposals, not claims about physical watercolor.

Curtis and colleagues model watercolor as ordered translucent glazes with shallow-water flow and pigment optics. The useful principle here is that separate deposits and their overlap create the material. A full fluid simulation is unnecessary for a fixed gift composition. Our simpler masks approximate the appearance and do not implement that physical model. See [Computer-Generated Watercolor, SIGGRAPH 1997](https://grail.cs.washington.edu/projects/watercolor/).

## Timing, memory, and validation

Use an explicit score near the user's 13-second drawing arc. First ink should appear promptly. Establish stems, then a few readable outlines, then pigment. Overlap groups without starting the entire bouquet together. Reserve a final small mark. Do not extend the duration merely to signal care.

Use the animation timestamp, not frame counts. Reset the previous timestamp after a hidden-tab pause. Browsers commonly pause animation callbacks in hidden tabs; refresh rates also vary. See [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).

Proposed engineering budgets, not browser limits: target 60 Hz with drawing work below 8 ms per frame on the test machine; flag frames above 33 ms during the reveal. Use DPR at most 2. Track every canvas backing allocation. At 390 × 844 and DPR 2, one RGBA surface is approximately 5.0 MiB; main plus full-size paper costs roughly 10.0 MiB before petals. Prefer a total tracked backing budget near 32 MiB on this phone layout. This is an estimate, not total browser or GPU memory. Keep material canvases cropped. Avoid full-frame animation atlases.

If measured cache work disrupts startup, move material generation to a worker with OffscreenCanvas or split it into smaller batches. Worker transfer is supported by the API, but adds lifecycle complexity; do not add it speculatively. See [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas). If WebGL becomes necessary, use a per-pixel memory budget and explicit resource disposal; available VRAM cannot be queried portably. See [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).

Validate a cold load at 0.5, 2, 4, 7, 10, 13, and 17 seconds. Capture the moments just before and after each material completion. Compare local changed-pixel regions, not only total bright-pixel count: a global count can hide one petal popping. Record frame intervals and supported long-task entries. Long tasks identify work of at least 50 ms, so their absence does not prove smooth 60 Hz playback. See [PerformanceLongTaskTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming).

Repeat on narrow portrait and landscape layouts. Check resize during drawing, hide/resume, reduced motion, and a slow CPU. Confirm that resize preserves the drawing state. Confirm that reduced motion resolves every late mark and stops idle animation. Inspect the final image as carefully as the reveal: permanent imperfections must remain legible after the animation ends.
