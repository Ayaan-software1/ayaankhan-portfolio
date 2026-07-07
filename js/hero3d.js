/* ============================================================
   Hero 3D — subtle rotating wireframe (Three.js, ESM via CDN)
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

    // Outer wireframe icosahedron — the main shape
    const outer = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.35, 1)),
      new THREE.LineBasicMaterial({
        color: 0xff4655,
        transparent: true,
        opacity: 0.5,
      })
    );

    // Inner counter-rotating core for a bit of depth
    const inner = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.55, 0)),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.18,
      })
    );

    const group = new THREE.Group();
    group.add(outer, inner);
    scene.add(group);

    // Cursor influence (normalized -0.5 … 0.5, eased toward target)
    let targetX = 0, targetY = 0;
    window.addEventListener("mousemove", (e) => {
      targetX = e.clientX / window.innerWidth - 0.5;
      targetY = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });

    function resize() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.floor(w * renderer.getPixelRatio())) {
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    }
    window.addEventListener("resize", resize);
    resize();

    const clock = new THREE.Clock();

    renderer.setAnimationLoop(() => {
      // Skip rendering once the hero has scrolled out of view
      if (window.scrollY > window.innerHeight) return;

      const t = clock.getElapsedTime();

      // Slow ambient rotation + eased cursor tilt
      group.rotation.y += ((targetX * 0.9 + t * 0.12) - group.rotation.y) * 0.05;
      group.rotation.x += ((targetY * 0.6 + Math.sin(t * 0.4) * 0.1) - group.rotation.x) * 0.05;
      inner.rotation.y -= 0.004;
      inner.rotation.x += 0.002;

      // Gentle float
      group.position.y = Math.sin(t * 0.8) * 0.06;

      renderer.render(scene, camera);
    });
  }
})();
