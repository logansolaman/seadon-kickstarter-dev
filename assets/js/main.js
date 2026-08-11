/* ============================================================
   SEADON — scroll choreography (designer light theme)
   GSAP 3.12 + ScrollTrigger. Respects prefers-reduced-motion.
   ============================================================ */
(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- split-text helper ---------- */
  function splitLines(el) {
    const text = el.textContent.trim();
    el.textContent = "";
    el.setAttribute("aria-label", text);
    const line = document.createElement("span");
    line.className = "split-line";
    line.setAttribute("aria-hidden", "true");
    const inner = document.createElement("span");
    inner.className = "split-inner";
    inner.style.display = "inline-block";
    inner.style.willChange = "transform";
    inner.textContent = text;
    line.appendChild(inner);
    el.appendChild(line);
    return inner;
  }

  /* ---------- reduced motion: reveal everything, stop here ---------- */
  if (reduced) {
    document.querySelectorAll("[data-split]").forEach((el) => { splitLines(el); });
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    document.querySelectorAll("[data-count]").forEach((el) => {
      el.textContent = parseInt(el.dataset.count, 10).toLocaleString("en-US");
    });
    const fill = document.getElementById("meterFill");
    if (fill) fill.style.width = "37%";
    const rail = document.getElementById("railFill");
    if (rail) rail.style.height = "100%";
    return;
  }

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const isMobile = window.matchMedia("(max-width: 900px)").matches;

  /* ================= HERO intro ================= */
  const heroInners = [...document.querySelectorAll(".hero__title [data-split]")].map(splitLines);
  gsap.set(heroInners, { yPercent: 110 });

  const heroTl = gsap.timeline({ defaults: { ease: "expo.out" } });
  heroTl
    .to(heroInners[0], { yPercent: 0, duration: 1.1 }, 0.15)
    .to(heroInners[1], { yPercent: 0, duration: 1.1 }, 0.3)
    .fromTo(".hero__copy [data-reveal]", { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.1 }, 0.55)
    .fromTo(".hero__media", { opacity: 0, y: 40, rotate: 2 }, { opacity: 1, y: 0, rotate: 0, duration: 1 }, 0.5);

  /* gentle bird float */
  gsap.to(".hero__bird", { y: -14, rotation: -3, duration: 2.4, yoyo: true, repeat: -1, ease: "sine.inOut" });

  /* hero scroll-out */
  gsap.timeline({
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: 0.6,
    },
  })
    .to(".hero__copy", { yPercent: -18, opacity: 0.1, ease: "none" }, 0)
    .to(".hero__media", { yPercent: -26, opacity: 0.2, ease: "none" }, 0);

  /* ================= split-text section titles ================= */
  document.querySelectorAll("[data-split]:not(.hero__title [data-split])").forEach((el) => {
    const inner = splitLines(el);
    gsap.set(inner, { yPercent: 110 });
    gsap.to(inner, {
      yPercent: 0,
      duration: 1,
      ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 86%" },
    });
  });

  /* ================= generic reveals ================= */
  document.querySelectorAll("[data-reveal]").forEach((el) => {
    if (el.closest(".hero__pin")) return;
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.85,
      ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 88%" },
    });
  });

  /* ================= counters ================= */
  document.querySelectorAll("[data-count]").forEach((el) => {
    const target = parseInt(el.dataset.count, 10);
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target,
      duration: 1.6,
      ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 86%" },
      onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString("en-US"); },
    });
  });

  /* ================= how-it-works rail + steps ================= */
  gsap.utils.toArray("#howSteps .step").forEach((step, i) => {
    gsap.fromTo(step,
      { opacity: 0, x: 70, rotate: 0.8 },
      { opacity: 1, x: 0, rotate: 0, duration: 0.9, ease: "expo.out",
        scrollTrigger: { trigger: step, start: "top 82%" } });
  });

  const rail = document.getElementById("railFill");
  if (rail) {
    gsap.to(rail, {
      height: "100%",
      ease: "none",
      scrollTrigger: { trigger: "#howSteps", start: "top 70%", end: "bottom 60%", scrub: 0.4 },
    });
  }

  /* ================= pieces: tilt-in + gradient parallax ================= */
  gsap.utils.toArray(".piece").forEach((piece) => {
    const grad = piece.querySelector(".piece__grad");
    if (grad && !isMobile) {
      gsap.fromTo(grad, { scale: 1.25 }, {
        scale: 1.05,
        ease: "none",
        scrollTrigger: { trigger: piece, start: "top bottom", end: "bottom top", scrub: 0.5 },
      });
    }
  });

  /* ================= early-access meter ================= */
  const meter = document.getElementById("meterFill");
  if (meter) {
    gsap.to(meter, {
      width: "37%",
      duration: 1.4,
      ease: "expo.out",
      scrollTrigger: { trigger: ".early__meter", start: "top 85%" },
    });
  }

  /* ================= forms: fake-success micro-interaction ================= */
  document.querySelectorAll("[data-signup]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = form.querySelector("button");
      const input = form.querySelector("input");
      if (!input.value) return;
      btn.textContent = "✓ You're on the list";
      btn.disabled = true;
      input.disabled = true;
      gsap.fromTo(btn, { scale: 0.92 }, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.5)" });
    });
  });

  /* ================= DEPTH GAUGE ================= */
  const gauge = document.querySelector(".gauge");
  const gaugeFill = document.getElementById("gaugeFill");
  const gaugePhase = document.getElementById("gaugePhase");
  const gaugeRead = document.getElementById("gaugeRead");
  if (gauge && gaugeFill && gaugePhase && gaugeRead) {
    ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const p = self.progress;
        gaugeFill.style.height = (p * 100).toFixed(1) + "%";
        gauge.classList.toggle("is-on", p > 0.05);
        if (p < 0.25) {
          gaugePhase.textContent = "SKY";
          gaugeRead.textContent = Math.round((1 - p / 0.25) * 2000) + " m up";
        } else if (p < 0.45) {
          gaugePhase.textContent = "MOUNTAINS";
          gaugeRead.textContent = Math.round(2000 - ((p - 0.25) / 0.2) * 2000) + " m up";
        } else if (p < 0.62) {
          gaugePhase.textContent = "SURFACE";
          gaugeRead.textContent = Math.round(((p - 0.45) / 0.17) * 60) + " m";
        } else {
          gaugePhase.textContent = "DEEP SEA";
          gaugeRead.textContent = Math.round(60 + ((p - 0.62) / 0.38) * 1440) + " m";
        }
      },
    });
  }

  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
