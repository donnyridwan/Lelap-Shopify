/* lelap — Article: highlight the current heading in "In this article" and share the article. */
(function () {
  'use strict';
  const root = document.querySelector('[data-article]');
  if (!root) return;
  const links = [...root.querySelectorAll('[data-toc-link]')];
  const heads = links.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
  if (heads.length) {
    // Active = the last heading that has scrolled past 30% of the viewport (first one before that).
    let current = '';
    const setActive = (id) => {
      if (id === current) return;
      current = id;
      links.forEach((a) => {
        const on = decodeURIComponent(a.hash.slice(1)) === id;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      });
    };
    let ticking = false;
    const update = () => {
      ticking = false;
      const line = window.innerHeight * 0.3;
      let id = heads[0].id;
      heads.forEach((h) => { if (h.getBoundingClientRect().top <= line) id = h.id; });
      setActive(id);
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
    links.forEach((a) => a.addEventListener('click', (e) => {
      const target = document.getElementById(decodeURIComponent(a.hash.slice(1)));
      if (!target) return;
      e.preventDefault();
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', a.hash);
      setActive(target.id);
    }));
  }
  const share = root.querySelector('[data-article-share]');
  if (share) {
    share.addEventListener('click', () => {
      const data = { title: document.title, url: location.href.split('#')[0] };
      if (navigator.share) { navigator.share(data).catch(() => {}); return; }
      if (navigator.clipboard) {
        navigator.clipboard.writeText(data.url).then(() => {
          const label = share.querySelector('span');
          const old = label.textContent;
          label.textContent = share.dataset.copied;
          setTimeout(() => { label.textContent = old; }, 2000);
        });
      }
    });
  }
})();
