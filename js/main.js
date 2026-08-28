/* Scroll reveal + nav highlight */
(function () {
  const reveals = document.querySelectorAll('.reveal');
  const navLinks = document.querySelectorAll('.nav a');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  reveals.forEach((el) => observer.observe(el));

  const sections = [...document.querySelectorAll('section[id]')];
  const onScroll = () => {
    const y = window.scrollY + 120;
    let current = sections[0]?.id || '';
    sections.forEach((sec) => {
      if (sec.offsetTop <= y) current = sec.id;
    });
    navLinks.forEach((a) => {
      a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile nav */
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  toggle?.addEventListener('click', () => {
    nav.classList.toggle('open');
    toggle.classList.toggle('open');
  });

  navLinks.forEach((a) =>
    a.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle?.classList.remove('open');
    })
  );
})();
