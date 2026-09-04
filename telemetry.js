/*
 * Hidden, opt-in instrumentation for the watercolor experience.
 *
 * The module deliberately keeps its input surface scalar. In particular, a
 * frame sample is never retained wholesale: camera frames, landmarks, and any
 * other incidental data cannot leak into a snapshot or a console export.
 */
(function installExperienceTelemetry(global) {
  'use strict';

  if (!global || global.ExperienceTelemetry) return;

  var document = global.document;
  var hasDOM = !!(document && document.createElement);
  var now = function getNow() {
    return global.performance && typeof global.performance.now === 'function'
      ? global.performance.now()
      : Date.now();
  };

  var DEFAULTS = Object.freeze({
    perceptionSensitivity: 0.58,
    waterSpread: 0.64,
    pigmentIntensity: 0.72,
    dryingTempo: 0.46,
    memoryFadeTempo: 0.55
  });

  var PARAMS = [
    { key: 'perceptionSensitivity', label: 'Perception sensitivity', group: 'Perception' },
    { key: 'waterSpread', label: 'Water spread', group: 'Water' },
    { key: 'pigmentIntensity', label: 'Pigment intensity', group: 'Pigment' },
    { key: 'dryingTempo', label: 'Drying tempo', group: 'Drying' },
    { key: 'memoryFadeTempo', label: 'Memory / fade tempo', group: 'Memory' }
  ];
  var PARAM_KEYS = PARAMS.reduce(function collectKeys(keys, parameter) {
    keys[parameter.key] = true;
    return keys;
  }, {});

  var EVENTS = Object.freeze({
    settingsChange: 'experience-telemetry:settingschange'
  });

  var state = {
    settings: clone(DEFAULTS),
    metrics: {
      fps: 0,
      renderFrameMs: 0,
      cvLatencyMs: 0,
      cvConfidence: 0,
      motionEnergy: 0,
      wetCoverage: 0,
      pigmentLoad: 0,
      phase: 'idle',
      source: 'unknown'
    },
    lastTimestamp: 0,
    sampleCount: 0,
    visible: false,
    destroyed: false,
    renderPending: false,
    lastPanelRender: 0,
    listeners: Object.create(null)
  };

  var panel = null;
  var controls = Object.create(null);
  var metricNodes = Object.create(null);
  var keyboardHandler = null;
  var styleNode = null;

  function clone(value) {
    var result = {};
    Object.keys(value).forEach(function copy(key) {
      result[key] = value[key];
    });
    return result;
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function numberOr(value, fallback) {
    return typeof value === 'number' && isFinite(value) ? value : fallback;
  }

  function ratio(value, fallback) {
    var numeric = numberOr(value, fallback);
    // Accept percentages at the boundary, while retaining a normalized value.
    if (numeric > 1 && numeric <= 100) numeric /= 100;
    return clamp(numeric, 0, 1);
  }

  function smooth(previous, next, alpha) {
    return previous === 0 ? next : previous + (next - previous) * alpha;
  }

  function textValue(value, fallback) {
    if (typeof value !== 'string' && typeof value !== 'number') return fallback;
    var text = String(value).replace(/\s+/g, ' ').trim();
    return text ? text.slice(0, 28) : fallback;
  }

  function getSampleValue(sample, keys, fallback) {
    for (var i = 0; i < keys.length; i += 1) {
      if (sample[keys[i]] !== undefined && sample[keys[i]] !== null) return sample[keys[i]];
    }
    return fallback;
  }

  function dispatchSettingsChange(detail) {
    var callbacks = state.listeners.settingschange || [];
    callbacks.slice().forEach(function call(listener) {
      try { listener(detail); } catch (_) { /* Instrumentation callbacks cannot stop the experience. */ }
    });
    (state.listeners.change || []).slice().forEach(function callChange(listener) {
      try { listener(detail); } catch (_) { /* Instrumentation callbacks cannot stop the experience. */ }
    });

    if (!hasDOM || typeof global.dispatchEvent !== 'function') return;
    var event;
    if (typeof global.CustomEvent === 'function') {
      event = new global.CustomEvent(EVENTS.settingsChange, { detail: detail });
    } else if (typeof document.createEvent === 'function') {
      event = document.createEvent('CustomEvent');
      event.initCustomEvent(EVENTS.settingsChange, false, false, detail);
    }
    if (event) global.dispatchEvent(event);
  }

  function canonicalSettingEntries(next) {
    var entries = [];
    if (!next || typeof next !== 'object') return entries;
    Object.keys(PARAM_KEYS).forEach(function directKey(key) {
      if (next[key] !== undefined) entries.push([key, next[key]]);
    });
    var nested = [
      ['perception', 'sensitivity', 'perceptionSensitivity'],
      ['water', 'spread', 'waterSpread'],
      ['pigment', 'intensity', 'pigmentIntensity'],
      ['drying', 'tempo', 'dryingTempo'],
      ['memory', 'fadeTempo', 'memoryFadeTempo']
    ];
    nested.forEach(function nestedEntry(parts) {
      if (next[parts[0]] && typeof next[parts[0]] === 'object' && next[parts[0]][parts[1]] !== undefined) {
        entries.push([parts[2], next[parts[0]][parts[1]]]);
      }
    });
    return entries;
  }

  function renderSettingsControls() {
    Object.keys(controls).forEach(function updateControl(key) {
      if (!controls[key]) return;
      var value = state.settings[key].toFixed(2);
      controls[key].input.value = value;
      controls[key].output.textContent = value;
    });
  }

  function formatNumber(value, digits) {
    return numberOr(value, 0).toFixed(digits);
  }

  function renderPanel() {
    if (!panel || !state.visible) return;
    var metrics = state.metrics;
    metricNodes.fps.textContent = formatNumber(metrics.fps, 1);
    metricNodes.renderFrameMs.textContent = formatNumber(metrics.renderFrameMs, 1) + ' ms';
    metricNodes.cvLatencyMs.textContent = formatNumber(metrics.cvLatencyMs, 1) + ' ms';
    metricNodes.cvConfidence.textContent = Math.round(metrics.cvConfidence * 100) + '%';
    metricNodes.motionEnergy.textContent = Math.round(metrics.motionEnergy * 100) + '%';
    metricNodes.wetCoverage.textContent = Math.round(metrics.wetCoverage * 100) + '%';
    metricNodes.pigmentLoad.textContent = Math.round(metrics.pigmentLoad * 100) + '%';
    metricNodes.phase.textContent = metrics.phase;
    metricNodes.source.textContent = metrics.source;
    renderSettingsControls();
    state.lastPanelRender = now();
  }

  function requestPanelRender() {
    if (!panel || !state.visible || state.renderPending) return;
    var elapsed = now() - state.lastPanelRender;
    if (elapsed >= 120) {
      renderPanel();
      return;
    }
    state.renderPending = true;
    var wait = Math.max(16, 120 - elapsed);
    global.setTimeout(function throttledPanelRender() {
      state.renderPending = false;
      renderPanel();
    }, wait);
  }

  function metricRow(key, label) {
    var row = document.createElement('div');
    row.className = 'experience-telemetry__metric';
    var name = document.createElement('span');
    name.textContent = label;
    var value = document.createElement('strong');
    value.textContent = '—';
    row.appendChild(name);
    row.appendChild(value);
    metricNodes[key] = value;
    return row;
  }

  function section(title, rows) {
    var wrapper = document.createElement('section');
    wrapper.className = 'experience-telemetry__section';
    var heading = document.createElement('h3');
    heading.textContent = title;
    wrapper.appendChild(heading);
    rows.forEach(function appendRow(row) { wrapper.appendChild(row); });
    return wrapper;
  }

  function createPanel() {
    if (!hasDOM || panel) return;
    styleNode = document.createElement('style');
    styleNode.setAttribute('data-experience-telemetry-style', '');
    styleNode.textContent = [
      '[data-experience-telemetry]{position:fixed;z-index:2147483646;top:12px;left:12px;width:min(304px,calc(100vw - 24px));max-height:calc(100svh - 24px);overflow:auto;padding:12px 13px 11px;border:1px solid rgba(255,255,255,.18);border-radius:12px;color:#f9f4ec;background:rgba(28,24,23,.92);box-shadow:0 16px 42px rgba(35,23,15,.2);font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.01em;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}',
      '[data-experience-telemetry][hidden]{display:none}',
      '.experience-telemetry__header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}',
      '.experience-telemetry__title{margin:0;font-size:11px;letter-spacing:.12em;font-weight:700}',
      '.experience-telemetry__hint{color:rgba(249,244,236,.52);font-size:9px}',
      '.experience-telemetry__section{margin:0 0 10px;padding-top:8px;border-top:1px solid rgba(255,255,255,.12)}',
      '.experience-telemetry__section h3{margin:0 0 5px;color:#f4c7a9;font-size:9px;letter-spacing:.14em;text-transform:uppercase;font-weight:700}',
      '.experience-telemetry__metric{display:flex;align-items:baseline;justify-content:space-between;gap:12px;min-height:17px}',
      '.experience-telemetry__metric span{color:rgba(249,244,236,.68)}',
      '.experience-telemetry__metric strong{max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff;font-weight:600}',
      '.experience-telemetry__parameter{display:grid;grid-template-columns:1fr 94px 28px;align-items:center;gap:7px;min-height:25px}',
      '.experience-telemetry__parameter label{color:rgba(249,244,236,.76);font-size:10px}',
      '.experience-telemetry__parameter input{width:100%;margin:0;accent-color:#efaa85}',
      '.experience-telemetry__parameter output{color:#fff;text-align:right}',
      '.experience-telemetry__actions{display:flex;gap:6px;margin-top:3px}',
      '.experience-telemetry__actions button{flex:1;border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:5px 7px;color:#f9f4ec;background:rgba(255,255,255,.08);font:inherit;font-size:10px;cursor:pointer}',
      '.experience-telemetry__actions button:hover{background:rgba(255,255,255,.15)}',
      '.experience-telemetry__actions button:focus-visible{outline:1px solid #f4c7a9;outline-offset:2px}'
    ].join('');
    (document.head || document.documentElement).appendChild(styleNode);

    panel = document.createElement('aside');
    panel.id = 'experience-telemetry';
    panel.setAttribute('data-experience-telemetry', '');
    panel.setAttribute('aria-label', 'Experience telemetry');
    panel.hidden = true;

    var header = document.createElement('div');
    header.className = 'experience-telemetry__header';
    var title = document.createElement('h2');
    title.className = 'experience-telemetry__title';
    title.textContent = 'EXPERIENCE TELEMETRY';
    var hint = document.createElement('span');
    hint.className = 'experience-telemetry__hint';
    hint.textContent = '⌥⇧T toggle · esc hide';
    header.appendChild(title);
    header.appendChild(hint);
    panel.appendChild(header);

    panel.appendChild(section('Performance', [
      metricRow('fps', 'Smoothed FPS'),
      metricRow('renderFrameMs', 'Render frame'),
      metricRow('cvLatencyMs', 'CV latency')
    ]));
    panel.appendChild(section('Perception', [
      metricRow('cvConfidence', 'CV confidence'),
      metricRow('motionEnergy', 'Motion energy')
    ]));
    panel.appendChild(section('Watercolor', [
      metricRow('wetCoverage', 'Wet coverage'),
      metricRow('pigmentLoad', 'Pigment load')
    ]));
    panel.appendChild(section('Runtime', [
      metricRow('phase', 'Lifecycle phase'),
      metricRow('source', 'Camera / fallback')
    ]));

    var parameterRows = PARAMS.map(function makeParameter(parameter) {
      var row = document.createElement('div');
      row.className = 'experience-telemetry__parameter';
      var label = document.createElement('label');
      label.textContent = parameter.group + ' · ' + parameter.label.replace(parameter.group + ' ', '');
      var input = document.createElement('input');
      input.type = 'range';
      input.min = '0';
      input.max = '1';
      input.step = '0.01';
      input.value = state.settings[parameter.key].toFixed(2);
      input.setAttribute('aria-label', parameter.label);
      var output = document.createElement('output');
      output.textContent = input.value;
      input.addEventListener('input', function onParameterInput() {
        output.textContent = Number(input.value).toFixed(2);
        api.setParameter(parameter.key, Number(input.value), { source: 'panel' });
      });
      controls[parameter.key] = { input: input, output: output };
      row.appendChild(label);
      row.appendChild(input);
      row.appendChild(output);
      return row;
    });
    panel.appendChild(section('Tuning · normalized 0–1', parameterRows));

    var actions = document.createElement('div');
    actions.className = 'experience-telemetry__actions';
    var reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = 'Reset defaults';
    reset.addEventListener('click', function resetFromPanel() { api.resetDefaults('panel'); });
    var exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.textContent = 'Export console';
    exportButton.addEventListener('click', function exportFromPanel() { api.exportSnapshot(); });
    var close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Hide';
    close.addEventListener('click', function hideFromPanel() { api.hide(); });
    actions.appendChild(reset);
    actions.appendChild(exportButton);
    actions.appendChild(close);
    panel.appendChild(actions);
    (document.body || document.documentElement).appendChild(panel);
  }

  function queryOptIn() {
    if (!global.location || typeof global.location.search !== 'string') return false;
    try {
      var params = new global.URLSearchParams(global.location.search);
      return params.get('telemetry') === '1';
    } catch (error) {
      return /(?:^|[?&])telemetry=1(?:&|$)/.test(global.location.search);
    }
  }

  function startKeyboardControls() {
    if (!hasDOM || keyboardHandler) return;
    keyboardHandler = function onTelemetryKey(event) {
      var key = String(event.key || '').toLowerCase();
      if (key === 't' && event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        api.toggle();
      } else if (key === 'escape' && state.visible) {
        api.hide();
      }
    };
    document.addEventListener('keydown', keyboardHandler);
  }

  var api = {
    version: '1.0.0',
    events: EVENTS,
    defaults: clone(DEFAULTS),

    show: function show() {
      if (state.destroyed) return api;
      createPanel();
      if (!panel) return api;
      state.visible = true;
      panel.hidden = false;
      renderPanel();
      return api;
    },

    hide: function hide() {
      state.visible = false;
      if (panel) panel.hidden = true;
      return api;
    },

    toggle: function toggle() {
      return state.visible ? api.hide() : api.show();
    },

    isVisible: function isVisible() {
      return state.visible;
    },

    recordFrame: function recordFrame(sample) {
      if (state.destroyed || !sample || typeof sample !== 'object') return api;
      var timestamp = numberOr(getSampleValue(sample, ['timestamp', 'time'], now()), now());
      var delta = state.lastTimestamp > 0 ? timestamp - state.lastTimestamp : 0;
      state.lastTimestamp = timestamp;
      var measuredFrameMs = delta > 0 && delta < 10000 ? delta : state.metrics.renderFrameMs;
      var explicitFrameMs = getSampleValue(sample, ['renderFrameMs', 'renderMs', 'frameMs'], measuredFrameMs);
      var fps = getSampleValue(sample, ['fps', 'framesPerSecond'], delta > 0 ? 1000 / delta : 0);
      var cvLatency = getSampleValue(sample, ['cvLatencyMs', 'cvLatency', 'latencyMs'], state.metrics.cvLatencyMs);
      state.metrics.fps = smooth(state.metrics.fps, clamp(numberOr(fps, 0), 0, 240), 0.18);
      state.metrics.renderFrameMs = smooth(state.metrics.renderFrameMs, clamp(numberOr(explicitFrameMs, 0), 0, 10000), 0.18);
      state.metrics.cvLatencyMs = smooth(state.metrics.cvLatencyMs, clamp(numberOr(cvLatency, 0), 0, 10000), 0.18);
      state.metrics.cvConfidence = smooth(state.metrics.cvConfidence, ratio(getSampleValue(sample, ['cvConfidence', 'confidence'], state.metrics.cvConfidence), state.metrics.cvConfidence), 0.14);
      state.metrics.motionEnergy = smooth(state.metrics.motionEnergy, ratio(getSampleValue(sample, ['motionEnergy', 'motion'], state.metrics.motionEnergy), state.metrics.motionEnergy), 0.14);
      state.metrics.wetCoverage = smooth(state.metrics.wetCoverage, ratio(getSampleValue(sample, ['wetCoverage', 'wet'], state.metrics.wetCoverage), state.metrics.wetCoverage), 0.14);
      state.metrics.pigmentLoad = smooth(state.metrics.pigmentLoad, ratio(getSampleValue(sample, ['pigmentLoad', 'pigment'], state.metrics.pigmentLoad), state.metrics.pigmentLoad), 0.14);
      state.metrics.phase = textValue(getSampleValue(sample, ['phase', 'lifecyclePhase'], state.metrics.phase), state.metrics.phase);
      state.metrics.source = textValue(getSampleValue(sample, ['source', 'cameraSource', 'inputSource'], state.metrics.source), state.metrics.source);
      state.sampleCount += 1;
      requestPanelRender();
      return api;
    },

    // Short aliases keep the hot path pleasant without creating another API shape.
    sample: function sample(frameSample) { return api.recordFrame(frameSample); },
    frame: function frame(frameSample) { return api.recordFrame(frameSample); },

    setPhase: function setPhase(phase) {
      state.metrics.phase = textValue(phase, state.metrics.phase);
      requestPanelRender();
      return api;
    },

    setSource: function setSource(source) {
      state.metrics.source = textValue(source, state.metrics.source);
      requestPanelRender();
      return api;
    },

    getSettings: function getSettings() {
      return clone(state.settings);
    },

    setSettings: function setSettings(next, meta) {
      var changes = {};
      canonicalSettingEntries(next).forEach(function applyEntry(entry) {
        var key = entry[0];
        var value = clamp(numberOr(entry[1], state.settings[key]), 0, 1);
        if (Math.abs(value - state.settings[key]) < 0.0001) return;
        changes[key] = { previous: state.settings[key], value: value };
        state.settings[key] = value;
      });
      if (Object.keys(changes).length) {
        dispatchSettingsChange({
          source: meta && meta.source ? String(meta.source).slice(0, 32) : 'api',
          settings: clone(state.settings),
          changes: changes
        });
        renderSettingsControls();
      }
      return api;
    },

    setParameter: function setParameter(name, value, meta) {
      var update = {};
      update[name] = value;
      return api.setSettings(update, meta);
    },

    resetDefaults: function resetDefaults(source) {
      return api.setSettings(DEFAULTS, { source: source || 'reset' });
    },

    on: function on(eventName, listener) {
      if (typeof listener !== 'function') return function noop() {};
      var name = eventName === EVENTS.settingsChange ? 'settingschange' : eventName;
      if (!state.listeners[name]) state.listeners[name] = [];
      state.listeners[name].push(listener);
      return function unsubscribe() {
        var listeners = state.listeners[name] || [];
        var index = listeners.indexOf(listener);
        if (index !== -1) listeners.splice(index, 1);
      };
    },

    onSettingsChange: function onSettingsChange(listener) {
      return api.on('settingschange', listener);
    },

    snapshot: function snapshot() {
      return {
        version: api.version,
        samples: state.sampleCount,
        metrics: {
          fps: Number(formatNumber(state.metrics.fps, 1)),
          renderFrameMs: Number(formatNumber(state.metrics.renderFrameMs, 1)),
          cvLatencyMs: Number(formatNumber(state.metrics.cvLatencyMs, 1)),
          cvConfidence: Number(state.metrics.cvConfidence.toFixed(3)),
          motionEnergy: Number(state.metrics.motionEnergy.toFixed(3)),
          wetCoverage: Number(state.metrics.wetCoverage.toFixed(3)),
          pigmentLoad: Number(state.metrics.pigmentLoad.toFixed(3)),
          phase: state.metrics.phase,
          source: state.metrics.source
        },
        settings: clone(state.settings)
      };
    },

    exportSnapshot: function exportSnapshot() {
      var result = api.snapshot();
      if (global.console && typeof global.console.info === 'function') {
        global.console.info('[ExperienceTelemetry] snapshot', result);
      }
      return result;
    },

    destroy: function destroy() {
      state.destroyed = true;
      state.visible = false;
      if (hasDOM && keyboardHandler) document.removeEventListener('keydown', keyboardHandler);
      if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
      if (styleNode && styleNode.parentNode) styleNode.parentNode.removeChild(styleNode);
      panel = null;
      styleNode = null;
      return api;
    }
  };

  global.ExperienceTelemetry = api;
  if (hasDOM) {
    startKeyboardControls();
    if (queryOptIn()) {
      if (document.body) api.show();
      else document.addEventListener('DOMContentLoaded', function showOptedInTelemetry() { api.show(); }, { once: true });
    }
  }
}(typeof globalThis !== 'undefined' ? globalThis : this));
