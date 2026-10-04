/* ============================================================
   ASCII field background
   A full-page WebGL layer of monospace glyphs (" .,:;=+*#%@") whose
   density follows a slowly drifting, domain-warped noise field.
   The cursor swells the field and sends ripples out of it; scrolling
   drags the field and lifts its density.

   Raw WebGL (no Three.js) so it costs nothing to load. Desktop-class
   devices without reduced-motion only, same gate as hero3d.js.
   ============================================================ */
(() => {
  // Chrome on Windows touchscreen laptops reports `pointer: coarse` even
  // with a touchpad, so a non-mobile browser (UA-CH) also counts.
  const desktopClass = window.matchMedia("(pointer: fine)").matches ||
    (navigator.userAgentData && navigator.userAgentData.mobile === false);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!desktopClass || reducedMotion) return;

  const GLYPHS = " .,:;=+*#%@";
  const CELL = 13;          // glyph cell size in CSS px
  const INTENSITY = 0.92;   // max brightness of the field (0–1)
  const POINTER_EASE = 0.06;

  const canvas = document.createElement("canvas");
  canvas.id = "ascii-bg";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);

  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true });
  if (!gl) { canvas.remove(); return; }

  const vertexSrc = `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `;

  const fragmentSrc = `
    precision highp float;

    uniform vec2      uResolution;
    uniform float     uTime;
    uniform vec2      uPointer;
    uniform float     uScroll;
    uniform float     uCell;
    uniform float     uGlyphCount;
    uniform float     uIntensity;
    uniform sampler2D uAtlas;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i),                 hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p *= 2.02;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      // Snap to the glyph grid so every pixel in a cell shares one density.
      vec2 cell       = floor(gl_FragCoord.xy / uCell);
      vec2 inCell     = fract(gl_FragCoord.xy / uCell);
      vec2 cellCentre = (cell + 0.5) * uCell;
      vec2 p = cellCentre / uResolution.y;

      float t = uTime * 0.05;

      // Two rounds of domain warping give the slow marbled drift.
      vec2 q = vec2(fbm(p * 2.1 + t), fbm(p * 2.1 + vec2(5.2, 1.3) - t));
      vec2 r = vec2(
        fbm(p * 2.1 + 2.6 * q + vec2(1.7, 9.2) + t * 1.3),
        fbm(p * 2.1 + 2.6 * q + vec2(8.3, 2.8) - t * 1.1)
      );
      float f = fbm(p * 2.1 + 2.6 * r);

      // Scroll drags the field and lifts its density.
      f += sin(p.y * 3.0 - uScroll * 6.2) * 0.10;
      f += uScroll * 0.10;

      // Cursor swell plus ripples travelling out of it.
      float d = distance(cellCentre, uPointer) / uResolution.y;
      float halo = exp(-d * d * 6.0);
      f += 0.34 * halo;
      f += 0.12 * sin(d * 26.0 - uTime * 3.0) * halo;

      // Quieter towards the edges.
      vec2 ndc = cellCentre / uResolution;
      float vignette = smoothstep(0.0, 0.42, ndc.x) * smoothstep(1.0, 0.58, ndc.x)
                     * smoothstep(0.0, 0.38, ndc.y) * smoothstep(1.0, 0.62, ndc.y);
      vignette = 0.55 + 0.45 * vignette;

      float density = pow(clamp(f, 0.0, 1.0), 1.15);
      float index = min(floor(density * uGlyphCount), uGlyphCount - 1.0);
      vec2 atlasUv = vec2((index + inCell.x) / uGlyphCount, 1.0 - inCell.y);
      float glyph = texture2D(uAtlas, atlasUv).r;

      float shade = glyph * (0.38 + 0.62 * density) * vignette * uIntensity;
      // Premultiplied white at alpha = shade.
      gl_FragColor = vec4(vec3(shade * shade), shade);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSrc));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSrc));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (err) {
    console.warn("ascii-bg disabled:", err);
    canvas.remove();
    return;
  }
  gl.useProgram(program);

  // One triangle that covers the whole viewport.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  // Glyph atlas: one 32x32 tile per character, white on black.
  const atlas = document.createElement("canvas");
  atlas.width = 32 * GLYPHS.length;
  atlas.height = 32;
  const actx = atlas.getContext("2d");
  actx.fillStyle = "#000";
  actx.fillRect(0, 0, atlas.width, atlas.height);
  actx.font = '23px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  actx.fillStyle = "#fff";
  actx.textAlign = "center";
  actx.textBaseline = "middle";
  for (let i = 0; i < GLYPHS.length; i++) actx.fillText(GLYPHS[i], 32 * i + 16, 17);

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const u = {};
  ["uResolution", "uTime", "uPointer", "uScroll", "uCell", "uGlyphCount", "uIntensity", "uAtlas"]
    .forEach((name) => { u[name] = gl.getUniformLocation(program, name); });

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  gl.uniform1f(u.uCell, CELL * dpr);
  gl.uniform1f(u.uGlyphCount, GLYPHS.length);
  gl.uniform1i(u.uAtlas, 0);

  function resize() {
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u.uResolution, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener("resize", resize);

  // Pointer in GL pixel space (origin bottom-left), eased towards the target.
  const pointer = { x: canvas.width / 2, y: canvas.height / 2, tx: canvas.width / 2, ty: canvas.height / 2 };
  window.addEventListener("pointermove", (e) => {
    pointer.tx = e.clientX * dpr;
    pointer.ty = (window.innerHeight - e.clientY) * dpr;
  }, { passive: true });

  const start = performance.now();
  let intensity = 0;
  let raf = 0;

  function frame() {
    pointer.x += (pointer.tx - pointer.x) * POINTER_EASE;
    pointer.y += (pointer.ty - pointer.y) * POINTER_EASE;
    intensity += (INTENSITY - intensity) * 0.02;   // fade in on load

    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const scroll = maxScroll > 0 ? window.scrollY / maxScroll : 0;

    gl.uniform2f(u.uPointer, pointer.x, pointer.y);
    gl.uniform1f(u.uScroll, scroll);
    gl.uniform1f(u.uTime, (performance.now() - start) / 1000);
    gl.uniform1f(u.uIntensity, intensity);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  // Don't burn GPU in hidden tabs.
  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) raf = requestAnimationFrame(frame);
  });
})();
