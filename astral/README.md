# Astral Flowers

A wordless clustered bouquet of translucent flower forms on warm ivory. The
original p5.js artwork remains at the repository root.

Run it from the repository root with `python -m http.server 4173`, then open `http://127.0.0.1:4173/astral/`.

The reveal follows gathered stems, then a coral centre, overlapping companion
clusters, peripheral buds, and loose fibres. The sequence
finishes in eighteen seconds, then rests. Reload to watch it again.
No interaction is required.

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
WebGL failure displays a static image.

The [current direction](../docs/next-study.md) records the choice between studies.
Earlier paper, thread, and procedural membrane studies remain outside deployment.

## Deployment

Deploy this directory to the Vercel project `astralflowers`:

```sh
npx vercel@59.11.7 --prod --yes
```

Live at <https://astralflowers.shin86.dev>.
The custom domain is verified. <https://astralflowers.vercel.app> is the Vercel alias.

## Verification

```sh
node --check astral/garden.js
git diff --check
```

Browser validation covers the reveal, viewport changes, forced playback, and
desktop and phone layouts. There is no build step.
