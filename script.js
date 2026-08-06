(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

  gsap.registerPlugin(ScrollTrigger);

  /* ============================================================
     Ember particle canvas — the site's looping visual signature
  ============================================================ */
  (function embers() {
    const canvas = document.getElementById('embers');
    if (!canvas || reduceMotion) return;
    const ctx = canvas.getContext('2d');
    let w, h, particles, raf;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }

    function makeParticle(spawnAtBottom) {
      return {
        x: Math.random() * w,
        y: spawnAtBottom ? h + Math.random() * 100 : Math.random() * h,
        r: 1 + Math.random() * 2.4,
        vy: 0.35 + Math.random() * 0.7,
        drift: Math.random() * 0.6 - 0.3,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.15 + Math.random() * 0.45,
        hue: Math.random(), // 0 = ember orange, 1 = amber/white
      };
    }

    function init() {
      resize();
      const count = w < 700 ? 22 : 45;
      particles = Array.from({ length: count }, () => makeParticle(false));
    }

    function colorFor(p) {
      // interpolate between ember (#FF5A1F) and warm white (#FFE8CF)
      const r = Math.round(255);
      const g = Math.round(90 + (232 - 90) * p.hue);
      const b = Math.round(31 + (207 - 31) * p.hue);
      return `${r},${g},${b}`;
    }

    function tick() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.y -= p.vy;
        p.phase += 0.01;
        p.x += Math.sin(p.phase) * p.drift;
        const fadeByHeight = Math.max(0, 1 - p.y / (h * 0.85));
        const a = p.alpha * fadeByHeight;

        const rgb = colorFor(p);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        grad.addColorStop(0, `rgba(${rgb},${a})`);
        grad.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
        ctx.fill();

        if (p.y < -20 || a <= 0.003) {
          Object.assign(p, makeParticle(true));
        }
      });
      raf = requestAnimationFrame(tick);
    }

    init();
    canvas.classList.add('is-active');
    raf = requestAnimationFrame(tick);
    window.addEventListener('resize', () => { resize(); }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(tick);
      }
    });
  })();

  /* ============================================================
     Custom cursor glow
  ============================================================ */
  if (!reduceMotion && !isCoarsePointer) {
    const glow = document.querySelector('.cursor-glow');
    const moveX = gsap.quickTo(glow, 'x', { duration: 0.55, ease: 'power3.out' });
    const moveY = gsap.quickTo(glow, 'y', { duration: 0.55, ease: 'power3.out' });
    window.addEventListener('mousemove', (e) => {
      moveX(e.clientX);
      moveY(e.clientY);
      glow.classList.add('is-active');
    }, { passive: true });
    document.addEventListener('mouseleave', () => glow.classList.remove('is-active'));
  }

  /* ============================================================
     Magnetic buttons
  ============================================================ */
  if (!reduceMotion && !isCoarsePointer) {
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      const moveX = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
      const moveY = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const relX = e.clientX - rect.left - rect.width / 2;
        const relY = e.clientY - rect.top - rect.height / 2;
        moveX(relX * 0.35);
        moveY(relY * 0.5);
      });
      el.addEventListener('mouseleave', () => { moveX(0); moveY(0); });
    });
  }

  /* ============================================================
     Tilt cards
  ============================================================ */
  if (!reduceMotion && !isCoarsePointer) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      const rotX = gsap.quickTo(card, 'rotateX', { duration: 0.5, ease: 'power3.out' });
      const rotY = gsap.quickTo(card, 'rotateY', { duration: 0.5, ease: 'power3.out' });
      const lift = gsap.quickTo(card, 'y', { duration: 0.5, ease: 'power3.out' });
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        rotX(py * -8);
        rotY(px * 10);
        lift(-4);
      });
      card.addEventListener('mouseleave', () => { rotX(0); rotY(0); lift(0); });
    });
  }

  /* ------------------------------------------------------------
     Split hero title lines + eyebrow for reveal
  ------------------------------------------------------------ */
  function wrapLine(el) {
    const text = el.textContent;
    el.innerHTML = `<span class="line-inner">${text}</span>`;
    return el.querySelector('.line-inner');
  }
  function wrapLineWithEm(el) {
    const inner = document.createElement('span');
    inner.className = 'line-inner';
    inner.innerHTML = el.innerHTML;
    el.innerHTML = '';
    el.appendChild(inner);
    return inner;
  }

  const titleLines = gsap.utils.toArray('.hero__title [data-split]');
  const lineInners = titleLines.map((el) => wrapLineWithEm(el));

  const eyebrow = document.querySelector('.hero .eyebrow[data-split]');
  let eyebrowInner = null;
  if (eyebrow) eyebrowInner = wrapLine(eyebrow);

  gsap.set(lineInners, { yPercent: 110 });
  if (eyebrowInner) gsap.set(eyebrowInner, { yPercent: 130, opacity: 0 });
  gsap.set('.hero__sub, .hero__actions, .hero__ticker', { opacity: 0, y: 24 });
  gsap.set('.scroll-cue', { opacity: 0 });
  gsap.set('.site-header', { opacity: 0, y: -12 });

  /* ------------------------------------------------------------
     Intro timeline
  ------------------------------------------------------------ */
  const intro = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.15 });

  intro.to('.site-header', { opacity: 1, y: 0, duration: 0.01 }, 0);
  if (eyebrowInner) intro.to(eyebrowInner, { yPercent: 0, opacity: 1, duration: 0.7 }, 0.1);
  intro.to(lineInners, { yPercent: 0, duration: 1, stagger: 0.09, ease: 'power4.out' }, 0.25);
  intro.to('.hero__sub, .hero__actions, .hero__ticker', { opacity: 1, y: 0, duration: 0.8, stagger: 0.12 }, '-=0.55');
  intro.to('.scroll-cue', { opacity: 1, duration: 0.6 }, '-=0.4');

  /* ------------------------------------------------------------
     Generic [data-reveal] fade-up on scroll
  ------------------------------------------------------------ */
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    if (el.closest('.hero')) return;
    gsap.fromTo(el,
      { opacity: 0, y: 32 },
      { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' } }
    );
  });

  /* ------------------------------------------------------------
     [data-reveal-lines] — headline line reveal on scroll
  ------------------------------------------------------------ */
  gsap.utils.toArray('[data-reveal-lines]').forEach((el) => {
    const html = el.innerHTML.split('<br>');
    el.innerHTML = html.map((line) => `<span class="rl-line"><span class="rl-inner">${line}</span></span>`).join('');
    el.querySelectorAll('.rl-line').forEach((l) => { l.style.display = 'block'; l.style.overflow = 'hidden'; });
    const inners = el.querySelectorAll('.rl-inner');
    gsap.set(inners, { yPercent: 110 });
    gsap.to(inners, {
      yPercent: 0, duration: 0.9, stagger: 0.08, ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });

  /* ------------------------------------------------------------
     Manifesto — words "forge" into color as you scroll
  ------------------------------------------------------------ */
  (function forgeText() {
    const el = document.querySelector('[data-forge-text]');
    if (!el) return;
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="word">${w}</span>`).join(' ');
    const wordEls = el.querySelectorAll('.word');

    gsap.to(wordEls, {
      color: 'var(--ember-white)',
      stagger: 0.5,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top 75%',
        end: 'bottom 40%',
        scrub: 0.4,
      },
    });
  })();

  /* ------------------------------------------------------------
     Método — scrub progress bar + node lighting
  ------------------------------------------------------------ */
  (function metodoBar() {
    const bar = document.querySelector('[data-metodo-bar]');
    const nodes = gsap.utils.toArray('[data-metodo-node]');
    if (!bar || !nodes.length) return;
    bar.classList.add('is-filled');

    ScrollTrigger.create({
      trigger: '.metodo__wrap',
      start: 'top 70%',
      end: 'bottom 60%',
      scrub: 0.5,
      onUpdate: (self) => {
        bar.style.setProperty('--fill', self.progress);
        const litCount = Math.floor(self.progress * nodes.length + 0.15);
        nodes.forEach((n, i) => n.classList.toggle('is-lit', i < litCount));
      },
    });
  })();

  /* ------------------------------------------------------------
     Projetos — horizontal scroll rig (desktop only)
  ------------------------------------------------------------ */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const wrap = document.querySelector('[data-horizontal-wrap]');
    const track = document.querySelector('[data-horizontal-track]');
    if (!wrap || !track) return;

    const getDistance = () => track.scrollWidth - window.innerWidth;

    const tween = gsap.to(track, {
      x: () => -getDistance(),
      ease: 'none',
      scrollTrigger: {
        trigger: wrap,
        start: 'top top',
        end: () => `+=${getDistance()}`,
        pin: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    });

    // subtle scale-in per panel as it becomes centered
    gsap.utils.toArray('.caso').forEach((panel) => {
      const frames = panel.querySelectorAll('.browser-frame');
      gsap.fromTo(frames,
        { scale: 0.92, opacity: 0.5 },
        {
          scale: 1, opacity: 1, stagger: 0.06, ease: 'none',
          scrollTrigger: {
            trigger: panel,
            containerAnimation: tween,
            start: 'left 75%',
            end: 'left 35%',
            scrub: true,
          },
        }
      );
    });

    return () => { tween.scrollTrigger && tween.scrollTrigger.kill(); tween.kill(); };
  });

  /* ------------------------------------------------------------
     Servico cards stagger-in
  ------------------------------------------------------------ */
  gsap.utils.toArray('.servico-card').forEach((card, i) => {
    gsap.fromTo(card,
      { opacity: 0, y: 40, rotateX: -8 },
      {
        opacity: 1, y: 0, rotateX: 0, duration: 0.8, delay: i * 0.08, ease: 'power3.out',
        scrollTrigger: { trigger: '.servicos__grid', start: 'top 82%' },
      }
    );
  });

  /* ------------------------------------------------------------
     Scroll progress ring (fixed corner indicator)
  ------------------------------------------------------------ */
  const progressFill = document.querySelector('.progress-ring__fill');
  const progressWrap = document.querySelector('.progress-ring');
  const RING_LEN = 276.5;

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      progressFill.style.strokeDashoffset = RING_LEN - self.progress * RING_LEN;
    },
  });

  ScrollTrigger.create({
    trigger: '.manifesto',
    start: 'top bottom',
    onEnter: () => progressWrap.classList.add('is-visible'),
    onLeaveBack: () => progressWrap.classList.remove('is-visible'),
  });

  progressWrap.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ------------------------------------------------------------
     Scroll cue click
  ------------------------------------------------------------ */
  document.querySelector('.scroll-cue')?.addEventListener('click', () => {
    document.querySelector('.manifesto')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ------------------------------------------------------------
     Mobile nav toggle
  ------------------------------------------------------------ */
  const navToggle = document.querySelector('.nav-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  navToggle?.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });
  mobileNav?.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      mobileNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  /* ------------------------------------------------------------
     Smooth in-page scroll for anchor links
  ------------------------------------------------------------ */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });
})();
