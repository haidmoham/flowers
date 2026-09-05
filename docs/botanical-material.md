# Botanical material

Historical study: the active artwork now uses 3D geometry. This source and
its palette mask remain in `studies/ivory-botanical/` and as archived assets
in `astral/`. The implementation notes below describe the earlier renderer.

Generated on 2026-09-05 with the built-in imagegen tool. The user requested real
flowers as inspiration for Astral Flowers. Tracking: [issue 6](https://github.com/haidmoham/flowers/issues/6).

## References and decisions

- [Hollingsworth Peonies: Coral Charm](https://hollingsworthpeonies.com/product/coral-charm/)
  informed the cupped, semi-double focal flower and its visible centre.
- [Floret: ranunculus varieties](https://s3.amazonaws.com/kajabi-storefronts-production/sites/14614/themes/577851/downloads/EBpaX4IyTCOsY1QaYh6U_Floret-How-To-Grow-Ranunculus.pdf)
  informed closely layered petals.
- [Floret: cosmos](https://www.floretflowers.com/crazy-for-cosmos/)
  informed lighter companion flowers and open centres.
- [American Dahlia Society: forms](https://www.dahlia.org/wp-content/uploads/2018/02/UnderstandingDahliaForms.pdf)
  informed the compact, repeated petal structure of decorative dahlias.

The source is generated botanical artwork, not a photograph or a cultivar
identification guide. It interprets these flower forms in the existing astral
composition. No reference photographs were copied into the asset.

## Integration

[material-botanical.webp](../astral/material-botanical.webp) is the active source.
It is 1122 × 1402 pixels and 220,240 bytes. The generated PNG was encoded as WebP
without resizing. [material.webp](../astral/material.webp) remains available as
the earlier artwork. The preload, renderer, and static fallback use the new file.

Ripple anchors follow the new flower centres. The existing bloom arrival field
remains a soft artistic reveal. Petal colours retain the requested reference
palette. A source-aligned palette mask preserves foliage and pollen. Picker
specimens use the same mask and pigment function as the bouquet.

## Petal ownership correction

[Issue 7](https://github.com/haidmoham/flowers/issues/7) replaces the earlier
overlapping ellipses. Those regions crossed the new petal boundaries and mixed
the two selected colours within individual flowers.

`astral/petal-mask.png` stores disjoint main and companion coverage in its red
and green channels. Black retains the native source. The generator at
`studies/botanical/generate-petal-mask.py` traces touching bloom contours and
refines their seams with source pigment. Flower envelopes exclude stems and
paper. Separate centre data retains pollen and the darker central structures.
The generator does not change the botanical artwork. It requires Pillow, NumPy,
and SciPy; the deployed page has no new runtime dependency.

Each texel belongs to at most one colour group. Browser texture interpolation
antialiases the narrow boundary. The previous broad colour blend and vertical
fade are removed. The lowest flowers now accept their complete chosen shade.
The main group contains the focal peony, coral dahlia, upper right ranunculus,
lower apricot ranunculus, and coral buds. The pink flowers and lowest magenta
bud form the companion group. Re-author the mask if the material changes.

## Exact generation prompt

Use case: precise-object-edit. Image 1 is the edit target: the source material for the Astral Flowers interactive bouquet. Change the flower morphology to be inspired by REAL FRESH FLOWERS. Keep the portrait 4:5 composition, plain uniform warm ivory #f6efe4 background, flower centre positions, overall size of each flower, and the gathered stems reaching the lower edge. Preserve exquisite fine detail, ethereal backlit translucency, a graceful asymmetrical bouquet, and the delicate astral aesthetic. Replace the skeletal leaf-like membranes with recognisable fresh botanical petals: the large central bloom is a coral semi-double peony, with rounded cupped silky petals and a believable small golden stamen centre; upper-right/top bloom is a ruffled magenta cosmos with a yellow centre, in the same exact location; left companion is a layered pink ranunculus; back and lower companion blooms use small decorative dahlias and ranunculus with spiralled petal layers. Use living rounded petals, natural radial growth, gentle curls, rich dimensional folds, fine real petal striations, and sparse healthy green stems and small leaves. Flower positions in normalized image coordinates: main at (.51,.48), left (.25,.32), upper middle (.43,.27), top (.62,.18), right (.77,.43), lower left (.27,.58), lower right (.74,.57), small lower (.44,.67), lowest right (.68,.73). Keep three small buds close to their existing source positions. Strong flower pigments: coral red #d34a32, warm magenta #ad3e70, soft coral accents #f2a27d, occasional natural gold centres. The flowers must look fresh, soft, and full of life, with tangible petals, not dried, brittle, skeletal, leaf-shaped, metallic, neon, or lace. The image remains an original ethereal botanical artwork inspired by real blossoms, not a generic florist stock photo. Separate clear flower silhouettes on the flat ivory background. Do not add a vase, wrapping, hands, words, frame, ornaments, halos, stars, drop shadows, or extra scenery. Output a single clean high-resolution portrait source asset.
