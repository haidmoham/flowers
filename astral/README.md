# Astral Flowers

A wordless astral bouquet of translucent flower forms on warm ivory. The
original p5.js artwork remains at the repository root.

Run it from the repository root with `python -m http.server 4173`, then open `http://127.0.0.1:4173/astral/`.

The reveal follows gathered stems, then a coral centre, overlapping companion
clusters, peripheral buds, and loose fibres. The sequence
finishes in eighteen seconds. A soft aura and sparse dust continue their slow
light cycle. The colour symbol opens a wordless palette. No interaction is required.

## Palette and composition

`sis1` starts with apricot orange (`#e99b7c`) and carnation pink (`#d990a6`). Three other
presets offer moon, dawn, and natural source colours. The split swatches select
presets. The opposing arrows cycle them. Two native colour wells set any custom
pair. The circular arrow replays the reveal. Escape or an outside press closes
the panel. All control names are accessible labels; no words appear on the page.

The shader preserves the source veins and folds while recolouring broad flower
groups. Custom colours affect the petals and aura. The lower gathered stems
retain their source colours. Choices reset to `sis1` on reload.

The p5.js reference contributes an uneven cluster, a dominant central bloom,
loose peripheral buds, and fine curved traces. A slight tilt and three satellite
buds open the composition. Faint elliptical traces and quiet dust supply depth.
The colours share the source shading to feel like carnation pigment. Flare rays
and spectral highlights are removed. The photographic material remains unchanged.

The owner explicitly requests full playback regardless of reduced-motion settings
for this private, single-viewer piece. It pauses its animation loop in hidden tabs.
It contains no visible copy, external asset requests, runtime dependencies, or analytics.

## Material

The material image was generated with ImageGen and refined for supple membranes,
uneven folds, warm rose throats, and exposed fibres. It is a generated artwork,
not a photograph of physical flowers. The deployed WebP is approximately 259 KB.

An authored arrival map follows individual petal and stem routes. A WebGL shader
reveals pixels from that map. Local contrast subtly varies the timing.
The map is precomputed; page startup performs no procedural map generation.
The editable generator remains in `../studies/clustered-exposure/generate-arrival.js`.
WebGL failure displays the original static image and hides the unavailable palette.

The [current direction](../docs/next-study.md) records the choice between studies.
Earlier paper, thread, and procedural membrane studies remain outside deployment.

## Deployment

Deploy this directory to the Vercel project `astralflowers`:

```sh
npx vercel@59.11.7 --prod --yes
```

Live at <https://astralflowers.shin86.dev>.
The custom domain is verified. <https://astralflowers.vercel.app> is the Vercel alias.

The same artwork is also served at <https://astralflowers.mhaider.dev> through
the Cloudflare Worker in `../deploy/`. It follows the stable Vercel alias, so
future production updates reach both domains. Deploy the routing adapter from
the repository root with `npx wrangler@4.129.0 deploy --config deploy/mhaider.json`.
The adapter accepts GET and HEAD. It does not forward cookies or authorization.

## Verification

```sh
node --check astral/garden.js
git diff --check
```

Browser validation covers the reveal, viewport changes, forced playback, and
desktop and phone layouts. There is no build step.
