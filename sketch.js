/* global p5, WatercolorField, MotionVision, ExperienceTelemetry */

// This file is the encounter conductor. The medium, camera analysis, and hidden
// telemetry each keep their own concerns; this boundary only turns movement into
// a restrained, water-first gesture.
const PALETTE = ['coral', 'blush', 'lavender', 'green', '#d9ae49'];
const PAPER = [246, 239, 228];
const MAX_TRACE_HISTORY = 72;
const POINTER_INTERVAL = 52;
const CAMERA_INTERVAL = 86;

let field;
let graphite;
let activation;
let canvasElement;
let phase = 'resting';
let source = 'waiting';
let seed = 39191;
let sessionStartedAt = 0;
let lastInputAt = 0;
let lastCameraDepositAt = 0;
let lastPointerDepositAt = 0;
let cameraRequestedAt = 0;
let traceHistory = [];
let pointerPaths = new Map();
let cameraPrevious = null;
let syntheticPrevious = null;

function now() { return performance.now(); }

function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }

function telemetry() { return window.ExperienceTelemetry || null; }

function getSettings() {
  const panel = telemetry();
  return panel && typeof panel.getSettings === 'function'
    ? panel.getSettings()
    : { perceptionSensitivity: 0.58, waterSpread: 0.64, pigmentIntensity: 0.72, dryingTempo: 0.46, memoryFadeTempo: 0.55 };
}

function applySettings() {
  const settings = getSettings();
  if (window.MotionVision && typeof MotionVision.configure === 'function') {
    MotionVision.configure({ perceptionSensitivity: settings.perceptionSensitivity });
  }
  if (field) {
    const parameters = {
      waterSpread: settings.waterSpread,
      pigmentIntensity: settings.pigmentIntensity,
      dryingTempo: settings.dryingTempo,
      memoryFadeTempo: settings.memoryFadeTempo
    };
    if (typeof field.configure === 'function') field.configure(parameters);
    else if (typeof field.setParameters === 'function') field.setParameters(parameters);
  }
}

function timings() {
  const settings = getSettings();
  return {
    making: 39000 + (1 - settings.memoryFadeTempo) * 2500,
    settling: 4000 + (1 - settings.dryingTempo) * 1500,
    fading: 6800 + (1 - settings.memoryFadeTempo) * 2200,
    residue: 1800 + (1 - settings.memoryFadeTempo) * 1200
  };
}

function nextSeed() {
  seed = (Math.imul(seed ^ (seed >>> 16), 2246822507) + 3266489917) >>> 0;
  return seed || 39191;
}

function makeGraphite(preserve) {
  const old = preserve && graphite;
  const next = createGraphics(width, height);
  next.pixelDensity(1);
  next.clear();
  if (old) {
    next.image(old, 0, 0, next.width, next.height);
    old.remove();
  }
  graphite = next;
}

function setPhase(next, at) {
  if (phase === next) return;
  phase = next;
  const mediumPhase = next === 'fading' ? 'fading' : (next === 'settling' || next === 'residue' ? 'residue' : 'active');
  if (field && typeof field.setPhase === 'function') field.setPhase(mediumPhase);
  const panel = telemetry();
  if (panel && typeof panel.setPhase === 'function') panel.setPhase(next);
  if (activation) {
    activation.classList.toggle('is-resting', next === 'resting');
    activation.classList.toggle('is-awake', next !== 'resting');
  }
}

function resetEncounter(next = nextSeed()) {
  seed = Number.isFinite(next) ? next >>> 0 : nextSeed();
  if (field && typeof field.reset === 'function') field.reset(seed);
  if (graphite) graphite.remove();
  makeGraphite(false);
  traceHistory = [];
  pointerPaths.clear();
  cameraPrevious = null;
  syntheticPrevious = null;
  sessionStartedAt = 0;
  lastInputAt = 0;
  lastCameraDepositAt = 0;
  lastPointerDepositAt = 0;
  cameraRequestedAt = 0;
  source = 'waiting';
  setPhase('resting');
}

function beginEncounter(inputSource, at) {
  const time = at || now();
  if (phase === 'resting') {
    sessionStartedAt = time;
    setPhase(inputSource === 'camera' ? 'listening' : 'warming', time);
  }
  if (phase === 'listening') setPhase('warming', time);
  if (phase === 'settling' && time - sessionStartedAt < timings().making) setPhase('painting', time);
  source = inputSource;
  lastInputAt = time;
}

function pigmentColour(index) { return PALETTE[Math.abs(index) % PALETTE.length]; }

function drawTrace(from, to, opacity) {
  if (!from || !to || !graphite) return;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.hypot(dx, dy) < 0.0015) return;
  const scale = Math.min(graphite.width, graphite.height);
  graphite.push();
  graphite.noFill();
  graphite.stroke(51, 44, 41, opacity);
  graphite.strokeWeight(Math.max(0.38, scale / 1650));
  graphite.line(from.x * graphite.width, from.y * graphite.height, to.x * graphite.width, to.y * graphite.height);
  graphite.pop();
  traceHistory.push({ x: to.x, y: to.y, at: now() });
  if (traceHistory.length > MAX_TRACE_HISTORY) traceHistory.shift();
}

function fadeGraphite(opacity) {
  if (!graphite) return;
  const context = graphite.drawingContext;
  context.save();
  context.globalCompositeOperation = 'destination-out';
  graphite.noStroke();
  graphite.fill(255, opacity);
  graphite.rect(0, 0, graphite.width, graphite.height);
  context.restore();
}

function depositPoint(point, prior, inputSource, time, mirror) {
  if (!field || !point) return;
  const x = mirror ? 1 - point.x : point.x;
  const dx = prior ? (mirror ? -(point.x - prior.x) : point.x - prior.x) : 0;
  const dy = prior ? point.y - prior.y : 0;
  const warmFor = time - sessionStartedAt;
  // The first beat is only water. Once it has had a moment to arrive, the
  // field's own delayed release lets pigment bloom after the path has passed.
  const isWetOnly = warmFor < 160;
  const pressure = clamp(0.26 + point.energy * 0.62, 0.16, 0.9);
  // Keep a colour in the hand for several seconds. Rapid hue changes turn a
  // continuous gesture into confetti; this slower drift reads as one wash.
  const colourAge = Math.max(0, time - sessionStartedAt);
  const index = Math.floor(colourAge / 5600) + (mirror ? 1 : 0);
  field.deposit({
    x,
    y: point.y,
    dx,
    dy,
    pressure,
    wet: clamp(0.5 + point.energy * 0.38, 0.34, 0.92),
    amount: clamp(0.3 + point.energy * 0.43, 0.24, 0.82),
    radius: clamp(0.018 + pressure * 0.028, 0.017, 0.052),
    colour: pigmentColour(index),
    pigment: !isWetOnly
  });
}

function acceptGesture(raw, inputSource, at = now()) {
  const point = {
    x: clamp(Number(raw.x), 0, 1),
    y: clamp(Number(raw.y), 0, 1),
    energy: clamp(Number.isFinite(raw.energy) ? raw.energy : 0.45, 0.06, 1)
  };
  const isCamera = inputSource === 'camera';
  const lastAt = isCamera ? lastCameraDepositAt : lastPointerDepositAt;
  const interval = isCamera ? CAMERA_INTERVAL : POINTER_INTERVAL;
  if (at - lastAt < interval || phase === 'fading' || phase === 'residue') return false;

  beginEncounter(inputSource, at);
  const prior = isCamera ? cameraPrevious : raw.previous;
  const tracePoint = isCamera ? { x: 1 - point.x, y: point.y } : point;
  const tracePrior = isCamera && prior ? { x: 1 - prior.x, y: prior.y } : prior;
  drawTrace(tracePrior, tracePoint, isCamera ? 34 : 46);
  depositPoint(point, prior, inputSource, at, isCamera);

  lastInputAt = at;
  source = inputSource;
  if (isCamera) {
    lastCameraDepositAt = at;
    cameraPrevious = point;
  } else {
    lastPointerDepositAt = at;
  }
  return true;
}

function pointFromPointer(event) {
  const bounds = canvasElement.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) / bounds.width,
    y: (event.clientY - bounds.top) / bounds.height,
    energy: clamp(Math.hypot(event.movementX || 0, event.movementY || 0) / 28 + 0.25, 0.18, 0.9)
  };
}

function wirePointerInput() {
  const onDown = event => {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    const point = pointFromPointer(event);
    pointerPaths.set(event.pointerId, point);
    try { canvasElement.setPointerCapture(event.pointerId); } catch (_) { /* capture is a nicety, not a requirement */ }
    acceptGesture({ ...point, previous: point }, event.pointerType === 'touch' ? 'touch' : 'pointer');
  };
  const onMove = event => {
    const previous = pointerPaths.get(event.pointerId);
    if (!previous) return;
    event.preventDefault();
    const point = pointFromPointer(event);
    acceptGesture({ ...point, previous }, event.pointerType === 'touch' ? 'touch' : 'pointer');
    pointerPaths.set(event.pointerId, point);
  };
  const onEnd = event => {
    pointerPaths.delete(event.pointerId);
    try { canvasElement.releasePointerCapture(event.pointerId); } catch (_) { /* already released */ }
  };
  canvasElement.addEventListener('pointerdown', onDown, { passive: false });
  canvasElement.addEventListener('pointermove', onMove, { passive: false });
  canvasElement.addEventListener('pointerup', onEnd, { passive: true });
  canvasElement.addEventListener('pointercancel', onEnd, { passive: true });
}

function startCamera() {
  if (!window.MotionVision || typeof MotionVision.start !== 'function') return;
  source = 'camera-requested';
  cameraRequestedAt = now();
  const panel = telemetry();
  if (panel && typeof panel.setSource === 'function') panel.setSource(source);
  MotionVision.start({ perceptionSensitivity: getSettings().perceptionSensitivity }).then(state => {
    if (!state || state.status !== 'running') {
      // No denial copy or status surface: the material remains usable by hand.
      source = 'fallback';
    }
  }).catch(() => { source = 'fallback'; });
}

function consumeCamera(time) {
  if (!window.MotionVision || typeof MotionVision.getState !== 'function') return null;
  const state = MotionVision.getState();
  if (state.status === 'requesting' && cameraRequestedAt && time - cameraRequestedAt > 6500) {
    source = 'fallback';
    cameraRequestedAt = 0;
    if (typeof MotionVision.stop === 'function') MotionVision.stop();
    return MotionVision.getState();
  }
  if (state.status === 'running' && source === 'camera-requested') source = 'camera';
  if (state.status === 'running' && state.confidence > 0.065 && state.motionEnergy > 0.008) {
    acceptGesture({ x: state.x, y: state.y, energy: Math.max(state.motionEnergy, state.flowConfidence || 0) }, 'camera', time);
  }
  return state;
}

function evolveLifecycle(time) {
  if (phase === 'resting') return;
  const schedule = timings();
  const age = time - sessionStartedAt;
  const idle = time - lastInputAt;
  if ((phase === 'warming' || phase === 'listening') && age > 900) setPhase('painting', time);
  if ((phase === 'warming' || phase === 'painting') && idle > 2500) setPhase('settling', time);
  if (age >= schedule.making && phase !== 'fading' && phase !== 'residue') setPhase('settling', time);
  if (phase === 'settling' && age >= schedule.making + schedule.settling) setPhase('fading', time);
  if (phase === 'fading') {
    fadeGraphite(2.6);
    if (age >= schedule.making + schedule.settling + schedule.fading) setPhase('residue', time);
  }
  if (phase === 'residue' && age >= schedule.making + schedule.settling + schedule.fading + schedule.residue) {
    resetEncounter(nextSeed());
  }
}

function recordTelemetry(time, frameStarted, vision) {
  const panel = telemetry();
  if (!panel || typeof panel.recordFrame !== 'function') return;
  const metrics = field && typeof field.getMetrics === 'function' ? field.getMetrics() : {};
  panel.recordFrame({
    timestamp: time,
    fps: deltaTime ? 1000 / deltaTime : 0,
    renderFrameMs: now() - frameStarted,
    cvLatencyMs: vision ? vision.cvLatencyMs : 0,
    cvConfidence: vision ? vision.confidence : 0,
    motionEnergy: vision ? vision.motionEnergy : 0,
    wetCoverage: metrics.wetCoverage || 0,
    pigmentLoad: metrics.pigmentLoad || 0,
    phase,
    source
  });
}

function setup() {
  pixelDensity(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2));
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('painting');
  canvasElement = canvas.elt;
  frameRate(60);
  field = new WatercolorField(window, { seed, maxDimension: 960, fadeAfter: 120000 });
  makeGraphite(false);
  activation = document.getElementById('activation');
  activation.classList.add('is-resting');
  activation.addEventListener('click', () => {
    beginEncounter('camera', now());
    startCamera();
  });
  wirePointerInput();
  applySettings();
  if (window.MotionVision && typeof MotionVision.subscribe === 'function') {
    MotionVision.subscribe(state => {
      if (state && state.status === 'denied') source = 'fallback';
    });
  }
  const panel = telemetry();
  if (panel && typeof panel.onSettingsChange === 'function') panel.onSettingsChange(applySettings);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.MotionVision && typeof MotionVision.stop === 'function') MotionVision.stop();
  });
  window.addEventListener('pagehide', () => {
    if (window.MotionVision && typeof MotionVision.stop === 'function') MotionVision.stop();
  });
  installDebugSurface();
}

function draw() {
  const frameStarted = now();
  const time = frameStarted;
  const vision = consumeCamera(time);
  evolveLifecycle(time);
  if (field) {
    field.update(Math.min(80, deltaTime || 16.67));
    field.render();
  } else background(...PAPER);
  if (graphite) image(graphite, 0, 0, width, height);
  recordTelemetry(time, frameStarted, vision);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  pixelDensity(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2));
  if (field && typeof field.resize === 'function') field.resize(width, height, true);
  makeGraphite(true);
}

function installDebugSurface() {
  const debug = {
    snapshot() {
      const metrics = field && typeof field.getMetrics === 'function' ? field.getMetrics() : {};
      return Object.freeze({
        phase,
        source,
        seed,
        elapsedMs: sessionStartedAt ? Math.round(now() - sessionStartedAt) : 0,
        marks: metrics.marks || 0,
        wetCoverage: Number((metrics.wetCoverage || 0).toFixed(3)),
        pigmentLoad: Number((metrics.pigmentLoad || 0).toFixed(3)),
        settings: Object.freeze({ ...getSettings() })
      });
    },
    reset(nextSeedValue) {
      if (window.MotionVision && typeof MotionVision.clearInjection === 'function') MotionVision.clearInjection();
      resetEncounter(Number.isFinite(nextSeedValue) ? nextSeedValue : nextSeed());
      return debug.snapshot();
    },
    synthetic(sample = {}) {
      const input = {
        x: Number.isFinite(sample.x) ? sample.x : 0.5,
        y: Number.isFinite(sample.y) ? sample.y : 0.5,
        energy: Number.isFinite(sample.motionEnergy) ? sample.motionEnergy : 0.6,
        previous: syntheticPrevious
      };
      acceptGesture(input, 'synthetic', now());
      syntheticPrevious = input;
      return debug.snapshot();
    }
  };
  window.__watercolorExperience = Object.freeze(debug);
}
