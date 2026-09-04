/*
 * WatercolorField — a small, gesture-led watercolor medium for p5.js.
 *
 * It deliberately has no knowledge of flowers, cameras, or DOM events. Feed it
 * normalised samples (0..1 x/y) and let the caller decide what a gesture means.
 */
(function watercolorFieldModule(global) {
  'use strict';

  const IVORY = [246, 239, 228];
  const PALETTE = [
    [205, 91, 77], [230, 145, 134], [174, 112, 154],
    [128, 145, 104], [99, 116, 137], [224, 181, 74]
  ];
  const NAMED_COLOURS = {
    red: [205, 91, 77], coral: [219, 109, 91], pink: [230, 145, 134],
    blush: [230, 145, 134], purple: [174, 112, 154], lavender: [162, 143, 186],
    green: [128, 145, 104], leaf: [99, 124, 91], blue: [105, 128, 165]
  };
  const MAX_MARKS = 84;

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function hashSeed(seed) {
    let value = (Number(seed) || 1) >>> 0;
    return function random() {
      value += 0x6D2B79F5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function colourFrom(value, fallback) {
    if (Array.isArray(value) && value.length >= 3) return value.slice(0, 3).map(Number);
    if (typeof value === 'string') {
      const named = NAMED_COLOURS[value.toLowerCase()];
      if (named) return named;
      const hex = value.replace('#', '');
      if (/^[0-9a-f]{6}$/i.test(hex)) {
        return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
      }
    }
    return fallback;
  }

  function rgba(colour, alpha) {
    return `rgba(${colour[0]}, ${colour[1]}, ${colour[2]}, ${clamp(alpha, 0, 1)})`;
  }

  /**
   * @param {p5} p A global-mode p5 instance (pass window) or an instance-mode p5 sketch.
   * @param {object} [options]
   * @param {number} [options.seed=30171] Stable seed for paper and irregular mark contours.
   * @param {number} [options.maxDimension=900] Buffer cap; output is scaled when rendered.
   * @param {number} [options.fadeAfter=24000] Idle milliseconds before pigment gently fades.
   */
  class WatercolorField {
    constructor(p, options) {
      if (!p || typeof p.createGraphics !== 'function') {
        throw new TypeError('WatercolorField needs a p5 instance with createGraphics().');
      }
      this.p = p;
      this.options = Object.assign({ seed: 30171, maxDimension: 900, fadeAfter: 24000 }, options);
      this.seed = this.options.seed;
      this.marks = [];
      this.metrics = { wetCoverage: 0, pigmentLoad: 0, activity: 0 };
      this.pigmentMass = 0;
      this.parameters = {
        waterSpread: 0.5,
        pigmentIntensity: 0.55,
        dryingTempo: 0.5,
        memoryFadeTempo: 0.5
      };
      this.phase = 'active';
      this.forgetting = 0;
      this.lastDepositAt = 0;
      this.elapsed = 0;
      this.destroyed = false;
      this.resize(this.options.width || p.width, this.options.height || p.height);
    }

    /**
     * Applies bounded, normalised telemetry controls (all values are 0..1).
     * Omitted keys retain their present value.
     */
    setParameters(settings) {
      if (!settings || typeof settings !== 'object') return Object.assign({}, this.parameters);
      ['waterSpread', 'pigmentIntensity', 'dryingTempo', 'memoryFadeTempo'].forEach(key => {
        if (Number.isFinite(settings[key])) this.parameters[key] = clamp(settings[key], 0, 1);
      });
      return Object.assign({}, this.parameters);
    }

    configure(settings) { return this.setParameters(settings); }

    /**
     * Fades existing pigment into its paper ground without clearing a layer.
     * 0 stops deliberate fading; 1 is a brisk but still visibly material washout.
     */
    setForgetting(amount) {
      this.forgetting = clamp(Number.isFinite(amount) ? amount : 0, 0, 1);
      if (this.forgetting > 0) this.phase = 'fading';
      return this.forgetting;
    }

    /** Convenience state for finite encounters: active, residue, or fading. */
    setPhase(phase) {
      if (!['active', 'residue', 'fading'].includes(phase)) return this.phase;
      this.phase = phase;
      if (phase === 'active') this.forgetting = 0;
      if (phase === 'fading') this.forgetting = Math.max(this.forgetting, 0.72);
      if (phase === 'residue') this.forgetting = 0;
      return this.phase;
    }

    _makeBuffers(width, height) {
      const longest = Math.max(width, height, 1);
      this.renderScale = Math.min(1, this.options.maxDimension / longest);
      this.width = Math.max(1, Math.round(width * this.renderScale));
      this.height = Math.max(1, Math.round(height * this.renderScale));
      this.paper = this.p.createGraphics(this.width, this.height);
      this.pigment = this.p.createGraphics(this.width, this.height);
      this.water = this.p.createGraphics(this.width, this.height);
      [this.paper, this.pigment, this.water].forEach(layer => layer.pixelDensity(1));
      this._paintPaper();
      this.pigment.clear();
      this.water.clear();
    }

    _disposeBuffers() {
      [this.paper, this.pigment, this.water].forEach(layer => {
        if (layer && typeof layer.remove === 'function') layer.remove();
      });
    }

    _paintPaper() {
      const g = this.paper;
      const random = hashSeed(this.seed);
      g.clear();
      g.background(IVORY[0], IVORY[1], IVORY[2]);
      g.noFill();

      // Fibres sit almost below perception. A fixed seed keeps a resized field familiar.
      g.strokeWeight(Math.max(0.35, this.width / 1900));
      for (let i = 0; i < Math.ceil(this.width * this.height / 540); i += 1) {
        const y = random() * this.height;
        const x = random() * this.width;
        const span = 4 + random() * 22;
        g.stroke(121, 93, 69, 8 + random() * 9);
        g.line(x, y, x + span, y + (random() - 0.5) * 1.2);
      }
      // A few very broad folds stop the surface feeling like a flat web texture.
      for (let i = 0; i < 5; i += 1) {
        const y = random() * this.height;
        g.stroke(143, 111, 83, 6 + random() * 5);
        g.strokeWeight(8 + random() * 18);
        g.line(-this.width * 0.12, y, this.width * 1.12, y + (random() - 0.5) * this.height * 0.08);
      }
      for (let i = 0; i < 28; i += 1) {
        g.noStroke();
        g.fill(255, 251, 239, 8 + random() * 10);
        g.ellipse(random() * this.width, random() * this.height, 18 + random() * 95, 8 + random() * 42);
      }
    }

    _normalise(sample) {
      const x = clamp(Number.isFinite(Number(sample.x)) ? Number(sample.x) : 0.5, 0, 1);
      const y = clamp(Number.isFinite(Number(sample.y)) ? Number(sample.y) : 0.5, 0, 1);
      const pressure = clamp(Number.isFinite(sample.pressure) ? sample.pressure : 0.5, 0.04, 1);
      const wet = clamp(Number.isFinite(sample.wet) ? sample.wet : 0.76, 0.04, 1);
      const amount = clamp(Number.isFinite(sample.amount) ? sample.amount : 0.56, 0.03, 1);
      const radius = clamp(Number.isFinite(sample.radius) ? sample.radius : 0.022 + pressure * 0.038, 0.006, 0.18);
      return { x, y, pressure, wet, amount, radius };
    }

    /**
     * Adds one water-first gesture sample. x and y are normalised (0..1).
     * Useful sample keys: pressure, wet, amount, radius, colour/color, dx, dy.
     */
    deposit(sample) {
      if (this.destroyed || !sample) return null;
      const point = this._normalise(sample);
      const random = hashSeed((this.seed + Math.floor(this.elapsed * 31) + this.marks.length * 193) >>> 0);
      const hue = colourFrom(sample.colour || sample.color, PALETTE[Math.floor(random() * PALETTE.length)]);
      const spreadScale = 0.62 + this.parameters.waterSpread * 1.18;
      const radius = point.radius * Math.min(this.width, this.height) * spreadScale;
      const dx = clamp(Number(sample.dx) || 0, -1, 1) * this.width;
      const dy = clamp(Number(sample.dy) || 0, -1, 1) * this.height;
      const contour = Array.from({ length: 14 }, (_, index) => 0.77 + random() * 0.34 + Math.sin(index * 2.17 + random() * 2) * 0.06);
      const mark = {
        x: point.x * this.width, y: point.y * this.height, dx, dy, radius,
        wet: point.wet, amount: point.amount, pigment: sample.pigment !== false,
        pressure: point.pressure, colour: hue,
        contour, angle: Math.atan2(dy, dx) || random() * Math.PI,
        age: 0, pigmentPainted: 0, delay: 90 + random() * 220,
        bloomAt: (460 + random() * 760) / (0.68 + this.parameters.dryingTempo * 0.92),
        bloomed: false, settling: 1.5 + random() * 2.8
      };
      this.marks.push(mark);
      if (this.marks.length > MAX_MARKS) this.marks.shift();
      this.lastDepositAt = this.elapsed;
      this._paintWater();
      return mark;
    }

    addSample(sample) { return this.deposit(sample); }

    /** Adds water without committing pigment; useful for a camera's open-palm/wet state. */
    wet(sample) {
      return this.deposit(Object.assign({}, sample, { pigment: false }));
    }

    _irregularBlob(g, mark, radius, fillAlpha, edgeAlpha, offsetX, offsetY) {
      const n = mark.contour.length;
      const cx = mark.x + (offsetX || 0);
      const cy = mark.y + (offsetY || 0);
      g.noStroke();
      g.fill(rgba(mark.colour, fillAlpha));
      g.beginShape();
      for (let i = 0; i < n; i += 1) {
        const a = (i / n) * Math.PI * 2 + mark.angle;
        const pull = 1 + Math.cos(a - mark.angle) * Math.min(0.28, Math.hypot(mark.dx, mark.dy) / Math.max(radius, 1) * 0.11);
        const r = radius * mark.contour[i] * pull;
        g.vertex(cx + Math.cos(a) * r, cy + Math.sin(a) * r * (0.82 + mark.pressure * 0.18));
      }
      g.endShape(this.p.CLOSE || 'close');
      if (edgeAlpha > 0) {
        g.noFill();
        g.stroke(rgba(mark.colour, edgeAlpha));
        g.strokeWeight(Math.max(0.55, radius * 0.038));
        g.beginShape();
        for (let i = 0; i <= n; i += 1) {
          const index = i % n;
          const a = (index / n) * Math.PI * 2 + mark.angle;
          const r = radius * mark.contour[index] * (1.015 + Math.sin(index * 1.7) * 0.025);
          g.vertex(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.89);
        }
        g.endShape();
      }
    }

    _paintWater() {
      const g = this.water;
      g.clear();
      g.blendMode(this.p.MULTIPLY || 'multiply');
      this.marks.forEach(mark => {
        const dryingRate = 0.52 + this.parameters.dryingTempo * 1.82;
        const living = mark.wet * Math.exp(-mark.age / ((1850 + mark.settling * 240) / dryingRate));
        if (living < 0.012) return;
        const spreadReach = 0.72 + this.parameters.waterSpread * 0.92;
        const spread = 1 + Math.min(0.5, mark.age / mark.bloomAt * 0.18) * spreadReach
          + (mark.bloomed ? 0.17 * spreadReach : 0);
        this._irregularBlob(g, mark, mark.radius * spread, living * 0.13, living * 0.08);
        // A dragged sample has a watery, low-density bridge rather than repeated dots.
        if (Math.hypot(mark.dx, mark.dy) > mark.radius * 0.45) {
          g.stroke(rgba(mark.colour, living * 0.08));
          g.strokeWeight(mark.radius * (0.6 + mark.pressure * 0.35));
          g.line(mark.x - mark.dx * 0.55, mark.y - mark.dy * 0.55, mark.x + mark.dx * 0.2, mark.y + mark.dy * 0.2);
        }
      });
      g.blendMode(this.p.BLEND || 'source-over');
    }

    _releasePigment(mark, increment) {
      const g = this.pigment;
      g.blendMode(this.p.MULTIPLY || 'multiply');
      const intensity = 0.32 + this.parameters.pigmentIntensity * 1.42;
      const saturationCeiling = 8 + this.parameters.pigmentIntensity * 28;
      const requested = increment * mark.amount * (0.42 + mark.pressure * 0.58) * intensity;
      const settled = clamp(Math.min(requested, Math.max(0, saturationCeiling - this.pigmentMass)), 0, 0.18);
      this.pigmentMass += settled;
      // Join sampled points with a transparent wash. The blob remains the
      // pooled watercolor edge; this bridge is the wet brush that carried it.
      if (Math.hypot(mark.dx, mark.dy) > mark.radius * 0.22) {
        g.noFill();
        g.stroke(rgba(mark.colour, settled * 0.48));
        g.strokeWeight(mark.radius * (0.72 + mark.pressure * 0.24));
        g.strokeCap(this.p.ROUND || 'round');
        g.line(mark.x - mark.dx, mark.y - mark.dy, mark.x, mark.y);
      }
      this._irregularBlob(g, mark, mark.radius * (0.72 + mark.pigmentPainted * 0.16), settled, settled * 1.35);
      if (mark.bloomed) {
        this._irregularBlob(g, mark, mark.radius * 1.08, settled * 0.28, settled * 0.82,
          Math.cos(mark.angle) * mark.radius * 0.08, Math.sin(mark.angle) * mark.radius * 0.05);
      }
      g.blendMode(this.p.BLEND || 'source-over');
    }

    _fadePigment(amount) {
      if (amount <= 0) return;
      const g = this.pigment;
      g.blendMode(this.p.BLEND || 'source-over');
      g.noStroke();
      g.fill(rgba(IVORY, amount));
      g.rect(0, 0, this.width, this.height);
    }

    /** Advance drying and delayed pigment. deltaMs defaults to p5's deltaTime. */
    update(deltaMs) {
      if (this.destroyed) return this.getMetrics();
      const dt = clamp(Number.isFinite(deltaMs) ? deltaMs : (this.p.deltaTime || 16.67), 0, 80);
      this.elapsed += dt;
      let wetArea = 0;
      this.marks.forEach(mark => {
        mark.age += dt;
        if (!mark.bloomed && mark.age >= mark.bloomAt && mark.wet > 0.18) mark.bloomed = true;
        const dryingRate = 0.52 + this.parameters.dryingTempo * 1.82;
        const release = mark.pigment && mark.age > mark.delay
          ? Math.min(1 - mark.pigmentPainted, dt / ((740 + mark.settling * 130) / dryingRate)) : 0;
        if (release > 0) {
          mark.pigmentPainted += release;
          this._releasePigment(mark, release);
        }
        const liveWet = mark.wet * Math.exp(-mark.age / ((1850 + mark.settling * 240) / dryingRate));
        wetArea += Math.PI * mark.radius * mark.radius * liveWet;
      });
      this.marks = this.marks.filter(mark => mark.age < 7200 || (mark.pigment && mark.pigmentPainted < 0.98));
      const idle = this.elapsed - this.lastDepositAt;
      const fadeTempo = 0.34 + this.parameters.memoryFadeTempo * 2.66;
      const idleThreshold = this.options.fadeAfter * (1.62 - this.parameters.memoryFadeTempo * 1.14);
      if (idle > idleThreshold || this.forgetting > 0) {
        const deliberate = this.forgetting > 0 ? this.forgetting * dt / 6200 : 0;
        const fade = clamp(dt / 160000 * fadeTempo + deliberate, 0, 0.055);
        this._fadePigment(fade);
        this.pigmentMass *= 1 - fade;
      }
      this._paintWater();
      const area = this.width * this.height;
      this.metrics.wetCoverage = clamp(wetArea / area, 0, 1);
      const saturationCeiling = 8 + this.parameters.pigmentIntensity * 28;
      this.metrics.pigmentLoad = clamp(this.pigmentMass / saturationCeiling, 0, 1);
      this.metrics.activity = clamp(this.metrics.wetCoverage * 5 + this.metrics.pigmentLoad * 0.35, 0, 1);
      return this.getMetrics();
    }

    /** Draws the paper, settled pigment, and current water into p5 or a p5.Graphics target. */
    render(target) {
      if (this.destroyed) return;
      const g = target || this.p;
      const outputWidth = g.width || this.p.width;
      const outputHeight = g.height || this.p.height;
      g.image(this.paper, 0, 0, outputWidth, outputHeight);
      g.image(this.pigment, 0, 0, outputWidth, outputHeight);
      g.image(this.water, 0, 0, outputWidth, outputHeight);
    }

    /** Convenience for a p5 draw loop: update then render. */
    draw(target, deltaMs) {
      this.update(deltaMs);
      this.render(target);
      return this.getMetrics();
    }

    getMetrics() {
      return Object.assign({}, this.metrics, {
        marks: this.marks.length,
        phase: this.phase,
        forgetting: this.forgetting,
        parameters: Object.assign({}, this.parameters)
      });
    }

    resize(width, height, preserve) {
      if (this.destroyed) return;
      const oldPigment = preserve && this.pigment;
      const oldWidth = this.width;
      const oldHeight = this.height;
      if (this.paper && typeof this.paper.remove === 'function') this.paper.remove();
      if (this.water && typeof this.water.remove === 'function') this.water.remove();
      if (!oldPigment && this.pigment && typeof this.pigment.remove === 'function') this.pigment.remove();
      this._makeBuffers(Math.max(1, width || this.p.width), Math.max(1, height || this.p.height));
      if (oldPigment) {
        this.pigment.image(oldPigment, 0, 0, this.width, this.height);
        if (typeof oldPigment.remove === 'function') oldPigment.remove();
      }
      if (oldWidth && oldHeight) {
        this.marks.forEach(mark => {
          mark.x = mark.x / oldWidth * this.width;
          mark.y = mark.y / oldHeight * this.height;
          mark.dx = mark.dx / oldWidth * this.width;
          mark.dy = mark.dy / oldHeight * this.height;
          mark.radius *= Math.min(this.width, this.height) / Math.min(oldWidth, oldHeight);
        });
      }
    }

    reset(seed) {
      if (Number.isFinite(seed)) this.seed = seed;
      this.marks.length = 0;
      this.elapsed = 0;
      this.lastDepositAt = 0;
      this.metrics = { wetCoverage: 0, pigmentLoad: 0, activity: 0 };
      this.pigmentMass = 0;
      this.phase = 'active';
      this.forgetting = 0;
      this._disposeBuffers();
      this._makeBuffers(this.p.width, this.p.height);
    }

    destroy() {
      if (this.destroyed) return;
      this._disposeBuffers();
      this.marks.length = 0;
      this.destroyed = true;
    }
  }

  global.WatercolorField = WatercolorField;
}(typeof window !== 'undefined' ? window : globalThis));
