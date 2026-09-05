# Living celestial flowers

Research and implementation: 2026-09-05. [Issue 8](https://github.com/haidmoham/flowers/issues/8).

The user replaced the ivory autumn direction with a fully 3D, luminous astral
scene. The new reference is the living science-fiction flora associated with
Avatar. This implementation uses original geometry and shaders. It uses no film
assets. The user then confirmed that the entire visible experience must be wordless.

## Stack decision

Use JavaScript ES modules, Three.js 0.185.1, WebGL 2, and a small local bundle
of Three.js post-processing passes. The current site needs no React runtime,
TypeScript compiler, application framework, remote texture service, or model loader.
All rendering dependencies load from the same origin. The MIT license ships
beside the pinned dependency files.

The [Three.js renderer guide](https://threejs.org/manual/en/webgpurenderer)
describes WebGPURenderer as the newer path. It supports WebGPU with a WebGL 2
fallback and uses TSL for material and post-processing nodes. The same guide
still recommends WebGLRenderer for applications that target WebGL 2. Custom
GLSL and EffectComposer do not transfer directly to the WebGPU stack.

For this scene, WebGLRenderer is a deliberate scope choice. The effects fit
its maintained material and post-processing APIs. WebGPU/TSL is a future option
if the scene needs compute simulation or more advanced subsurface effects.
This is an engineering decision, not a benchmark claiming WebGL is faster.

## Effects and primary sources

| Visual job | Implementation | Source |
| --- | --- | --- |
| Flowers with real depth | Curved petal surfaces merge into one geometry per flower form. Blooms occupy different depths. Curved tube stems and shaped leaves connect them. | [BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html) |
| Luminous organic detail | Petal UV coordinates follow root-to-tip growth. A GLSL material extension adds narrow emissive veins, scattered luminous points, and a slow travelling light cycle. | [MeshStandardMaterial emissive properties](https://threejs.org/docs/pages/MeshStandardMaterial.html) |
| Iridescent surfaces | MeshPhysicalMaterial supplies sheen, modest clearcoat, and view-dependent iridescence. Colored directional lights establish volume. This is stylized thin-petal lighting, not a full subsurface scattering simulation. | [MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html) |
| Light spilling into darkness | RenderPass produces the scene in an HDR target. UnrealBloomPass extracts bright values and blurs them. OutputPass applies final tone mapping and color conversion. The threshold keeps the background and most petal surfaces crisp. | [UnrealBloomPass](https://threejs.org/docs/pages/UnrealBloomPass.html), [official bloom example](https://threejs.org/examples/webgl_postprocessing_unreal_bloom.html) |
| Depth and living atmosphere | Spatial stars, floating pollen points, and tilted orbital curves surround the bouquet. Procedural noise on a large sphere supplies a dim nebula. Tiny flower motion and a touch pulse provide a response. | [Points](https://threejs.org/docs/pages/Points.html), [ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html) |
| Bounded rendering work | Merge petals by flower form. Instance the pollen beads. Limit device pixel ratio. Dispose temporary specimen render targets. Stop the animation loop in hidden tabs. | [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices), [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) |

Bloom is threshold-based across the HDR scene. It does not redraw a separate
object-selection layer. The bright pollen and emissive petal detail supply the
energy. The first render lit the petal bodies too evenly. Lower surface lighting
and smoother petal folds made the luminous detail easier to distinguish.

## Gradual bloom and softer light

The follow-up in [issue 9](https://github.com/haidmoham/flowers/issues/9)
restores the bouquet's growth sequence. Stems reveal indexed tube segments.
Leaves scale up as growth reaches each attachment. Each bud follows its stem
tip. Petals interpolate from a closed shape to the open shape over 4.2 seconds.
Eight separate start times produce a settled bouquet within fifteen seconds.

The [BufferGeometry morph attributes](https://threejs.org/docs/pages/BufferGeometry.html)
store closed positions and normals once. Each [Mesh](https://threejs.org/docs/pages/Mesh.html)
has its own morph weight. JavaScript advances the weights; the GPU interpolates
the vertices and normals. No geometry arrays are rebuilt during playback.
Tube draw ranges reveal existing triangles. These are runtime JavaScript and
WebGL operations. TypeScript types would provide compile-time checks only.

Replay retains colors and camera state. Camera reset does not restart growth.
Pause and hidden tabs freeze the sequence. Opening the picker completes the
bouquet so palette choices always affect a complete preview.

Softer light comes from lower directional intensity, lower pollen emission,
quieter vein and edge emission, higher petal roughness, and lower specular
intensity. Bloom strength is 0.3, radius 0.8, and threshold 0.5. The wider blur
and lower strength retain a modest halo without the previous hot centers.

`studies/celestial/check-bloom.cjs` controls the browser frame scheduler and
checks six stages, morph weights, staggered opening, pause, replay, and picker
completion. The production scene exposes no animation-control test hook.

## Diffused light and romantic color

The user rejected the first soft-light pass because it made the flowers look
dim and removed the romantic mood. [Issue 10](https://github.com/haidmoham/flowers/issues/10)
replaces that treatment with continuous emissive petal rims, soft edge gradients,
and a rose-lilac default pairing. Warm amber-rose and mint-blue remain available.

The reference is the user's description of muted aesthetic LED strips. The
[Philips Hue strip range](https://www.philips-hue.com/en-us/products/smart-light-strips)
describes uniform light, smooth effects, and direct and indirect light. The
adaptation is continuous colored emission surrounded by diffuse light. It is
a visual interpretation, not a simulation of a specific LED product.

The petal shader measures distance to its UV border. A narrow smooth rim and
a broader gradient emit the selected color. A separate color uniform keeps
this emission independent of the low base material emission. Both uniforms
refer to the same mutable Three.js Color, so picker changes remain immediate.
The shader runs on the GPU. JavaScript updates its uniforms at runtime;
TypeScript annotations, if added later, would only check these data types.

The user then requested lower brightness with all other design choices kept.
Petal emission now has a 0.72 multiplier. Bloom strength is 0.30, radius 0.72,
and threshold 0.24. These supersede
the first soft-light settings above. The [Three.js bloom pass](https://threejs.org/docs/pages/UnrealBloomPass.html)
combines blurred mip levels. This lets the luminous rim and surrounding halo
have different visual widths. Material roughness is 0.82, metalness is zero,
and specular intensity is 0.2. Pollen emission is 0.28 in a warm peach hue.
The previous dense vein and point pattern is replaced by faint broad veins.

The visual review compares the previous desktop and phone render with the new
default, three pairings, and a side view. `capture-light.cjs` records the three
pairings when `SCENE_SCREENSHOTS` names an output directory. Existing scene
and bloom checks continue to verify behavior and rendering bounds.

## Color ownership and wordless selection

Each complete petal mesh uses either the main material or the companion material.
Changing one color changes that material only. No screen-space region or image
mask can cross into another flower when the scene rotates.

The picker represents the main group with one large flower and the companion
group with a small cluster. All eight choices use rendered specimens of the
active group. Their geometry and material function match the scene. The fixed
cache holds at most sixteen specimens. Custom shades are rendered on demand
and their render targets are disposed. Centers and stems use separate materials.

There are no visible words. Buttons retain accessible names, selected states,
and keyboard focus. The canvas describes drag, arrow-key, Home, Enter, and
Space controls to assistive technology. The owner's existing full-playback
preference starts the scene in motion. The viewer can pause it. A still render supplies the wordless
fallback when WebGL 2 is unavailable.

## JavaScript and TypeScript boundary

The current code is JavaScript. Objects, typed arrays, event handlers, and
Three.js methods execute in the browser. GLSL executes on the GPU. A future
TypeScript annotation could check flower roles and geometry data during a build,
but it would not add runtime geometry or lighting. The choice of JavaScript
does not prevent these WebGL effects.

## Verification

`studies/celestial/check-scene.cjs` verifies geometry depth, independent material
ownership, rotation, reset, touch response, pause, presets, custom colors,
specimen cache bounds, viewport fit, a wordless interface, same-origin assets,
and the unsupported-WebGL fallback. Run it with `PLAYWRIGHT_PATH` pointing at
an installed Playwright module. Its optional first argument is the live URL.

The check bounds the full render at fewer than 150 draw calls and 180,000
triangles, including post-processing. These are measured complexity bounds,
not a claim of a fixed frame rate on every GPU. Screenshots at front and side
angles provide the visual check that geometry and light remain readable.
