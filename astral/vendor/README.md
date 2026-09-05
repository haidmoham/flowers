# Renderer dependencies

Three.js 0.185.1, MIT licensed. `LICENSE` preserves the upstream license.
`three.module.min.js` and `three.core.min.js` are unmodified upstream builds.
`effects.js` bundles EffectComposer, RenderPass, UnrealBloomPass, and OutputPass
from that version. Rebuild with `studies/celestial/build-effects.cjs`.
Set `THREE_PACKAGE_ROOT` to the installed Three.js package and `ESBUILD_PATH`
to the installed esbuild module if they are not on the normal module path.
The site loads all dependencies from its own origin.
