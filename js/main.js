/* ============================================================
   Ayaan Khan — portfolio interactions
   Custom cursor · magnetic hover · GSAP reveals · accordions
   ============================================================ */
(() => {
  "use strict";

  // Chrome on Windows touchscreen laptops reports `pointer: coarse` even
  // with a touchpad, so a non-mobile browser (UA-CH) also counts.
  const desktopClass = window.matchMedia("(pointer: fine)").matches ||
    (navigator.userAgentData && navigator.userAgentData.mobile === false);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Custom cursor (pointer devices only) ---------- */
  if (desktopClass && !reducedMotion) {
    // Viewfinder cursor: an instant dot plus four corner brackets. The
    // brackets trail the pointer as a small square, and over anything
    // interactive they glide out and lock onto that element's edges.
    const dot = document.getElementById("cursor-dot");
    const frame = document.getElementById("cursor-frame");

    const IDLE = 26;   // bracket square around the pointer (px)
    const PAD = 8;     // breathing room around a locked element (px)
    const lockTargets = "a, button, summary, .magnetic-card, .tooltip, input, textarea";

    let mouseX = -100, mouseY = -100;
    const box = { x: -100, y: -100, w: IDLE, h: IDLE };  // frame centre + size
    let locked = null;
    let pressed = false;

    // Only hide the native cursor once we know where the real one is
    window.addEventListener("mousemove", () => {
      document.body.classList.add("has-cursor");
    }, { once: true, passive: true });

    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      // Dot snaps to the cursor instantly
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    }, { passive: true });

    document.addEventListener("mouseover", (e) => {
      locked = e.target.closest(lockTargets);
      frame.classList.toggle("is-locked", !!locked);
      dot.classList.toggle("is-locked", !!locked);
    });
    window.addEventListener("mousedown", () => { pressed = true; });
    window.addEventListener("mouseup", () => { pressed = false; });

    // Frame eases toward the pointer square, or the locked element's rect
    // (re-read every frame, so it follows magnetic pulls and scrolling).
    // Time-based smoothing so the feel doesn't change with frame rate.
    let lastTrail = performance.now();
    (function trail(now) {
      const dt = Math.min((now - lastTrail) / 1000, 0.1) || 0.016;
      lastTrail = now;

      let tx = mouseX, ty = mouseY, tw = IDLE, th = IDLE;
      if (locked && locked.isConnected) {
        const r = locked.getBoundingClientRect();
        tx = r.left + r.width / 2;
        ty = r.top + r.height / 2;
        tw = r.width + PAD * 2;
        th = r.height + PAD * 2;
      }
      if (pressed) { tw *= 0.88; th *= 0.88; }

      const k = 1 - Math.exp(-dt / (locked ? 0.08 : 0.06));
      box.x += (tx - box.x) * k;
      box.y += (ty - box.y) * k;
      box.w += (tw - box.w) * k;
      box.h += (th - box.h) * k;
      frame.style.width = `${box.w}px`;
      frame.style.height = `${box.h}px`;
      frame.style.transform = `translate(${box.x - box.w / 2}px, ${box.y - box.h / 2}px)`;
      requestAnimationFrame(trail);
    })(lastTrail);

    /* ---------- Magnetic pull ---------- */
    const attachMagnet = (el, strength) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const relX = e.clientX - (r.left + r.width / 2);
        const relY = e.clientY - (r.top + r.height / 2);
        gsap.to(el, {
          x: relX * strength,
          y: relY * strength,
          duration: 0.4,
          ease: "power2.out",
        });
      });
      el.addEventListener("mouseleave", () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" });
      });
    };

    document.querySelectorAll(".magnetic").forEach((el) => attachMagnet(el, 0.35));
    document.querySelectorAll(".magnetic-card").forEach((el) => attachMagnet(el, 0.06));
  }

  /* ---------- Scroll-triggered reveals ---------- */
  if (window.gsap && window.ScrollTrigger && !reducedMotion) {
    gsap.registerPlugin(ScrollTrigger);

    const pendingReveals = new Map();

    const showInstantly = (el) => {
      const st = pendingReveals.get(el);
      if (st) {
        st.kill();
        pendingReveals.delete(el);
      }
      gsap.set(el, { opacity: 1, y: 0, overwrite: "auto" });
    };

    gsap.utils.toArray(".reveal").forEach((el) => {
      gsap.set(el, { opacity: 0, y: 28 });
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top 92%",
        once: true,
        onEnter: (self) => {
          // On fast manual scrolls, snap instead of tweening so sections
          // never sit invisible mid-flight and flash the page black.
          if (Math.abs(self.getVelocity()) > 1800) {
            showInstantly(el);
          } else {
            pendingReveals.delete(el);
            gsap.to(el, {
              opacity: 1,
              y: 0,
              duration: 0.6,
              ease: "power3.out",
              overwrite: "auto",
            });
          }
        },
      });
      pendingReveals.set(el, st);
    });

    // Nav jumps: before the smooth scroll starts, instantly reveal
    // everything between here and the target. Deterministic — doesn't
    // rely on scroll velocity or frame rate, so no black flash.
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", () => {
        const target = document.querySelector(link.getAttribute("href"));
        if (!target) return;
        // One viewport past wherever we land, whichever direction we jump
        const targetTop = window.scrollY + target.getBoundingClientRect().top;
        const limit = Math.max(window.scrollY, targetTop) + window.innerHeight;
        pendingReveals.forEach((st, el) => {
          if (window.scrollY + el.getBoundingClientRect().top < limit) {
            showInstantly(el);
          }
        });
      });
    });
  }

  /* ---------- Project accordions ---------- */
  document.querySelectorAll(".project__head").forEach((head) => {
    head.addEventListener("click", () => {
      const project = head.closest(".project");
      const open = project.classList.toggle("is-open");
      head.setAttribute("aria-expanded", String(open));
    });
  });

  /* ---------- Links to #legal open the footer's Legal & Privacy ---------- */
  const legal = document.getElementById("legal");
  document.querySelectorAll('a[href="#legal"]').forEach((link) => {
    link.addEventListener("click", () => { if (legal) legal.open = true; });
  });

  /* ---------- Contact form (Formspree, AJAX) ---------- */
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  if (form && status) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      status.textContent = "Sending…";
      status.className = "contact__status";
      try {
        const res = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          form.reset();
          status.textContent = "Merci! Your message is on its way. 🚀";
          status.classList.add("is-success");
        } else {
          throw new Error("Formspree rejected the request");
        }
      } catch {
        status.textContent = "Hmm, that didn't work. Email me directly instead.";
        status.classList.add("is-error");
      }
    });
  }

  /* ---------- Easter egg: console greeting ---------- */
  console.log(
    "%c👋 Grüezi!",
    "font-size: 28px; font-weight: bold; color: #e9e9ec;"
  );
  console.log(
    "%cSnooping in the console? Respect. That's how it starts.\n→ github.com/ayaan-software1",
    "font-size: 13px; color: #9a9aa3; line-height: 1.6;"
  );
  console.log(
    "%c(Psst, try hovering the 🇨🇭 in the hero.)",
    "font-size: 11px; color: #55555e; font-style: italic;"
  );
})();
