/* ============================================================
   SEADON — 3D & Hyperrealism fixed scene (Three.js r128)
   A vertical world the camera descends through as you scroll:
   sky (flock + sun) -> mountains -> sea surface -> deep sea.
   Exposes window.SeaGL.progress for other scripts.
   ============================================================ */
(() => {
  "use strict";
  if (!window.THREE) return;

  const canvas = document.getElementById("gl");
  if (!canvas) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 900px)").matches;

  /* ---------- renderer / scene / camera ---------- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  } catch (err) {
    /* no WebGL: hide canvas, keep the page usable over the dark base bg */
    canvas.style.display = "none";
    console.warn("WebGL unavailable — 3D scene disabled.", err);
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  const FOG = new THREE.FogExp2(0x9cc8e8, 0.006);
  scene.fog = FOG;
  scene.background = new THREE.Color(0x9cc8e8);

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 600);
  camera.position.set(0, 0, 0);
  camera.lookAt(0, -2, -60);

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight(0xcfe8f8, 0x6a8aa0, 0.9);
  scene.add(hemi);

  const sunLight = new THREE.DirectionalLight(0xfff2dc, 1.4);
  sunLight.position.set(60, 40, -120);
  scene.add(sunLight);

  const abyssLight = new THREE.PointLight(0x2fbfae, 0, 140);
  abyssLight.position.set(0, -150, -60);
  scene.add(abyssLight);

  /* ---------- helpers: soft radial texture ---------- */
  function radialTexture(inner, outer) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    return t;
  }

  /* ---------- SUN ---------- */
  const sunTex = radialTexture("rgba(255,244,230,0.95)", "rgba(199,125,255,0)");
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunTex, color: 0xfff6e0, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  sun.scale.set(70, 70, 1);
  sun.position.set(55, 22, -190);
  scene.add(sun);

  const sunHaze = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunTex, color: 0xbfe0f5, transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  sunHaze.scale.set(220, 220, 1);
  sunHaze.position.set(55, 20, -200);
  scene.add(sunHaze);

  /* ---------- CLOUDS (soft billboard puffs) ---------- */
  const cloudTex = radialTexture("rgba(210,220,235,0.32)", "rgba(210,220,235,0)");
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.SpriteMaterial({
      map: cloudTex, color: 0xffffff, transparent: true,
      opacity: 0.35 + Math.random() * 0.25, depthWrite: false,
    });
    const s = new THREE.Sprite(m);
    const w = 40 + Math.random() * 70;
    s.scale.set(w, w * 0.32, 1);
    s.position.set((Math.random() - 0.5) * 260, 4 + Math.random() * 26, -80 - Math.random() * 140);
    s.userData.speed = 0.6 + Math.random() * 1.2;
    clouds.push(s);
    scene.add(s);
  }

  /* ---------- MOUNTAINS: procedural ridge heightfields ---------- */
  function fbm(x, seed) {
    return (
      Math.sin(x * 0.9 + seed) * 0.5 +
      Math.sin(x * 2.3 + seed * 1.7) * 0.28 +
      Math.sin(x * 5.1 + seed * 3.1) * 0.14 +
      Math.sin(x * 11.7 + seed * 5.3) * 0.06
    );
  }

  function makeRidge(width, depth, seed, amp, baseY, color, z) {
    const geo = new THREE.PlaneGeometry(width, depth, 160, 24);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const zz = pos.getZ(i);
      // ridge line along x; height falls away from center z of the strip
      const crest = fbm(x * 0.045, seed) * amp + amp * 0.4;
      const fall = Math.max(0, 1 - Math.abs(zz) / (depth * 0.5));
      const h = crest * Math.pow(fall, 0.85);
      pos.setY(i, h);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      color, roughness: 0.95, metalness: 0.02, flatShading: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, baseY, z);
    scene.add(mesh);
    return mesh;
  }

  const ridgeFar = makeRidge(520, 90, 3.1, 26, -46, 0x9db8cc, -190);
  const ridgeMid = makeRidge(520, 90, 7.7, 30, -50, 0x64809a, -150);
  const ridgeNear = makeRidge(520, 90, 12.4, 34, -54, 0x3a5a78, -110);
  const ridges = [ridgeFar, ridgeMid, ridgeNear];
  const ridgeHomeY = ridges.map((r) => r.position.y);
  ridges.forEach((r) => { r.position.y -= 34; }); // start sunk below the horizon

  /* snow caps hint: brighter top vertices on the far ridge */
  (function snowCaps() {
    const geo = ridgeFar.geometry;
    const pos = geo.attributes.position;
    const colors = [];
    const base = new THREE.Color(0x9db8cc);
    const cap = new THREE.Color(0xf2f8fc);
    for (let i = 0; i < pos.count; i++) {
      const t = Math.max(0, Math.min(1, (pos.getY(i) - 10) / 16));
      const c = base.clone().lerp(cap, t * 0.75);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    ridgeFar.material.vertexColors = true;
    ridgeFar.material.needsUpdate = true;
  })();

  /* ---------- SEA SURFACE: animated wave shader ---------- */
  const waterGeo = new THREE.PlaneGeometry(600, 500, 120, 100);
  const waterMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uShallow: { value: new THREE.Color(0x8fe8dc) },
      uDeep: { value: new THREE.Color(0x17708e) },
      uFogColor: { value: FOG.color },
      uFogDensity: { value: 0.008 },
    },
    vertexShader: `
      uniform float uTime;
      varying float vH;
      varying vec3 vPos;
      float wave(vec2 p) {
        return sin(p.x * 0.14 + uTime * 0.9) * 0.7
             + sin(p.y * 0.11 - uTime * 0.7) * 0.55
             + sin((p.x + p.y) * 0.22 + uTime * 1.3) * 0.28
             + sin(length(p) * 0.09 - uTime * 0.5) * 0.4;
      }
      void main() {
        vec3 p = position;
        float h = wave(p.xy);
        p.z += h;
        vH = h;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uShallow;
      uniform vec3 uDeep;
      uniform vec3 uFogColor;
      uniform float uFogDensity;
      uniform float uTime;
      varying float vH;
      varying vec3 vPos;
      void main() {
        float t = smoothstep(-1.6, 1.8, vH);
        vec3 col = mix(uDeep, uShallow, t * 0.55);
        // moving glints
        float glint = smoothstep(0.82, 1.0, sin(vPos.x * 0.5 + uTime * 2.0) * sin(vPos.z * 0.4 - uTime * 1.6));
        col += glint * 0.18;
        // exponential fog to blend into the scene
        float dist = length(vPos - cameraPosition);
        float f = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
        col = mix(col, uFogColor, clamp(f, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    fog: false,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -82, -160);
  scene.add(water);

  /* ---------- GOD RAYS (additive cones) ---------- */
  const rays = [];
  const rayGeo = new THREE.ConeGeometry(9, 110, 24, 1, true);
  for (let i = 0; i < 7; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: i % 2 ? 0x7fe8dc : 0x39c2c9,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ray = new THREE.Mesh(rayGeo, mat);
    ray.position.set(-60 + i * 22 + Math.random() * 10, -140, -90 - Math.random() * 80);
    ray.rotation.z = (Math.random() - 0.5) * 0.24;
    rays.push(ray);
    scene.add(ray);
  }

  /* ---------- MARINE SNOW (points) ---------- */
  const SNOW_N = isMobile ? 350 : 800;
  const snowGeo = new THREE.BufferGeometry();
  const snowPos = new Float32Array(SNOW_N * 3);
  for (let i = 0; i < SNOW_N; i++) {
    snowPos[i * 3] = (Math.random() - 0.5) * 240;
    snowPos[i * 3 + 1] = -86 - Math.random() * 190;
    snowPos[i * 3 + 2] = -20 - Math.random() * 180;
  }
  snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPos, 3));
  const snowMat = new THREE.PointsMaterial({
    color: 0xdffcf6, size: 0.55, transparent: true, opacity: 0.5,
    depthWrite: false, sizeAttenuation: true,
  });
  const snowPts = new THREE.Points(snowGeo, snowMat);
  scene.add(snowPts);

  /* ---------- FLOCK: bar-tailed godwits ---------- */
  const flockGroup = new THREE.Group();
  scene.add(flockGroup);
  const birds = [];
  const wingGeoL = new THREE.PlaneGeometry(1.7, 0.34);
  wingGeoL.translate(0.85, 0, 0); // hinge at body, extends right
  const wingGeoR = new THREE.PlaneGeometry(1.7, 0.34);
  wingGeoR.translate(-0.85, 0, 0); // extends left
  const birdMat = new THREE.MeshBasicMaterial({ color: 0xdfe8f2, side: THREE.DoubleSide });

  function makeBird() {
    const g = new THREE.Group();
    const wl = new THREE.Mesh(wingGeoL, birdMat);
    const wr = new THREE.Mesh(wingGeoR, birdMat);
    g.add(wl, wr);
    g.userData = { wl, wr, phase: Math.random() * Math.PI * 2, speed: 5 + Math.random() * 2.5 };
    return g;
  }

  for (let i = 0; i < 17; i++) {
    const b = makeBird();
    const row = Math.floor((i + 1) / 2);
    const side = i === 0 ? 0 : i % 2 === 0 ? 1 : -1;
    // tight screen-space V: leader top, wings trailing back-down
    const bx = side * (row * 2.4 + (Math.random() - 0.5) * 0.5);
    const by = -row * 1.1 + (Math.random() - 0.5) * 0.4 - (i === 0 ? 0.4 : 0);
    const bz = (Math.random() - 0.5) * 2;
    const s = i === 0 ? 1.15 : 0.72 + Math.random() * 0.22;
    b.scale.setScalar(s);
    b.position.set(bx, by, bz);
    b.rotation.y = (Math.random() - 0.5) * 0.22; // slight 3D attitude
    b.userData.home = new THREE.Vector3(bx, by, bz);
    flockGroup.add(b);
    birds.push(b);
  }
  flockGroup.position.set(16, 12, -52);

  /* ---------- scroll + mouse state ---------- */
  let targetProgress = 0;
  let progress = 0;
  let mouseX = 0, mouseY = 0, aimX = 0, aimY = 0;

  function readScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    targetProgress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  }
  window.addEventListener("scroll", readScroll, { passive: true });
  readScroll();

  window.addEventListener("pointermove", (e) => {
    mouseX = e.clientX / window.innerWidth - 0.5;
    mouseY = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    readScroll();
  });

  /* ---------- palette keyframes for the descent ---------- */
  const C = (hex) => new THREE.Color(hex);
  const stops = [
    { p: 0.0, fog: C(0x9cc8e8), density: 0.006 },  // bright day sky
    { p: 0.3, fog: C(0xbcd9ec), density: 0.009 },  // mountain haze
    { p: 0.5, fog: C(0x2f9db4), density: 0.013 },  // turquoise surface
    { p: 0.68, fog: C(0x12707c), density: 0.018 }, // teal mid-water
    { p: 1.0, fog: C(0x0a4f5c), density: 0.026 },  // deep teal caustic zone
  ];
  const fogCol = new THREE.Color();
  function paletteAt(p) {
    let a = stops[0], b = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (p >= stops[i].p && p <= stops[i + 1].p) { a = stops[i]; b = stops[i + 1]; break; }
    }
    const t = (p - a.p) / Math.max(0.0001, b.p - a.p);
    fogCol.copy(a.fog).lerp(b.fog, t);
    FOG.color.copy(fogCol);
    scene.background = fogCol;
    FOG.density = a.density + (b.density - a.density) * t;
    waterMat.uniforms.uFogDensity.value = FOG.density;
  }

  /* ---------- animation loop ---------- */
  const clock = new THREE.Clock();
  let running = true;

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    const t = clock.getElapsedTime();
    const dt = Math.min(0.05, clock.getDelta() + 0.016);

    progress += (targetProgress - progress) * 0.08;
    if (window.SeaGL) window.SeaGL.progress = progress;
    const p = progress;

    /* camera descent + subtle mouse parallax */
    aimX += (mouseX - aimX) * 0.04;
    aimY += (mouseY - aimY) * 0.04;
    const camY = -p * 250;
    camera.position.set(aimX * 6, camY + aimY * -3, 0);
    camera.rotation.x = -0.04 - p * 0.1; // tilt down as we sink
    camera.rotation.y = -aimX * 0.06;

    paletteAt(p);

    /* mountains rise out of the horizon as the story leaves the hero */
    const rise = Math.min(1, Math.max(0, (p - 0.04) / 0.2));
    const ease = rise * rise * (3 - 2 * rise);
    ridges.forEach((r, i) => {
      r.position.y = ridgeHomeY[i] - 34 * (1 - ease);
    });

    /* sun + haze fade out on the way down */
    const sunFade = Math.max(0, 1 - p / 0.34);
    sun.material.opacity = 0.9 * sunFade;
    sunHaze.material.opacity = 0.35 * sunFade;
    sunLight.intensity = 1.4 * sunFade;
    hemi.intensity = 0.9 * (1 - p * 0.6);
    abyssLight.intensity = p > 0.55 ? (p - 0.55) * 2.4 : 0;

    /* clouds drift, fade with the sky */
    const cloudFade = Math.max(0, 1 - p / 0.3);
    clouds.forEach((c, i) => {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 180) c.position.x = -180;
      c.material.opacity = (0.35 + (i % 3) * 0.08) * cloudFade;
    });

    /* flock: steer toward mouse, flap, fly off before the sea */
    const flockFade = Math.max(0, 1 - Math.max(0, p - 0.3) / 0.14);
    flockGroup.visible = flockFade > 0.02;
    if (flockGroup.visible) {
      flockGroup.position.x = 16 + aimX * 22;
      flockGroup.position.y = 12 + camY * 0.08 + aimY * -10 + p * 30;
      flockGroup.rotation.z = -aimX * 0.22;
      flockGroup.rotation.x = aimY * 0.12;
      birds.forEach((b) => {
        const u = b.userData;
        const flap = Math.sin(t * u.speed + u.phase) * 0.55;
        u.wl.rotation.z = flap;   // right wing tips up
        u.wr.rotation.z = -flap;  // left wing tips up (mirrored geo)
      });
      birdMat.opacity = flockFade;
      birdMat.transparent = flockFade < 1;
    }

    /* water */
    waterMat.uniforms.uTime.value = t;
    const surfVis = p > 0.3 && p < 0.75;
    water.visible = surfVis || p >= 0.75;

    /* god rays fade in below the surface */
    const rayVis = Math.max(0, Math.min(1, (p - 0.52) / 0.16)) * (p > 0.9 ? Math.max(0.25, 1 - (p - 0.9) / 0.1) : 1);
    rays.forEach((r, i) => {
      r.material.opacity = 0.08 * rayVis * (1 + 0.4 * Math.sin(t * 0.5 + i));
      r.rotation.z += Math.sin(t * 0.2 + i) * 0.0004;
    });

    /* marine snow falls, visible underwater */
    snowPts.visible = p > 0.42;
    if (snowPts.visible) {
      const pos = snowGeo.attributes.position;
      for (let i = 0; i < SNOW_N; i++) {
        let y = pos.getY(i) - dt * (1.5 + (i % 5) * 0.5);
        if (y < -276) y = -86;
        pos.setY(i, y);
        pos.setX(i, pos.getX(i) + Math.sin(t * 0.3 + i) * 0.004);
      }
      pos.needsUpdate = true;
      snowMat.opacity = Math.min(0.5, (p - 0.42) * 2);
    }

    renderer.render(scene, camera);
  }

  /* ---------- reduced motion: static render per scroll ---------- */
  if (reduced) {
    const renderStatic = () => {
      readScroll();
      progress = targetProgress;
      if (window.SeaGL) window.SeaGL.progress = progress;
      const p = progress;
      camera.position.set(0, -p * 250, 0);
      camera.rotation.x = -0.04 - p * 0.1;
      paletteAt(p);
      const rise = Math.min(1, Math.max(0, (p - 0.04) / 0.2));
      const ease = rise * rise * (3 - 2 * rise);
      ridges.forEach((r, i) => { r.position.y = ridgeHomeY[i] - 34 * (1 - ease); });
      const sunFade = Math.max(0, 1 - p / 0.34);
      sun.material.opacity = 0.9 * sunFade;
      sunHaze.material.opacity = 0.35 * sunFade;
      sunLight.intensity = 1.4 * sunFade;
      waterMat.uniforms.uTime.value = 2.5;
      rays.forEach((r, i) => { r.material.opacity = 0.05 * Math.max(0, Math.min(1, (p - 0.52) / 0.16)); });
      snowPts.visible = p > 0.42;
      flockGroup.visible = p < 0.34;
      renderer.render(scene, camera);
    };
    window.addEventListener("scroll", renderStatic, { passive: true });
    renderStatic();
    return;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { running = false; }
    else if (!running) { running = true; clock.getDelta(); frame(); }
  });

  frame();
  window.SeaGL = window.SeaGL || {};
  window.SeaGL.progress = 0;
})();
