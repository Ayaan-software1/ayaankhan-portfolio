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

    // Ring trails behind with a soft lerp
    (function trail() {
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      requestAnimationFrame(trail);
    })();

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

    gsap.utils.toArray(".reveal").forEach((el) => {
      gsap.from(el, {
        opacity: 0,
        y: 36,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          toggleActions: "play none none none",
        },
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
    "font-size: 28px; font-weight: bold; color: #ff4655;"
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
