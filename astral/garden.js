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
  const presets = {
    sis1: ['#ff680a', '#ff2796'],
    moon: ['#945bff', '#47caff'],
    dawn: ['#ffc629', '#ff645e'],
    original: ['#b88571', '#a69abd'],
  };
  let preset = 'sis1';
  const picker = document.querySelector('.palette');
  const inputs = ['a', 'b'].map(id => document.querySelector(`#colour-${id}`));

  function fallback() {
    ready = false;
    cancelAnimationFrame(frame);
    frame = 0;
    canvas.classList.add('fallback');
    picker.hidden = true;
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
    uniform vec2 viewport;
    uniform vec2 imageSize;
    uniform float time;
    uniform vec3 colourA;
    uniform vec3 colourB;
    uniform float recolour;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float glint(vec2 p) {
      float core = exp(-dot(p, p) / .000018);
      float rays = exp(-abs(p.x) * 950. - abs(p.y) * 95.)
        + exp(-abs(p.x) * 95. - abs(p.y) * 950.);
      return core + rays * .55;
    }

    vec3 pigment(vec3 source, vec2 q) {
      // Broad flower masks keep one family pink instead of tinting every warm vein orange.
      float companion = 1. - smoothstep(.72, 1.15, length((q - vec2(.24, .32)) / vec2(.19, .16)));
      companion = max(companion, 1. - smoothstep(.72, 1.15, length((q - vec2(.62, .18)) / vec2(.18, .13))));
      companion = max(companion, 1. - smoothstep(.72, 1.15, length((q - vec2(.77, .51)) / vec2(.17, .12))));
      companion = max(companion, 1. - smoothstep(.72, 1.15, length((q - vec2(.68, .73)) / vec2(.17, .13))));
      float warm = 1. - companion;
      vec3 tint = mix(colourB, colourA, warm);
      float light = dot(source, vec3(.25, .6, .15));
      vec3 dyed = mix(tint * (.38 + light * .9), vec3(1., .97, .94), smoothstep(.50, .91, light) * .78);
      float petals = 1. - smoothstep(.72, .91, q.y);
      return mix(source, dyed, recolour * petals);
    }

    float presence(vec3 source) {
      float light = dot(source, vec3(.25, .6, .15));
      float saturation = max(source.r, max(source.g, source.b)) - min(source.r, min(source.g, source.b));
      return 1. - smoothstep(.58, .84, light) * (1. - smoothstep(.18, .32, saturation));
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
      vec2 pixel = vec2(uv.x, 1. - uv.y) * viewport;
      float aspect = imageSize.x / imageSize.y;
      float height = min(viewport.y * .90, viewport.x * .88 / aspect);
      vec2 point = (pixel - vec2(viewport.x * .48, viewport.y * .48)) / height;
      float tilt = -.13;
      vec2 turned = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt)) * point;
      // A gentle shear opens the top cluster while keeping the gathered stems intact.
      vec2 q = turned / vec2(aspect, 1.) + .5;
      q.x += sin(q.y * 5.) * .018;
      vec3 base = vec3(.964706, .937255, .894118);
      float grain = (hash(floor(pixel)) - .5) * .006;
      vec3 bg = base + grain;

      float appear = smoothstep(2., 14., time);
      vec2 orbit = mat2(.91, -.414, .414, .91) * (point + vec2(.02, .07));
      float radius = length(orbit / vec2(.48, .26));
      float halo = exp(-pow((radius - .96) * 3.2, 2.));
      vec3 aura = mix(colourA, colourB, .5 + .5 * sin(atan(orbit.y, orbit.x) * 2. + time * .045));
      bg = mix(bg, mix(vec3(1.), aura, .32), halo * .25 * appear);
      float ring = (1. - smoothstep(.001, .004, abs(radius - 1.))) * .16;
      ring += (1. - smoothstep(.001, .003, abs(length(orbit / vec2(.40, .32)) - 1.))) * .09;
      bg = mix(bg, mix(aura, vec3(.65, .53, .7), .6), ring * appear);

      // Sparse, stationary dust has a slow light cycle. Avoid a moving starfield.
      vec2 cell = floor(pixel / 48.);
      vec2 speck = (fract(pixel / 48.) - vec2(hash(cell), hash(cell + 8.))) * 48.;
      float chance = step(.87, hash(cell + 17.));
      float twinkle = .55 + .45 * sin(time * .55 + hash(cell) * 6.28);
      float dust = exp(-dot(speck, speck) / 1.2) * chance * twinkle;
      float cross = exp(-abs(speck.x) * 3. - abs(speck.y) * .6) + exp(-abs(speck.x) * .6 - abs(speck.y) * 3.);
      bg = mix(bg, aura * .65, (dust * .45 + cross * chance * .1) * halo * appear);
      float stars = glint(orbit - vec2(-.39, -.15))
        + glint(orbit - vec2(.24, -.226))
        + glint(orbit - vec2(.435, .11))
        + glint(orbit - vec2(-.17, .243));
      bg = mix(bg, vec3(.71, .47, .66), min(stars, 1.) * .32 * appear);
      bg += vec3(.10, .08, .13) * min(stars, 1.) * appear;
      bg = bud(bg, point, vec2(-.37, -.25), .058, -.8, 10.);
      bg = bud(bg, point, vec2(.35, -.35), .045, .8, 12.);
      bg = bud(bg, point, vec2(.40, .17), .032, 1.8, 14.);

      if (q.x < 0. || q.x > 1. || q.y < 0. || q.y > 1.) {
        gl_FragColor = vec4(bg, 1.);
        return;
      }

      vec3 source = texture2D(art, q).rgb;
      float when = texture2D(arrival, q).r * 20.;
      float exposure = smoothstep(when - .23, when + .62, time);
      float feather = smoothstep(0., .09, q.x)
        * smoothstep(0., .09, 1. - q.x)
        * smoothstep(0., .065, q.y)
        * smoothstep(0., .065, 1. - q.y);

      // The source paper must not travel with the reveal as tan bands around stems.
      vec3 dyed = pigment(source, q);
      // Thin bright veins catch spectral light as the reveal travels through the petals.
      float vein = smoothstep(.52, .85, dot(source, vec3(.25, .6, .15)));
      vec3 sheen = mix(vec3(.82, .87, 1.), vec3(1., .83, .72), .5 + .5 * sin(q.y * 17. + q.x * 11.));
      dyed = mix(dyed, sheen, vein * .17);
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
  const uImage = gl.getUniformLocation(program, 'imageSize');
  const uA = gl.getUniformLocation(program, 'colourA');
  const uB = gl.getUniformLocation(program, 'colourB');
  const uRecolour = gl.getUniformLocation(program, 'recolour');

  function updatePalette() {
    inputs.forEach((input, i) => {
      const rgb = input.value.match(/[a-f\d]{2}/gi).map(hex => parseInt(hex, 16) / 255);
      gl.uniform3fv(i === 0 ? uA : uB, rgb);
      document.documentElement.style.setProperty(`--colour-${i === 0 ? 'a' : 'b'}`, input.value);
    });
    gl.uniform1f(uRecolour, preset === 'original' ? 0 : 1);
    document.querySelectorAll('[data-preset]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.preset === preset));
    });
    document.querySelector('#palette-status').textContent = `${preset || 'custom'} palette`;
    render();
  }

  function selectPreset(name) {
    preset = name;
    inputs.forEach((input, i) => { input.value = presets[name][i]; });
    updatePalette();
  }

  document.querySelectorAll('[data-preset]').forEach(button => {
    button.addEventListener('click', () => selectPreset(button.dataset.preset));
  });
  inputs.forEach(input => input.addEventListener('input', () => {
    preset = '';
    updatePalette();
  }));
  document.querySelector('#cycle').addEventListener('click', () => {
    const names = Object.keys(presets);
    selectPreset(names[(names.indexOf(preset) + 1) % names.length]);
  });
  document.querySelector('#replay').addEventListener('click', () => {
    elapsed = 0;
    last = 0;
    run();
  });
  document.addEventListener('pointerdown', event => {
    if (!picker.contains(event.target)) picker.open = false;
  });
  picker.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      picker.open = false;
      picker.querySelector('summary').focus();
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
  Promise.all([load('material.webp'), load('arrival.png')])
    .then(([image, arrival]) => {
      texture(0, 'art', image);
      texture(1, 'arrival', arrival);
      gl.uniform2f(uImage, image.width, image.height);
      ready = true;
      resize();
      run();
    })
    .catch(fallback);
})();
