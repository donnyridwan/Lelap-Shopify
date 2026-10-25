/* lelap — Article: highlight the current heading in "In this article" and share the article. */
(function () {
  'use strict';
  const root = document.querySelector('[data-article]');
  if (!root) return;
  const links = [...root.querySelectorAll('[data-toc-link]')];
  const heads = links.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
  if (heads.length && 'IntersectionObserver' in window) {
    const setActive = (id) => links.forEach((a) => a.classList.toggle('is-active', a.hash.slice(1) === id));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-20% 0px -70% 0px' });
    heads.forEach((h) => io.observe(h));
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
