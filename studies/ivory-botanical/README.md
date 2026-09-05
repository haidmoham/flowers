# Ivory botanical study

A translucent astral bouquet on warm ivory with a small flower counter. The
original p5.js artwork remains at the repository root.

Run it from the repository root with `python -m http.server 4173`, then open `http://127.0.0.1:4173/studies/ivory-botanical/`.

The default ripple reveal spreads pigment outward from the blooms through
overlapping, slightly uneven fronts. Faint rings expand and fade. The bloom
switch retains the original reveal along stems and petals. Both modes finish
in eighteen seconds and settle on the same image. A soft aura and sparse dust continue their slow
light cycle. “choose your flowers” opens the flower counter. No interaction is required.

## Palette and composition

The bouquet starts with coral (`#d34a32`) and magenta (`#ad3e70`). Select main
blooms or companions, then choose one of eight flower specimens. Each selection
changes that group only. Garden warmth, blue hour, and golden hour set both groups.
A labelled native colour input lets you mix a custom shade for the active group.
Colour names describe pigments, not botanical species.

The eight exact pigment values come from the live reference at
`flowers.shin86.dev`, inspected on 2026-09-05. They include the reference's
runtime colour corrections, which differ from the older root sketch. The
botanical source preserves natural foliage and flower centres during recolouring.

Opening the counter reveals the complete bouquet so colour choices are visible.
The bouquet moves beside the counter on desktop and above it on phones. The
counter scrolls on short screens. “bloom again” closes the counter and restarts
the selected reveal. The bloom/ripple switch also restarts playback. Escape,
the close button, and “back to bouquet” restore trigger focus.
An outside press also closes the counter. Choices take effect immediately.

The flower specimens use the same GLSL `dye()` function and source material as
the bouquet. A temporary framebuffer renders each specimen. Only the eight
fixed shades are cached. Custom shades do not accumulate in the cache.

The shader preserves the source petal striations and folds while recolouring whole
blooms. `petal-mask.png` assigns each source pixel to one petal group or native
material. The red channel holds main petals. The green channel holds companions.
Linear texture sampling smooths the one-pixel seams. No broad region blends the
two choices. Custom colours affect the petals and aura. The lower gathered stems
retain their source colours. Choices reset to `sis1` on reload.

The mask generator is `../botanical/generate-petal-mask.py`. Its authored
contours apply only to the current botanical material. Update the mask when the
source changes. `../botanical/check-petal-regions.cjs` checks rendered
pixels on touching blooms, low petals, buds, pollen, and foliage.

The p5.js reference contributes an uneven cluster, a dominant central bloom,
loose peripheral buds, and fine curved traces. A slight tilt and three satellite
buds open the composition. Faint elliptical traces and quiet dust supply depth.
The colours share the source shading. Flare rays and spectral highlights remain
absent. The active material now follows real flower forms.

The owner explicitly requests full playback regardless of reduced-motion settings
for this private, single-viewer piece. It pauses its animation loop in hidden tabs.
The counter uses short lowercase labels. There are no external asset requests,
runtime dependencies, or analytics. New control transitions respect reduced motion.

The supporting autumn frame uses original SVG maple silhouettes, thin hanging
lines, and pale ochre washes. The counter uses fresh ivory, berry ink, and
accents from each selected flower. A short lift-and-settle motion acknowledges
a changed bloom; reduced-motion preferences disable it. The shared pigment
calculation retains richer colour with less cream in the highlights. It references
[flowers.shin86.dev](https://flowers.shin86.dev). See the
[bouquet picker research](../docs/bouquet-picker-research.md) for sources and decisions.

## Material

The active material was generated with the built-in imagegen tool from real
flower references: cupped peonies, layered ranunculus, open cosmos, and decorative
dahlias. It is a generated artwork, not a photograph of physical flowers.
The WebP is approximately 220 KB. The earlier membrane artwork is retained as
a separate file. The [botanical material note](../docs/botanical-material.md)
records the references, exact prompt, and asset path.

An authored arrival map follows individual petal and stem routes in bloom mode.
Ripple mode uses a continuous field of expanding fronts from source-image
coordinates. The shader takes the earliest arrival at each pixel so overlapping
waves do not create hard region boundaries. Neither mode distorts the material.
The map is precomputed; page startup performs no procedural map generation.
The editable generator remains in `../clustered-exposure/generate-arrival.js`.
WebGL failure displays the original static image and hides the unavailable palette.

The [current direction](../../docs/next-study.md) records the choice between studies.
Earlier paper, thread, and procedural membrane studies remain outside deployment.

## Archive status

This directory preserves the prior scene. It is not the production deployment
root. The active 3D artwork and deployment instructions are in `astral/`.

## Verification

```sh
node --check studies/ivory-botanical/garden.js
git diff --check
```

Browser validation covers the reveal, viewport changes, forced playback, and
desktop and phone layouts. There is no build step.
