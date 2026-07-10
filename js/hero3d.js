/* ============================================================
   Hero 3D — armillary rings on a scroll-driven journey.
   The canvas is a fixed overlay: GSAP ScrollTrigger scrubs it
   along a loose S-curve (Hero right → About left → Timeline
   right → Projects left), it pulses as each section becomes
   active, then fades out when Skills enters — at which point
   the Three.js render loop is stopped entirely.
   Loaded only on desktop-class devices with fine pointers and
   no reduced-motion preference; everyone else gets a gradient.
   ============================================================ */
(() => {
  "use strict";

  const canvas = document.getElementById("hero-canvas");
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wideEnough = window.innerWidth >= 768;

  if (!canvas || !finePointer || reducedMotion || !wideEnough) {
    document.body.classList.add("no-3d");
    return;
  }

  import("https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js")
    .then(init)
    .catch(() => document.body.classList.add("no-3d"));

  function init(THREE) {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 4;

    // root: scaled by the exit animation (GSAP)
    // group: ambient drift + pulse scale (render loop)
    const root = new THREE.Group();
    const group = new THREE.Group();
    root.add(group);
    scene.add(root);

    /* ---- Rings: thin tori, additive so crossings flare ---- */
    const ringSpecs = [
      { radius: 1.5,  tube: 0.014, color: 0xffffff, opacity: 0.85, tilt: [1.15, 0, 0.35],   axis: "y", wobble: "x", speed: 0.22 },
      { radius: 1.28, tube: 0.012, color: 0xd9d9de, opacity: 0.65, tilt: [0.45, 0.85, 0],   axis: "x", wobble: "z", speed: -0.16 },
      { radius: 1.05, tube: 0.01,  color: 0xffffff, opacity: 0.5,  tilt: [-0.7, 0.3, 0.95], axis: "y", wobble: "z", speed: 0.3 },
      { radius: 0.8,  tube: 0.009, color: 0xd9d9de, opacity: 0.42, tilt: [0.2, -0.65, 0.5], axis: "x", wobble: "y", speed: -0.34 },
    ];

    const rings = ringSpecs.map((spec) => {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(spec.radius, spec.tube, 8, 160),
        new THREE.MeshBasicMaterial({
          color: spec.color,
          transparent: true,
          opacity: spec.opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      const pivot = new THREE.Group();
      pivot.rotation.set(...spec.tilt);
      pivot.add(mesh);
      group.add(pivot);
      return { mesh, pivot, base: spec.opacity, axis: spec.axis, wobble: spec.wobble, speed: spec.speed };
    });

    /* ---- Orbiting dots: discrete satellites on one ring ---- */
    const DOTS = 64;
    const DOT_BASE_OPACITY = 0.55;
    const dotPositions = new Float32Array(DOTS * 3);
    for (let i = 0; i < DOTS; i++) {
      const a = (i / DOTS) * Math.PI * 2;
      dotPositions[i * 3] = Math.cos(a) * 1.18;
      dotPositions[i * 3 + 1] = Math.sin(a) * 1.18;
    }
    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.BufferAttribute(dotPositions, 3));
    const dotRing = new THREE.Points(
      dotGeo,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.022,
        transparent: true,
        opacity: DOT_BASE_OPACITY,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const dotPivot = new THREE.Group();
    dotPivot.rotation.set(0.9, -0.4, 0.2);
    dotPivot.add(dotRing);
    group.add(dotPivot);

    /* ---- Dust: sparse shell of faint particles for depth ---- */
    const DUST = 240;
    const dustPositions = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
      const u = Math.random() * 2 - 1;
      const phi = Math.random() * Math.PI * 2;
      const r = 1.7 + Math.random() * 0.9;
      const s = Math.sqrt(1 - u * u);
      dustPositions[i * 3] = s * Math.cos(phi) * r;
      dustPositions[i * 3 + 1] = u * r;
      dustPositions[i * 3 + 2] = s * Math.sin(phi) * r;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    const dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.012,
        transparent: true,
        opacity: 0.35,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    group.add(dust);

    /* ---- Core: small sphere + soft canvas-gradient glow ---- */
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
    );
    group.add(core);

    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = glowCanvas.height = 128;
    const gctx = glowCanvas.getContext("2d");
    const grad = gctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    grad.addColorStop(0.4, "rgba(255, 255, 255, 0.22)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 128, 128);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(glowCanvas),
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glow.scale.set(0.9, 0.9, 1);
    group.add(glow);

    /* ---- Render loop with a hard on/off switch ---- */
    const clock = new THREE.Clock();
    let rendering = false;
    // 0..1, eased up and back down by GSAP on section pulses
    const pulseState = { v: 0 };

    function tick() {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      // Fallback only (no GSAP): stop drawing once the hero is gone
      if (!hasGSAP && window.scrollY > window.innerHeight) return;

      const boost = pulseState.v;

      rings.forEach(({ mesh, pivot, base, axis, wobble, speed }) => {
        pivot.rotation[axis] += speed * dt;
        pivot.rotation[wobble] += speed * 0.22 * dt;
        mesh.material.opacity = Math.min(1, base * (1 + boost));
      });

      dotRing.rotation.z += 0.14 * dt;
      dotRing.material.opacity = Math.min(1, DOT_BASE_OPACITY * (1 + boost));
      dust.rotation.y -= 0.02 * dt;
      dust.rotation.x += 0.008 * dt;

      group.rotation.y += 0.04 * dt;
      group.position.y = Math.sin(t * 0.7) * 0.06;
      group.scale.setScalar(1 + boost * 0.07);

      const breath = 0.5 + Math.sin(t * 1.5) * 0.5;
      core.material.opacity = Math.min(1, 0.6 + breath * 0.35 + boost * 0.3);
      glow.material.opacity = Math.min(1, 0.55 + breath * 0.4 + boost * 0.4);
      const gs = 0.85 + breath * 0.18 + boost * 0.15;
      glow.scale.set(gs, gs, 1);

      renderer.render(scene, camera);
    }

    function startRender() {
      if (rendering) return;
      rendering = true;
      clock.getDelta(); // swallow the paused gap
      renderer.setAnimationLoop(tick);
    }

    function stopRender() {
      rendering = false;
      renderer.setAnimationLoop(null);
    }

    function resize() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.floor(w * renderer.getPixelRatio())) {
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    }
    resize();
    startRender();

    /* ---- Scroll journey (GSAP ScrollTrigger) ---- */
    const hasGSAP = !!(window.gsap && window.ScrollTrigger);
    if (!hasGSAP) {
      // No GSAP: pin the canvas back inside the hero like before
      canvas.style.position = "absolute";
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    // Waypoints: where the object's center sits (fraction of viewport
    // width) as each section scrolls by. 0.1 / 0.9 deliberately push
    // part of the object past the viewport edge mid-weave.
    const waypoints = [
      { sel: "#about",    xf: 0.12, scale: 0.7,  rotation: -7 },
      { sel: "#timeline", xf: 0.9,  scale: 0.6,  rotation: 6 },
      { sel: "#projects", xf: 0.1,  scale: 0.52, rotation: -6 },
    ];
    const exitEl = document.querySelector("#skills");

    // Centripetal-ish Catmull-Rom through {t, v} points: continuous
    // position AND velocity, so the weave never corners at a waypoint
    function spline(points, t) {
      let i = 0;
      while (i < points.length - 2 && t > points[i + 1].t) i++;
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];
      const span = p2.t - p1.t || 1e-6;
      const u = Math.min(Math.max((t - p1.t) / span, 0), 1);
      const m1 = ((p2.v - p0.v) / ((p2.t - p0.t) || 1e-6)) * span;
      const m2 = ((p3.v - p1.v) / ((p3.t - p1.t) || 1e-6)) * span;
      const u2 = u * u;
      const u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * p1.v + (u3 - 2 * u2 + u) * m1
           + (-2 * u3 + 3 * u2) * p2.v + (u3 - u2) * m2;
    }

    let pathTween = null;
    function buildPath() {
      if (pathTween) {
        if (pathTween.scrollTrigger) pathTween.scrollTrigger.kill();
        pathTween.kill();
      }
      // Reset to the untransformed hero anchor before measuring
      gsap.set(canvas, { x: 0, y: 0, scale: 1, rotation: 0, yPercent: -50 });

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rect = canvas.getBoundingClientRect();
      const baseCenter = rect.left + rect.width / 2;

      // Map each section to its normalized position along the scrub
      // range (scroll 0 → skills at 60% of the viewport)
      const range = Math.max(exitEl.offsetTop - vh * 0.6, 1);
      let lastT = 0;
      const tOf = (el) => {
        const t = Math.min(Math.max((el.offsetTop - vh * 0.4) / range, lastT + 0.05), 0.95);
        lastT = t;
        return t;
      };

      const pts = [{ t: 0, x: baseCenter / vw, s: 1, r: 0 }];
      waypoints.forEach((w) => {
        const el = document.querySelector(w.sel);
        if (!el) return;
        pts.push({ t: tOf(el), x: w.xf, s: w.scale, r: w.rotation });
      });
      pts.push({ t: 1, x: 0.42, s: 0.45, r: 0 });

      const setX = gsap.quickSetter(canvas, "x", "px");
      const setScale = gsap.quickSetter(canvas, "scale");
      const setRotation = gsap.quickSetter(canvas, "rotation", "deg");
      const xPts = pts.map((p) => ({ t: p.t, v: p.x }));
      const sPts = pts.map((p) => ({ t: p.t, v: p.s }));
      const rPts = pts.map((p) => ({ t: p.t, v: p.r }));

      const state = { p: 0 };
      pathTween = gsap.to(state, {
        p: 1,
        ease: "none",
        scrollTrigger: {
          start: 0,
          endTrigger: exitEl,
          end: "top 60%",
          scrub: 1.2,
        },
        onUpdate: () => {
          setX(spline(xPts, state.p) * vw - baseCenter);
          setScale(spline(sPts, state.p));
          setRotation(spline(rPts, state.p));
        },
      });
    }
    // Build once layout is final. Never kill/rebuild during ScrollTrigger's
    // own load refresh — mutating triggers mid-refresh corrupts its state.
    if (document.readyState === "complete") {
      buildPath();
    } else {
      window.addEventListener("load", () => setTimeout(buildPath, 60), { once: true });
    }

    /* ---- Progress pulses as each section becomes active ---- */
    const pulse = () => {
      gsap.to(pulseState, {
        v: 1,
        duration: 0.4,
        ease: "power2.inOut",
        overwrite: true,
        onComplete: () => {
          gsap.to(pulseState, { v: 0, duration: 0.9, ease: "power2.inOut" });
        },
      });
    };
    waypoints.forEach(({ sel }) => {
      const el = document.querySelector(sel);
      if (!el) return;
      ScrollTrigger.create({
        trigger: el,
        start: "top 55%",
        onEnter: pulse,
        onEnterBack: pulse,
      });
    });
    pulse(); // hero is the active section on load

    /* ---- Exit at Skills: fade out, then stop rendering ---- */
    ScrollTrigger.create({
      trigger: exitEl,
      start: "top 60%",
      onEnter: () => {
        gsap.to(canvas, {
          autoAlpha: 0,
          duration: 0.5,
          ease: "power2.in",
          overwrite: "auto",
          onComplete: stopRender,
        });
        gsap.to(root.scale, { x: 0.35, y: 0.35, z: 0.35, duration: 0.5, ease: "power2.in", overwrite: "auto" });
      },
      onLeaveBack: () => {
        startRender();
        gsap.to(canvas, { autoAlpha: 1, duration: 0.4, ease: "power2.out", overwrite: "auto" });
        gsap.to(root.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: "power2.out", overwrite: "auto" });
      },
    });

    /* ---- Resize: renderer + rebuilt path ---- */
    let resizeTimer;
    window.addEventListener("resize", () => {
      resize();
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        buildPath();
        ScrollTrigger.refresh();
      }, 200);
    });
  }
})();
