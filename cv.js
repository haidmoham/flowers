/* Local, low-rate camera motion input for global-mode p5 sketches. */
(function (global) {
  'use strict';

  var defaults = {
    analysisWidth: 64,
    analysisHeight: 48,
    targetFps: 15,
    threshold: 24,
    minMotionPixels: 14,
    smoothing: 0.3,
    energySmoothing: 0.24,
    perceptionSensitivity: null
  };
  var options = Object.assign({}, defaults);
  var video = null;
  var canvas = null;
  var context = null;
  var stream = null;
  var frame = null;
  var previous = null;
  var gridWeight = null;
  var gridX = null;
  var gridY = null;
  var gridXX = null;
  var gridYY = null;
  var gridXY = null;
  var gridXT = null;
  var gridYT = null;
  var gridActive = null;
  var gridVisited = null;
  var queue = null;
  var running = false;
  var disposed = false;
  var startPromise = null;
  var rafId = 0;
  var videoFrameCallbackId = 0;
  var lastVideoFrameAt = 0;
  var lastAnalysisAt = 0;
  var lastPositionAt = 0;
  var hasPreviousFrame = false;
  var injection = null;
  var pointerBinding = null;
  var listeners = [];

  var state = {
    status: 'idle',
    available: false,
    denied: false,
    active: false,
    source: 'camera',
    x: 0.5,
    y: 0.5,
    velocityX: 0,
    velocityY: 0,
    motionEnergy: 0,
    confidence: 0,
    flowX: 0,
    flowY: 0,
    flowConfidence: 0,
    cvLatencyMs: 0,
    lastSampleAt: 0
  };

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function configure(next) {
    if (!next) return Object.assign({}, options);
    var priorWidth = options.analysisWidth;
    var priorHeight = options.analysisHeight;
    var width = Number(next.analysisWidth);
    var height = Number(next.analysisHeight);
    var fps = Number(next.targetFps);
    if (Number.isFinite(width)) options.analysisWidth = Math.round(clamp(width, 32, 128));
    if (Number.isFinite(height)) options.analysisHeight = Math.round(clamp(height, 24, 96));
    if (Number.isFinite(Number(next.perceptionSensitivity))) {
      var sensitivity = clamp(Number(next.perceptionSensitivity), 0, 1);
      options.perceptionSensitivity = sensitivity;
      options.threshold = 40 - 28 * sensitivity;
      options.minMotionPixels = 36 - 28 * sensitivity;
      options.smoothing = 0.18 + 0.26 * sensitivity;
      options.targetFps = 12 + 6 * sensitivity;
    }
    if (Number.isFinite(fps)) options.targetFps = clamp(fps, 10, 20);
    ['threshold', 'minMotionPixels'].forEach(function (key) {
      if (Number.isFinite(Number(next[key]))) options[key] = Number(next[key]);
    });
    ['smoothing', 'energySmoothing'].forEach(function (key) {
      if (Number.isFinite(Number(next[key]))) options[key] = clamp(Number(next[key]), 0.02, 1);
    });
    options.threshold = clamp(options.threshold, 1, 255);
    options.minMotionPixels = clamp(Math.round(options.minMotionPixels), 1, options.analysisWidth * options.analysisHeight);
    if (canvas && (priorWidth !== options.analysisWidth || priorHeight !== options.analysisHeight)) {
      canvas.width = options.analysisWidth;
      canvas.height = options.analysisHeight;
      context = canvas.getContext('2d', { willReadFrequently: true });
      makeBuffers();
      hasPreviousFrame = false;
      lastAnalysisAt = 0;
    }
    return Object.assign({}, options);
  }

  function notify() {
    for (var i = 0; i < listeners.length; i += 1) {
      try { listeners[i](getState()); } catch (_) { /* Consumer callbacks cannot stop capture. */ }
    }
  }

  function setStatus(status, available, denied) {
    state.status = status;
    state.available = available;
    state.denied = denied;
    notify();
  }

  function makeBuffers() {
    var count = options.analysisWidth * options.analysisHeight;
    frame = new Uint8Array(count);
    previous = new Uint8Array(count);
    var cells = 8 * 6;
    gridWeight = new Float32Array(cells);
    gridX = new Float32Array(cells);
    gridY = new Float32Array(cells);
    gridXX = new Float32Array(cells);
    gridYY = new Float32Array(cells);
    gridXY = new Float32Array(cells);
    gridXT = new Float32Array(cells);
    gridYT = new Float32Array(cells);
    gridActive = new Uint8Array(cells);
    gridVisited = new Uint8Array(cells);
    queue = new Int16Array(cells);
  }

  function makeCaptureElements() {
    if (!video) {
      video = document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('aria-hidden', 'true');
      video.tabIndex = -1;
      Object.assign(video.style, {
        position: 'fixed', width: '1px', height: '1px', opacity: '0',
        pointerEvents: 'none', transform: 'scaleX(-1)', left: '-2px', top: '-2px'
      });
      (document.body || document.documentElement).appendChild(video);
    }
    if (!canvas || canvas.width !== options.analysisWidth || canvas.height !== options.analysisHeight) {
      canvas = document.createElement('canvas');
      canvas.width = options.analysisWidth;
      canvas.height = options.analysisHeight;
      context = canvas.getContext('2d', { willReadFrequently: true });
      makeBuffers();
    }
  }

  function watchVideoFrames() {
    if (!video || !video.requestVideoFrameCallback) return;
    videoFrameCallbackId = video.requestVideoFrameCallback(function () {
      lastVideoFrameAt = performance.now();
      if (running) watchVideoFrames();
    });
  }

  function setMotion(x, y, energy, confidence, source, now) {
    var elapsed = Math.max(1, now - lastPositionAt) / 1000;
    var targetX = clamp(x, 0, 1);
    var targetY = clamp(y, 0, 1);
    var alpha = options.smoothing;
    var oldX = state.x;
    var oldY = state.y;
    state.x += (targetX - state.x) * alpha;
    state.y += (targetY - state.y) * alpha;
    state.velocityX = (state.x - oldX) / elapsed;
    state.velocityY = (state.y - oldY) / elapsed;
    state.motionEnergy += (clamp(energy, 0, 1) - state.motionEnergy) * options.energySmoothing;
    state.confidence += (clamp(confidence, 0, 1) - state.confidence) * 0.38;
    state.active = state.confidence > 0.04;
    state.source = source;
    state.lastSampleAt = now;
    lastPositionAt = now;
  }

  function applyInjection(now) {
    if (!injection) return false;
    setMotion(injection.x, injection.y, injection.motionEnergy, injection.confidence, injection.source, now);
    state.flowX = injection.flowX;
    state.flowY = injection.flowY;
    state.flowConfidence = injection.flowConfidence;
    state.cvLatencyMs = 0;
    notify();
    return true;
  }

  function analyze(now) {
    if (!video || video.readyState < 2 || !context || !frame) return;
    var interval = 1000 / options.targetFps;
    if (now - lastAnalysisAt < interval) return;
    lastAnalysisAt = now;
    var analysisStartedAt = performance.now();

    context.save();
    context.setTransform(-1, 0, 0, 1, options.analysisWidth, 0);
    context.drawImage(video, 0, 0, options.analysisWidth, options.analysisHeight);
    context.restore();
    var pixels;
    try { pixels = context.getImageData(0, 0, options.analysisWidth, options.analysisHeight).data; }
    catch (_) { setStatus('unavailable', false, false); return; }

    var width = options.analysisWidth;
    var height = options.analysisHeight;
    var count = frame.length;
    var cellWidth = width / 8;
    var cellHeight = height / 6;
    var totalDifference = 0;
    var totalWeight = 0;
    var activePixels = 0;
    var i;
    for (i = 0; i < count; i += 1) {
      var p = i * 4;
      frame[i] = (pixels[p] * 77 + pixels[p + 1] * 150 + pixels[p + 2] * 29) >> 8;
    }
    if (!hasPreviousFrame) {
      previous.set(frame);
      hasPreviousFrame = true;
      lastPositionAt = now;
      state.lastSampleAt = now;
      state.cvLatencyMs += (performance.now() - analysisStartedAt - state.cvLatencyMs) * 0.25;
      notify();
      return;
    }
    gridWeight.fill(0); gridX.fill(0); gridY.fill(0); gridXX.fill(0); gridYY.fill(0);
    gridXY.fill(0); gridXT.fill(0); gridYT.fill(0); gridActive.fill(0); gridVisited.fill(0);

    for (i = 0; i < count; i += 1) {
      var difference = Math.abs(frame[i] - previous[i]);
      totalDifference += difference;
      var px = i % width;
      var py = (i / width) | 0;
      var cell = Math.min(7, (px / cellWidth) | 0) + Math.min(5, (py / cellHeight) | 0) * 8;
      if (difference >= options.threshold) {
        var weight = difference - options.threshold + 1;
        gridWeight[cell] += weight;
        gridX[cell] += px * weight;
        gridY[cell] += py * weight;
        totalWeight += weight;
        activePixels += 1;
      }
      if (px && py && px < width - 1 && py < height - 1) {
        // Spatial gradients plus temporal change form a tiny Lucas-Kanade system per cell.
        var ix = (frame[i + 1] - frame[i - 1] + previous[i + 1] - previous[i - 1]) * 0.25;
        var iy = (frame[i + width] - frame[i - width] + previous[i + width] - previous[i - width]) * 0.25;
        var it = frame[i] - previous[i];
        gridXX[cell] += ix * ix;
        gridYY[cell] += iy * iy;
        gridXY[cell] += ix * iy;
        gridXT[cell] += ix * it;
        gridYT[cell] += iy * it;
      }
    }
    previous.set(frame);

    if (applyInjection(now)) {
      state.cvLatencyMs += (performance.now() - analysisStartedAt - state.cvLatencyMs) * 0.25;
      return;
    }

    var minimumCellWeight = Math.max(3, options.threshold * 0.16);
    for (i = 0; i < 48; i += 1) gridActive[i] = gridWeight[i] >= minimumCellWeight ? 1 : 0;
    var bestWeight = 0;
    var bestX = 0;
    var bestY = 0;
    var bestFlowX = 0;
    var bestFlowY = 0;
    var bestFlowConfidence = 0;
    for (i = 0; i < 48; i += 1) {
      if (!gridActive[i] || gridVisited[i]) continue;
      var head = 0;
      var tail = 0;
      var componentWeight = 0;
      var componentX = 0;
      var componentY = 0;
      var xx = 0, yy = 0, xy = 0, xt = 0, yt = 0;
      queue[tail++] = i;
      gridVisited[i] = 1;
      while (head < tail) {
        var cellIndex = queue[head++];
        componentWeight += gridWeight[cellIndex];
        componentX += gridX[cellIndex];
        componentY += gridY[cellIndex];
        xx += gridXX[cellIndex]; yy += gridYY[cellIndex]; xy += gridXY[cellIndex];
        xt += gridXT[cellIndex]; yt += gridYT[cellIndex];
        var column = cellIndex % 8;
        var row = (cellIndex / 8) | 0;
        var neighbor;
        if (column > 0) { neighbor = cellIndex - 1; if (gridActive[neighbor] && !gridVisited[neighbor]) { gridVisited[neighbor] = 1; queue[tail++] = neighbor; } }
        if (column < 7) { neighbor = cellIndex + 1; if (gridActive[neighbor] && !gridVisited[neighbor]) { gridVisited[neighbor] = 1; queue[tail++] = neighbor; } }
        if (row > 0) { neighbor = cellIndex - 8; if (gridActive[neighbor] && !gridVisited[neighbor]) { gridVisited[neighbor] = 1; queue[tail++] = neighbor; } }
        if (row < 5) { neighbor = cellIndex + 8; if (gridActive[neighbor] && !gridVisited[neighbor]) { gridVisited[neighbor] = 1; queue[tail++] = neighbor; } }
      }
      var determinant = xx * yy - xy * xy;
      var texture = determinant > 0 ? Math.sqrt(determinant) / (xx + yy + 0.001) : 0;
      if (componentWeight > bestWeight) {
        bestWeight = componentWeight;
        bestX = componentX / componentWeight;
        bestY = componentY / componentWeight;
        bestFlowConfidence = clamp(texture * 2.5, 0, 1);
        bestFlowX = determinant > 4 ? clamp((xy * yt - yy * xt) / determinant, -8, 8) : 0;
        bestFlowY = determinant > 4 ? clamp((xy * xt - xx * yt) / determinant, -8, 8) : 0;
      }
    }

    var energy = totalDifference / (count * 255);
    if (bestWeight && activePixels >= options.minMotionPixels) {
      var concentration = totalWeight ? bestWeight / totalWeight : 0;
      var confidence = clamp((activePixels / options.minMotionPixels) * concentration * (0.35 + bestFlowConfidence * 0.65), 0, 1);
      setMotion(bestX / Math.max(1, width - 1), bestY / Math.max(1, height - 1), energy, confidence, 'camera', now);
      if (bestFlowConfidence >= 0.035) {
        state.flowX += (bestFlowX / width - state.flowX) * 0.38;
        state.flowY += (bestFlowY / height - state.flowY) * 0.38;
        state.flowConfidence += (bestFlowConfidence - state.flowConfidence) * 0.35;
      } else {
        state.flowX *= 0.72;
        state.flowY *= 0.72;
        state.flowConfidence *= 0.65;
      }
    } else {
      state.motionEnergy += (energy - state.motionEnergy) * options.energySmoothing;
      state.confidence *= 0.72;
      state.flowX *= 0.62;
      state.flowY *= 0.62;
      state.flowConfidence *= 0.65;
      state.velocityX *= 0.6;
      state.velocityY *= 0.6;
      state.active = state.confidence > 0.04;
      state.lastSampleAt = now;
    }
    state.cvLatencyMs += (performance.now() - analysisStartedAt - state.cvLatencyMs) * 0.25;
    notify();
  }

  function frameLoop(now) {
    if (!running) return;
    analyze(now);
    rafId = global.requestAnimationFrame(frameLoop);
  }

  function stopVideoFrames() {
    if (video && videoFrameCallbackId && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(videoFrameCallbackId);
    videoFrameCallbackId = 0;
  }

  function stop() {
    running = false;
    if (rafId) global.cancelAnimationFrame(rafId);
    rafId = 0;
    stopVideoFrames();
    if (stream) stream.getTracks().forEach(function (track) { track.stop(); });
    stream = null;
    if (video) video.srcObject = null;
    if (context && canvas) context.clearRect(0, 0, canvas.width, canvas.height);
    if (frame) frame.fill(0);
    if (previous) previous.fill(0);
    hasPreviousFrame = false;
    state.active = false;
    state.motionEnergy = 0;
    state.confidence = 0;
    state.flowX = 0;
    state.flowY = 0;
    state.flowConfidence = 0;
    if (state.status === 'running' || state.status === 'requesting') setStatus('idle', false, false);
  }

  function requestCamera(constraints, timeoutMs) {
    var settled = false;
    var timer = 0;
    var request = navigator.mediaDevices.getUserMedia(constraints);
    return new Promise(function (resolve, reject) {
      timer = global.setTimeout(function () {
        if (settled) return;
        settled = true;
        var error = new Error('Camera request timed out.');
        error.name = 'TimeoutError';
        reject(error);
      }, timeoutMs);
      request.then(function (nextStream) {
        if (settled) {
          // A browser may fulfill getUserMedia after our experience has moved
          // on. Never leave that late camera stream alive in the background.
          nextStream.getTracks().forEach(function (track) { track.stop(); });
          return;
        }
        settled = true;
        global.clearTimeout(timer);
        resolve(nextStream);
      }, function (error) {
        if (settled) return;
        settled = true;
        global.clearTimeout(timer);
        reject(error);
      });
    });
  }

  async function start(nextOptions) {
    configure(nextOptions);
    if (disposed) {
      disposed = false;
      video = null; canvas = null; context = null;
    }
    if (running) return getState();
    if (startPromise) return startPromise;
    if (!global.navigator || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('unavailable', false, false);
      return getState();
    }
    setStatus('requesting', false, false);
    startPromise = requestCamera({
      audio: false,
      video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }
    }, 6500).then(function (nextStream) {
      stream = nextStream;
      makeCaptureElements();
      video.srcObject = stream;
      return video.play();
    }).then(function () {
      running = true;
      lastAnalysisAt = 0;
      lastVideoFrameAt = performance.now();
      hasPreviousFrame = false;
      setStatus('running', true, false);
      watchVideoFrames();
      rafId = global.requestAnimationFrame(frameLoop);
      return getState();
    }).catch(function (error) {
      if (stream) stream.getTracks().forEach(function (track) { track.stop(); });
      stream = null;
      var denied = error && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
      setStatus(denied ? 'denied' : 'unavailable', false, denied);
      return getState();
    }).finally(function () { startPromise = null; });
    return startPromise;
  }

  function getState() { return Object.assign({}, state); }

  function inject(sample) {
    sample = sample || {};
    injection = {
      x: clamp(Number.isFinite(sample.x) ? sample.x : state.x, 0, 1),
      y: clamp(Number.isFinite(sample.y) ? sample.y : state.y, 0, 1),
      motionEnergy: clamp(Number.isFinite(sample.motionEnergy) ? sample.motionEnergy : 1, 0, 1),
      confidence: clamp(Number.isFinite(sample.confidence) ? sample.confidence : 1, 0, 1),
      flowX: clamp(Number.isFinite(sample.flowX) ? sample.flowX : 0, -1, 1),
      flowY: clamp(Number.isFinite(sample.flowY) ? sample.flowY : 0, -1, 1),
      flowConfidence: clamp(Number.isFinite(sample.flowConfidence) ? sample.flowConfidence : 1, 0, 1),
      source: sample.source === 'pointer' || sample.source === 'touch' ? sample.source : 'synthetic'
    };
    applyInjection(Number.isFinite(sample.timestamp) ? sample.timestamp : performance.now());
    return getState();
  }

  function clearInjection() { injection = null; }

  function eventPoint(event, boundsProvider, source) {
    var point = event.touches && event.touches.length ? event.touches[0] : event;
    if (!point || !Number.isFinite(point.clientX) || !Number.isFinite(point.clientY)) return;
    var bounds = boundsProvider();
    if (!bounds || !bounds.width || !bounds.height) return;
    inject({
      x: (point.clientX - bounds.left) / bounds.width,
      y: (point.clientY - bounds.top) / bounds.height,
      source: source
    });
  }

  function enablePointerInjection(target, boundsProvider) {
    disablePointerInjection();
    target = target || global;
    boundsProvider = boundsProvider || function () { return { left: 0, top: 0, width: global.innerWidth, height: global.innerHeight }; };
    var onPointer = function (event) { eventPoint(event, boundsProvider, event.pointerType === 'touch' ? 'touch' : 'pointer'); };
    var onTouch = function (event) { eventPoint(event, boundsProvider, 'touch'); };
    target.addEventListener('pointerdown', onPointer, { passive: true });
    target.addEventListener('pointermove', onPointer, { passive: true });
    target.addEventListener('touchstart', onTouch, { passive: true });
    target.addEventListener('touchmove', onTouch, { passive: true });
    pointerBinding = { target: target, onPointer: onPointer, onTouch: onTouch };
  }

  function disablePointerInjection() {
    if (!pointerBinding) return;
    var binding = pointerBinding;
    binding.target.removeEventListener('pointerdown', binding.onPointer);
    binding.target.removeEventListener('pointermove', binding.onPointer);
    binding.target.removeEventListener('touchstart', binding.onTouch);
    binding.target.removeEventListener('touchmove', binding.onTouch);
    if (injection && (injection.source === 'pointer' || injection.source === 'touch')) injection = null;
    pointerBinding = null;
  }

  function subscribe(callback) {
    if (typeof callback !== 'function') return function () {};
    listeners.push(callback);
    return function () {
      var index = listeners.indexOf(callback);
      if (index >= 0) listeners.splice(index, 1);
    };
  }

  function dispose() {
    stop();
    disablePointerInjection();
    listeners.length = 0;
    if (video && video.parentNode) video.parentNode.removeChild(video);
    video = null; canvas = null; context = null;
    frame = null; previous = null; gridWeight = null; gridX = null; gridY = null;
    gridXX = null; gridYY = null; gridXY = null; gridXT = null; gridYT = null;
    gridActive = null; gridVisited = null; queue = null;
    disposed = true;
  }

  global.MotionVision = {
    start: start,
    stop: stop,
    dispose: dispose,
    configure: configure,
    getConfig: function () { return Object.assign({}, options); },
    update: function (now) { analyze(Number.isFinite(now) ? now : performance.now()); return getState(); },
    getState: getState,
    subscribe: subscribe,
    inject: inject,
    clearInjection: clearInjection,
    enablePointerInjection: enablePointerInjection,
    disablePointerInjection: disablePointerInjection
  };
})(window);
