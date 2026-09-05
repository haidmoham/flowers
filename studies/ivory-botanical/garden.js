(() => {
  'use strict';

  const canvas = document.querySelector('#herbarium');
  // The owner explicitly requests full playback for this private, single-viewer piece.
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    powerPreference: 'low-power',
  });
  let elapsed = 0;
  let last = 0;
  let frame = 0;
  let ready = false;
  let revealMode = 'ripple';
  const motionControls = document.querySelector('.reveal-modes');
  // Source-image coordinates keep each wave attached to its bloom during resize.
  const rippleBlooms = [
    [.51, .48, .25, 3.2], [.25, .32, .20, 4.5], [.43, .27, .16, 5.2],
    [.62, .18, .20, 6.0], [.76, .35, .18, 7.0], [.25, .55, .19, 8.0],
    [.74, .59, .17, 9.0], [.43, .71, .10, 10.0], [.68, .77, .16, 11.0],
  ];
  const waveCalls = rippleBlooms.map(([x, y, radius, delay]) =>
    `flowerWave(q, vec2(${x.toFixed(3)}, ${y.toFixed(3)}), ${radius.toFixed(3)}, ${delay.toFixed(3)}, rippleArrival, rippleInk);`
  ).join('\n');
  const presets = {
    sis1: ['#d34a32', '#ad3e70'],
    moon: ['#6872ad', '#557cae'],
    dawn: ['#ddb946', '#d34a32'],
  };
  const flowers = [
    { name: 'apricot', hex: '#f2a27d' },
    { name: 'magenta', hex: '#ad3e70' },
    { name: 'coral', hex: '#d34a32' },
    { name: 'gold', hex: '#ddb946' },
    { name: 'cream', hex: '#f2df9f' },
    { name: 'violet', hex: '#6872ad' },
    { name: 'cornflower', hex: '#557cae' },
    { name: 'blush', hex: '#e99aab' },
  ];
  let preset = 'sis1';
  let activeRole = 'a';
  const picker = document.querySelector('.palette');
  const inputs = ['a', 'b'].map(id => document.querySelector(`#colour-${id}`));
  const specimens = new Map();
  const rgb = hex => hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16) / 255);
  const flowerName = hex => flowers.find(flower => flower.hex === hex)?.name || 'your shade';

  function fallback() {
    ready = false;
    cancelAnimationFrame(frame);
    frame = 0;
    canvas.classList.add('fallback');
    picker.hidden = true;
    motionControls.hidden = true;
  }

  if (!gl) {
    fallback();
    return;
  }

  const vertex = `
    attribute vec2 p;
    varying vec2 uv;
    void main() {
      uv = p * .5 + .5;
      gl_Position = vec4(p, 0., 1.);
    }
  `;

  const fragment = `
    precision highp float;
    varying vec2 uv;
    uniform sampler2D art;
    uniform sampler2D arrival;
    uniform sampler2D petalMask;
    uniform vec2 viewport;
    uniform vec2 imageSize;
    uniform vec2 stageSize;
    uniform float stageTop;
    uniform float time;
    uniform float rippleMode;
    uniform vec3 colourA;
    uniform vec3 colourB;
    uniform float recolour;
    uniform float specimen;
    uniform vec3 specimenColour;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    vec3 dye(vec3 source, vec3 tint) {
      float light = dot(source, vec3(.25, .6, .15));
      // Deeper folds and less cream retain the chosen hue in translucent petals.
      vec3 dyed = tint * (.38 + light * .80);
      dyed = mix(dyed, vec3(1., .96, .91), smoothstep(.52, .92, light) * .18);
      dyed = mix(dyed, source, .035);
      return dyed;
    }

    vec3 pigment(vec3 source, vec2 q) {
      // Authored source-pixel ownership replaces overlapping oval regions.
      // Linear sampling antialiases only the one-pixel boundary between blooms.
      vec2 petals = texture2D(petalMask, q).rg;
      return source + recolour * (
        petals.r * (dye(source, colourA) - source)
        + petals.g * (dye(source, colourB) - source));
    }

    float presence(vec3 source) {
      float light = dot(source, vec3(.25, .6, .15));
      float saturation = max(source.r, max(source.g, source.b)) - min(source.r, min(source.g, source.b));
      return 1. - smoothstep(.58, .84, light) * (1. - smoothstep(.18, .32, saturation));
    }

    void flowerWave(vec2 q, vec2 centre, float scale, float delay,
      inout float arrivalTime, inout float ringInk) {
      vec2 local = (q - centre) * vec2(.8, 1.) / scale;
      float angle = atan(local.y, local.x);
      float edge = 1. + .045 * sin(angle * 7. + delay);
      float distance = length(local) / edge;
      // Overlapping fronts form a continuous field; no hard region boundaries.
      arrivalTime = min(arrivalTime, delay + distance * 2.8);
      float progress = clamp((time - delay) / 3.6, 0., 1.);
      float radius = .12 + progress * 1.25;
      float line = 1. - smoothstep(.001, .004, abs(distance - radius));
      ringInk += line * max(0., sin(progress * 3.141593)) * .085;
    }

    vec3 bud(vec3 bg, vec2 point, vec2 centre, float scale, float angle, float delay) {
      vec2 b = (point - centre) / scale;
      b = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * b;
      vec2 q = vec2(.397, .145) + b * vec2(.057, .064);
      float mask = 1. - smoothstep(.55, 1., length(b));
      vec3 source = texture2D(art, q).rgb;
      return mix(bg, pigment(source, q), mask * presence(source) * smoothstep(delay, delay + 2., time));
    }

    void main() {
      if (specimen > .5) {
        vec2 s = vec2(uv.x, 1. - uv.y);
        vec2 q = vec2(.445, .068) + s * vec2(.36, .225);
        vec3 source = texture2D(art, q).rgb;
        float edge = smoothstep(0., .05, s.x) * smoothstep(0., .05, 1. - s.x)
          * smoothstep(0., .05, s.y) * smoothstep(0., .09, 1. - s.y);
        edge *= 1. - smoothstep(.88, 1., length((s - vec2(.5, .43)) / vec2(.52, .56)));
        vec2 petals = texture2D(petalMask, q).rg;
        gl_FragColor = vec4(mix(source, dye(source, specimenColour), petals.r + petals.g), presence(source) * edge);
        return;
      }
      vec2 pixel = vec2(uv.x, 1. - uv.y) * viewport;
      float aspect = imageSize.x / imageSize.y;
      float height = min(stageSize.y * .90, stageSize.x * .88 / aspect);
      vec2 point = (pixel - vec2(stageSize.x * .48, stageTop + stageSize.y * .48)) / height;
      float tilt = -.13;
      vec2 turned = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt)) * point;
      // A gentle shear opens the top cluster while keeping the gathered stems intact.
      vec2 q = turned / vec2(aspect, 1.) + .5;
      q.x += sin(q.y * 5.) * .018;
      vec3 base = vec3(.964706, .937255, .894118);
      float grain = (hash(floor(pixel)) - .5) * .006;
      vec3 bg = base + grain;
      // Quiet ochre washes stay at the perimeter, behind the astral subject.
      float edgeWash = pow(abs(uv.x - .5) * 2., 3.) * .026;
      edgeWash *= .6 + .4 * sin(uv.y * 17. + sin(uv.x * 12.));
      bg = mix(bg, vec3(.70, .51, .30), edgeWash);

      float appear = smoothstep(2., 14., time);
      float rippleArrival = 100.;
      float rippleInk = 0.;
      if (rippleMode > .5 && time < 18.) {
        ${waveCalls}
      }
      vec2 orbit = mat2(.91, -.414, .414, .91) * (point + vec2(.02, .07));
      float radius = length(orbit / vec2(.48, .26));
      float halo = exp(-pow((radius - .96) * 3.2, 2.));
      vec3 aura = mix(colourA, colourB, .5 + .5 * sin(atan(orbit.y, orbit.x) * 2. + time * .045));
      bg = mix(bg, mix(vec3(1.), aura, .32), halo * .045 * appear);
      float ring = (1. - smoothstep(.001, .004, abs(radius - 1.))) * .07;
      ring += (1. - smoothstep(.001, .003, abs(length(orbit / vec2(.40, .32)) - 1.))) * .04;
      bg = mix(bg, mix(aura, vec3(.65, .53, .7), .6), ring * appear);
      bg = mix(bg, mix(colourA, colourB, .5), min(rippleInk, .12));

      // Sparse, stationary dust has a slow light cycle. Avoid a moving starfield.
      vec2 cell = floor(pixel / 48.);
      vec2 speck = (fract(pixel / 48.) - vec2(hash(cell), hash(cell + 8.))) * 48.;
      float chance = step(.87, hash(cell + 17.));
      float twinkle = .55 + .45 * sin(time * .55 + hash(cell) * 6.28);
      float dust = exp(-dot(speck, speck) / 1.2) * chance * twinkle;
      bg = mix(bg, vec3(.70, .62, .65), dust * .10 * halo * appear);
      bg = bud(bg, point, vec2(-.37, -.25), .058, -.8, 10.);
      bg = bud(bg, point, vec2(.35, -.35), .045, .8, 12.);
      bg = bud(bg, point, vec2(.40, .17), .032, 1.8, 14.);

      if (q.x < 0. || q.x > 1. || q.y < 0. || q.y > 1.) {
        gl_FragColor = vec4(bg, 1.);
        return;
      }

      vec3 source = texture2D(art, q).rgb;
      float when = texture2D(arrival, q).r * 20.;
      when = mix(when, min(rippleArrival, 17.), rippleMode);
      float exposure = smoothstep(when - .23, when + .62, time);
      float feather = smoothstep(0., .09, q.x)
        * smoothstep(0., .09, 1. - q.x)
        * smoothstep(0., .065, q.y)
        * smoothstep(0., .065, 1. - q.y);

      // The source paper must not travel with the reveal as tan bands around stems.
      vec3 dyed = pigment(source, q);
      vec3 colour = mix(bg, dyed, exposure * feather * presence(source));
      gl_FragColor = vec4(colour, 1.);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }
    gl.useProgram(program);
  } catch (error) {
    console.error('Flower renderer could not start:', error);
    fallback();
    return;
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1,
  ]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uViewport = gl.getUniformLocation(program, 'viewport');
  const uTime = gl.getUniformLocation(program, 'time');
  const uRipple = gl.getUniformLocation(program, 'rippleMode');
  const uImage = gl.getUniformLocation(program, 'imageSize');
  const uA = gl.getUniformLocation(program, 'colourA');
  const uB = gl.getUniformLocation(program, 'colourB');
  const uRecolour = gl.getUniformLocation(program, 'recolour');
  const uStage = gl.getUniformLocation(program, 'stageSize');
  const uStageTop = gl.getUniformLocation(program, 'stageTop');
  const uSpecimen = gl.getUniformLocation(program, 'specimen');
  const uSpecimenColour = gl.getUniformLocation(program, 'specimenColour');

  // The specimen and bouquet share dye(), so the chooser previews real pigment.
  function specimenImage(hex) {
    if (specimens.has(hex)) return specimens.get(hex);
    const width = 144, height = 112;
    const target = gl.createTexture();
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, target);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
    gl.viewport(0, 0, width, height);
    gl.uniform1f(uSpecimen, 1);
    gl.uniform3fv(uSpecimenColour, rgb(hex));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const preview = document.createElement('canvas');
    preview.width = width;
    preview.height = height;
    const context = preview.getContext('2d');
    const data = context.createImageData(width, height);
    for (let row = 0; row < height; row++) {
      data.data.set(pixels.subarray(row * width * 4, (row + 1) * width * 4), (height - row - 1) * width * 4);
    }
    context.putImageData(data, 0, 0);
    const url = preview.toDataURL();
    // Cache only the fixed collection. Custom shade dragging must not grow memory.
    if (flowers.some(flower => flower.hex === hex)) specimens.set(hex, url);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fbo);
    gl.deleteTexture(target);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1f(uSpecimen, 0);
    gl.viewport(0, 0, canvas.width, canvas.height);
    return url;
  }

  function updatePalette() {
    inputs.forEach((input, i) => {
      gl.uniform3fv(i === 0 ? uA : uB, rgb(input.value));
      document.documentElement.style.setProperty(`--colour-${i === 0 ? 'a' : 'b'}`, input.value);
      const role = i === 0 ? 'a' : 'b';
      document.querySelector(`#name-${role}`).textContent = flowerName(input.value);
      if (ready) {
        const image = document.querySelector(`[data-role="${role}"] img`);
        if (image.dataset.colour !== input.value) {
          image.src = specimenImage(input.value);
          if (image.dataset.colour && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
            image.getAnimations().forEach(animation => animation.cancel());
            image.animate([
              { transform: 'translateY(3px) rotate(-7deg) scale(.88)' },
              { transform: 'translateY(-4px) rotate(3deg) scale(1.12)', offset: .55 },
              { transform: 'translateY(0) rotate(0) scale(1)' },
            ], { duration: 460, easing: 'cubic-bezier(.2,.7,.3,1)' });
          }
          image.dataset.colour = input.value;
        }
      }
    });
    gl.uniform1f(uRecolour, 1);
    document.querySelectorAll('[data-preset]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.preset === preset));
    });
    document.querySelectorAll('[data-flower]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.flower === inputs[activeRole === 'a' ? 0 : 1].value));
    });
    document.querySelector('#palette-status').textContent = `${flowerName(inputs[0].value)} at the heart, ${flowerName(inputs[1].value)} around it.`;
    render();
  }

  function showSelection() {
    // A colour decision needs the complete bouquet, even during the arrival.
    elapsed = Math.max(elapsed, 21);
    updatePalette();
  }

  function closePicker() {
    picker.open = false;
    picker.querySelector('summary').focus();
  }

  function selectPreset(name) {
    preset = name;
    inputs.forEach((input, i) => { input.value = presets[name][i]; });
    showSelection();
  }

  flowers.forEach(flower => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'flower-option';
    button.dataset.flower = flower.hex;
    button.style.setProperty('--petal', flower.hex);
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', `${flower.name} flowers`);
    const image = document.createElement('img');
    image.alt = '';
    image.width = 68;
    image.height = 51;
    const label = document.createElement('span');
    label.textContent = flower.name;
    button.append(image, label);
    button.addEventListener('click', () => {
      preset = '';
      inputs[activeRole === 'a' ? 0 : 1].value = flower.hex;
      showSelection();
    });
    document.querySelector('#flower-options').append(button);
  });
  document.querySelectorAll('[data-role]').forEach(button => {
    button.addEventListener('click', () => {
      activeRole = button.dataset.role;
      document.querySelectorAll('[data-role]').forEach(role => role.setAttribute('aria-pressed', String(role === button)));
      document.querySelector('#selection-title').textContent = activeRole === 'a' ? 'pick your main blooms' : 'pick your companions';
      document.querySelector('#custom-a').hidden = activeRole !== 'a';
      document.querySelector('#custom-b').hidden = activeRole !== 'b';
      updatePalette();
    });
  });

  document.querySelectorAll('[data-preset]').forEach(button => {
    button.addEventListener('click', () => selectPreset(button.dataset.preset));
  });
  inputs.forEach(input => input.addEventListener('input', () => {
    preset = '';
    showSelection();
  }));
  document.querySelector('#close-picker').addEventListener('click', closePicker);
  document.querySelector('#keep-bouquet').addEventListener('click', closePicker);
  function replay() {
    elapsed = 0;
    last = 0;
    render();
    run();
  }
  document.querySelector('#replay').addEventListener('click', () => {
    closePicker();
    replay();
  });
  motionControls.querySelectorAll('[data-mode]').forEach(button => {
    button.addEventListener('click', () => {
      revealMode = button.dataset.mode;
      picker.open = false;
      motionControls.querySelectorAll('[data-mode]').forEach(control => {
        control.setAttribute('aria-pressed', String(control === button));
      });
      replay();
    });
  });
  picker.addEventListener('toggle', () => {
    resize();
    if (picker.open) showSelection();
  });
  document.addEventListener('pointerdown', event => {
    if (!picker.contains(event.target)) picker.open = false;
  });
  picker.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closePicker();
    }
  });
  updatePalette();

  function texture(unit, uniform, image) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(gl.getUniformLocation(program, uniform), unit);
  }

  function render() {
    if (!ready) return;
    gl.uniform1f(uTime, elapsed);
    gl.uniform1f(uRipple, revealMode === 'ripple' ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(.964706, .937255, .894118, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uViewport, innerWidth, innerHeight);
    let stageWidth = innerWidth, stageHeight = innerHeight;
    if (picker.open) {
      const panel = picker.querySelector('.flower-shop').getBoundingClientRect();
      if (innerWidth > 700) stageWidth = Math.max(240, panel.left - 8);
      else stageHeight = Math.max(120, panel.top);
    }
    const stageTop = innerWidth <= 700 ? 58 : 0;
    gl.uniform2f(uStage, stageWidth, Math.max(80, stageHeight - stageTop));
    gl.uniform1f(uStageTop, stageTop);
    render();
  }

  function tick(now) {
    frame = 0;
    if (document.hidden) {
      last = 0;
      return;
    }
    if (last) elapsed += (now - last) / 1000;
    last = now;
    render();
    frame = requestAnimationFrame(tick);
  }

  function run() {
    if (ready && !frame && !document.hidden) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  }

  function load(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    last = 0;
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else {
      run();
    }
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    fallback();
  });
  // A restored context keeps the static artwork. It must not replay the gift.
  canvas.addEventListener('webglcontextrestored', fallback);

  resize();
  Promise.all([load('material-botanical.webp'), load('arrival.png'), load('petal-mask.png')])
    .then(([image, arrival, mask]) => {
      texture(0, 'art', image);
      texture(1, 'arrival', arrival);
      // Unit 2 belongs to the temporary specimen framebuffer texture.
      texture(3, 'petalMask', mask);
      gl.uniform2f(uImage, image.width, image.height);
      ready = true;
      document.querySelectorAll('[data-flower]').forEach(button => {
        button.querySelector('img').src = specimenImage(button.dataset.flower);
      });
      updatePalette();
      resize();
      run();
    })
    .catch(fallback);
})();
