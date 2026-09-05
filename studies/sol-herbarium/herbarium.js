(() => {
  'use strict';

  const canvas = document.querySelector('#herbarium');
  const ctx = canvas.getContext('2d', { alpha: false });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const PAPER = '#071820';
  const SILVER = '#d5d1c5';
  const GOLD = '#d4a75f';
  const PALE_GOLD = '#f1d397';
  const GREEN = '#64857a';
  const DEEP_GREEN = '#315a55';
  const palettes = {
    coral: ['#e45f52', '#ee917d', '#b83f45'],
    ochre: ['#d8aa43', '#efd27c', '#b77d31'],
    blue: ['#6f8fc5', '#9db5d3', '#465f9c'],
    violet: ['#927bb4', '#b9a4ca', '#695786'],
    wine: ['#a64e70', '#d07b91', '#713852'],
    vellum: ['#d8cdb8', '#f0e1c3', '#a99c93'],
    blush: ['#d98f8d', '#edb7a4', '#a96072']
  };

  let width = 0;
  let height = 0;
  let dpr = 1;
  let scale = 1;
  let sceneX = 0;
  let sceneY = 0;
  let paper;
  let flowers = [];
  let last = performance.now();
  let elapsed = 0;
  let pulseStarted = -100;
  let cacheGeneration = 0;
  let materialPending = 0;
  let frameRequest = 0;
  let pointer = { x: -1000, y: -1000, energy: 0, down: false };

  const flowerSpecs = [
    // Back petals form a close, irregular crown rather than an evenly spaced fan.
    { x: 388, y: 372, r: 72, state: 'side', angle: -2.58, palette: 'violet', delay: 4.9, depth: 0, root: 476, lean: -95 },
    { x: 500, y: 314, r: 78, state: 'partial', angle: -1.28, palette: 'vellum', delay: 5.2, depth: 1, root: 491, lean: -22 },
    { x: 607, y: 365, r: 72, state: 'side', angle: -0.06, palette: 'blue', delay: 5.5, depth: 2, root: 515, lean: 92 },
    { x: 338, y: 451, r: 64, state: 'partial', angle: -2.75, palette: 'blush', delay: 6.0, depth: 3, root: 465, lean: -128 },
    { x: 650, y: 466, r: 65, state: 'partial', angle: 0.16, palette: 'wine', delay: 6.3, depth: 4, root: 526, lean: 132 },
    { x: 408, y: 529, r: 76, state: 'open', angle: -0.52, palette: 'blue', delay: 4.4, depth: 5, root: 482, lean: -62 },
    { x: 584, y: 541, r: 82, state: 'side', angle: 0.41, palette: 'blush', delay: 4.65, depth: 6, root: 510, lean: 74 },
    { x: 466, y: 437, r: 91, state: 'open', angle: -0.82, palette: 'violet', delay: 3.85, depth: 7, root: 491, lean: -24 },
    { x: 557, y: 410, r: 91, state: 'open', angle: 0.13, palette: 'ochre', delay: 4.05, depth: 8, root: 505, lean: 41 },
    { x: 516, y: 524, r: 124, state: 'open', angle: -1.07, palette: 'coral', delay: 3.2, depth: 9, root: 499, lean: 7, hero: true },
    { x: 357, y: 579, r: 47, state: 'partial', angle: 2.58, palette: 'vellum', delay: 7.1, depth: 10, root: 471, lean: -109 },
    { x: 664, y: 578, r: 48, state: 'side', angle: 0.47, palette: 'blue', delay: 7.35, depth: 11, root: 529, lean: 136 },
    { x: 303, y: 282, r: 37, state: 'bud', angle: -1.88, palette: 'coral', delay: 7.6, depth: 12, root: 464, lean: -141 },
    { x: 581, y: 227, r: 34, state: 'bud', angle: -1.04, palette: 'ochre', delay: 7.9, depth: 13, root: 521, lean: 68 },
    { x: 703, y: 416, r: 31, state: 'bud', angle: -0.08, palette: 'wine', delay: 8.25, depth: 14, root: 532, lean: 156 },
    { x: 418, y: 235, r: 32, state: 'bud', angle: -1.67, palette: 'vellum', delay: 8.5, depth: 15, root: 483, lean: -67 }
  ];

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.min(width / 835, height / 940);
    if (width < 620) scale = Math.min(width / 710, height / 950);
    const centerX = width < 620 ? width * 0.5 : width * 0.44;
    const centerY = height * (width < 620 ? 0.42 : 0.52);
    sceneX = centerX - 500 * scale;
    sceneY = centerY - 500 * scale;
    paper = makePaper();
    buildFlowers();
    beginMaterialCache();
  }

  function makePaper() {
    const buffer = document.createElement('canvas');
    buffer.width = Math.round(width * dpr);
    buffer.height = Math.round(height * dpr);
    const c = buffer.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = PAPER;
    c.fillRect(0, 0, width, height);

    const random = mulberry32(74129 + Math.round(width) * 3 + Math.round(height));
    const stains = [
      [0.28, 0.25, 0.55, '#10303a', 0.22],
      [0.68, 0.62, 0.48, '#0d2632', 0.18],
      [0.48, 0.46, 0.32, '#183645', 0.12],
      [0.84, 0.16, 0.28, '#06131d', 0.26]
    ];
    stains.forEach(([x, y, radius, color, alpha]) => {
      const g = c.createRadialGradient(width * x, height * y, 0, width * x, height * y, Math.max(width, height) * radius);
      g.addColorStop(0, withAlpha(color, alpha));
      g.addColorStop(0.7, withAlpha(color, alpha * 0.32));
      g.addColorStop(1, withAlpha(color, 0));
      c.fillStyle = g;
      c.fillRect(0, 0, width, height);
    });

    // Long cotton fibers and occasional compressed threads stay fixed to the sheet.
    c.lineCap = 'round';
    const fiberCount = Math.min(2300, Math.max(700, Math.floor(width * height / 620)));
    for (let i = 0; i < fiberCount; i += 1) {
      const x = random() * width;
      const y = random() * height;
      const length = randomRangeFrom(random, 2.5, 18);
      const angle = randomRangeFrom(random, -0.13, 0.13) + (random() > 0.87 ? Math.PI / 2 : 0);
      c.strokeStyle = random() > 0.54
        ? `rgba(201, 211, 197, ${randomRangeFrom(random, 0.012, 0.045)})`
        : `rgba(0, 6, 12, ${randomRangeFrom(random, 0.025, 0.085)})`;
      c.lineWidth = randomRangeFrom(random, 0.25, 0.72);
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      c.stroke();
    }

    // Two almost-lost press marks make the surface feel handled rather than generated.
    [height * 0.337, height * 0.674].forEach((y, index) => {
      c.strokeStyle = index ? 'rgba(211, 218, 204, 0.018)' : 'rgba(0, 6, 12, 0.055)';
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(0, y);
      c.bezierCurveTo(width * 0.3, y - 1.5, width * 0.7, y + 1.2, width, y - 0.4);
      c.stroke();
    });
    return buffer;
  }

  function buildFlowers() {
    const random = mulberry32(170417);
    flowers = flowerSpecs.map((spec, index) => {
      const angles = petalAngles(spec, random);
      const flower = {
        ...spec,
        index,
        colors: palettes[spec.palette],
        phase: random() * Math.PI * 2,
        petals: angles.map((angle, petalIndex) => makePetal(spec, angle, petalIndex, random)),
        stamens: spec.state === 'bud' ? [] : makeStamens(spec, random),
        leafT: index % 3 === 1 ? [] : index % 2 ? [0.44] : [0.36, 0.56]
      };
      flower.materialPetals = flower.petals.map(() => null);
      return flower;
    });
  }

  function beginMaterialCache() {
    const generation = ++cacheGeneration;
    const order = flowers
      .flatMap(flower => flower.petals.map((petal, petalIndex) => ({ flower, petal, petalIndex })))
      .sort((a, b) => (a.flower.hero ? -100 : a.flower.delay) - (b.flower.hero ? -100 : b.flower.delay));
    materialPending = order.length;
    const renderNext = () => {
      if (generation !== cacheGeneration) return;
      const item = order.shift();
      if (!item) {
        materialPending = 0;
        if (reduceMotion.matches && !document.hidden) draw(30);
        return;
      }
      item.flower.materialPetals[item.petalIndex] = makeMaterialPetal(
        item.flower,
        item.petal,
        9127 + item.flower.index * 193 + item.petalIndex * 31
      );
      materialPending = order.length;
      if (reduceMotion.matches && !document.hidden) draw(30);
      window.setTimeout(renderNext, 0);
    };
    window.setTimeout(renderNext, 0);
  }

  function makeMaterialPetal(flower, petal, seed) {
    const random = mulberry32(seed);
    const localLight = norm3({
      x: -0.62 * Math.cos(petal.angle) - -0.34 * Math.sin(petal.angle),
      y: 0.62 * Math.sin(petal.angle) + -0.34 * Math.cos(petal.angle),
      z: 1
    });
    const localHalf = norm3({ x: localLight.x * 0.48, y: localLight.y * 0.48, z: 1 });
    const throat = hexRgb(flower.colors[2]);
    const body = hexRgb(flower.colors[0]);
    const tip = hexRgb(flower.colors[1]);
    const rows = flower.hero ? 76 : flower.state === 'bud' ? 44 : 58;
    const columns = flower.hero ? 30 : flower.state === 'bud' ? 16 : 23;

    const surface = (t, v) => {
      const taper = Math.pow(Math.max(0, Math.sin(Math.PI * t)), flower.state === 'bud' ? 0.92 : 0.69);
      const forward = petal.length * (t - (flower.state === 'bud' ? 0.035 : 0.095) * Math.pow(t, 7));
      const cross = petal.width * taper * v * (1 - 0.22 * t);
      const curlScale = flower.state === 'bud' ? 0.22 : flower.state === 'side' ? 0.78 : 1;
      const curl = (flower.r * petal.lift * Math.sin(t * Math.PI * 0.9) - flower.r * petal.fall * Math.pow(t, 5)) * curlScale;
      const ridge = petal.width * 0.58 * taper * v * v;
      const torque = flower.r * 0.15 * Math.sin(t * 4.2 + petal.index * 1.17 + flower.phase) * v * taper;
      return {
        x: forward + (petal.bend * Math.sin(Math.PI * t)) * v * 0.16,
        y: cross + petal.bend * Math.sin(Math.PI * t) * 0.18,
        z: curl + ridge + torque
      };
    };
    const angleCos = Math.cos(petal.angle);
    const angleSin = Math.sin(petal.angle);
    const rawProject = point => {
      const worldX = angleCos * point.x - angleSin * point.y;
      const worldY = angleSin * point.x + angleCos * point.y;
      const projectedX = worldX + point.z * 0.15;
      const projectedY = worldY * 0.82 - point.z * 0.62;
      return {
        x: angleCos * projectedX + angleSin * projectedY,
        y: -angleSin * projectedX + angleCos * projectedY
      };
    };
    const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (let row = 0; row <= 72; row += 1) {
      for (let column = 0; column <= 20; column += 1) {
        const point = rawProject(surface(row / 72, column / 10 - 1));
        bounds.minX = Math.min(bounds.minX, point.x);
        bounds.minY = Math.min(bounds.minY, point.y);
        bounds.maxX = Math.max(bounds.maxX, point.x);
        bounds.maxY = Math.max(bounds.maxY, point.y);
      }
    }
    const margin = 5;
    const logicalWidth = Math.ceil(bounds.maxX - bounds.minX + margin * 2);
    const logicalHeight = Math.ceil(bounds.maxY - bounds.minY + margin * 2);
    const origin = { x: margin - bounds.minX, y: margin - bounds.minY };
    const quality = Math.min(1.8, Math.max(1.35, dpr * 0.86));
    const buffer = document.createElement('canvas');
    buffer.width = Math.ceil(logicalWidth * quality);
    buffer.height = Math.ceil(logicalHeight * quality);
    const c = buffer.getContext('2d');
    c.scale(quality, quality);
    const glimmer = document.createElement('canvas');
    glimmer.width = buffer.width;
    glimmer.height = buffer.height;
    const g = glimmer.getContext('2d');
    g.scale(quality, quality);
    const project = point => {
      const raw = rawProject(point);
      return { x: origin.x + raw.x, y: origin.y + raw.y };
    };
    const normal = (t, v) => {
      const ta = surface(Math.max(0.001, t - 0.002), v);
      const tb = surface(Math.min(0.999, t + 0.002), v);
      const va = surface(t, Math.max(-1, v - 0.003));
      const vb = surface(t, Math.min(1, v + 0.003));
      let value = norm3(cross3(sub3(tb, ta), sub3(vb, va)));
      if (value.z < 0) value = { x: -value.x, y: -value.y, z: -value.z };
      return value;
    };

    // Contiguous shaded facets establish the curved translucent body.
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const t = (row + 0.5) / rows;
        const v = (column + 0.5) / columns * 2 - 1;
        const n = normal(t, v);
        const diffuse = 0.28 + Math.max(0, dot3(n, localLight)) * 0.55;
        const specular = Math.pow(Math.max(0, dot3(n, localHalf)), flower.hero ? 14 : 18);
        const centerShade = 0.1 * Math.exp(-v * v * 34) * (1 - t);
        const lightness = diffuse + specular * 0.42 - centerShade;
        const base = t < 0.42 ? mixRgb(throat, body, t / 0.42) : mixRgb(body, tip, (t - 0.42) / 0.58);
        const warm = flower.hero ? specular * 30 : specular * 18;
        const color = {
          r: base.r * lightness + warm,
          g: base.g * lightness + warm * 0.82,
          b: base.b * lightness + warm * 0.55
        };
        const a = project(surface(row / rows, column / columns * 2 - 1));
        const b = project(surface((row + 1) / rows, column / columns * 2 - 1));
        const d = project(surface(row / rows, (column + 1) / columns * 2 - 1));
        const e = project(surface((row + 1) / rows, (column + 1) / columns * 2 - 1));
        c.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${flower.state === 'bud' ? 0.72 : 0.82})`;
        c.strokeStyle = c.fillStyle;
        c.lineWidth = 0.46;
        c.beginPath();
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
        c.lineTo(e.x, e.y);
        c.lineTo(d.x, d.y);
        c.closePath();
        c.fill();
        c.stroke();
      }
    }

    // Longitudinal strands carry light through the complete curl.
    const strands = flower.hero ? 148 : flower.state === 'bud' ? 62 : 104;
    c.lineCap = 'round';
    for (let strand = 0; strand < strands; strand += 1) {
      const lane = strands === 1 ? 0 : strand / (strands - 1) * 2 - 1;
      const n = normal(0.55, lane);
      const sheen = Math.pow(Math.max(0, dot3(n, localHalf)), 6);
      const metallic = strand % 11 === 0;
      c.strokeStyle = metallic
        ? `rgba(247, 214, 157, ${0.08 + sheen * 0.36})`
        : `rgba(231, 226, 218, ${0.045 + sheen * 0.22})`;
      c.lineWidth = metallic ? 0.42 : 0.22;
      c.beginPath();
      for (let point = 0; point <= 82; point += 1) {
        const t = 0.008 + point / 82 * 0.986;
        const wander = lane + (
          Math.sin(t * 10.7 + petal.index * 0.8 + strand * 0.035) * 0.007 +
          Math.sin(t * 31 + seed) * 0.002
        ) * Math.sin(Math.PI * t);
        const q = project(surface(t, wander));
        if (point === 0) c.moveTo(q.x, q.y);
        else c.lineTo(q.x, q.y);
      }
      c.stroke();
      if (metallic || sheen > 0.24) {
        g.strokeStyle = metallic
          ? `rgba(255, 224, 169, ${0.13 + sheen * 0.44})`
          : `rgba(246, 236, 224, ${sheen * 0.24})`;
        g.lineWidth = metallic ? 0.62 : 0.34;
        g.beginPath();
        for (let point = 0; point <= 82; point += 1) {
          const t = 0.008 + point / 82 * 0.986;
          const wander = lane + (
            Math.sin(t * 10.7 + petal.index * 0.8 + strand * 0.035) * 0.007 +
            Math.sin(t * 31 + seed) * 0.002
          ) * Math.sin(Math.PI * t);
          const q = project(surface(t, wander));
          if (point === 0) g.moveTo(q.x, q.y);
          else g.lineTo(q.x, q.y);
        }
        g.stroke();
      }
    }

    // Sparse cross threads stop the surface reading as a smooth 2D gradient.
    for (let ring = 4; ring < rows - 3; ring += flower.hero ? 4 : 5) {
      const t = ring / rows;
      c.strokeStyle = `rgba(228, 218, 209, ${0.025 + random() * 0.035})`;
      c.lineWidth = 0.25;
      c.beginPath();
      for (let point = 0; point <= 36; point += 1) {
        const v = point / 36 * 2 - 1;
        const q = project(surface(t + Math.sin(v * 5 + seed) * 0.0015, v));
        if (point === 0) c.moveTo(q.x, q.y);
        else c.lineTo(q.x, q.y);
      }
      c.stroke();
    }

    // Dry pigment remains only near the throat and catches between the threads.
    for (let grain = 0; grain < (flower.hero ? 120 : 56); grain += 1) {
      const t = 0.035 + random() * 0.39;
      const v = (random() - 0.5) * 1.35;
      const q = project(surface(t, v));
      c.fillStyle = withAlpha(flower.colors[2], 0.08 + random() * 0.21);
      c.beginPath();
      c.ellipse(q.x, q.y, 0.25 + random() * 0.55, 0.35 + random() * 0.9, random() * Math.PI, 0, Math.PI * 2);
      c.fill();
    }

    // Edge light breaks naturally as the surface turns away.
    [-1, 1].forEach(side => {
      for (let row = 0; row < rows; row += 1) {
        const t = (row + 0.5) / rows;
        const glint = Math.pow(Math.max(0, dot3(normal(t, side), localHalf)), 5);
        const a = project(surface(row / rows, side));
        const b = project(surface((row + 1) / rows, side));
        c.strokeStyle = `rgba(248, 221, 177, ${0.09 + glint * 0.58})`;
        c.lineWidth = 0.62;
        c.beginPath();
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
        c.stroke();
        if (glint > 0.18) {
          g.strokeStyle = `rgba(255, 229, 184, ${glint * 0.54})`;
          g.lineWidth = 0.72;
          g.beginPath();
          g.moveTo(a.x, a.y);
          g.lineTo(b.x, b.y);
          g.stroke();
        }
      }
    });
    const edgeA = [];
    const edgeB = [];
    const ridge = [];
    for (let point = 0; point <= 88; point += 1) {
      const t = point / 88;
      edgeA.push(rawProject(surface(t, -1)));
      edgeB.push(rawProject(surface(t, 1)));
      ridge.push(rawProject(surface(t, 0)));
    }
    return {
      canvas: buffer,
      glimmer,
      width: logicalWidth,
      height: logicalHeight,
      originX: origin.x,
      originY: origin.y,
      contour: edgeA.concat(edgeB.reverse()),
      ridge
    };
  }

  function petalAngles(spec, random) {
    let angles;
    if (spec.state === 'bud') angles = [-0.28, 0, 0.28];
    else if (spec.state === 'side') angles = [-1.18, -0.61, -0.12, 0.38, 0.9, 1.36];
    else if (spec.state === 'partial') angles = [-1.6, -0.93, -0.3, 0.3, 0.9, 1.5];
    else angles = [0, 1, 2, 3, 4, 5].map(i => i * Math.PI / 3);
    return angles.map(angle => spec.angle + angle + randomRangeFrom(random, -0.075, 0.075));
  }

  function makePetal(spec, angle, index, random) {
    const bud = spec.state === 'bud';
    const side = spec.state === 'side';
    return {
      angle,
      length: spec.r * randomRangeFrom(random, bud ? 1.7 : side ? 1.05 : 1.15, bud ? 2.05 : side ? 1.5 : 1.58),
      width: spec.r * randomRangeFrom(random, bud ? 0.13 : 0.25, bud ? 0.21 : 0.39),
      bend: spec.r * randomRangeFrom(random, -0.18, 0.2),
      notch: randomRangeFrom(random, 0.01, 0.1),
      lift: randomRangeFrom(random, spec.hero ? 0.42 : 0.38, spec.hero ? 0.58 : 0.64),
      fall: randomRangeFrom(random, spec.hero ? 0.18 : 0.2, spec.hero ? 0.38 : 0.5),
      washShift: randomRangeFrom(random, -0.12, 0.14),
      alpha: randomRangeFrom(random, 0.74, 1),
      index
    };
  }

  function makeStamens(spec, random) {
    return Array.from({ length: 5 }, (_, index) => {
      const angle = spec.angle + (index - 2) * randomRangeFrom(random, 0.17, 0.27) + randomRangeFrom(random, -0.08, 0.08);
      const length = spec.r * randomRangeFrom(random, 0.64, 1.02);
      return { angle, length, bend: randomRangeFrom(random, -0.16, 0.16), bright: index === 1 || (spec.hero && index === 3) };
    });
  }

  function stemCurve(flower, pos) {
    const canvasBottom = (height - sceneY) / scale;
    const unevenEnd = (flower.index % 4) * 13 + (flower.root - 495) * 0.22;
    return {
      a: { x: flower.root + (flower.index % 3 - 1) * 2.8, y: canvasBottom + 24 + unevenEnd },
      b: { x: flower.root + flower.lean * 0.08, y: 848 },
      c: { x: pos.x - flower.lean * 0.5, y: pos.y + 165 },
      d: { x: pos.x, y: pos.y + flower.r * 0.14 }
    };
  }

  function flowerPosition(flower, time) {
    if (reduceMotion.matches) return { x: flower.x, y: flower.y };
    const breath = Math.sin(time * 0.27 + flower.phase) * (flower.hero ? 0.7 : 1.1);
    const influence = pointerInfluence(flower.x, flower.y);
    return {
      x: flower.x + breath + influence.x * (0.8 + flower.depth * 0.025),
      y: flower.y + Math.cos(time * 0.21 + flower.phase) * 0.38 + influence.y * 0.22
    };
  }

  function pointerInfluence(x, y) {
    if (pointer.energy < 0.005) return { x: 0, y: 0 };
    const dx = x - pointer.x;
    const dy = y - pointer.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 245) return { x: 0, y: 0 };
    const force = (1 - distance / 245) * pointer.energy;
    return { x: (dx / (distance || 1)) * force * 4.2, y: (dy / (distance || 1)) * force * 2.1 };
  }

  function draw(time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(paper, 0, 0, width, height);
    ctx.save();
    ctx.translate(sceneX, sceneY);
    ctx.scale(scale, scale);
    flowers.forEach(flower => drawStem(flower, time));
    flowers.forEach(flower => drawLeaves(flower, time));
    flowers.forEach(flower => drawFlower(flower, time));
    drawBinding(time);
    ctx.restore();
    drawEdgeTone();
  }

  function drawStem(flower, time) {
    const progress = smoothstep(0, 1, (time - flower.index * 0.055) / 3.1);
    if (progress <= 0) return;
    const pos = flowerPosition(flower, time);
    const curve = stemCurve(flower, pos);
    ctx.save();
    ctx.fillStyle = 'transparent';
    ctx.lineCap = 'round';
    ctx.setLineDash([1300]);
    ctx.lineDashOffset = 1300 * (1 - progress);
    stemPath(curve);
    ctx.strokeStyle = withAlpha(DEEP_GREEN, 0.62);
    ctx.lineWidth = flower.hero ? 1.55 : 1.05;
    ctx.stroke();
    stemPath(curve);
    ctx.strokeStyle = withAlpha(GREEN, 0.42);
    ctx.lineWidth = 0.46;
    ctx.stroke();
    ctx.restore();
  }

  function stemPath(curve) {
    ctx.beginPath();
    ctx.moveTo(curve.a.x, curve.a.y);
    ctx.bezierCurveTo(curve.b.x, curve.b.y, curve.c.x, curve.c.y, curve.d.x, curve.d.y);
  }

  function drawLeaves(flower, time) {
    if (!flower.leafT.length) return;
    const pos = flowerPosition(flower, time);
    const curve = stemCurve(flower, pos);
    flower.leafT.forEach((t, index) => {
      const progress = smoothstep(0, 1, (time - 1.55 - flower.index * 0.035 - index * 0.16) / 1.2);
      if (progress <= 0) return;
      const point = cubicPoint(curve.a, curve.b, curve.c, curve.d, t);
      const next = cubicPoint(curve.a, curve.b, curve.c, curve.d, Math.min(1, t + 0.02));
      const tangent = Math.atan2(next.y - point.y, next.x - point.x);
      const side = (flower.index + index) % 2 ? -1 : 1;
      drawLeaf(point, tangent + side * (0.72 + index * 0.14), (38 + (flower.index % 4) * 5) * progress, side, progress);
    });
  }

  function drawLeaf(point, angle, length, side, progress) {
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(angle);
    ctx.globalCompositeOperation = 'screen';
    const gradient = ctx.createLinearGradient(0, 0, length, 0);
    gradient.addColorStop(0, withAlpha(GREEN, 0.28 * progress));
    gradient.addColorStop(0.62, withAlpha(GREEN, 0.17 * progress));
    gradient.addColorStop(1, withAlpha(GREEN, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(length * 0.3, -length * 0.22 * side, length * 0.74, -length * 0.18 * side, length, 0);
    ctx.bezierCurveTo(length * 0.73, length * 0.16 * side, length * 0.29, length * 0.2 * side, 0, 0);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = withAlpha(SILVER, 0.22 * progress);
    ctx.lineWidth = 0.56;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(length * 0.45, side * 1.3, length * 0.92, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawFlower(flower, time) {
    const pos = flowerPosition(flower, time);
    const pulse = flowerPulse(flower, time);
    ctx.save();
    ctx.translate(pos.x, pos.y);
    const microTurn = reduceMotion.matches ? 0 : Math.sin(time * 0.19 + flower.phase) * 0.006;
    ctx.rotate(microTurn);

    flower.petals.forEach((petal, index) => {
      const outline = smoothstep(0, 1, (time - flower.delay - index * 0.105) / 1.7);
      const pigment = smoothstep(0, 1, (time - flower.delay - 1.15 - index * 0.08) / 2.5);
      if (outline > 0) drawPetal(flower, petal, outline, pigment, pulse);
    });

    const center = smoothstep(0, 1, (time - flower.delay - 2.6) / 1.15);
    if (center > 0) drawCenter(flower, center, pulse);
    ctx.restore();
  }

  function petalPath(petal, expansion = 1) {
    const length = petal.length * expansion;
    const width = petal.width * expansion;
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.bezierCurveTo(
      length * 0.2, -width * 0.68,
      length * 0.68, -width * (1.02 + petal.bend / Math.max(1, length)),
      length, -width * petal.notch
    );
    ctx.bezierCurveTo(
      length * 0.75, width * (0.9 - petal.bend / Math.max(1, length)),
      length * 0.26, width * 0.77,
      -2, 0
    );
    ctx.closePath();
  }

  function drawPetal(flower, petal, outline, pigment, pulse) {
    ctx.save();
    ctx.rotate(petal.angle);
    const material = flower.materialPetals[petal.index];
    if (pigment > 0 && material) {
      ctx.save();
      ctx.globalAlpha = pigment * (flower.hero ? 1 : 0.9);
      ctx.drawImage(material.canvas, -material.originX, -material.originY, material.width, material.height);
      if (pulse > 0.005) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = pulse * (flower.hero ? 0.92 : 0.68);
        ctx.drawImage(material.glimmer, -material.originX, -material.originY, material.width, material.height);
      }
      ctx.restore();
    }

    ctx.save();
    const perimeter = petal.length * 2.65;
    const contourDeparture = smoothstep(0, 1, (pigment - 0.48) / 0.44);
    const contourAlpha = outline * (flower.state === 'bud' ? 1 - contourDeparture * 0.78 : 1 - contourDeparture);
    ctx.lineCap = 'round';
    ctx.strokeStyle = withAlpha(SILVER, (flower.hero ? 0.44 : 0.31) * petal.alpha * contourAlpha);
    ctx.lineWidth = flower.hero ? 0.88 : 0.67;
    if (material) strokeSampled(material.contour, outline);
    else {
      ctx.setLineDash([perimeter]);
      ctx.lineDashOffset = perimeter * (1 - outline);
      petalPath(petal);
      ctx.stroke();
    }
    ctx.restore();

    if (outline > 0.55) {
      const vein = smoothstep(0, 1, (outline - 0.55) / 0.45);
      ctx.strokeStyle = withAlpha(SILVER, 0.18 * vein * contourAlpha);
      ctx.lineWidth = 0.45;
      if (material) strokeSampled(material.ridge, vein);
      else {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(petal.length * 0.43, petal.bend * 0.22, petal.length * 0.88, -petal.width * petal.notch);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawCenter(flower, reveal, pulse) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const inner = ctx.createRadialGradient(0, 0, 0, 0, 0, flower.r * 0.32);
    inner.addColorStop(0, withAlpha(flower.colors[1], (0.42 + pulse * 0.16) * reveal));
    inner.addColorStop(0.35, withAlpha(flower.colors[0], 0.19 * reveal));
    inner.addColorStop(1, withAlpha(flower.colors[0], 0));
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.arc(0, 0, flower.r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    flower.stamens.forEach((stamen, index) => {
      const progress = smoothstep(0, 1, reveal * 1.45 - index * 0.1);
      if (progress <= 0) return;
      const x = Math.cos(stamen.angle) * stamen.length * progress;
      const y = Math.sin(stamen.angle) * stamen.length * progress;
      ctx.strokeStyle = withAlpha(PALE_GOLD, 0.48 * progress);
      ctx.lineWidth = 0.58;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(
        Math.cos(stamen.angle + stamen.bend) * stamen.length * 0.5,
        Math.sin(stamen.angle + stamen.bend) * stamen.length * 0.5,
        x, y
      );
      ctx.stroke();
      if (progress > 0.82) drawAnther(x, y, stamen.angle, flower.hero || stamen.bright, pulse, (progress - 0.82) / 0.18);
    });
    ctx.restore();
  }

  function drawAnther(x, y, angle, bright, pulse, reveal) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (bright) {
      ctx.globalCompositeOperation = 'screen';
      const radius = 7 + pulse * 5;
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      glow.addColorStop(0, withAlpha(PALE_GOLD, 0.68 * reveal));
      glow.addColorStop(0.18, withAlpha(GOLD, 0.2 * reveal));
      glow.addColorStop(1, withAlpha(GOLD, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = withAlpha(bright ? PALE_GOLD : GOLD, (0.76 + pulse * 0.18) * reveal);
    ctx.beginPath();
    ctx.ellipse(0, 0, bright ? 1.45 : 1.05, bright ? 3.2 : 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (bright && reveal > 0.92) {
      ctx.strokeStyle = withAlpha(PALE_GOLD, (0.28 + pulse * 0.2) * reveal);
      ctx.lineWidth = 0.42;
      ctx.beginPath();
      ctx.moveTo(-5.5, 0); ctx.lineTo(5.5, 0);
      ctx.moveTo(0, -5.5); ctx.lineTo(0, 5.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBinding(time) {
    const reveal = smoothstep(0, 1, (time - 8.4) / 2.1);
    if (reveal <= 0) return;
    const pulse = Math.max(0, 1 - Math.abs(time - pulseStarted - 0.2) / 1.2);
    ctx.save();
    ctx.setLineDash([280]);
    ctx.lineDashOffset = 280 * (1 - reveal);
    ctx.lineCap = 'round';
    ctx.strokeStyle = withAlpha(GOLD, 0.42 + pulse * 0.18);
    ctx.lineWidth = 0.82;
    ctx.beginPath();
    ctx.moveTo(463, 827);
    ctx.bezierCurveTo(483, 838, 518, 833, 537, 823);
    ctx.stroke();
    ctx.strokeStyle = withAlpha(PALE_GOLD, 0.29 + pulse * 0.15);
    ctx.lineWidth = 0.52;
    ctx.beginPath();
    ctx.moveTo(465, 835);
    ctx.bezierCurveTo(489, 824, 519, 827, 539, 837);
    ctx.moveTo(503, 830);
    ctx.bezierCurveTo(514, 844, 526, 857, 533, 875);
    ctx.moveTo(501, 831);
    ctx.bezierCurveTo(493, 846, 483, 858, 476, 872);
    ctx.stroke();
    ctx.fillStyle = withAlpha(GOLD, 0.58 + pulse * 0.18);
    ctx.beginPath();
    ctx.ellipse(502, 831, 2.8, 2.1, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function flowerPulse(flower, time) {
    const travel = (time - pulseStarted) - Math.max(0, (835 - flower.y) / 310) * 0.72;
    if (travel < 0 || travel > 1.2) return 0;
    return Math.sin(Math.PI * travel / 1.2);
  }

  function drawEdgeTone() {
    const edge = ctx.createRadialGradient(width * 0.46, height * 0.48, Math.min(width, height) * 0.3, width * 0.46, height * 0.48, Math.max(width, height) * 0.78);
    edge.addColorStop(0.55, 'rgba(1, 8, 12, 0)');
    edge.addColorStop(1, 'rgba(1, 8, 12, 0.42)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, width, height);
  }

  function frame(now) {
    frameRequest = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;
    const target = pointer.down ? 1 : 0;
    pointer.energy += (target - pointer.energy) * Math.min(1, dt * (pointer.down ? 5 : 2.6));
    draw(reduceMotion.matches ? 30 : elapsed);
    if (!document.hidden && (!reduceMotion.matches || materialPending > 0)) scheduleFrame();
  }

  function scheduleFrame() {
    if (frameRequest || document.hidden) return;
    frameRequest = requestAnimationFrame(frame);
  }

  function updatePointer(event) {
    pointer.x = (event.clientX - sceneX) / scale;
    pointer.y = (event.clientY - sceneY) / scale;
  }

  canvas.addEventListener('pointermove', event => {
    updatePointer(event);
    if (event.pointerType === 'mouse') pointer.down = true;
  });
  canvas.addEventListener('pointerdown', event => {
    updatePointer(event);
    pointer.down = true;
    pulseStarted = elapsed;
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener('pointerup', event => {
    if (event.pointerType !== 'mouse') pointer.down = false;
  });
  canvas.addEventListener('pointerleave', () => { pointer.down = false; });
  canvas.addEventListener('pointercancel', () => { pointer.down = false; });
  canvas.addEventListener('keydown', event => {
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      pulseStarted = elapsed;
    }
  });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frameRequest) {
      cancelAnimationFrame(frameRequest);
      frameRequest = 0;
      return;
    }
    last = performance.now();
    scheduleFrame();
  });
  reduceMotion.addEventListener?.('change', () => {
    elapsed = Math.max(elapsed, 30);
    last = performance.now();
    scheduleFrame();
  });

  function cubicPoint(a, b, c, d, t) {
    const u = 1 - t;
    return {
      x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
      y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y
    };
  }

  function strokeSampled(points, amount) {
    if (!points || points.length < 2 || amount <= 0) return;
    const exact = Math.min(points.length - 1, (points.length - 1) * amount);
    const stop = Math.max(1, Math.floor(exact));
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 1; index <= stop; index += 1) ctx.lineTo(points[index].x, points[index].y);
    if (stop < points.length - 1) {
      const a = points[stop];
      const b = points[stop + 1];
      const fraction = exact - stop;
      ctx.lineTo(a.x + (b.x - a.x) * fraction, a.y + (b.y - a.y) * fraction);
    }
    ctx.stroke();
  }

  function withAlpha(hex, alpha) {
    const value = hex.replace('#', '');
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
  }

  function smoothstep(min, max, value) {
    const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return t * t * (3 - 2 * t);
  }

  function mulberry32(seed) {
    return () => {
      let value = seed += 0x6D2B79F5;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function randomRangeFrom(random, min, max) {
    return min + (max - min) * random();
  }

  function hexRgb(hex) {
    const value = hex.replace('#', '');
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function mixRgb(a, b, amount) {
    return {
      r: a.r + (b.r - a.r) * amount,
      g: a.g + (b.g - a.g) * amount,
      b: a.b + (b.b - a.b) * amount
    };
  }

  function dot3(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  function sub3(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  function cross3(a, b) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  }

  function norm3(point) {
    const length = Math.hypot(point.x, point.y, point.z) || 1;
    return { x: point.x / length, y: point.y / length, z: point.z / length };
  }

  resize();
  scheduleFrame();
})();
