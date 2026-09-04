/* global p5 */

const PAPER = '#F6EFE4';
const CHARCOAL = '#332C29';
const COLORS = {
  coral: '#E97862', blush: '#EAB0A2', butter: '#EBC64B',
  cornflower: '#829DD2', cream: '#F3E3BC', magenta: '#C05D83',
  lavender: '#A89BC7', green: '#779064', deepGreen: '#4F704F'
};

let flowers = [];
let stems = [];
let leaves = [];
let paperTexture;
let sceneScale = 1;
let sceneX = 0;
let sceneY = 0;
let startedAt = 0;
// Intentional exception: this private gift always plays its restrained motion.
const reducedMotion = false;
let pointer = { x: 0, y: 0, active: false };
let seed = 74319;
let revealMode = 'bloom';
let modeControlsWired = false;

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('bouquet');
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  frameRate(60);
  buildGarden();
  startedAt = millis();
  wireModeControls();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildGarden();
  startedAt = millis();
}

function wireModeControls() {
  if (modeControlsWired) return;
  const controls = document.querySelectorAll('[data-mode="bloom"], [data-mode="ripple"]');
  controls.forEach(control => control.addEventListener('click', () => setRevealMode(control.dataset.mode)));
  modeControlsWired = true;
  updateModeControls();
}

function setRevealMode(mode) {
  if (mode !== 'bloom' && mode !== 'ripple') return;
  revealMode = mode;
  updateModeControls();
  startedAt = millis();
  if (reducedMotion) redraw();
}

function updateModeControls() {
  document.querySelectorAll('[data-mode="bloom"], [data-mode="ripple"]').forEach(control => {
    control.setAttribute('aria-pressed', String(control.dataset.mode === revealMode));
  });
}

function buildGarden() {
  sceneScale = Math.min(width / 900, height / 960);
  const tallMobile = width < 650 && height / width > 1.15;
  sceneX = tallMobile ? width * 0.015 : Math.max(width * 0.16, (width - 720 * sceneScale) * 0.42);
  sceneY = tallMobile ? height - 1360 * sceneScale : Math.max(10, height * 0.035);
  const random = makeRandom(seed);

  flowers = [];
  stems = [];
  leaves = [];
  paperTexture = makePaperTexture();
  const focus = {
    x: (width * (tallMobile ? .37 : .36) - sceneX) / sceneScale,
    y: (height * (tallMobile ? .63 : .64) - sceneY) / sceneScale
  };
  const physicalUnit = Math.min(width, height) / 644;
  const massScale = tallMobile ? 1.3 : 1.45;
  const at = (dx, dy, radius, extra) => ({
    x: focus.x + dx * massScale * physicalUnit / sceneScale,
    y: focus.y + dy * massScale * physicalUnit / sceneScale,
    r: radius * massScale * physicalUnit / sceneScale,
    petals: 6,
    ...extra
  });
  const specs = [
    // Back-to-front layers make a dense gathered bouquet rather than an evenly spaced fan.
    at(-38, -28, 58, { state: 'side', angle: -.46, palette: [COLORS.lavender, COLORS.cornflower], pigment: .92, lineAlpha: 172, delay: 3.92, sway: 1.16 }),
    at(42, -32, 60, { state: 'open', angle: .25, palette: [COLORS.butter, COLORS.cream], pigment: .98, lineAlpha: 184, delay: 4.14, sway: 1.34 }),
    at(55, 28, 55, { state: 'side', angle: 1.13, palette: [COLORS.magenta, COLORS.blush], pigment: .9, lineAlpha: 168, delay: 4.36, sway: 1.42 }),
    at(-78, -57, 50, { state: 'open', angle: -.82, palette: [COLORS.coral, COLORS.blush], pigment: .82, lineAlpha: 154, delay: 5.9, sway: 1.06 }),
    at(-85, 28, 52, { state: 'side', angle: -.12, palette: [COLORS.lavender, COLORS.cream], pigment: .78, lineAlpha: 146, delay: 6.12, sway: 1.08 }),
    at(-18, 64, 45, { state: 'partial', angle: -1.25, palette: [COLORS.cream, COLORS.butter], pigment: .72, lineAlpha: 137, delay: 6.34, sway: 1.02 }),
    at(92, 64, 42, { state: 'partial', angle: -.32, palette: [COLORS.cornflower, COLORS.lavender], pigment: .66, lineAlpha: 128, delay: 6.56, sway: 1.04 }),
    at(110, -8, 43, { state: 'side', angle: .72, palette: [COLORS.magenta, COLORS.blush], pigment: .72, lineAlpha: 139, delay: 6.78, sway: 1.12 }),
    at(12, -88, 45, { state: 'partial', angle: .34, palette: [COLORS.butter, COLORS.cream], pigment: .7, lineAlpha: 133, delay: 8.1, sway: 1.08 }),
    at(-116, 68, 29, { state: 'partial', angle: -1.15, palette: [COLORS.cream, COLORS.blush], pigment: .52, lineAlpha: 105, delay: 8.32, sway: .86 }),
    at(130, 84, 26, { state: 'partial', angle: -.25, palette: [COLORS.cornflower, COLORS.lavender], pigment: .48, lineAlpha: 98, delay: 8.54, sway: .9 }),
    at(-50, -122, 29, { state: 'bud', angle: -1.42, palette: [COLORS.coral, COLORS.cream], pigment: .48, lineAlpha: 106, delay: 8.76, sway: .86 }),
    at(56, -119, 26, { state: 'bud', angle: -1.1, palette: [COLORS.butter, COLORS.cream], pigment: .43, lineAlpha: 96, delay: 8.98, sway: .8 }),
    at(-128, -5, 27, { state: 'partial', angle: -1.7, palette: [COLORS.lavender, COLORS.blush], pigment: .44, lineAlpha: 92, delay: 10.3, sway: .78 }),
    at(134, 20, 22, { state: 'bud', angle: -.8, palette: [COLORS.coral, COLORS.blush], pigment: .4, lineAlpha: 86, delay: 10.52, sway: .74 }),
    at(-24, 105, 27, { state: 'partial', angle: -1.1, palette: [COLORS.cream, COLORS.butter], pigment: .43, lineAlpha: 92, delay: 10.75, sway: .8 }),
    at(94, -86, 28, { state: 'partial', angle: .18, palette: [COLORS.cornflower, COLORS.cream], pigment: .48, lineAlpha: 100, delay: 10.99, sway: .86 }),
    // The warm hero is drawn last, visibly nested in the thick central cluster.
    at(0, 0, 80, { state: 'open', angle: -1.08, palette: [COLORS.coral, COLORS.blush], pigment: 1.14, lineAlpha: 225, delay: 3.7, sway: 1.8 })
  ];

  specs.forEach((spec, i) => {
    const flower = makeFlower(spec, i, random);
    flowers.push(flower);
    paintFlowerWash(flower, random);
  });

  // Stem starts stay tightly gathered under the flower mass, so the marks read as a bouquet.
  const stemTargets = [0, 1, 2, 4, 5, 7, 9, 12, 17].map(index => {
    const flower = flowers[index];
    return [flower.x, flower.y + flower.r * .18];
  });
  stemTargets.forEach((target, i) => stems.push(makeStem(target[0], target[1], i, random, focus.x)));
  makeLeaves(random);
}

function makePaperTexture() {
  const g = createGraphics(width, height);
  g.pixelDensity(1);
  g.clear();
  const random = makeRandom(seed + 901);
  const fibers = Math.min(260, Math.max(108, Math.floor(width * height / 5100)));
  g.strokeWeight(.42);
  for (let i = 0; i < fibers; i++) {
    const x = random(width);
    const y = random(height);
    const length = random(5, 22);
    const edgeBias = random() < .48;
    const edgeX = random() < .5 ? random(width * .12) : width - random(width * .12);
    const edgeY = random() < .5 ? random(height * .12) : height - random(height * .12);
    const ink = i % 4 === 0 ? [151, 122, 91, random(4, 11)] : [255, 252, 242, random(5, 12)];
    g.stroke(...ink);
    g.line(edgeBias ? edgeX : x, edgeBias ? edgeY : y, (edgeBias ? edgeX : x) + length, (edgeBias ? edgeY : y) + random(-.7, .7));
  }
  g.noStroke();
  const context = g.drawingContext;
  const glow = context.createRadialGradient(width * .48, height * .46, Math.min(width, height) * .18, width * .48, height * .46, Math.max(width, height) * .82);
  glow.addColorStop(0, 'rgba(189, 154, 113, 0)');
  glow.addColorStop(1, 'rgba(177, 137, 93, 0.062)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
  const cornerRadius = Math.min(width, height) * .36;
  [[0, 0], [width, 0], [0, height], [width, height]].forEach(([x, y]) => {
    const corner = context.createRadialGradient(x, y, 0, x, y, cornerRadius);
    corner.addColorStop(0, 'rgba(138, 101, 72, 0.048)');
    corner.addColorStop(1, 'rgba(138, 101, 72, 0)');
    context.fillStyle = corner;
    context.fillRect(0, 0, width, height);
  });
  [height * .335, height * .665].forEach(y => {
    g.stroke(157, 118, 83, 12);
    g.strokeWeight(.85);
    g.line(0, y - 1.4, width, y + random(-1.8, 1.8));
    g.stroke(255, 252, 240, 12);
    g.strokeWeight(.72);
    g.line(0, y + 1.2, width, y + random(-1.4, 1.4));
  });
  g.stroke(164, 125, 91, 5);
  g.strokeWeight(.58);
  g.line(width * .515, 0, width * .508, height);
  g.noStroke();
  g.fill(143, 104, 76, 5);
  g.ellipse(width * .1, height * .72, width * .16, height * .055);
  g.ellipse(width * .88, height * .25, width * .12, height * .042);
  g.fill(255, 251, 241, 7);
  g.ellipse(width * .22, height * .2, width * .19, height * .048);
  return g;
}

function makeFlower(spec, index, random) {
  const angles = lilyAngles(spec, random);
  const contours = angles.map((angle, i) => makeLilyTepal(spec, angle, i, random));
  return {
    ...spec,
    index,
    contours,
    tepalAngles: angles,
    center: { x: spec.x, y: spec.y },
    stamens: makeStamens(spec, random),
    throatMarks: makeThroatMarks(spec, random),
    bloomDeposits: makeBloomDeposits(spec, angles, random),
    ripple: makeRippleProfile(spec, random)
  };
}

function makeBloomDeposits(spec, angles, random) {
  return angles.map((angle, index) => {
    const distance = spec.r * random(.3, .58);
    const rx = spec.r * random(.52, .76);
    const ry = spec.r * random(.2, .34);
    const profile = [];
    for (let point = 0; point < 14; point++) profile.push(random(.84, 1.13) + sin(point * 1.73 + index) * .055);
    return {
      x: spec.x + cos(angle) * distance,
      y: spec.y + sin(angle) * distance,
      angle,
      rx,
      ry,
      profile
    };
  });
}

function makeRippleProfile(spec, random) {
  const count = Math.floor(random(24, 37));
  const lobes = Math.floor(random(3, 6));
  const phase = random(TWO_PI);
  const secondaryPhase = random(TWO_PI);
  const profile = [];
  for (let i = 0; i < count; i++) {
    const angle = TWO_PI * i / count;
    profile.push(
      sin(angle * lobes + phase) * random(.032, .074) +
      sin(angle * (lobes + 1) + secondaryPhase) * random(.012, .032)
    );
  }
  const ringInks = [];
  const ringWidths = [];
  const ringSpreads = [];
  for (let i = 0; i < 3; i++) {
    const tint = color(spec.palette[i % spec.palette.length]);
    const alpha = random(8, 26);
    ringInks.push({ r: tint.levels[0], g: tint.levels[1], b: tint.levels[2], alpha });
    ringWidths.push(random(.8, 1.2));
    ringSpreads.push(random(.82, 1.18));
  }
  return { count, lobes, phase, profile, ringInks, ringWidths, ringSpreads, delays: [.03, .16, .29] };
}

function lilyAngles(spec, random) {
  if (spec.state === 'bud') return [-0.28, 0, 0.28].map(a => spec.angle + a + random(-0.05, 0.05));
  if (spec.state === 'partial') return [-1.02, -0.64, -0.28, 0.12, 0.5, 0.88].map(a => spec.angle + a + random(-0.07, 0.07));
  if (spec.state === 'side') return [-2.05, -1.3, -0.58, 0.08, 0.72, 1.38].map(a => spec.angle + a + random(-0.1, 0.1));
  return [0, 1, 2, 3, 4, 5].map(i => spec.angle + i * TWO_PI / 6 + random(-0.1, 0.1));
}

function makeLilyTepal(spec, angle, index, random) {
  const path = [];
  const isBud = spec.state === 'bud';
  const isPartial = spec.state === 'partial';
  const length = spec.r * (isBud ? random(1.7, 2.12) : isPartial ? random(1.12, 1.46) : random(1.15, 1.58));
  const width = spec.r * (isBud ? random(.14, .21) : isPartial ? random(.23, .31) : random(.31, .43));
  const recurved = spec.r * (isBud ? random(-.08, .1) : random(-.3, .3));
  const normal = { x: cos(angle + HALF_PI), y: sin(angle + HALF_PI) };
  const axis = { x: cos(angle), y: sin(angle) };
  for (let side = 1; side >= -1; side -= 2) {
    for (let j = 0; j <= 26; j++) {
      const t = side === 1 ? j / 26 : 1 - j / 26;
      const forward = length * (t + sin(t * PI) * (isBud ? .04 : .09));
      const curve = sin(PI * t) * recurved + sin(t * PI * 2 + index) * spec.r * .035;
      const taper = sin(PI * t) * width * (1 - t * .22);
      const notch = t > .88 ? (t - .88) * spec.r * .16 : 0;
      path.push({
        x: spec.x + axis.x * forward + normal.x * (curve + side * (taper - notch)),
        y: spec.y + axis.y * forward + normal.y * (curve + side * (taper - notch))
      });
    }
  }
  return path;
}

function makeStamens(spec, random) {
  if (spec.state === 'bud') return [];
  const filaments = [];
  for (let i = 0; i < 5; i++) {
    const a = spec.angle + (i - 2) * random(.13, .25) + random(-.08, .08);
    const start = { x: spec.x + random(-4, 4), y: spec.y + random(-4, 4) };
    const tip = { x: spec.x + cos(a) * spec.r * random(.75, 1.08), y: spec.y + sin(a) * spec.r * random(.75, 1.08) };
    const control = { x: lerp(start.x, tip.x, .52) + cos(a + HALF_PI) * random(-12, 12), y: lerp(start.y, tip.y, .52) + sin(a + HALF_PI) * random(-12, 12) };
    filaments.push({ points: sampleQuadratic(start, control, tip, 20), tip });
  }
  return filaments;
}

function makeThroatMarks(spec, random) {
  if (spec.state === 'bud') return [];
  return Array.from({ length: 6 }, (_, i) => {
    const a = spec.angle + (i - 2.5) * .34 + random(-.08, .08);
    return [
      { x: spec.x + cos(a) * spec.r * .13, y: spec.y + sin(a) * spec.r * .13 },
      { x: spec.x + cos(a) * spec.r * random(.34, .48), y: spec.y + sin(a) * spec.r * random(.34, .48) }
    ];
  });
}

function makeCenter(spec, random) {
  const dots = [];
  for (let i = 0; i < 14; i++) {
    const a = random(TWO_PI);
    const d = random(spec.r * 0.06, spec.r * 0.28);
    dots.push({ x: spec.x + cos(a) * d, y: spec.y + sin(a) * d, r: random(1.8, 4.2) });
  }
  return dots;
}

function paintFlowerWash(flower, random) {
  const washSize = Math.max(72, Math.ceil(flower.r * sceneScale * 4));
  const g = createGraphics(washSize, washSize);
  g.pixelDensity(1);
  g.clear();
  g.noStroke();
  g.blendMode(MULTIPLY);
  flower.wash = g;
  flower.washSize = washSize;
  const cx = washSize / 2;
  const cy = washSize / 2;
  for (let petal = 0; petal < flower.tepalAngles.length; petal++) {
    const a = flower.tepalAngles[petal] + random(-0.07, 0.07);
    for (let layer = 0; layer < 5; layer++) {
      const rr = flower.r * sceneScale * random(0.49, 0.7);
      const length = flower.state === 'bud' ? random(.75, 1.2) : random(.64, 1.1);
      const ox = cos(a) * rr * length + random(-4, 4);
      const oy = sin(a) * rr * length + random(-4, 4);
      const col = color(flower.palette[layer % flower.palette.length]);
      col.setAlpha(Math.min(89, (layer === 0 ? random(13, 25) : random(25, 45)) * flower.pigment));
      g.fill(col);
      irregularWash(g, cx + ox, cy + oy, rr * random(.88, 1.35), rr * random(.26, .44), a, random);
    }
  }
  for (let layer = 0; layer < 3; layer++) {
    const col = color(flower.palette[layer % flower.palette.length]);
    col.setAlpha(Math.min(89, random(42, 76) * flower.pigment));
    g.fill(col);
    irregularWash(g, cx + random(-4, 4), cy + random(-4, 4), flower.r * sceneScale * random(0.22, 0.38), flower.r * sceneScale * random(0.2, 0.33), random(TWO_PI), random);
  }
}

function irregularWash(g, x, y, rx, ry, angle, random) {
  g.beginShape();
  for (let n = 0; n <= 22; n++) {
    const t = (TWO_PI * n) / 22;
    const tremor = random(0.76, 1.18) + sin(n * 2.13 + angle) * 0.08;
    const px = cos(t) * rx * tremor;
    const py = sin(t) * ry * tremor;
    g.vertex(x + px * cos(angle) - py * sin(angle), y + px * sin(angle) + py * cos(angle));
  }
  g.endShape(CLOSE);
}

function makeStem(x, y, index, random, rootCenter) {
  const rootX = rootCenter + random(-52, 52) / sceneScale;
  const rootY = (height - sceneY) / sceneScale + random(42, 88) / sceneScale;
  const c1 = { x: rootX + random(-38, 38) / sceneScale, y: rootY - random(130, 220) / sceneScale };
  const c2 = { x: x + random(-74, 74) / sceneScale, y: y + random(86, 170) / sceneScale };
  return {
    points: sampleCubic({ x: rootX, y: rootY }, c1, c2, { x, y }, 72),
    delay: index * 0.11,
    alpha: index < 7 ? random(125, 170) : random(72, 112),
    weight: index % 4 === 0 ? 1.45 : random(.84, 1.18)
  };
}

function makeLeaves(random) {
  const placements = [
    [0, .42, -1], [0, .61, 1], [1, .56, 1], [2, .68, -1], [3, .44, -1],
    [3, .63, 1], [4, .55, -1], [5, .41, 1], [6, .57, -1], [7, .59, 1], [8, .47, -1]
  ];
  placements.forEach(([stemIndex, t, side], index) => {
    const stem = stems[stemIndex];
    const at = stem.points[Math.floor(t * (stem.points.length - 1))];
    const after = stem.points[Math.min(stem.points.length - 1, Math.floor(t * (stem.points.length - 1)) + 2)];
    const angle = atan2(after.y - at.y, after.x - at.x) + side * random(0.75, 1.13);
    const length = random(31, 61);
    leaves.push({
      x: at.x, y: at.y, angle, length, width: length * random(0.23, 0.34),
      delay: 2.18 + stemIndex * 0.075 + index * 0.03, path: makeLeafPath(at.x, at.y, angle, length, random)
    });
  });
}

function makeLeafPath(x, y, angle, length, random) {
  const tip = { x: x + cos(angle) * length, y: y + sin(angle) * length };
  const normal = { x: cos(angle + HALF_PI), y: sin(angle + HALF_PI) };
  const curve = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const bulge = sin(PI * t) * length * random(0.20, 0.28);
    curve.push({ x: lerp(x, tip.x, t) + normal.x * bulge, y: lerp(y, tip.y, t) + normal.y * bulge });
  }
  for (let i = 20; i >= 0; i--) {
    const t = i / 20;
    const bulge = sin(PI * t) * length * random(0.18, 0.25);
    curve.push({ x: lerp(x, tip.x, t) - normal.x * bulge, y: lerp(y, tip.y, t) - normal.y * bulge });
  }
  return curve;
}

function sampleCubic(a, b, c, d, count) {
  const points = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const mt = 1 - t;
    points.push({
      x: mt * mt * mt * a.x + 3 * mt * mt * t * b.x + 3 * mt * t * t * c.x + t * t * t * d.x,
      y: mt * mt * mt * a.y + 3 * mt * mt * t * b.y + 3 * mt * t * t * c.y + t * t * t * d.y
    });
  }
  return points;
}

function sampleQuadratic(a, b, c, count) {
  const points = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const mt = 1 - t;
    points.push({
      x: mt * mt * a.x + 2 * mt * t * b.x + t * t * c.x,
      y: mt * mt * a.y + 2 * mt * t * b.y + t * t * c.y
    });
  }
  return points;
}

function draw() {
  background(PAPER);
  image(paperTexture, 0, 0, width, height);
  const elapsed = reducedMotion ? 10 : (millis() - startedAt) / 1000;
  const lean = pointerLean();

  push();
  translate(sceneX, sceneY);
  scale(sceneScale);
  drawStems(elapsed, lean);
  drawLeaves(elapsed, lean);
  drawFlowers(elapsed, lean);
  pop();
}

function drawStems(elapsed, lean) {
  stems.forEach((stem, index) => {
    const reveal = revealAt(elapsed, stem.delay, 1.35);
    const stemColor = color(index % 3 === 0 ? COLORS.deepGreen : COLORS.green);
    stemColor.setAlpha(stem.alpha);
    stroke(stemColor);
    strokeWeight(stem.weight);
    noFill();
    drawLeaningSampled(stem.points, reveal, index, lean);
  });
}

function drawLeaves(elapsed, lean) {
  leaves.forEach((leaf, i) => {
    const reveal = revealAt(elapsed, leaf.delay, 0.56);
    const leafColor = color(i % 3 === 0 ? COLORS.deepGreen : COLORS.green);
    leafColor.setAlpha(i < 7 ? 138 : 100);
    stroke(leafColor);
    strokeWeight(1.05);
    noFill();
    drawLeaningSampled(leaf.path, reveal, i + 2, lean);
    if (reveal > 0.52) drawLeaningSegment(leaf.path[0], leaf.path[Math.floor(leaf.path.length * 0.5)], (reveal - .52) / .48, i + 2, lean);
  });
}

function drawFlowers(elapsed, lean) {
  flowers.forEach(flower => {
    const contourReveal = revealAt(elapsed, flower.delay, 2.3);
    const pigmentReveal = revealAt(elapsed, flower.delay + 2.3, 0.72);
    const stamenReveal = revealAt(elapsed, flower.delay + 2.38, 0.52);
    if (contourReveal <= 0) return;
    const sway = flowerSway(flower, elapsed, lean);
    if (pigmentReveal > 0) {
      const washSize = flower.washSize / sceneScale;
      if (revealMode === 'ripple') {
        if (reducedMotion) {
          image(flower.wash, flower.x + sway.x - washSize / 2, flower.y + sway.y - washSize / 2, washSize, washSize);
        } else {
          drawRippleWash(flower, sway, pigmentReveal, washSize);
        }
      } else {
        drawBloomWash(flower, sway, pigmentReveal, washSize);
      }
    }

    push();
    translate(sway.x, sway.y);
    const flowerInk = color(CHARCOAL);
    flowerInk.setAlpha(flower.lineAlpha);
    stroke(flowerInk);
    strokeWeight(0.72);
    noFill();
    flower.contours.forEach((path, i) => drawSampled(path, constrain(contourReveal * 2 - i * 0.2, 0, 1)));
    if (revealMode === 'ripple' && !reducedMotion && pigmentReveal > 0) drawRippleRings(flower, pigmentReveal);
    if (stamenReveal > 0) {
      strokeWeight(0.64);
      flower.stamens.forEach((stamen, i) => {
        drawSampled(stamen.points, constrain(stamenReveal * 1.45 - i * 0.1, 0, 1));
        if (stamenReveal > 0.74 + i * 0.035) {
          noStroke();
          const anther = color(i % 2 ? COLORS.butter : CHARCOAL);
          anther.setAlpha(flower.lineAlpha);
          fill(anther);
          ellipse(stamen.tip.x, stamen.tip.y, 2.1, 4.7);
          noFill();
          stroke(flowerInk);
        }
      });
      strokeWeight(0.82);
      flower.throatMarks.forEach((mark, i) => drawSampled(mark, constrain(stamenReveal * 1.6 - i * 0.1, 0, 1)));
    }
    pop();
  });
}

function drawBloomWash(flower, sway, progress, washSize) {
  drawingContext.save();
  drawingContext.beginPath();
  for (let i = 0; i < flower.bloomDeposits.length; i++) {
    const depositProgress = constrain((progress - i * .09) / .52, 0, 1);
    if (depositProgress > 0) addBloomDepositPath(flower, sway, flower.bloomDeposits[i], depositProgress);
  }
  drawingContext.clip();
  image(flower.wash, flower.x + sway.x - washSize / 2, flower.y + sway.y - washSize / 2, washSize, washSize);
  drawingContext.restore();
}

function addBloomDepositPath(flower, sway, deposit, progress) {
  const scaleAmount = .3 + .7 * easeOut(progress);
  for (let i = 0; i < deposit.profile.length; i++) {
    const theta = TWO_PI * i / deposit.profile.length;
    const irregularity = deposit.profile[i];
    const localX = cos(theta) * deposit.rx * scaleAmount * irregularity;
    const localY = sin(theta) * deposit.ry * scaleAmount * irregularity;
    const x = deposit.x + sway.x + localX * cos(deposit.angle) - localY * sin(deposit.angle);
    const y = deposit.y + sway.y + localX * sin(deposit.angle) + localY * cos(deposit.angle);
    if (i === 0) drawingContext.moveTo(x, y);
    else drawingContext.lineTo(x, y);
  }
  drawingContext.closePath();
}

function drawRippleWash(flower, sway, progress, washSize) {
  const ripple = flower.ripple;
  const eased = 1 - pow(1 - progress, 2.35);
  const radius = flower.r * (.11 + 1.72 * eased);
  drawingContext.save();
  drawingContext.beginPath();
  for (let i = 0; i < ripple.count; i++) {
    const angle = TWO_PI * i / ripple.count;
    const edge = radius * (1 + ripple.profile[i] * (.9 - progress * .35));
    const x = flower.x + sway.x + cos(angle) * edge;
    const y = flower.y + sway.y + sin(angle) * edge;
    if (i === 0) drawingContext.moveTo(x, y);
    else drawingContext.lineTo(x, y);
  }
  drawingContext.closePath();
  drawingContext.clip();
  image(flower.wash, flower.x + sway.x - washSize / 2, flower.y + sway.y - washSize / 2, washSize, washSize);
  drawingContext.restore();
}

function drawRippleRings(flower, pigmentReveal) {
  const ripple = flower.ripple;
  blendMode(MULTIPLY);
  noFill();
  for (let ring = 0; ring < 3; ring++) {
    const progress = constrain((pigmentReveal - ripple.delays[ring]) / .66, 0, 1);
    if (progress <= 0) continue;
    const eased = ring === 0 ? 1 - pow(1 - progress, 2.5) : ring === 1 ? sin(progress * HALF_PI) : 1 - pow(1 - progress, 1.65);
    const radius = flower.r * (.18 + (1.05 + ring * .22) * eased * ripple.ringSpreads[ring]);
    const offset = Math.floor(ripple.count * (ring + 1) / 9);
    const ink = ripple.ringInks[ring];
    stroke(ink.r, ink.g, ink.b, ink.alpha * sin(PI * progress));
    strokeWeight(ripple.ringWidths[ring]);
    beginShape();
    for (let i = 0; i < ripple.count; i++) {
      const angle = TWO_PI * i / ripple.count;
      const edge = radius * (1 + ripple.profile[(i + offset) % ripple.count] * (1.25 - progress * .35));
      vertex(flower.x + cos(angle) * edge, flower.y + sin(angle) * edge);
    }
    endShape(CLOSE);
  }
  blendMode(BLEND);
}

function drawLeaningSampled(points, amount, index, lean) {
  if (amount <= 0 || points.length < 2) return;
  const stop = Math.max(1, Math.floor((points.length - 1) * Math.min(1, amount)));
  beginShape();
  for (let i = 0; i <= stop; i++) {
    const point = points[i];
    vertex(point.x + stemLean(point, index, lean), point.y);
  }
  if (stop < points.length - 1) {
    const a = points[stop];
    const b = points[stop + 1];
    const fraction = ((points.length - 1) * amount) - stop;
    const ax = a.x + stemLean(a, index, lean);
    const bx = b.x + stemLean(b, index, lean);
    vertex(lerp(ax, bx, fraction), lerp(a.y, b.y, fraction));
  }
  endShape();
}

function drawLeaningSegment(a, b, amount, index, lean) {
  if (amount <= 0) return;
  const fraction = Math.min(1, amount);
  const ax = a.x + stemLean(a, index, lean);
  const bx = b.x + stemLean(b, index, lean);
  line(ax, a.y, lerp(ax, bx, fraction), lerp(a.y, b.y, fraction));
}

function drawSampled(points, amount) {
  if (amount <= 0 || points.length < 2) return;
  const stop = Math.max(1, Math.floor((points.length - 1) * Math.min(1, amount)));
  beginShape();
  for (let i = 0; i <= stop; i++) vertex(points[i].x, points[i].y);
  if (stop < points.length - 1) {
    const a = points[stop];
    const b = points[stop + 1];
    const f = ((points.length - 1) * amount) - stop;
    vertex(lerp(a.x, b.x, f), lerp(a.y, b.y, f));
  }
  endShape();
}

function revealAt(elapsed, delay, duration) {
  return constrain((elapsed - delay) / duration, 0, 1);
}

function easeOut(t) {
  return 1 - pow(1 - t, 3);
}

function flowerSway(flower, elapsed, lean) {
  if (reducedMotion) return { x: 0, y: 0 };
  const phase = elapsed * (0.72 + flower.index * .035) + flower.index * 1.71;
  const localLean = nearLean(flower.x, flower.y, lean);
  return {
    x: sin(phase) * flower.sway + localLean * (1.7 + flower.sway * .2),
    y: cos(phase * 1.13) * 0.36
  };
}

function stemLean(point, index, lean) {
  if (reducedMotion) return 0;
  const upperness = constrain((1150 - point.y) / 900, 0, 1);
  const micro = sin(millis() * .00072 + index * 2.31 + point.y * .006) * upperness * (0.6 + (index % 3) * .23);
  return micro + nearLean(point.x, point.y, lean) * upperness * 1.25;
}

function pointerLean() {
  if (!pointer.active || reducedMotion) return { x: 0, y: 0 };
  return { x: (pointer.x - sceneX) / sceneScale, y: (pointer.y - sceneY) / sceneScale };
}

function nearLean(x, y, lean) {
  const dx = lean.x - x;
  const dy = lean.y - y;
  const distance = sqrt(dx * dx + dy * dy);
  if (distance > 230) return 0;
  return constrain((-dx / 230) * (1 - distance / 230) * 2.4, -2.2, 2.2);
}

function pointerMoved() {
  pointer = { x: mouseX, y: mouseY, active: true };
}

function mouseOut() {
  pointer.active = false;
}

function touchMoved() {
  if (touches.length) pointer = { x: touches[0].x, y: touches[0].y, active: true };
  return false;
}

function touchEnded() {
  pointer.active = false;
  return false;
}

function makeRandom(initial) {
  let value = initial >>> 0;
  return (min = 1, max) => {
    value = (value * 1664525 + 1013904223) >>> 0;
    const unit = value / 4294967296;
    return max === undefined ? unit * min : min + unit * (max - min);
  };
}
