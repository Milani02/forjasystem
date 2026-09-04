(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

  gsap.registerPlugin(ScrollTrigger);

  /* ============================================================
     Tema claro/escuro — o estado inicial já foi decidido por um
     script inline no <head> (evita flash do tema errado antes do
     CSS carregar); aqui só cuidamos do clique, do aria-label e de
     lembrar a escolha da pessoa pra próxima visita.
  ============================================================ */
  (function themeToggle() {
    const btn = document.querySelector('[data-theme-toggle]');
    if (!btn) return;
    const root = document.documentElement;
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const THEME_COLOR = { dark: '#060504', light: '#F6F1EA' };

    function reflect(theme) {
      btn.setAttribute('aria-label', theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro');
      if (themeColorMeta) themeColorMeta.setAttribute('content', THEME_COLOR[theme]);
    }
    reflect(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

    btn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      reflect(next);
      try { localStorage.setItem('forja-theme', next); } catch (e) {}
    });
  })();

  /* ============================================================
     Preloader — "acendendo a forja" antes do hero. Progresso
     simulado por tempo (sensação de carregamento), mas só fecha
     de verdade quando window.load + fontes terminarem — o que
     demorar mais entre isso e um tempo mínimo. Dispara app:ready
     pro resto do script saber que pode começar a entrada do hero.
  ============================================================ */
  (function preloader() {
    const el = document.querySelector('[data-preloader]');
    if (!el || reduceMotion) {
      document.documentElement.classList.remove('is-loading');
      if (el) el.remove();
      window.dispatchEvent(new Event('app:ready'));
      return;
    }

    const fillEl = el.querySelector('[data-preloader-fill]');
    const pctEl = el.querySelector('[data-preloader-pct]');
    const markEl = el.querySelector('.preloader__mark');

    let shown = 0, target = 0, closing = false;

    function setHeat(pct) {
      const stage = pct > 85 ? 4 : pct > 60 ? 3 : pct > 30 ? 2 : 1;
      markEl.className = 'preloader__mark preloader__mark--heat-' + stage;
    }

    function raf() {
      if (closing) return;
      shown += (target - shown) * 0.1 + 0.1;
      if (shown > target) shown = target;
      const val = Math.min(99, Math.round(shown));
      fillEl.style.width = val + '%';
      pctEl.textContent = val + '%';
      setHeat(val);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    const simTimer = setInterval(() => {
      target = Math.min(90, target + 3 + Math.random() * 7);
    }, 200);

    const loaded = new Promise((res) => {
      if (document.readyState === 'complete') return res();
      window.addEventListener('load', res, { once: true });
    });
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    const minTime = new Promise((res) => setTimeout(res, 1500));

    Promise.all([loaded, fontsReady, minTime]).then(() => {
      clearInterval(simTimer);
      closing = true;
      shown = 100;
      fillEl.style.width = '100%';
      pctEl.textContent = '100%';
      setHeat(100);

      gsap.delayedCall(0.3, () => {
        gsap.timeline({
          onComplete: () => {
            el.remove();
            document.documentElement.classList.remove('is-loading');
            window.dispatchEvent(new Event('app:ready'));
          },
        })
          .to(el.querySelector('.preloader__stage'), { opacity: 0, y: -14, duration: 0.35, ease: 'power2.in' })
          .to(el, { clipPath: 'inset(0 0 100% 0)', duration: 0.65, ease: 'power4.inOut' }, '-=0.05');
      });
    });
  })();

  /* ============================================================
     Ember particle canvas — the site's looping visual signature
  ============================================================ */
  (function embers() {
    const canvas = document.getElementById('embers');
    // efeito de fundo puramente decorativo (sem scroll-jack, sem
    // movimento brusco) — mostra mesmo com prefers-reduced-motion,
    // ao contrário das animações mais fortes do resto do site
    if (!canvas) return;
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
     Respingos de magma do hero — saltam em arcos (gravidade) sobre
     o vídeo de fundo, contínuo enquanto a seção existe.
  ============================================================ */
  (function heroMagmaSplash() {
    const canvas = document.querySelector('.hero__magma-splash');
    // mesmo racional do embers(): fundo decorativo, sem scroll-jack —
    // mostra mesmo com prefers-reduced-motion
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const GRAVITY = 0.16;
    let w, h, poolY, particles = [], raf;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = canvas.width = rect.width;
      h = canvas.height = rect.height;
      // a "poça" fica presa à base da janela visível, não da seção
      // inteira — em telas baixas o hero costuma crescer além do
      // viewport (texto grande empurra a altura), e sem isso os
      // respingos nasceriam fora da área visível sem rolar
      poolY = Math.min(h, window.innerHeight);
    }

    function makeDroplet() {
      const speed = 3.6 + Math.random() * 5;
      const angle = Math.PI / 2 + (Math.random() * 0.9 - 0.45); // maiormente pra cima, leque estreito
      return {
        x: w * (0.15 + Math.random() * 0.7),
        y: poolY + 6,
        vx: Math.cos(angle) * speed * 0.6,
        vy: -Math.sin(angle) * speed,
        r: 1.6 + Math.random() * 3,
        hue: Math.random(), // 0 = ember, 1 = amber/white (quente)
        alpha: 0.55 + Math.random() * 0.35,
        life: 0,
      };
    }

    function colorFor(p) {
      const g = Math.round(90 + (200 - 90) * p.hue);
      const b = Math.round(31 + (180 - 31) * p.hue);
      return `255,${g},${b}`;
    }

    function spawnBurst() {
      const count = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) particles.push(makeDroplet());
      setTimeout(spawnBurst, 220 + Math.random() * 480);
    }

    function tick() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.vy += GRAVITY;
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;
        const fade = Math.max(0, 1 - p.life / 130);
        const a = p.alpha * fade;
        const r = p.r * (0.6 + 0.4 * fade);
        const rgb = colorFor(p);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5);
        grad.addColorStop(0, `rgba(${rgb},${a})`);
        grad.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 5, 0, Math.PI * 2);
        ctx.fill();
      });
      particles = particles.filter((p) => p.y < poolY + 40 && p.life < 130);
      raf = requestAnimationFrame(tick);
    }

    resize();
    raf = requestAnimationFrame(tick);
    spawnBurst();
    window.addEventListener('resize', resize, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(tick);
    });
  })();

  /* ============================================================
     Projetos — chuva de código em tom de lava subindo atrás dos
     cards. Mesmo racional do embers()/magma-splash: fundo puramente
     decorativo, sem scroll-jack, então mostra mesmo com
     prefers-reduced-motion.
  ============================================================ */
  (function projetosCodeRain() {
    const canvas = document.querySelector('.projetos__code-rain');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const GLYPHS = ['{', '}', '<', '>', '/', '=', ';', '(', ')', '0', '1', '=>', '&&', '||', 'const', 'let', 'fn', '...'];
    const monoFont = getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() || 'monospace';
    let w, h, glyphs, raf;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = canvas.width = rect.width;
      h = canvas.height = rect.height;
    }

    function makeGlyph(spawnAtBottom) {
      return {
        x: Math.random() * w,
        y: spawnAtBottom ? h + 20 + Math.random() * 80 : Math.random() * h,
        vy: 0.3 + Math.random() * 0.55,
        drift: Math.random() * 0.4 - 0.2,
        phase: Math.random() * Math.PI * 2,
        char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        size: 11 + Math.random() * 8,
        hue: Math.random(), // 0 = ember fundo, 1 = amber/branco quente
        alpha: 0.12 + Math.random() * 0.38,
      };
    }

    function init() {
      resize();
      const count = w < 700 ? 24 : 44;
      glyphs = Array.from({ length: count }, () => makeGlyph(false));
    }

    function colorFor(g) {
      const r = 255;
      const green = Math.round(70 + (200 - 70) * g.hue);
      const blue = Math.round(20 + (150 - 20) * g.hue);
      return `${r},${green},${blue}`;
    }

    function tick() {
      ctx.clearRect(0, 0, w, h);
      glyphs.forEach((g) => {
        g.y -= g.vy;
        g.phase += 0.008;
        g.x += Math.sin(g.phase) * g.drift;
        const fadeByHeight = Math.max(0, 1 - g.y / (h * 0.9));
        const a = g.alpha * fadeByHeight;

        ctx.font = `${g.size}px ${monoFont}`;
        ctx.fillStyle = `rgba(${colorFor(g)},${a})`;
        ctx.fillText(g.char, g.x, g.y);

        if (g.y < -20 || a <= 0.004) Object.assign(g, makeGlyph(true));
      });
      raf = requestAnimationFrame(tick);
    }

    init();
    raf = requestAnimationFrame(tick);
    window.addEventListener('resize', () => resize(), { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(tick);
    });
  })();

  /* ============================================================
     Circuito de fundo — pulsos de brasa viajando pelas linhas
     (a dualidade "Forja" + "System" do nome, sempre no ar)
  ============================================================ */
  (function circuitPulses() {
    const paths = gsap.utils.toArray('[data-circuit-pulse]');
    if (!paths.length) return;
    if (reduceMotion) return;

    paths.forEach((path, i) => {
      const len = path.getTotalLength();
      path.style.strokeDasharray = `70 ${len}`;
      gsap.fromTo(path,
        { strokeDashoffset: 70 },
        {
          strokeDashoffset: -len,
          duration: len / 190,
          repeat: -1,
          ease: 'none',
          delay: i * 0.9,
        }
      );
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

  /* ============================================================
     Spotlight de cursor nos cards de serviço e depoimento
  ============================================================ */
  if (!reduceMotion && !isCoarsePointer) {
    document.querySelectorAll('.servico-card, .depoimento-card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        card.style.setProperty('--my', `${e.clientY - rect.top}px`);
      });
    });
  }

  /* ============================================================
     WhatsApp FAB — entrada tipo mola ao rolar
  ============================================================ */
  (function whatsappFab() {
    const fab = document.querySelector('.whatsapp-fab');
    if (!fab || reduceMotion) return;
    // Só aparece depois de DUAS seções abaixo do hero (problema é a
    // 1ª, manifesto é a 2ª) — não logo na primeira.
    ScrollTrigger.create({
      trigger: '.manifesto',
      start: 'top 80%',
      once: true,
      onEnter: () => {
        gsap.to(fab, { opacity: 1, scale: 1, y: 0, duration: 0.9, ease: 'back.out(1.7)' });
      },
    });
  })();

  /* ============================================================
     Contagem animada — seção de números
  ============================================================ */
  (function statCounters() {
    gsap.utils.toArray('.stat__num').forEach((el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      if (reduceMotion) { el.textContent = target + suffix; return; }
      const counter = { val: 0 };
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to(counter, {
            val: target, duration: 1.6, ease: 'power2.out',
            onUpdate: () => { el.textContent = Math.round(counter.val) + suffix; },
          });
        },
      });
    });
  })();

  /* ------------------------------------------------------------
     Split hero title into words (cada palavra com sua própria
     máscara) + eyebrow for reveal
  ------------------------------------------------------------ */
  function wrapLine(el) {
    const text = el.textContent;
    el.innerHTML = `<span class="line-inner">${text}</span>`;
    return el.querySelector('.line-inner');
  }
  function wrapWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words
      .map((w) => `<span class="word-mask"><span class="word-inner">${w}</span></span>`)
      .join(' ');
    return Array.from(el.querySelectorAll('.word-inner'));
  }

  const titleLines = gsap.utils.toArray('.hero__title [data-split]');
  const wordInners = titleLines.flatMap((el) => wrapWords(el));

  const eyebrow = document.querySelector('.hero .eyebrow[data-split]');
  let eyebrowInner = null;
  if (eyebrow) eyebrowInner = wrapLine(eyebrow);

  gsap.set(wordInners, { yPercent: 110 });
  if (eyebrowInner) gsap.set(eyebrowInner, { yPercent: 130, opacity: 0 });
  gsap.set('.hero__sub, .hero__actions, .hero__ticker', { opacity: 0, y: 24 });
  gsap.set('.scroll-cue', { opacity: 0 });
  gsap.set('.site-header', { opacity: 0, y: -12 });
  if (!reduceMotion) gsap.set('.whatsapp-fab', { opacity: 0, scale: 0.4, y: 40 });

  /* ------------------------------------------------------------
     Hero reveal — título entra palavra por palavra, eyebrow/sub/
     ações/ticker em seguida. Toca uma vez, direto — sem scroll-jack,
     o vídeo de fundo já roda sozinho em loop.
  ------------------------------------------------------------ */
  const heroReveal = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });

  heroReveal.to(wordInners, { yPercent: 0, duration: 0.7, stagger: 0.06, ease: 'power4.out' }, 0);
  if (eyebrowInner) heroReveal.to(eyebrowInner, { yPercent: 0, opacity: 1, duration: 0.7 }, 0);
  heroReveal.to('.hero__sub, .hero__actions, .hero__ticker', { opacity: 1, y: 0, duration: 0.8, stagger: 0.12 }, 0.4);

  /* ------------------------------------------------------------
     Chrome imediato — header, dica de rolagem e o reveal do hero.
     Só começa depois que o preloader some (evento app:ready) — se
     o preloader já tiver sido removido (reduced motion), o evento
     já foi disparado antes desse listener existir, então dispara
     na hora também.
  ------------------------------------------------------------ */
  function startHeroEntry() {
    gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.15 })
      .to('.site-header', { opacity: 1, y: 0, duration: 0.5 }, 0)
      .to('.scroll-cue', { opacity: 1, duration: 0.6 }, 0.3);

    heroReveal.play();
  }

  if (document.documentElement.classList.contains('is-loading')) {
    window.addEventListener('app:ready', startHeroEntry, { once: true });
  } else {
    startHeroEntry();
  }

  /* ------------------------------------------------------------
     Generic [data-reveal] fade-up on scroll
  ------------------------------------------------------------ */
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    if (el.closest('.hero')) return;
    gsap.fromTo(el,
      { opacity: 0, y: 46, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 1, ease: 'back.out(1.4)', scrollTrigger: { trigger: el, start: 'top 85%' } }
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
      '--lit': 1,
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
     Problema — itens de dor entram em cascata, marca "✕" gira
  ------------------------------------------------------------ */
  gsap.utils.toArray('.pain-item').forEach((item, i) => {
    const mark = item.querySelector('.pain-item__mark');
    gsap.fromTo(item,
      { opacity: 0, x: -36 },
      {
        opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', delay: i * 0.06,
        scrollTrigger: { trigger: item, start: 'top 88%' },
      }
    );
    if (mark) {
      gsap.fromTo(mark,
        { rotate: -160, scale: 0.3, opacity: 0 },
        {
          rotate: 0, scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(2.2)', delay: i * 0.06 + 0.08,
          scrollTrigger: { trigger: item, start: 'top 88%' },
        }
      );
    }
  });

  /* ------------------------------------------------------------
     Manifesto — palavra-âncora revelada com wipe
  ------------------------------------------------------------ */
  (function manifestoWordWipe() {
    const word = document.querySelector('.manifesto__word');
    if (!word) return;
    gsap.fromTo(word,
      { clipPath: 'inset(0 0 100% 0)', opacity: 0 },
      {
        clipPath: 'inset(0 0 0% 0)', opacity: 1, duration: 1, ease: 'power4.out',
        scrollTrigger: { trigger: word, start: 'top 85%' },
      }
    );
  })();

  /* ------------------------------------------------------------
     Números — cada bloco "salta" pra dentro
  ------------------------------------------------------------ */
  gsap.utils.toArray('.stat').forEach((stat, i) => {
    gsap.fromTo(stat,
      { opacity: 0, scale: 0.8, y: 24 },
      {
        opacity: 1, scale: 1, y: 0, duration: 0.8, delay: i * 0.1, ease: 'back.out(1.6)',
        scrollTrigger: { trigger: '.stats__grid', start: 'top 85%' },
      }
    );
  });

  /* ------------------------------------------------------------
     Tira de confiança — bento entra por direções diferentes
  ------------------------------------------------------------ */
  gsap.utils.toArray('.trust-card').forEach((card, i) => {
    const fromX = i === 0 ? -60 : 60;
    gsap.fromTo(card,
      { opacity: 0, x: fromX, rotate: i === 0 ? -2 : 2 },
      {
        opacity: 1, x: 0, rotate: 0, duration: 0.9, delay: i * 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: '.trust-strip__grid', start: 'top 82%' },
      }
    );
  });

  /* ------------------------------------------------------------
     Depoimentos — card cresce, aspas aparecem primeiro
  ------------------------------------------------------------ */
  gsap.utils.toArray('.depoimento-card').forEach((card, i) => {
    const mark = card.querySelector('.depoimento-card__mark');
    gsap.fromTo(card,
      { opacity: 0, scale: 0.88, y: 30 },
      {
        opacity: 1, scale: 1, y: 0, duration: 0.75, delay: i * 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: '.depoimentos__grid', start: 'top 82%' },
      }
    );
    if (mark) {
      gsap.fromTo(mark,
        { scale: 0, opacity: 0 },
        {
          scale: 1, opacity: 0.6, duration: 0.5, delay: i * 0.1 + 0.15, ease: 'back.out(2)',
          scrollTrigger: { trigger: '.depoimentos__grid', start: 'top 82%' },
        }
      );
    }
  });

  /* ------------------------------------------------------------
     CTA final — mockup de chat entra deslizando e girando
  ------------------------------------------------------------ */
  (function ctaChatMockReveal() {
    const mock = document.querySelector('.chat-mock');
    if (!mock) return;
    gsap.fromTo(mock,
      { opacity: 0, x: 60, rotate: 4, scale: 0.94 },
      {
        opacity: 1, x: 0, rotate: 0, scale: 1, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: mock, start: 'top 85%' },
      }
    );
  })();

  const mm = gsap.matchMedia();

  /* ------------------------------------------------------------
     Projetos — Z-axis depth scroll (desktop only): o scroll deixa
     de mover X/Y e passa a mover profundidade. Cada card nasce
     minúsculo e desfocado no centro, cresce em direção à "câmera"
     (foco nítido no meio do trajeto) e sai pelas bordas laterais,
     revelando o próximo logo atrás. STAGGER < 1 = janelas de cada
     card se sobrepõem, então o próximo já cresce enquanto o
     anterior ainda está saindo (sem buraco entre um e outro).
  ------------------------------------------------------------ */
  mm.add('(min-width: 901px)', () => {
    const stage = document.querySelector('[data-depth-stage]');
    const panels = gsap.utils.toArray('[data-depth-panel]');
    if (!stage || !panels.length) return () => {};

    if (reduceMotion) {
      panels.forEach((p) => gsap.set(p, { opacity: 1, position: 'relative', top: 'auto', left: 'auto', transform: 'none', filter: 'none' }));
      return () => {};
    }

    const N = panels.length;
    const STAGGER = 0.62;
    const virtualLength = 1 + (N - 1) * STAGGER;
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const mapClamped = (t, inMin, inMax, outMin, outMax) =>
      outMin + (outMax - outMin) * clamp01((t - inMin) / (inMax - inMin));

    function paint(progress) {
      const v = progress * virtualLength;
      panels.forEach((panel, i) => {
        const t = v - i * STAGGER;

        if (t <= -0.2 || t >= 1) {
          panel.style.opacity = 0;
          return;
        }

        const scale = Math.max(0.05, 0.22 + t * 1.4);

        // a saída cabe inteira dentro de [0,1] agora — o último card
        // do trilho nunca tem t > 1 (o scroll acaba exatamente ali),
        // então antes, com a janela de saída indo até 1.15, ele nunca
        // terminava de sumir e a seção de baixo demorava a "aparecer
        // de vez" depois do último projeto
        let opacity;
        if (t < -0.15) opacity = 0;
        else if (t < 0.15) opacity = mapClamped(t, -0.15, 0.15, 0, 1);
        else if (t <= 0.85) opacity = 1;
        else opacity = mapClamped(t, 0.85, 1, 1, 0);

        let blur;
        if (t < 0.35) blur = mapClamped(t, -0.15, 0.35, 8, 0);
        else if (t <= 0.65) blur = 0;
        else blur = mapClamped(t, 0.65, 1, 0, 4);

        const dir = i % 2 === 0 ? -1 : 1;
        const exitProgress = mapClamped(t, 0.78, 1, 0, 1);
        const tx = dir * exitProgress * window.innerWidth * 0.8;

        panel.style.opacity = opacity;
        panel.style.filter = blur > 0.05 ? `blur(${blur.toFixed(1)}px)` : 'none';
        panel.style.transform = `translate(-50%, -50%) translateX(${tx.toFixed(1)}px) scale(${scale.toFixed(3)})`;
        panel.style.zIndex = Math.round(scale * 100);
      });
    }

    paint(0);

    const st = ScrollTrigger.create({
      trigger: stage,
      start: 'top top',
      end: () => `+=${Math.round(virtualLength * 150)}%`,
      pin: true,
      scrub: 0.8,
      invalidateOnRefresh: true,
      onUpdate: (self) => paint(self.progress),
    });

    return () => {
      st.kill();
      panels.forEach((panel) => {
        panel.style.opacity = '';
        panel.style.filter = '';
        panel.style.transform = '';
        panel.style.zIndex = '';
      });
    };
  });

  /* ------------------------------------------------------------
     Projetos — mobile/tablet: pin trava, um projeto por vez. A cada
     rolada o próximo entra da direita pra esquerda enquanto o atual
     sai pela esquerda — troca direta, nunca dois brigando no centro
     por muito tempo. Desktop mantém o zoom em profundidade (acima).
  ------------------------------------------------------------ */
  mm.add('(max-width: 900px)', () => {
    if (reduceMotion) return () => {};
    const stage = document.querySelector('[data-depth-stage]');
    const panels = gsap.utils.toArray('.caso');
    if (!stage || !panels.length) return () => {};

    stage.classList.add('projetos__depth-stage--pin');

    const N = panels.length;
    const STAGGER = 0.85; // <1 = uma pequena sobreposição no cruzamento
    const virtualLength = 1 + (N - 1) * STAGGER;
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const mapClamped = (t, inMin, inMax, outMin, outMax) =>
      outMin + (outMax - outMin) * clamp01((t - inMin) / (inMax - inMin));

    function paint(progress) {
      const v = progress * virtualLength;
      panels.forEach((panel, i) => {
        const t = v - i * STAGGER;
        let tx, opacity;
        if (t <= -0.05 || t >= 1.05) {
          opacity = 0;
          tx = t < 0 ? 100 : -100;
        } else if (t < 0.2) {
          tx = mapClamped(t, 0, 0.2, 100, 0);
          opacity = mapClamped(t, 0, 0.08, 0, 1);
        } else if (t <= 0.8) {
          tx = 0;
          opacity = 1;
        } else {
          tx = mapClamped(t, 0.8, 1, 0, -100);
          opacity = mapClamped(t, 0.92, 1, 1, 0);
        }
        panel.style.opacity = opacity;
        panel.style.transform = `translate(-50%, -50%) translateX(${tx.toFixed(2)}%)`;
        panel.style.zIndex = t >= -0.05 && t <= 1.05 ? 10 : 1;
      });
    }

    paint(0);

    const st = ScrollTrigger.create({
      trigger: stage,
      start: 'top top',
      end: () => `+=${Math.round(virtualLength * 110)}%`,
      pin: true,
      scrub: 0.5,
      invalidateOnRefresh: true,
      onUpdate: (self) => paint(self.progress),
    });

    return () => {
      st.kill();
      stage.classList.remove('projetos__depth-stage--pin');
      panels.forEach((panel) => {
        panel.style.opacity = '';
        panel.style.transform = '';
        panel.style.zIndex = '';
      });
    };
  });

  /* ------------------------------------------------------------
     Método — bigorna esquenta e o martelo bate a cada capítulo.
     Desktop: pin de tela cheia, tudo esfregado pelo scroll. Mobile
     e tablet: sem pin (mais pesado e sujeito a jank com a barra de
     endereço) — a bigorna fica "sticky" no topo (ver CSS) enquanto
     cada passo dispara sua própria martelada ao entrar em cena.
     setHeat()/strike() são compartilhados pelas duas variantes.
  ------------------------------------------------------------ */
  (function storyForge() {
    const pin = document.querySelector('[data-story-pin]');
    const panels = gsap.utils.toArray('[data-story-panel]');
    const hammer = document.querySelector('[data-story-hammer]');
    const flash = document.querySelector('[data-story-flash]');
    const sparks = gsap.utils.toArray('[data-story-sparks] .story__spark');
    const visual = document.querySelector('.story__visual');
    if (!pin || !panels.length) return;

    const STRIKE_X = 100;
    const STRIKE_Y = 78;
    const RAISED_ROT = -38;

    if (hammer) gsap.set(hammer, { rotation: RAISED_ROT, transformOrigin: '0px 0px' });

    function setHeat(stage) {
      if (!visual) return;
      visual.classList.remove('story--heat-1', 'story--heat-2', 'story--heat-3', 'story--heat-4');
      if (stage > 0) visual.classList.add(`story--heat-${stage}`);
    }

    function strike(heatStage) {
      setHeat(heatStage);
      if (hammer) {
        gsap.timeline()
          .to(hammer, { rotation: 6, duration: 0.16, ease: 'power2.in' })
          .to(hammer, { rotation: RAISED_ROT, duration: 0.55, ease: 'elastic.out(1, 0.5)' }, 0.16);
      }
      if (flash) {
        gsap.fromTo(flash, { attr: { r: 2 }, opacity: 0.9 }, { attr: { r: 26 }, opacity: 0, duration: 0.4, ease: 'power2.out' });
      }
      sparks.forEach((spark) => {
        const angle = Math.PI + Math.random() * Math.PI; // upper half, spread wide
        const dist = 24 + Math.random() * 46;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist * 0.7;
        gsap.fromTo(spark,
          { attr: { cx: STRIKE_X, cy: STRIKE_Y, r: 2 + Math.random() * 1.5 }, opacity: 1 },
          {
            attr: { cx: STRIKE_X + dx, cy: STRIKE_Y + dy + 10 },
            opacity: 0,
            duration: 0.5 + Math.random() * 0.3,
            ease: 'power2.out',
          }
        );
      });
    }

    if (reduceMotion) {
      panels.forEach((p) => gsap.set(p, { opacity: 1, position: 'relative' }));
      return;
    }

    // Desktop — pin de tela cheia, 4 estágios esfregados pelo scroll
    mm.add('(min-width: 901px)', () => {
      gsap.set(panels.slice(1), { opacity: 0 });
      let activeIndex = 0;

      const st = ScrollTrigger.create({
        trigger: pin,
        start: 'top top',
        end: () => `+=${window.innerHeight * 2.6}`,
        pin: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
        onEnter: () => strike(1),
        onUpdate: (self) => {
          const progress = self.progress;
          const segment = 1 / panels.length;
          const idx = Math.min(panels.length - 1, Math.floor(progress / segment));
          if (idx !== activeIndex) {
            activeIndex = idx;
            panels.forEach((p, i) => {
              gsap.to(p, { opacity: i === activeIndex ? 1 : 0, duration: 0.4, overwrite: 'auto' });
            });
            strike(activeIndex + 1);
          }
        },
      });

      return () => st.kill();
    });

    // Mobile/tablet — sem bigorna, só um reveal simples por passo
    mm.add('(max-width: 900px)', () => {
      panels.forEach((p) => gsap.set(p, { opacity: 0, y: 28 }));

      const triggers = panels.map((panel) => ScrollTrigger.create({
        trigger: panel,
        start: 'top 72%',
        onEnter: () => gsap.to(panel, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }),
        onEnterBack: () => gsap.to(panel, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' }),
        onLeaveBack: () => gsap.to(panel, { opacity: 0, y: 28, duration: 0.4 }),
      }));

      return () => triggers.forEach((t) => t.kill());
    });
  })();

  /* ------------------------------------------------------------
     Servico cards stagger-in
  ------------------------------------------------------------ */
  gsap.utils.toArray('.servico-card').forEach((card, i) => {
    gsap.fromTo(card,
      { opacity: 0, y: 52, scale: 0.9, rotateX: -14 },
      {
        opacity: 1, y: 0, scale: 1, rotateX: 0, duration: 0.85, delay: i * 0.1, ease: 'back.out(1.5)',
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
     Header — some ao rolar pra baixo, volta assim que o usuário
     rola pra cima (em qualquer ponto da página, não só no hero).
     Fica sempre visível pertinho do topo, pra não sumir e voltar
     à toa por causa de um tremor de scroll de 2px.
  ------------------------------------------------------------ */
  (function headerAutoHide() {
    const header = document.querySelector('.site-header');
    if (!header || reduceMotion) return;
    let lastY = window.scrollY;
    let hidden = false;

    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      const goingDown = y > lastY;
      if (goingDown && y > 140 && !hidden) {
        hidden = true;
        gsap.to(header, { y: -(header.offsetHeight + 24), duration: 0.4, ease: 'power2.inOut' });
      } else if ((!goingDown || y <= 140) && hidden) {
        hidden = false;
        gsap.to(header, { y: 0, duration: 0.4, ease: 'power2.inOut' });
      }
      lastY = y;
    }, { passive: true });
  })();

  /* ------------------------------------------------------------
     Mobile nav toggle — cortina em clip-path (CSS) + letras que
     sobem de baixo pra cima, com pequeno atraso entre um link e
     outro. A brasa em cada letra já vive sozinha via CSS (delay
     negativo aleatório setado abaixo), então só falta revelar.
  ------------------------------------------------------------ */
  const navToggle = document.querySelector('.nav-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  const fabEl = document.querySelector('.whatsapp-fab');

  function wrapLetters(el) {
    const chars = Array.from(el.textContent);
    el.innerHTML = `<span class="link-word">${chars.map((ch) => {
      if (ch === ' ') return ' ';
      const delay = (-Math.random() * 3.4).toFixed(2);
      return `<span class="letter-mask"><span class="letter-inner" style="animation-delay:${delay}s">${ch}</span></span>`;
    }).join('')}</span>`;
    return Array.from(el.querySelectorAll('.letter-inner'));
  }

  const mobileNavLinkLetters = gsap.utils.toArray('.mobile-nav a').map(wrapLetters);
  if (!reduceMotion) {
    mobileNavLinkLetters.forEach((letters) => gsap.set(letters, { yPercent: 130, opacity: 0 }));
  }

  navToggle?.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
    document.body.style.overflow = isOpen ? 'hidden' : '';
    if (fabEl) fabEl.style.visibility = isOpen ? 'hidden' : '';

    if (reduceMotion) return;

    if (isOpen) {
      // a cortina (clip-path, via CSS) já começou a abrir junto do
      // clique; as letras entram um pouco depois, como se estivessem
      // se "construindo" no espaço que a cortina acabou de revelar
      const tl = gsap.timeline({ delay: 0.22 });
      mobileNavLinkLetters.forEach((letters, i) => {
        tl.to(letters, {
          yPercent: 0, opacity: 1, duration: 0.6, stagger: 0.022, ease: 'power4.out',
        }, i * 0.08);
      });
    } else {
      mobileNavLinkLetters.forEach((letters) => {
        gsap.to(letters, { yPercent: 130, opacity: 0, duration: 0.25, ease: 'power2.in', overwrite: true });
      });
    }
  });
  mobileNav?.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      mobileNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      if (fabEl) fabEl.style.visibility = '';
      if (!reduceMotion) {
        mobileNavLinkLetters.forEach((letters) => {
          gsap.to(letters, { yPercent: 130, opacity: 0, duration: 0.25, ease: 'power2.in', overwrite: true });
        });
      }
    });
  });

  /* ------------------------------------------------------------
     Rastreamento de clique no WhatsApp (evento de conversão)
  ------------------------------------------------------------ */
  document.querySelectorAll('a[href*="wa.me"]').forEach((a) => {
    a.addEventListener('click', () => {
      if (typeof gtag === 'function') {
        gtag('event', 'contato_whatsapp', {
          event_category: 'engagement',
          event_label: a.closest('section')?.id || a.className || 'whatsapp',
        });
      }
      if (typeof fbq === 'function') {
        fbq('track', 'Contact');
      }
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

  /* ------------------------------------------------------------
     Recalcula todas as posições dos ScrollTrigger depois que
     fontes e imagens terminam de carregar (evita desalinhar os
     pins quando o layout muda de tamanho após o cálculo inicial)
  ------------------------------------------------------------ */
  const refreshScrollTrigger = () => ScrollTrigger.refresh();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(refreshScrollTrigger);
  }
  window.addEventListener('load', refreshScrollTrigger);
})();
