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

  function fallback() {
    ready = false;
    cancelAnimationFrame(frame);
    frame = 0;
    canvas.classList.add('fallback');
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

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
      vec2 pixel = vec2(uv.x, 1. - uv.y) * viewport;
      float aspect = imageSize.x / imageSize.y;
      float height = min(viewport.y * .98, viewport.x * 1.14 / aspect);
      vec2 size = vec2(height * aspect, height);
      vec2 q = (pixel - vec2(viewport.x * .5, viewport.y * .48)) / size + .5;
      vec3 base = vec3(.964706, .937255, .894118);
      float grain = (hash(floor(pixel)) - .5) * .006;
      vec3 bg = base + grain;

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
      float luminance = dot(source, vec3(.25, .6, .15));
      float saturation = max(source.r, max(source.g, source.b))
        - min(source.r, min(source.g, source.b));
      float paper = smoothstep(.58, .84, luminance)
        * (1. - smoothstep(.18, .32, saturation));
      float presence = 1. - paper;
      vec3 colour = mix(bg, source, exposure * feather * presence);
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
  } catch {
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
    if (elapsed < 18) {
      frame = requestAnimationFrame(tick);
    }
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
