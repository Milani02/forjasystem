/* ============================================================
   Letras do preloader "forjadas": em vez de só nascer subindo,
   cada letra pisca por glifos aleatórios (tipo decodificando) e
   trava na letra certa incandescente — branca, quente — que
   esfria pro laranja ember com uma martelada de escala. Ideia:
   o nome é "Forja", o texto devia parecer forjado, não só
   desenhado na tela.
============================================================ */
(() => {
  const letters = document.querySelectorAll('[data-preloader] .preloader__brand-letter');
  if (!letters.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const CYCLE_MS = 7200;
  const SCRAMBLE_MS = 380;
  const STEP_MS = 45;

  const jobs = Array.from(letters).map((el) => ({
    el,
    real: el.textContent,
    delayMs: parseFloat(el.dataset.delay || '0') * 1000,
  }));

  function randomGlyph() {
    return GLYPHS[(Math.random() * GLYPHS.length) | 0];
  }

  function scramble(el, real) {
    el.classList.remove('is-revealed');
    el.classList.add('is-scrambling');
    el.textContent = randomGlyph();
    const start = performance.now();
    const timer = setInterval(() => {
      if (performance.now() - start >= SCRAMBLE_MS) {
        clearInterval(timer);
        el.textContent = real;
        el.classList.remove('is-scrambling');
        el.classList.add('is-revealed');
        return;
      }
      el.textContent = randomGlyph();
    }, STEP_MS);
  }

  function runCycle() {
    jobs.forEach(({ el, real, delayMs }) => {
      el.classList.remove('is-revealed', 'is-scrambling');
      setTimeout(() => scramble(el, real), delayMs);
    });
  }

  runCycle();
  setInterval(runCycle, CYCLE_MS);
})();
