// Run with PLAYWRIGHT_PATH set to an installed Playwright module, or install it locally.
// Optional first argument: deployed URL. The local server must serve the repo root.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const samples = {
  main: [[449,195],[482,319],[407,393],[421,493],[558,450],[733,588],
    [378,654],[402,755],[615,865],[798,420],[916,557],[467,932],[506,1034],[966,713]],
  companion: [[596,148],[797,231],[308,334],[350,464],[220,525],
    [225,693],[304,832],[365,891],[845,744],[910,842],[712,1063],[795,1153],[704,962]],
  native: [[575,649],[698,268],[535,1275],[615,1208],[448,240]],
};

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1402 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    // Freeze time and retain the last frame for deterministic pixel inspection.
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, options) {
        return getContext.call(this, kind, kind === 'webgl'
          ? { ...options, preserveDrawingBuffer: true } : options);
      };
      const get = WebGLRenderingContext.prototype.getUniformLocation;
      const set = WebGLRenderingContext.prototype.uniform1f;
      const names = new Map();
      WebGLRenderingContext.prototype.getUniformLocation = function (program, name) {
        const location = get.call(this, program, name);
        names.set(location, name);
        return location;
      };
      WebGLRenderingContext.prototype.uniform1f = function (location, value) {
        return set.call(this, location, names.get(location) === 'time' ? 21 : value);
      };
    });
    await page.goto(process.argv[2] || 'http://127.0.0.1:4187/studies/ivory-botanical/');
    await page.waitForFunction(() => document.querySelector('.role-flower').src.startsWith('data:'));
    await page.addStyleTag({ content: '.palette,.reveal-modes{visibility:hidden!important}' });
    const setColours = async (a, b) => {
      await page.evaluate(([a,b]) => {
        for (const [id, value] of [['a',a],['b',b]]) {
          const input = document.querySelector('#colour-' + id);
          input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, [a,b]);
      await page.waitForTimeout(60);
      return page.evaluate(samples => {
        const canvas = document.querySelector('canvas');
        const gl = canvas.getContext('webgl');
        const height = innerHeight * .9, tilt = -.13;
        return Object.fromEntries(Object.entries(samples).map(([role, points]) => [role, points.map(([x,y]) => {
          const qx = x/1122, qy = y/1402;
          const tx = (qx-.5-Math.sin(qy*5)*.018)*1122/1402, ty = qy-.5;
          const px = Math.round(innerWidth*.48+(Math.cos(tilt)*tx-Math.sin(tilt)*ty)*height);
          const py = Math.round(innerHeight*.48+(Math.sin(tilt)*tx+Math.cos(tilt)*ty)*height);
          const pixel = new Uint8Array(4);
          gl.readPixels(px, canvas.height-1-py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
          return [...pixel].slice(0,3);
        })]));
      }, samples);
    };
    const baseline = await setColours('#164eff', '#f21e35');
    const changeA = await setColours('#f2d524', '#f21e35');
    const changeB = await setColours('#164eff', '#24ceef');
    const delta = (a,b) => Math.max(...a.map((v,i) => Math.abs(v-b[i])));
    for (const [role, points] of Object.entries(samples)) {
      points.forEach((point,i) => {
        const da = delta(baseline[role][i],changeA[role][i]);
        const db = delta(baseline[role][i],changeB[role][i]);
        // One RGB step permits the deliberately shared, faint aura behind translucent edges.
        assert.ok(role === 'main' ? da > 20 && db <= 1
          : role === 'companion' ? db > 20 && da <= 1 : da <= 1 && db <= 1,
          `${role} at ${point}: main delta ${da}, companion delta ${db}`);
      });
    }
    await setColours('#164eff', '#f21e35');
    if (process.env.REGION_SCREENSHOT) await page.screenshot({ path: process.env.REGION_SCREENSHOT });
    assert.deepEqual(errors, []);
    console.log('32 source-anchored petal, overlap, bud, pollen, and foliage samples pass.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
