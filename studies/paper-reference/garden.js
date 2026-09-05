(() => {
  "use strict";
  const canvas = document.querySelector("#herbarium"),
    ctx = canvas.getContext("2d", { alpha: false });
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const PAPER = "#f5eee2",
    END = 14.4,
    TAU = Math.PI * 2;
  const clamp = (t) => Math.max(0, Math.min(1, t)),
    mix = (a, b, t) => a + (b - a) * t,
    ease = (t) => t * t * (3 - 2 * t);
  const colors = {
    coral: ["#dd7167", "#eda394", "#b64a57"],
    blue: ["#7e91c0", "#aaa8cc", "#59649a"],
    gold: ["#dcb948", "#edda92", "#b29039"],
    wine: ["#b36c8d", "#d09eac", "#913e64"],
    cream: ["#d6c58b", "#eadab0", "#a99b6b"],
    violet: ["#a296b8", "#bcb1c6", "#766783"],
  };
  // A close central gathering, with quieter and incomplete peripheral flowers.
  const specs = [
    [-42, -33, 56, "side", -0.6, "blue", 3.66, 0.82],
    [48, -47, 54, "open", 0.15, "gold", 3.91, 0.83],
    [61, 29, 54, "side", 0.96, "wine", 4.13, 0.78],
    [-83, -65, 48, "open", -0.81, "coral", 5.56, 0.69],
    [-88, 28, 49, "side", -0.23, "violet", 5.82, 0.61],
    [-21, 68, 42, "partial", -1.25, "cream", 6.05, 0.56],
    [103, 76, 35, "partial", -0.27, "blue", 6.27, 0.48],
    [116, -9, 38, "side", 0.49, "wine", 6.59, 0.63],
    [18, -108, 36, "partial", 0.35, "gold", 7.85, 0.49],
    [-123, 71, 29, "partial", -1.32, "cream", 8.13, 0.4],
    [135, 104, 19, "partial", -0.62, "blue", 8.39, 0.25],
    [-66, -145, 25, "bud", -1.65, "coral", 8.64, 0.4],
    [75, -141, 23, "bud", -1.0, "cream", 8.91, 0.31],
    [-144, -10, 25, "partial", -1.86, "violet", 10.15, 0.31],
    [145, 24, 20, "bud", -0.73, "coral", 10.41, 0.3],
    [-29, 118, 23, "partial", -1.05, "cream", 10.65, 0.29],
    [117, -103, 23, "partial", 0.12, "blue", 10.85, 0.3],
    [0, 0, 78, "open", -1.1, "coral", 3.4, 1],
  ];
  let width,
    height,
    dpr,
    scale,
    ox,
    oy,
    paper,
    flowers = [],
    stems = [],
    leaves = [],
    elapsed = 0,
    previous = null,
    request = 0;
  const scratch = document.createElement("canvas"),
    sc = scratch.getContext("2d");
  function random(seed) {
    let s = seed >>> 0;
    return (a = 1, b) => {
      s = (s * 1664525 + 1013904223) >>> 0;
      const u = s / 4294967296;
      return b === undefined ? u * a : a + u * (b - a);
    };
  }
  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function surface(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.ceil(w);
    c.height = Math.ceil(h);
    return c;
  }
  function measured(points) {
    let length = 0;
    return points.map((p, i) => {
      if (i) length += Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y);
      return { ...p, distance: length };
    });
  }
  function cubic(a, b, c, d, count = 66) {
    return measured(
      Array.from({ length: count + 1 }, (_, i) => {
        const t = i / count,
          u = 1 - t;
        return {
          x:
            u ** 3 * a.x +
            3 * u * u * t * b.x +
            3 * u * t * t * c.x +
            t ** 3 * d.x,
          y:
            u ** 3 * a.y +
            3 * u * u * t * b.y +
            3 * u * t * t * c.y +
            t ** 3 * d.y,
        };
      }),
    );
  }
  function tepal(r, angle, state, index, rng) {
    const bud = state === "bud",
      length = r * (bud ? rng(1.62, 2) : rng(1.14, 1.52));
    const breadth =
      r *
      (bud
        ? rng(0.12, 0.19)
        : state === "partial"
          ? rng(0.23, 0.32)
          : rng(0.3, 0.43));
    const bend = r * rng(-0.27, 0.27),
      phase = rng(TAU),
      points = [];
    for (const side of [1, -1])
      for (let step = 0; step <= 42; step++) {
        const t = side === 1 ? step / 42 : 1 - step / 42,
          x = length * (t + Math.sin(t * Math.PI) * 0.07);
        const y =
          Math.sin(t * Math.PI) * (bend + side * breadth * (1 - 0.22 * t)) +
          Math.sin(t * Math.PI * 2 + index) * r * 0.025 +
          Math.sin(t * 18 + phase) * Math.sin(t * Math.PI) * r * 0.005;
        points.push({
          x: x * Math.cos(angle) - y * Math.sin(angle),
          y: x * Math.sin(angle) + y * Math.cos(angle),
        });
      }
    return measured(points);
  }
  function irregular(g, x, y, rx, ry, angle, rng, alpha, color) {
    g.beginPath();
    const phase = rng(TAU);
    for (let i = 0; i < 38; i++) {
      const t = (TAU * i) / 38,
        e =
          0.94 +
          0.065 * Math.sin(t * 5 + phase) +
          0.045 * Math.sin(t * 9 - phase) +
          rng(-0.035, 0.035),
        px = Math.cos(t) * rx * e,
        py = Math.sin(t) * ry * e;
      const ax = x + px * Math.cos(angle) - py * Math.sin(angle),
        ay = y + px * Math.sin(angle) + py * Math.cos(angle);
      if (!i) g.moveTo(ax, ay);
      else g.lineTo(ax, ay);
    }
    g.closePath();
    g.fillStyle = rgba(color, alpha);
    g.fill();
  }
  function pigment(f, angle, index, rng) {
    const r = f.r,
      w = r * 1.65,
      h = r * 1.04,
      image = surface(w * 2, h * 2),
      g = image.getContext("2d");
    g.scale(2, 2);
    g.translate(r * 0.16, h / 2);
    const ink = colors[f.color],
      shift = rng(-0.045, 0.045) * r,
      reach = f.state === "bud" ? 0.83 : rng(0.61, 0.87);
    // Wash and contour have separate footprints. Paper remains inside the petal.
    for (let j = 0; j < 8; j++)
      irregular(
        g,
        (r * rng(0.26, 0.49) * reach) / 0.74,
        shift + rng(-0.03, 0.03) * r,
        r * rng(0.36, 0.52) * reach,
        r * rng(0.105, 0.215),
        rng(-0.08, 0.08),
        rng,
        rng(0.06, 0.135) * f.strength,
        ink[j % 2],
      );
    for (let j = 0; j < 3; j++)
      irregular(
        g,
        r * rng(0.07, 0.16),
        rng(-0.04, 0.04) * r,
        r * rng(0.12, 0.24),
        r * rng(0.055, 0.12),
        rng(-0.4, 0.4),
        rng,
        0.14 * f.strength,
        ink[2],
      );
    for (let j = 0; j < 120; j++) {
      const x = rng(r * 0.83),
        y = rng(-0.18, 0.18) * r,
        weight = Math.exp(
          -((x - r * 0.25) ** 2 / (r * r * 0.15) + (y * y) / (r * r * 0.026)),
        );
      g.fillStyle = rgba(ink[2], rng(0.015, 0.05) * weight * f.strength);
      g.fillRect(x, y, rng(0.3, 0.8), rng(0.2, 0.6));
    }
    const opacity =
      (f.index === 12 && index === 1) || (f.index === 4 && index === 3)
        ? 0.28
        : 1;
    return {
      image,
      angle: angle + rng(-0.04, 0.04),
      w,
      h,
      x: -r * 0.16,
      offset: shift,
      opacity,
    };
  }
  function build() {
    const rng = random(74319);
    flowers = specs.map((s, index) => {
      const [x, y, r, state, angle, color, delay, strength] = s,
        f = { x, y, r, state, angle, color, delay, strength, index };
      const offsets =
        state === "bud"
          ? [-0.28, 0, 0.28]
          : state === "partial"
            ? [-1.02, -0.64, -0.28, 0.12, 0.5, 0.88]
            : state === "side"
              ? [-2.05, -1.3, -0.58, 0.08, 0.72, 1.38]
              : [0, 1, 2, 3, 4, 5].map((i) => (i * TAU) / 6);
      f.angles = offsets.map((a) => angle + a + rng(-0.075, 0.075));
      f.paths = f.angles.map((a, i) => tepal(r, a, state, i, rng));
      f.pigments = f.angles.map((a, i) => pigment(f, a, i, rng));
      f.stamens =
        state === "bud"
          ? []
          : Array.from({ length: 5 }, (_, i) => {
              const a = angle + (i - 2) * 0.19 + rng(-0.08, 0.08),
                tip = {
                  x: Math.cos(a) * r * rng(0.62, 0.84),
                  y: Math.sin(a) * r * rng(0.62, 0.84),
                };
              return cubic(
                { x: rng(-2, 2), y: rng(-2, 2) },
                { x: tip.x * 0.4 + rng(-4, 4), y: tip.y * 0.3 },
                { x: tip.x * 0.8, y: tip.y * 0.68 },
                tip,
                24,
              );
            });
      f.corrections = f.paths.map((path, i) =>
        (index === 17 && i === 2) ||
        (index === 3 && i === 4) ||
        (index === 13 && i === 1)
          ? measured(
              path
                .slice(34, 52)
                .map((p, n) => ({
                  x: p.x + Math.sin((n / 17) * Math.PI) * 1.7,
                  y: p.y - Math.sin((n / 17) * Math.PI) * 1.1,
                })),
            )
          : null,
      );
      return f;
    });
    stems = [17, 0, 1, 2, 4, 7, 9, 12, 16, 11, 10, 13, 14, 15].map(
      (index, i) => {
        const f = flowers[index],
          x = rng(-30, 30),
          y = 370 + rng(0, 25);
        return {
          points: cubic(
            { x, y },
            { x: x + rng(-30, 30), y: 220 },
            { x: f.x + rng(-56, 56), y: f.y + rng(74, 126) },
            { x: f.x, y: f.y + 5 },
          ),
          delay: i < 9 ? i * 0.105 : 1.05 + (i - 9) * 0.11,
          index: i,
        };
      },
    );
    leaves = [];
    stems.forEach((s, i) =>
      (i < 5 ? [0.53, 0.71] : i < 9 ? [0.58] : []).forEach((fraction, j) => {
        const at = s.points[Math.floor(fraction * 66)],
          direction = (i + j) % 2 ? -0.62 : -2.52,
          length = rng(24, 43);
        leaves.push({
          stemIndex: i,
          anchorIndex: Math.floor(fraction * 66),
          points: measured(
            tepal(length / 1.3, direction, "bud", i, rng).map((p) => ({
              x: p.x + at.x,
              y: p.y + at.y,
            })),
          ),
          delay: 1.85 + i * 0.1 + j * 0.17,
        });
      }),
    );
  }
  function makePaper() {
    const p = surface(width, height),
      g = p.getContext("2d"),
      rng = random(9174);
    g.fillStyle = PAPER;
    g.fillRect(0, 0, width, height);
    const tint = g.createRadialGradient(
      width * 0.44,
      height * 0.43,
      width * 0.1,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.8,
    );
    tint.addColorStop(0, "rgba(170,130,88,0)");
    tint.addColorStop(1, "rgba(170,130,88,.052)");
    g.fillStyle = tint;
    g.fillRect(0, 0, width, height);
    for (let i = 0; i < (width * height) / 55; i++) {
      const x = rng(width),
        y = rng(height);
      g.strokeStyle = `rgba(119,91,65,${rng(0.008, 0.023)})`;
      g.lineWidth = rng(0.2, 0.45);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + rng(1, 5), y + rng(-0.4, 0.4));
      g.stroke();
    }
    for (let i = 0; i < 7; i++) {
      const x = rng(width),
        y = rng(height),
        radius = rng(0.08, 0.25) * Math.min(width, height),
        stain = g.createRadialGradient(x, y, 0, x, y, radius);
      stain.addColorStop(
        0,
        i % 2 ? "rgba(255,254,248,.065)" : "rgba(157,115,80,.006)",
      );
      stain.addColorStop(1, "rgba(157,115,80,0)");
      g.fillStyle = stain;
      g.fillRect(0, 0, width, height);
    }
    return p;
  }
  function resize() {
    width = innerWidth;
    height = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    scale = Math.min(width / 575, height / 650);
    ox = width * (width > height ? 0.465 : 0.49);
    oy = height * (width > height ? 0.61 : 0.55);
    paper = makePaper();
    stems.forEach((s) => {
      const shift = (height - oy) / scale + 8 - s.points[0].y;
      s.visible = measured(
        s.points.map((p, i) => ({
          x: p.x,
          y: p.y + shift * (1 - i / 66) ** 3,
        })),
      );
    });
    leaves.forEach((leaf) => {
      const s = stems[leaf.stemIndex],
        a = s.points[leaf.anchorIndex],
        b = s.visible[leaf.anchorIndex];
      leaf.visible = measured(
        leaf.points.map((p) => ({ x: p.x + b.x - a.x, y: p.y + b.y - a.y })),
      );
    });
    render(reduced.matches ? END : elapsed);
  }
  function stroke(points, progress, color, alpha, weight, phase = 0) {
    if (progress <= 0) return;
    const stop = points[points.length - 1].distance * clamp(progress);
    ctx.strokeStyle = rgba(color, alpha);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // Arc length controls the endpoint. Pressure changes slowly along the mark.
    for (let start = 0; start < points.length - 1; start += 9) {
      if (points[start].distance >= stop) break;
      ctx.lineWidth = weight * (0.86 + 0.14 * Math.sin(start * 0.13 + phase));
      ctx.beginPath();
      ctx.moveTo(points[start].x, points[start].y);
      for (
        let i = start + 1;
        i <= Math.min(start + 9, points.length - 1);
        i++
      ) {
        const p = points[i],
          before = points[i - 1];
        if (p.distance > stop) {
          const t = (stop - before.distance) / (p.distance - before.distance);
          ctx.lineTo(mix(before.x, p.x, t), mix(before.y, p.y, t));
          break;
        }
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
  }
  function hesitant(t, selected) {
    t = clamp(t);
    if (!selected || t < 0.46) return t;
    if (t < 0.54) return 0.46 + (t - 0.46) * 0.12;
    return mix(0.4696, 1, (t - 0.54) / 0.46);
  }
  function wash(f, p, progress) {
    if (progress <= 0) return;
    const image = p.image;
    if (progress >= 1) {
      ctx.save();
      ctx.rotate(p.angle);
      ctx.globalAlpha = p.opacity;
      ctx.globalCompositeOperation = "multiply";
      ctx.drawImage(image, p.x, -p.h / 2 + p.offset, p.w, p.h);
      ctx.restore();
      return;
    }
    if (scratch.width !== image.width || scratch.height !== image.height) {
      scratch.width = image.width;
      scratch.height = image.height;
    }
    sc.setTransform(1, 0, 0, 1, 0, 0);
    sc.clearRect(0, 0, scratch.width, scratch.height);
    sc.globalCompositeOperation = "source-over";
    sc.drawImage(image, 0, 0);
    // The feathered front travels from the throat. Its endpoint covers the complete source.
    const front = mix(-0.25, 1.4, ease(clamp(progress))) * image.width,
      feather = image.width * 0.27;
    const mask = sc.createLinearGradient(
      front - feather,
      0,
      front + feather,
      0,
    );
    mask.addColorStop(0, "rgba(0,0,0,1)");
    mask.addColorStop(1, "rgba(0,0,0,0)");
    sc.globalCompositeOperation = "destination-in";
    sc.fillStyle = mask;
    sc.fillRect(0, 0, image.width, image.height);
    sc.globalCompositeOperation = "source-over";
    ctx.save();
    ctx.rotate(p.angle);
    ctx.globalAlpha = p.opacity;
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(scratch, p.x, -p.h / 2 + p.offset, p.w, p.h);
    ctx.restore();
  }
  function drawFlower(f, time) {
    if (time < f.delay) return;
    ctx.save();
    ctx.translate(f.x, f.y);
    f.pigments.forEach((p, i) =>
      wash(f, p, (time - f.delay - 2.03 - i * 0.065) / 0.92),
    );
    f.paths.forEach((path, i) => {
      const p = (time - f.delay - i * 0.155) / 1.22;
      stroke(
        path,
        hesitant(p, f.index === 17 && i === 2),
        "#534743",
        0.17 + f.strength * 0.3,
        0.62,
        i + f.index,
      );
      if (f.corrections[i])
        stroke(
          f.corrections[i],
          (time - f.delay - 1.78) / 0.42,
          "#6c5450",
          0.22,
          0.49,
          i,
        );
    });
    f.stamens.forEach((path, i) => {
      const p = clamp((time - f.delay - 2.2 - i * 0.07) / 0.43);
      stroke(path, p, "#695443", 0.17 + f.strength * 0.34, 0.49, i);
      if (p > 0.9) {
        const tip = path[path.length - 1];
        ctx.fillStyle = rgba(
          i % 2 ? "#a58a41" : "#76563c",
          (0.34 + f.strength * 0.23) * clamp((p - 0.9) / 0.1),
        );
        ctx.beginPath();
        ctx.ellipse(tip.x, tip.y, 0.8, 1.65, f.angle + 0.4, 0, TAU);
        ctx.fill();
      }
    });
    ctx.restore();
  }
  function render(time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(paper, 0, 0, width, height);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    stems.forEach((s) =>
      stroke(
        s.visible,
        (time - s.delay) / 1.68,
        "#718165",
        s.index < 9 ? 0.36 : 0.18,
        s.index % 3 === 0 ? 0.95 : 0.72,
        s.index,
      ),
    );
    leaves.forEach((leaf, i) =>
      stroke(
        leaf.visible,
        (time - leaf.delay) / 0.67,
        "#778466",
        0.34,
        0.66,
        i,
      ),
    );
    flowers.forEach((f) => drawFlower(f, time));
    ctx.restore();
  }
  function frame(now) {
    request = 0;
    if (document.hidden) {
      previous = null;
      return;
    }
    if (previous !== null)
      elapsed = Math.min(END, elapsed + (now - previous) / 1000);
    previous = now;
    render(reduced.matches ? END : elapsed);
    if (!reduced.matches && elapsed < END)
      request = requestAnimationFrame(frame);
  }
  function resume() {
    previous = null;
    if (!request && !document.hidden) request = requestAnimationFrame(frame);
  }
  // Material is independent of viewport size. Resize keeps the same drawing and active clock.
  document.documentElement.style.background = PAPER;
  document.body.style.background = PAPER;
  build();
  resize();
  addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(request);
      request = 0;
      previous = null;
    } else resume();
  });
  reduced.addEventListener("change", () => {
    if (reduced.matches) {
      elapsed = END;
      cancelAnimationFrame(request);
      request = 0;
      render(END);
    } else resume();
  });
  resume();
})();
