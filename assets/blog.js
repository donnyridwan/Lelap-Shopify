/* lelap — Sleep Library: "Load more articles" appends the next page of cards without a reload. */
(function () {
  'use strict';
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-blog-more]');
    if (!btn) return;
    const grid = document.querySelector('[data-blog-grid]');
    if (!grid || !window.fetch || !window.DOMParser) return;
    e.preventDefault();
    btn.classList.add('is-loading');
    fetch(btn.href, { credentials: 'same-origin' })
      .then((r) => r.text())
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const added = [];
        doc.querySelectorAll('[data-blog-grid] .blog-grid__cell').forEach((cell) => {
          cell.classList.remove('is-featured');
          added.push(grid.appendChild(document.importNode(cell, true)));
        });
        // New cards fade up like the first page (they were not in the page when reveals were set up).
        requestAnimationFrame(() => requestAnimationFrame(() => added.forEach((c) => c.classList.add('is-revealed'))));
        const next = doc.querySelector('[data-blog-more]');
        if (next) { btn.href = next.getAttribute('href'); btn.classList.remove('is-loading'); } else btn.remove();
      })
      .catch(() => { window.location.href = btn.href; });
  });
})();
