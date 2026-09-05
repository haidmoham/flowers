# Astral Flowers

A wordless 3D bouquet of luminous flowers in a celestial field.
Live at <https://astralflowers.shin86.dev>.

The default bouquet pairs rose with lilac. Continuous petal rims emit colored
light through a broad, soft edge gradient. A diffuse halo surrounds the blooms.
Warm pollen and low surface reflection keep the centers quiet.

Run `python -m http.server 4187` from the repository root. Open
`http://127.0.0.1:4187/astral/`.

## Interaction

Drag the bouquet to turn it. Scroll to zoom. Touch a bloom to awaken its light.
Stems grow first. The buds open in sequence over fifteen seconds of playback.
The sprout-and-arrow icon replays the bloom and resumes motion. It keeps the
selected colors and camera angle. Pause stops both growth and ambient motion.
The flower symbol opens the picker. A large flower selects the main blooms.
A small cluster selects the companions. Choose a specimen, a custom color, or
one of three pairings. No visible copy appears in the scene or picker.
Opening the picker settles the bouquet so every color choice has a full preview.

Arrow keys rotate the focused canvas. Home resets the view. Enter awakens the
flowers. Space toggles motion. Escape closes the picker and restores focus.
Every icon and color choice has an accessible name. The owner's full-playback
preference starts the scene in motion. The pause control is always available.
Control transitions respect reduced motion. Hidden tabs do not run the animation loop.

## Renderer

- `garden.js`: scene, perspective camera, stars, orbital paths, animation,
  pointer controls, and the wordless picker.
- `botany.js`: merged petal geometry, curved stems, leaves, instanced pollen,
  and the shader that adds living veins and luminous detail.
- `vendor/`: pinned Three.js 0.185.1, its MIT license, and local post-processing
  passes. The runtime makes no third-party asset requests.
- `still.webp`: a still render of this scene for browsers without WebGL 2.

Each whole bloom uses either the main or companion material. Pollen and stems
have separate materials. Color selection does not use a flat bouquet image or
an image-space mask. The old botanical artwork and mask remain historical
assets. The complete previous scene is preserved in `../studies/ivory-botanical/`.

Read the [rendering research](../docs/celestial-rendering-research.md) for sources,
stack choices, effect boundaries, and verification. The artwork uses original
geometry and shaders. It contains no Avatar film assets.

## Verify

```sh
node --check astral/garden.js
node --check astral/botany.js
git diff --check
node studies/celestial/check-scene.cjs
node studies/celestial/check-bloom.cjs
```

Run from the repository root. The browser check requires Playwright, or a
`PLAYWRIGHT_PATH` environment variable pointing to an installed module. It
accepts a live URL as the first argument. `?inspect` enables read-only scene
measurements for this check. Ordinary visits do not expose diagnostics.

## Deploy

Deploy this directory through the existing Vercel project:

```sh
npx vercel@59.11.7 --prod --yes --scope zarnab
```

The established Cloudflare adapter also forwards the stable Vercel alias to
`astralflowers.mhaider.dev`. No routing changes are required for a scene update.
