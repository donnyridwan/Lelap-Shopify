/* lelap — Help Center: client-side search (?q=) and topic filter (?topic=) over the FAQ blocks. */
(function () {
  'use strict';

  const norm = (s) => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '');
  const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const STOP = ['a', 'an', 'the', 'i', 'my', 'do', 'to', 'of', 'and', 'or', 'is', 'can', 'how', 'what', 'in', 'on', 'for', 'it'];
  // Light stemming so "skip" matches "skipping" and "deliveries" matches "delivery".
  const stem = (w) => w.replace(/(ings?|ed|es|s)$/, '').replace(/(.)\1$/, '$1').replace(/ie$/, 'y');

  function init(root) {
    const form = root.querySelector('[data-help-form]');
    const input = root.querySelector('[data-help-input]');
    const clear = root.querySelector('[data-help-clear]');
    const results = root.querySelector('[data-help-results]');
    const count = root.querySelector('[data-help-count]');
    const empty = root.querySelector('[data-help-empty]');
    const items = [...root.querySelectorAll('[data-help-item]')].map((el) => {
      const a = el.querySelector('[data-help-a]');
      return {
        el, a, aText: a.textContent,
        topic: el.dataset.topic || '',
        q: norm(el.querySelector('[data-help-q]').textContent),
        body: norm(a.textContent),
        keys: norm(el.dataset.keywords)
      };
    });
    const html = document.documentElement;
    const label = (tpl, map) => Object.keys(map).reduce((s, k) => s.split(`[${k}]`).join(map[k]), tpl || '');

    function words(q) {
      return norm(q).split(/[^a-z0-9]+/).filter((w) => w && STOP.indexOf(w) === -1).map(stem).filter(Boolean);
    }

    function render(q, topic) {
      const terms = words(q);
      const searching = terms.length > 0 || !!topic;
      html.classList.toggle('is-help-search', searching);
      results.hidden = !searching;
      clear.hidden = !q;
      if (!searching) return;

      let shown = 0;
      const scored = items.map((it) => {
        let score = 0;
        let strong = false;
        if (topic) { score = norm(it.topic) === norm(topic) ? 1 : 0; strong = score > 0; }
        else {
          terms.forEach((t) => {
            const re = new RegExp('\\b' + escapeRe(t));
            if (re.test(it.q)) { score += 3; strong = true; }
            if (re.test(it.keys)) { score += 2; strong = true; }
            if (re.test(it.body)) score += 1;
          });
        }
        return { it, score, strong };
      });
      // Answer-only matches are shown only when nothing matches a question or its keywords.
      if (scored.some((s) => s.strong)) scored.forEach((s) => { if (!s.strong) s.score = 0; });
      scored.sort((x, y) => y.score - x.score);
      const list = results.querySelector('.help-results__list');
      scored.forEach(({ it, score }) => {
        it.el.hidden = score === 0;
        if (it.el.classList.contains('is-open')) {
          it.el.classList.remove('is-open');
          it.el.querySelector('.help-result__full').hidden = true;
          it.a.hidden = false;
          it.el.querySelector('[data-help-more]').setAttribute('aria-expanded', 'false');
        }
        if (score > 0) {
          shown += 1;
          list.insertBefore(it.el, empty);
          // Highlight matched words in the answer excerpt (Figma: plum semibold "Skip").
          let out = escapeHtml(it.aText);
          if (terms.length) {
            const re = new RegExp('\\b(' + terms.map(escapeRe).join('|') + ')[a-z]*', 'gi');
            out = out.replace(re, '<mark class="help-hit">$&</mark>');
          }
          it.a.innerHTML = out;
        }
      });
      const ds = root.dataset;
      if (topic) count.textContent = label(ds.topicLabel, { n: shown, topic });
      else if (shown === 0) count.textContent = label(ds.resultsNone, { q: q.trim() });
      else count.textContent = label(shown === 1 ? ds.resultsOne : ds.resultsMany, { n: shown, q: q.trim() });
      empty.hidden = shown > 0;
    }

    function sync(push) {
      const q = input.value;
      const url = new URL(location.href);
      url.searchParams.delete('topic');
      if (q.trim()) url.searchParams.set('q', q.trim()); else url.searchParams.delete('q');
      history[push ? 'pushState' : 'replaceState'](null, '', url);
      render(q, '');
    }

    let t;
    input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => sync(false), 180); });
    form.addEventListener('submit', (e) => { e.preventDefault(); sync(true); });
    clear.addEventListener('click', () => { input.value = ''; sync(true); input.focus(); });
    root.addEventListener('click', (e) => {
      const more = e.target.closest('[data-help-more]');
      if (!more) return;
      const art = more.closest('[data-help-item]');
      const open = more.getAttribute('aria-expanded') !== 'true';
      more.setAttribute('aria-expanded', open);
      art.classList.toggle('is-open', open);
      art.querySelector('.help-result__full').hidden = !open;
      art.querySelector('[data-help-a]').hidden = open;
    });
    window.addEventListener('popstate', fromUrl);

    function fromUrl() {
      const p = new URLSearchParams(location.search);
      input.value = p.get('q') || '';
      render(input.value, (p.get('topic') || '').trim());
    }
    fromUrl();
  }

  const boot = () => document.querySelectorAll('[data-help]').forEach((r) => { if (!r.dataset.bound) { r.dataset.bound = '1'; init(r); } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  document.addEventListener('shopify:section:load', boot);
})();
