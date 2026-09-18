/* ============================================================
   MacBook Carousel — mockup estático (não anima, não gira, não
   distorce), com os vídeos dos projetos passando DENTRO da tela.
   A tela do notebook mostra o vídeo atual ocupando a maior parte,
   com uma prévia do anterior colada na borda esquerda e uma prévia
   do próximo colada na borda direita. Arrastar desliza: o da
   direita entra pro meio, o do meio vai pro lugar do anterior à
   esquerda — a prévia É o próprio efeito de transição, não algo
   separado.

   Loop infinito com DOM mínimo: só existem 3 telas (anterior/
   atual/próxima), nunca uma por vídeo. Ao completar o arraste, a
   faixa reseta pro centro sem transição e o conteúdo das 3 telas é
   realocado — como o reset acontece na mesma posição visual, é
   imperceptível.
============================================================ */
(() => {
  const root = document.querySelector('[data-macbook-carousel]');
  if (!root) return;

  const screen = root.querySelector('[data-macbook-screen]');
  const track = root.querySelector('[data-macbook-track]');
  const brandEl = root.querySelector('[data-macbook-brand]');
  const descEl = root.querySelector('[data-macbook-desc]');
  const sourcesEl = root.querySelector('[data-macbook-sources]');
  if (!screen || !track || !sourcesEl) return;

  const sources = Array.from(sourcesEl.children).map((el) => ({
    brand: el.dataset.brand || '',
    desc: el.dataset.desc || '',
    src: el.dataset.src || '',
  }));
  const count = sources.length;
  if (!count) return;

  const slides = {
    prev: track.querySelector('[data-slot="prev"]').parentElement,
    current: track.querySelector('[data-slot="current"]').parentElement,
    next: track.querySelector('[data-slot="next"]').parentElement,
  };

  function loadSlot(wrapper, i) {
    const video = wrapper.querySelector('video');
    const data = sources[((i % count) + count) % count];
    if (video.src.indexOf(data.src) === -1) {
      video.src = data.src;
      video.load();
      video.play().catch(() => {});
    }
    return data;
  }

  let index = 0; // vídeo mostrado agora, 0..count-1
  loadSlot(slides.prev, index - 1);
  const activeData = loadSlot(slides.current, index);
  loadSlot(slides.next, index + 1);

  function updateLabel(data) {
    brandEl.textContent = data.brand;
    descEl.textContent = data.desc;
  }
  updateLabel(activeData);

  const MAIN_RATIO = 0.74; // vídeo atual ocupa 74% da tela do notebook
  const GAP = 10; // px entre as telas

  let screenWidth = 1;
  let screenHeight = 1;
  let slideWidth = 1;
  let pitch = 1; // slideWidth + GAP — quanto avança pra trocar 1 vídeo

  function measure() {
    const rect = screen.getBoundingClientRect();
    screenWidth = Math.max(1, rect.width);
    screenHeight = Math.max(1, rect.height);
    slideWidth = screenWidth * MAIN_RATIO;
    pitch = slideWidth + GAP;
    [slides.prev, slides.current, slides.next].forEach((el) => {
      el.style.width = `${slideWidth}px`;
      el.style.height = `${screenHeight}px`;
      el.style.marginRight = `${GAP}px`;
    });
  }

  let current = 0; // posição de arraste em unidades de "slide", -1..1, 0 = repouso
  let target = 0;
  let dragging = false;
  let dragStartX = 0;
  let dragStartCurrent = 0;

  function baseOffset() {
    // centraliza a tela do meio (índice 1 dos 3) na tela do notebook
    return screenWidth / 2 - (pitch + slideWidth / 2);
  }

  function applyLayout() {
    const offset = baseOffset() - current * pitch;
    track.style.transform = `translateX(${offset}px)`;

    // A prévia nas bordas encolhe e escurece um pouco — reforça que
    // está "chegando"/"saindo", não é só um corte reto de vídeo.
    [
      [slides.prev, 0],
      [slides.current, 1],
      [slides.next, 2],
    ].forEach(([el, slotIndex]) => {
      const dist = Math.min(1, Math.abs(slotIndex - 1 - current));
      el.style.transform = `scale(${1 - dist * 0.1})`;
      el.style.opacity = String(1 - dist * 0.45);
    });
  }

  function shift(direction) {
    // direction = +1 (avançou pra próxima) ou -1 (voltou pra anterior)
    index = ((index + direction) % count + count) % count;
    if (direction > 0) {
      const tmp = slides.prev;
      slides.prev = slides.current;
      slides.current = slides.next;
      slides.next = tmp;
      loadSlot(slides.next, index + 1);
    } else {
      const tmp = slides.next;
      slides.next = slides.current;
      slides.current = slides.prev;
      slides.prev = tmp;
      loadSlot(slides.prev, index - 1);
    }
    // Reordena os elementos no DOM na sequência prev/current/next —
    // troca só a ORDEM (os mesmos 3 elementos), não recria vídeo nenhum.
    track.appendChild(slides.prev);
    track.appendChild(slides.current);
    track.appendChild(slides.next);
    updateLabel(sources[index]);
  }

  screen.addEventListener('pointerdown', (e) => {
    dragging = true;
    dragStartX = e.clientX;
    dragStartCurrent = current;
    measure();
    screen.setPointerCapture(e.pointerId);
    screen.style.cursor = 'grabbing';
  });

  screen.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    current = Math.max(-1, Math.min(1, dragStartCurrent - dx / pitch));
    applyLayout();
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    screen.style.cursor = 'grab';
    const dx = e.clientX - dragStartX;
    const threshold = pitch * 0.3;
    if (dx <= -threshold) target = 1;
    else if (dx >= threshold) target = -1;
    else target = 0;
  }
  screen.addEventListener('pointerup', endDrag);
  screen.addEventListener('pointercancel', endDrag);

  let wheelLock = false;
  screen.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    if (wheelLock || dragging) return;
    wheelLock = true;
    target = e.deltaX > 0 ? 1 : -1;
    setTimeout(() => { wheelLock = false; }, 500);
  }, { passive: false });

  const arrowPrev = root.querySelector('[data-macbook-arrow-prev]');
  const arrowNext = root.querySelector('[data-macbook-arrow-next]');
  if (arrowPrev) arrowPrev.addEventListener('click', () => { if (!dragging && target === 0) target = -1; });
  if (arrowNext) arrowNext.addEventListener('click', () => { if (!dragging && target === 0) target = 1; });

  window.addEventListener('resize', () => { measure(); applyLayout(); });

  function tick() {
    requestAnimationFrame(tick);
    if (dragging) return;

    current += (target - current) * 0.2;
    applyLayout();

    if (Math.abs(target) > 0.001 && Math.abs(current - target) < 0.01) {
      const direction = target > 0 ? 1 : -1;
      shift(direction);
      current -= direction; // mesma posição visual, unidades recentradas
      target = 0;
      applyLayout();
    }
  }

  measure();
  applyLayout();
  tick();
})();
