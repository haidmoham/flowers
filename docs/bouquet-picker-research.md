# Bouquet picker research

Research date: 2026-09-04. Tracking: [issue 4](https://github.com/haidmoham/flowers/issues/4).

## Floral structure

[Floret's market bouquet guide](https://www.floretflowers.com/making-market-bouquets/)
builds arrangements from focal flowers and supporting ingredients. The existing
artwork has two pigment groups. The picker names these main blooms and companions.
It does not imply that the user can add stems or change botanical species.

[Floret's arranging curriculum](https://www.floretflowers.com/workshops/flower-arranging-workshop/)
uses layering and bridging to connect colours. Three optional pairings provide
gentle starting points. Users can choose all eight shades for either group.
The pairings are authored design choices, not a claim that these are the only
correct combinations.

[Team Flower's complementary colour demonstration](https://education.teamflower.org/learn/design/ssl/video-using-complimentary-colors-in-a-minimalistic-floral-arrangement?rq=flower+frog)
shows how colour and ingredient placement work together. This supports keeping
the entire bouquet visible while changing its ingredients.

## Visual reference

The user selected [flowers.shin86.dev](https://flowers.shin86.dev) as the supporting
autumn reference. Browser inspection showed pale maple clusters, fine hanging
lines, warm mottled paper, and muted ochre and russet at the margins. The source
uses a translucent bouquet as the focal subject.

Astral Flowers adapts those relationships with original SVG leaves and curves,
a small perimeter wash, warm paper surfaces, and walnut text. The central
material and its veins remain intact. No source-site code or assets were copied.

The user found this first adaptation too muted and stale. The revision confines
the autumn restraint to the frame. It uses richer flower pigments, less cream
in the shader highlights, fresh ivory surfaces, berry text, and selected-flower
colours in the controls. A brief selection response lifts and settles the chosen
specimen. This is a response to user taste, not a change to the floral structure.

## Interaction and rendering

### Live reference palette and ripple motion

On 2026-09-05, the user requested the reference's ripple motif and actual colours.
The [live reference bundle](https://flowers.shin86.dev/assets/index-BNeeWiXq.js)
contains a flower palette and runtime corrections that differ from `sketch.js`
in this checkout. The selected values below come from that live bundle.

| Picker name | Reference pigment |
| --- | --- |
| apricot | `#f2a27d` |
| magenta | `#ad3e70` |
| coral | `#d34a32` |
| gold | `#ddb946` |
| cream | `#f2df9f` |
| violet | `#6872ad` |
| cornflower | `#557cae` |
| blush | `#e99aab` |

The reference opens pigment with slightly irregular circular masks. Each flower
has its own delay, and a faint ring fades during expansion. Astral Flowers
adapts that behavior as overlapping radial arrival fields in GLSL. The earliest
arrival wins at each pixel. This gives continuous fronts without hard boundaries.
The mode switch can also replay the original arrival map. Pixel comparison at
the same settled time confirms that both modes produce the same artwork.

Palette constants were copied at the user's request. Motion was reimplemented
for the existing WebGL renderer. No reference images or p5.js dependency were added.
The accepted pigment shading and material image are unchanged in this revision.

### Flower counter

The design library search found colour-feedback candidates, but no earned
flower picker component. This implementation is a local trial of material
specimens as controls. The invariant is shared pigment calculation between
the specimen and the applied result. The subject, crop, palette, and role labels
can change. Transient pointer trails from the source candidates do not apply.

The two role buttons make the destination explicit. Flower specimens show the
material rather than a flat swatch. Native buttons expose selected state with
`aria-pressed`; a check mark also identifies the selected shade. A status line
names the resulting combination. Opening the picker shows the full bouquet.

The source is plain JavaScript, not TypeScript. Objects, event handlers, and
`Map` run in the browser. A TypeScript type annotation would only check those
values during development; it would not draw anything. GLSL `dye()` runs on the
GPU through WebGL. The DOM button changes a colour uniform; that uniform drives
the same pigment calculation in the specimen and the bouquet. No Three.js or
TypeScript build step is required here.
