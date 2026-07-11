/* ============================================================
   Ayaan Khan — hero name particle text
   Renders the heading onto an offscreen canvas, samples its
   pixels into a field of dots, and lets the cursor scatter
   nearby dots, which spring back home when it moves away.
   Fine pointers without reduced-motion only — touch devices
   keep the plain static <h1>.
   ============================================================ */
(() => {
  "use strict";

  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!finePointer || reducedMotion) return;

  const heading = document.querySelector(".hero__name");
  if (!heading) return;

  const GAP = 4;        // sample every Nth pixel → dot density
  const RADIUS = 90;    // cursor influence radius (px), ≈ the cursor ring's reach
  const PUSH = 4;       // scatter strength at the cursor's centre
  const EASE = 0.1;     // spring-back: fraction of remaining distance per frame
  const MAX_SPEED = 14; // spring-back speed cap (px/frame)
  const PAD = 110;      // canvas bleed so scattered dots don't clip at the edges

  // Few discrete near-white shades (around --text #e9e9ec) so dots can be
  // drawn in one batched path per shade instead of one fill per dot.
  const SHADES = [220, 226, 232, 238, 244].map((v) => `rgb(${v}, ${v}, ${v + 3})`);

  const canvas = document.createElement("canvas");
  canvas.className = "hero__name-canvas";
  canvas.setAttribute("aria-hidden", "true");
  heading.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  let particles = [];
  let width = 0;
  let height = 0;
  let rafId = null;
  let clientX = -1e4;
  let clientY = -1e4;

  function build() {
    const cs = getComputedStyle(heading);
    const fontSize = parseFloat(cs.fontSize);
    const lineHeight = parseFloat(cs.lineHeight) || fontSize;
    const rect = heading.getBoundingClientRect();

    width = Math.ceil(rect.width) + PAD * 2;
    height = Math.ceil(rect.height) + PAD * 2;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.left = `${-PAD}px`;
    canvas.style.top = `${-PAD}px`;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Redraw the heading's own lines with its computed font, then sample
    // the alpha channel to place one dot per GAP×GAP cell of glyph.
    const off = document.createElement("canvas");
    off.width = width;
    off.height = height;
    const octx = off.getContext("2d", { willReadFrequently: true });
    octx.font = `${cs.fontWeight} ${fontSize}px ${cs.fontFamily}`;
    if ("letterSpacing" in octx) octx.letterSpacing = cs.letterSpacing;
    octx.fillStyle = "#fff";
    octx.textBaseline = "middle";
    const lines = heading.innerText.split("\n").filter((l) => l.trim());
    lines.forEach((line, i) => {
      octx.fillText(line, PAD, PAD + lineHeight * (i + 0.5));
    });

    const data = octx.getImageData(0, 0, width, height).data;
    particles = [];
    for (let y = 0; y < height; y += GAP) {
      for (let x = 0; x < width; x += GAP) {
        if (data[(y * width + x) * 4 + 3] > 128) {
          particles.push({
            ox: x,
            oy: y,
            cx: x,
            cy: y,
            r: 1.6 + Math.random() * 0.9,
            shade: (Math.random() * SHADES.length) | 0,
          });
        }
      }
    }

    // Paint everything at rest before hiding the real text — no flash.
    draw();
    heading.classList.add("has-particles");
  }

  function step(mx, my) {
    let moving = false;
    for (const p of particles) {
      const dx = p.cx - mx;
      const dy = p.cy - my;
      const dist = Math.hypot(dx, dy);
      if (dist < RADIUS && dist > 0.5) {
        // Inside the cursor's radius: push away, harder the closer it is
        const f = (RADIUS - dist) / RADIUS;
        p.cx += (dx / dist) * f * PUSH;
        p.cy += (dy / dist) * f * PUSH;
        moving = true;
      } else if (p.cx !== p.ox || p.cy !== p.oy) {
        // Otherwise ease back home, capped so far-flung dots don't teleport
        let hx = (p.ox - p.cx) * EASE;
        let hy = (p.oy - p.cy) * EASE;
        const h = Math.hypot(hx, hy);
        if (h > MAX_SPEED) {
          hx = (hx / h) * MAX_SPEED;
          hy = (hy / h) * MAX_SPEED;
        }
        p.cx += hx;
        p.cy += hy;
        if (Math.abs(p.cx - p.ox) < 0.1 && Math.abs(p.cy - p.oy) < 0.1) {
          p.cx = p.ox;
          p.cy = p.oy;
        } else {
          moving = true;
        }
      }
    }
    return moving;
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    for (let s = 0; s < SHADES.length; s++) {
      ctx.fillStyle = SHADES[s];
      ctx.beginPath();
      for (const p of particles) {
        if (p.shade !== s) continue;
        ctx.moveTo(p.cx + p.r, p.cy);
        ctx.arc(p.cx, p.cy, p.r, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  }

  function nearCanvas(rect) {
    return (
      clientX > rect.left - RADIUS &&
      clientX < rect.right + RADIUS &&
      clientY > rect.top - RADIUS &&
      clientY < rect.bottom + RADIUS
    );
  }

  function loop() {
    const rect = canvas.getBoundingClientRect();
    const moving = step(clientX - rect.left, clientY - rect.top);
    draw();
    // Keep animating while dots are settling or the cursor could still
    // disturb them; otherwise stop the rAF loop entirely.
    rafId = moving || nearCanvas(rect) ? requestAnimationFrame(loop) : null;
  }

  window.addEventListener(
    "mousemove",
    (e) => {
      clientX = e.clientX;
      clientY = e.clientY;
      if (rafId === null && particles.length && nearCanvas(canvas.getBoundingClientRect())) {
        rafId = requestAnimationFrame(loop);
      }
    },
    { passive: true }
  );

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      build();
    }, 150);
  });

  // Sample only after Space Grotesk is in, or the dots trace the fallback
  // font. Build directly — not via rAF, which never fires in occluded tabs.
  document.fonts.ready.then(build);
})();
