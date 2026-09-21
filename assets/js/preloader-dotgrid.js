/* ============================================================
   Grade de pontinhos no fundo do preloader — grid estático que,
   perto do cursor, os pontos "levitam" numa órbita 3D projetada
   (elipse inclinada) e crescem/clareiam quanto mais perto do
   ponteiro. Longe do cursor ficam parados e discretos.
============================================================ */
(() => {
  const canvas = document.querySelector('[data-preloader-dotgrid]');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const SPACING = 34;
  const DOT_SIZE = 2.4;
  const IMPACT_RADIUS = 130;
  const HOVER_SCALE = 2;
  const ORBIT_SPEED = 1.1;
  const COLOR = { r: 255, g: 90, b: 31 }; // var(--ember)

  let width = 0, height = 0;
  let dots = [];
  let pointer = { x: -9999, y: -9999 };
  let hovering = false;
  let leaveAt = 0;
  let lastTs = 0;
  let angle = 0;
  let raf = 0;

  function smoothstep(t) {
    const c = Math.max(0, Math.min(1, t));
    return c * c * (3 - 2 * c);
  }

  function buildDots() {
    dots = [];
    const cols = Math.ceil(width / SPACING) + 2;
    const rows = Math.ceil(height / SPACING) + 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        dots.push({
          x0: c * SPACING,
          y0: r * SPACING,
          tilt: Math.random() * Math.PI,
          spin: Math.random() * Math.PI * 2,
          phase: Math.random() * Math.PI * 2,
          rate: 0.7 + Math.random() * 0.6,
        });
      }
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildDots();
  }

  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    hovering = true;
  }
  function onLeave() {
    pointer.x = -9999;
    pointer.y = -9999;
    hovering = false;
    leaveAt = performance.now();
  }

  function tick(ts) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min((ts - (lastTs || ts)) / 1000, 0.05);
    lastTs = ts;
    angle += ORBIT_SPEED * dt;
    ctx.clearRect(0, 0, width, height);

    const since = hovering ? 0 : Math.max(0, ts - leaveAt) / 1000;
    const decay = hovering ? 1 : smoothstep(Math.max(0, 1 - since * 1.5));

    for (const d of dots) {
      const dx = d.x0 - pointer.x;
      const dy = d.y0 - pointer.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let x = d.x0, y = d.y0, scale = 1, alpha = 0.22;

      if (dist < IMPACT_RADIUS && dist > 0) {
        const t = dist / IMPACT_RADIUS;
        const inf = smoothstep(1 - t) * decay;
        const orbitR = (1 - t) * SPACING * 0.7 * inf;
        const theta = angle * d.rate + d.phase;
        const cosSpin = Math.cos(d.spin), sinSpin = Math.sin(d.spin);
        const cosTilt = Math.cos(d.tilt), sinTilt = Math.sin(d.tilt);
        const lx = Math.cos(theta);
        const ly = Math.sin(theta) * cosTilt;
        const depth = Math.sin(theta) * sinTilt;
        const ox = (lx * cosSpin - ly * sinSpin) * orbitR;
        const oy = (lx * sinSpin + ly * cosSpin) * orbitR;
        x = d.x0 + ox;
        y = d.y0 + oy;
        const depthScale = 0.75 + 0.25 * ((depth + 1) * 0.5);
        scale = (1 + (HOVER_SCALE - 1) * inf) * depthScale;
        alpha = (0.22 + 0.55 * inf) * depthScale;
      }

      const radius = (DOT_SIZE / 2) * scale;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${COLOR.r},${COLOR.g},${COLOR.b},${alpha})`;
      ctx.fill();
    }
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);

  raf = requestAnimationFrame(tick);

  document.addEventListener('app:ready', () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
  }, { once: true });
})();
