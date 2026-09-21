/* ============================================================
   MacBook Carousel — mockup estático (não anima, não gira, não
   distorce). Os vídeos anterior/próximo ficam SOLTOS do lado de fora
   do notebook, em repouso. Arrastar (ou seta/scroll) anima os 3
   juntos: o que está entrando desliza de fora pra dentro da tela, e o
   atual desliza pra fora, pro lugar onde o que entrou descansava —
   como um carrinho de slide físico.

   Não existem elementos fixos "fora"/"tela" — os 3 slots (prev/
   current/next) são intercambiáveis: cada um é só um <div> com um
   <video> dentro, e a cada troca as REFERÊNCIAS trocam de papel (o
   DOM não se move), então nunca precisa recriar/recarregar um vídeo
   que já estava carregado.
============================================================ */
(() => {
  const root = document.querySelector('[data-macbook-carousel]');
  if (!root) return;

  const frame = root.querySelector('.macbook-carousel__frame');
  const brandEl = root.querySelector('[data-macbook-brand]');
  const descEl = root.querySelector('[data-macbook-desc]');
  const sourcesEl = root.querySelector('[data-macbook-sources]');
  const slotEls = root.querySelectorAll('.macbook-carousel__slot');
  if (!frame || !sourcesEl || slotEls.length !== 3) return;

  const sources = Array.from(sourcesEl.children).map((el) => ({
    brand: el.dataset.brand || '',
    desc: el.dataset.desc || '',
    src: el.dataset.src || '',
  }));
  const count = sources.length;
  if (!count) return;

  let slots = {};
  slotEls.forEach((el) => { slots[el.dataset.role] = el; });

  function loadSlot(el, i) {
    const video = el.querySelector('video');
    const data = sources[((i % count) + count) % count];
    if (video.src.indexOf(data.src) === -1) {
      video.src = data.src;
      video.load();
      video.play().catch(() => {});
    }
    return data;
  }

  let index = 0;
  loadSlot(slots.prev, index - 1);
  const activeData = loadSlot(slots.current, index);
  loadSlot(slots.next, index + 1);

  function updateLabel(data) {
    brandEl.textContent = data.brand;
    descEl.textContent = data.desc;
  }
  updateLabel(activeData);

  function setZ() {
    slots.current.style.zIndex = 2;
    slots.prev.style.zIndex = 3;
    slots.next.style.zIndex = 3;
  }
  setZ();

  /* Área da tela medida a partir do PNG (assets/portfolio/macbook-mockup.png,
     800×460): esquerda 11%, topo 5.9%, largura 77.75%, altura 83.9%. */
  const SCREEN_LEFT = .11, SCREEN_TOP = .059, SCREEN_W = .7775, SCREEN_H = .839;
  const SCREEN_RADIUS = 6;
  const PEEK_RADIUS = 14;
  const PEEK_W_RATIO = .4; // largura da prévia solta, relativa à tela
  const PEEK_H_RATIO = .62;
  const GAP = 16; // px entre o frame e a prévia solta

  let screenGeom = null, prevRest = null, nextRest = null;
  let dragRange = 1;

  function measure() {
    const rect = frame.getBoundingClientRect();
    const fw = rect.width, fh = rect.height;
    screenGeom = {
      left: fw * SCREEN_LEFT, top: fh * SCREEN_TOP,
      width: fw * SCREEN_W, height: fh * SCREEN_H,
      radius: SCREEN_RADIUS,
    };

    // Só cabe prévia solta se sobrar espaço de verdade fora do frame
    // (a seção corta com overflow:hidden) — mede a folga real até lá,
    // não só um valor fixo, pra não estourar em telas menores.
    const section = root.closest('.projetos') || root.parentElement || document.body;
    const sectionRect = section.getBoundingClientRect();
    const availLeft = Math.max(0, rect.left - sectionRect.left);
    const availRight = Math.max(0, sectionRect.right - rect.right);
    const avail = Math.min(availLeft, availRight);

    const pw = Math.max(46, Math.min(screenGeom.width * PEEK_W_RATIO, avail - GAP - 6, 176));
    const peekH = screenGeom.height * PEEK_H_RATIO;
    const peekTop = screenGeom.top + (screenGeom.height - peekH) / 2;

    prevRest = { left: -pw - GAP, top: peekTop, width: pw, height: peekH, radius: PEEK_RADIUS };
    nextRest = { left: fw + GAP, top: peekTop, width: pw, height: peekH, radius: PEEK_RADIUS };
    dragRange = Math.max(1, screenGeom.width);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpGeom(a, b, t) {
    return {
      left: lerp(a.left, b.left, t),
      top: lerp(a.top, b.top, t),
      width: lerp(a.width, b.width, t),
      height: lerp(a.height, b.height, t),
      radius: lerp(a.radius, b.radius, t),
    };
  }
  function setGeom(el, g) {
    el.style.left = `${g.left}px`;
    el.style.top = `${g.top}px`;
    el.style.width = `${g.width}px`;
    el.style.height = `${g.height}px`;
    el.style.borderRadius = `${g.radius}px`;
  }

  function applyLayout(t) {
    if (t >= 0) {
      // arrastando pra direita: o "prev" entra na tela vindo de fora,
      // à esquerda; o "current" sai pra fora, à direita.
      setGeom(slots.prev, lerpGeom(prevRest, screenGeom, t));
      setGeom(slots.next, nextRest);
      setGeom(slots.current, lerpGeom(screenGeom, nextRest, t));
    } else {
      const u = -t;
      setGeom(slots.next, lerpGeom(nextRest, screenGeom, u));
      setGeom(slots.prev, prevRest);
      setGeom(slots.current, lerpGeom(screenGeom, prevRest, u));
    }
  }

  let current = 0; // -1..1, 0 = repouso (current na tela, prev/next fora)
  let target = 0;
  let dragging = false;
  let dragStartX = 0;
  let dragStartCurrent = 0;

  function shift(direction) {
    // direction === 1  -> "prev" virou o vídeo atual (arrastou pra direita)
    // direction === -1 -> "next" virou o vídeo atual (arrastou pra esquerda)
    index = ((index + (direction === 1 ? -1 : 1)) % count + count) % count;
    if (direction === 1) {
      const tmp = slots.next;
      slots.next = slots.current;
      slots.current = slots.prev;
      slots.prev = tmp;
      loadSlot(slots.prev, index - 1);
    } else {
      const tmp = slots.prev;
      slots.prev = slots.current;
      slots.current = slots.next;
      slots.next = tmp;
      loadSlot(slots.next, index + 1);
    }
    setZ();
    updateLabel(sources[index]);
  }

  frame.addEventListener('pointerdown', (e) => {
    dragging = true;
    dragStartX = e.clientX;
    dragStartCurrent = current;
    measure();
    frame.setPointerCapture(e.pointerId);
  });

  frame.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    current = Math.max(-1, Math.min(1, dragStartCurrent + dx / dragRange));
    applyLayout(current);
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    const dx = e.clientX - dragStartX;
    const threshold = dragRange * .28;
    if (dx >= threshold) target = 1;
    else if (dx <= -threshold) target = -1;
    else target = 0;
  }
  frame.addEventListener('pointerup', endDrag);
  frame.addEventListener('pointercancel', endDrag);

  let wheelLock = false;
  frame.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    if (wheelLock || dragging) return;
    wheelLock = true;
    target = e.deltaX > 0 ? -1 : 1;
    setTimeout(() => { wheelLock = false; }, 500);
  }, { passive: false });

  const arrowPrev = root.querySelector('[data-macbook-arrow-prev]');
  const arrowNext = root.querySelector('[data-macbook-arrow-next]');
  if (arrowPrev) arrowPrev.addEventListener('click', () => { if (!dragging && target === 0) target = 1; });
  if (arrowNext) arrowNext.addEventListener('click', () => { if (!dragging && target === 0) target = -1; });

  window.addEventListener('resize', () => { measure(); applyLayout(current); });

  function tick() {
    requestAnimationFrame(tick);
    if (dragging) return;

    current += (target - current) * .22;
    applyLayout(current);

    if (Math.abs(target) > .001 && Math.abs(current - target) < .01) {
      shift(target);
      current = 0;
      target = 0;
      applyLayout(0);
    }
  }

  measure();
  applyLayout(0);
  tick();
})();
