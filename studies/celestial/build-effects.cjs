// Rebuild the pinned post-processing bundle with Three.js 0.185.1 and esbuild.
const path = require('node:path');
const esbuild = require(process.env.ESBUILD_PATH || 'esbuild');
const root = process.env.THREE_PACKAGE_ROOT || path.dirname(require.resolve('three/package.json'));
esbuild.buildSync({
  stdin: { contents: ['EffectComposer', 'RenderPass', 'UnrealBloomPass', 'OutputPass']
    .map(name => `export { ${name} } from ${JSON.stringify(path.join(root, 'examples/jsm/postprocessing', name + '.js'))};`).join('\n'),
    resolveDir: __dirname, sourcefile: 'effects.js' },
  outfile: path.resolve(__dirname, '../../astral/vendor/effects.js'),
  bundle: true, format: 'esm', minify: true, external: ['three'], legalComments: 'eof',
});
