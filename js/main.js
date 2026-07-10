/* ============================================================
   Ayaan Khan — portfolio interactions
   Custom cursor · magnetic hover · GSAP reveals · accordions
   ============================================================ */
(() => {
  "use strict";

  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Custom cursor (pointer devices only) ---------- */
  if (finePointer && !reducedMotion) {
    const dot = document.getElementById("cursor-dot");
    const ring = document.getElementById("cursor-ring");

    let mouseX = -100, mouseY = -100;
    let ringX = -100, ringY = -100;

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

    // Ring trails behind with a soft lerp (~180ms to catch up).
    // Time-based smoothing so the feel doesn't change with frame rate.
    let lastTrail = performance.now();
    (function trail(now) {
      const dt = Math.min((now - lastTrail) / 1000, 0.1) || 0.016;
      lastTrail = now;
      const k = 1 - Math.exp(-dt / 0.06);
      ringX += (mouseX - ringX) * k;
      ringY += (mouseY - ringY) * k;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      requestAnimationFrame(trail);
    })(lastTrail);

    // Grow the ring over interactive elements
    const hoverTargets = "a, button, .magnetic-card, .tooltip";
    document.querySelectorAll(hoverTargets).forEach((el) => {
      el.addEventListener("mouseenter", () => ring.classList.add("is-hovering"));
      el.addEventListener("mouseleave", () => ring.classList.remove("is-hovering"));
    });

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
        status.textContent = "Hmm, that didn't work — email me directly instead.";
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
    "%c(Psst — try hovering the 🇨🇭 in the hero.)",
    "font-size: 11px; color: #55555e; font-style: italic;"
  );
})();
