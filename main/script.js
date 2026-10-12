/* Meiyaku Design: site behaviour (smooth scroll, reveals, carousels, FAQ, footer reveal). Needs lenis.min.js loaded first. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior = reduce ? 'auto' : 'smooth';

  // Smooth scrolling (Lenis). Touch devices keep native momentum; skipped for reduced motion.
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.09 });
    const loop = t => { lenis.raf(t); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  // In-page links glide to their target (the footer link goes to the end of the page)
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href'), el = id.length > 1 ? document.querySelector(id) : null;
    if (id.length > 1 && !el) return;
    e.preventDefault();
    const y = !el ? 0 : el.classList.contains('site-footer') ? document.documentElement.scrollHeight - innerHeight : el.getBoundingClientRect().top + scrollY - 72;
    if (lenis) lenis.scrollTo(y); else scrollTo({ top: y, behavior });
  });

  // Reveal on scroll: stop observing once revealed
  const reveal = new IntersectionObserver((entries, obs) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('active'); obs.unobserve(e.target); }
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.reveal:not(.active)').forEach(el => reveal.observe(el));

  document.querySelectorAll('.carousel-article').forEach(article => {
    const slider = article.querySelector('.slider-container');
    const slides = [...slider.children];

    // Active slide = the one crossing the centre band. No scroll handler, no layout reads.
    const io = new IntersectionObserver(entries => {
      for (const e of entries) e.target.classList.toggle('is-active', e.isIntersecting);
    }, { root: slider, rootMargin: '0px -40% 0px -40%' });
    slides.forEach(s => io.observe(s));

    // Prev / next buttons
    const step = () => slides[0].offsetWidth + (parseFloat(getComputedStyle(slider).columnGap) || 32);
    article.querySelector('.carousel-prev')?.addEventListener('click', () => slider.scrollBy({ left: -step(), behavior }));
    article.querySelector('.carousel-next')?.addEventListener('click', () => slider.scrollBy({ left: step(), behavior }));

    // Mouse drag (touch uses native scrolling). Snap is paused while dragging, then eased to the nearest slide.
    let down = false, startX = 0, startLeft = 0, target = 0, raf = 0, timer = 0;
    slider.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; startX = e.clientX; startLeft = slider.scrollLeft; target = startLeft;
      clearTimeout(timer);
      slider.style.scrollSnapType = 'none';
      slider.setPointerCapture(e.pointerId);
    });
    slider.addEventListener('pointermove', e => {
      if (!down) return;
      target = startLeft - (e.clientX - startX) * 2.5;
      raf = raf || requestAnimationFrame(() => { slider.scrollLeft = target; raf = 0; });
    });
    const release = () => {
      if (!down) return;
      down = false;
      cancelAnimationFrame(raf); raf = 0;
      const c = slider.getBoundingClientRect(), mid = c.left + c.width / 2;
      let best = 0;
      for (const s of slides) {
        const r = s.getBoundingClientRect(), d = r.left + r.width / 2 - mid;
        if (Math.abs(d) < Math.abs(best) || best === 0) best = d;
      }
      slider.scrollBy({ left: best, behavior });
      timer = setTimeout(() => { if (!down) slider.style.scrollSnapType = ''; }, reduce ? 0 : 500);
    };
    slider.addEventListener('pointerup', release);
    slider.addEventListener('pointercancel', release);
  });

  // FAQ: one open at a time
  document.querySelectorAll('.faq-q').forEach(btn => btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item'), open = !item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i => { i.classList.remove('open'); i.querySelector('.faq-q').setAttribute('aria-expanded', 'false'); });
    item.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
  }));

  // Footer curtain reveal: the CTA section slides over a footer that scrolls more slowly (see .site-footer in CSS).
  // --p (0 -> 1) also drives the footer's inner parallax layers. Listeners exist only while the footer is near the viewport.
  const footer = document.querySelector('.site-footer');
  const wrap = footer && footer.parentElement;
  const cta = wrap && wrap.previousElementSibling;
  if (footer && cta && !reduce) {
    let live = false, ticking = false;
    const measure = () => footer.style.setProperty('--r', Math.max(0, Math.min(wrap.offsetHeight, cta.offsetHeight - 2)) + 'px');
    const update = () => {
      ticking = false;
      const r = wrap.getBoundingClientRect();
      footer.style.setProperty('--p', Math.min(1, Math.max(0, (innerHeight - r.top) / r.height)).toFixed(3));
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    const onResize = () => { measure(); onScroll(); };
    footer.style.setProperty('--p', 0);
    measure();
    if (lenis) lenis.on('scroll', () => { if (live) update(); });
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting === live) return;
      live = e.isIntersecting;
      footer.classList.toggle('live', live);
      if (live) { measure(); update(); addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onResize); }
      else { removeEventListener('scroll', onScroll); removeEventListener('resize', onResize); }
    }, { rootMargin: '0px 0px 15% 0px' }).observe(wrap);
  }
})();
