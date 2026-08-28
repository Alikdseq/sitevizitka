(function () {
  const slides = [...document.querySelectorAll('.slide')];
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const counter = document.getElementById('counter');
  const progress = document.getElementById('progress');
  const fullscreenBtn = document.getElementById('fullscreen');

  let current = 0;
  let touchStartX = 0;

  function show(index) {
    if (index < 0 || index >= slides.length) return;
    slides.forEach((s, i) => {
      s.classList.remove('active', 'prev');
      if (i === index) s.classList.add('active');
      else if (i < index) s.classList.add('prev');
    });
    current = index;
    counter.textContent = `${current + 1} / ${slides.length}`;
    progress.style.width = `${((current + 1) / slides.length) * 100}%`;
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === slides.length - 1;
  }

  function next() { show(current + 1); }
  function prev() { show(current - 1); }

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      next();
    }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      prev();
    }
    if (e.key === 'Home') show(0);
    if (e.key === 'End') show(slides.length - 1);
  });

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev();
    }
  }, { passive: true });

  fullscreenBtn?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  });

  show(0);
})();
