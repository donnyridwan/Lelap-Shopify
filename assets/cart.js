/* lelap — AJAX cart + cart drawer.
   - Intercepts form[data-product-form] submits → POST /cart/add.js (with Section Rendering API)
   - Quantity / remove links [data-cart-qty] → POST /cart/change.js
   - Re-renders the drawer from sections/cart-drawer-content.liquid
   - Opens on [data-cart-toggle] click and after add; closes on overlay, close button, Esc; traps focus. */
(function () {
  'use strict';

  const SECTION = 'cart-drawer-content';
  const routes = (window.theme && window.theme.routes) || {};
  const root = (routes.root || '/').replace(/\/?$/, '/');
  const url = (r, fallback) => (routes[r] || fallback);

  const drawer = () => document.querySelector('[data-cart-drawer]');
  const overlay = () => document.querySelector('[data-cart-overlay]');
  const isCartPage = () => document.body.classList.contains('template-cart');
  let lastFocus = null;

  /* Drawer open / close -------------------------------------------------- */
  const focusables = (el) => Array.from(el.querySelectorAll('a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'))
    .filter((n) => n.offsetParent !== null || n === document.activeElement);

  function open() {
    const d = drawer();
    if (!d) return false;
    if (d.classList.contains('is-open')) return true;
    lastFocus = document.activeElement;
    const o = overlay();
    if (o) { o.hidden = false; requestAnimationFrame(() => o.classList.add('is-open')); }
    d.removeAttribute('inert');
    d.setAttribute('aria-hidden', 'false');
    const gap = window.innerWidth - document.documentElement.clientWidth;
    if (gap > 0) document.documentElement.style.paddingRight = gap + 'px'; // no layout jump when the scrollbar goes away
    d.classList.add('is-entering');
    requestAnimationFrame(() => d.classList.add('is-open'));
    clearTimeout(d._enterTimer);
    d._enterTimer = setTimeout(() => d.classList.remove('is-entering'), 900);
    document.documentElement.style.overflow = 'hidden';
    document.querySelectorAll('[data-cart-toggle]').forEach((t) => t.setAttribute('aria-expanded', 'true'));
    setTimeout(() => d.focus({ preventScroll: true }), 50);
    return true;
  }

  function close() {
    const d = drawer();
    if (!d || !d.classList.contains('is-open')) return;
    d.classList.remove('is-open');
    d.setAttribute('aria-hidden', 'true');
    d.setAttribute('inert', '');
    const o = overlay();
    if (o) { o.classList.remove('is-open'); setTimeout(() => { if (!o.classList.contains('is-open')) o.hidden = true; }, 250); }
    document.documentElement.style.overflow = '';
    document.documentElement.style.paddingRight = '';
    document.querySelectorAll('[data-cart-toggle]').forEach((t) => t.setAttribute('aria-expanded', 'false'));
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  /* Rendering ------------------------------------------------------------ */
  function renderSection(html) {
    if (!html) return;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const fresh = doc.querySelector('[data-cart-drawer-inner]');
    const d = drawer();
    if (!fresh) return;
    if (d) {
      const current = d.querySelector('[data-cart-drawer-inner]');
      if (current) current.replaceWith(fresh); else d.appendChild(fresh);
    }
    updateCount(Number(fresh.dataset.itemCount || 0));
  }

  function updateCount(count) {
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = count > 0 ? count : '';
      el.dataset.count = count;
    });
  }

  function announce(msg) {
    const live = document.querySelector('[data-cart-drawer] [data-cart-live]');
    if (live) { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 30); }
  }

  async function refresh() {
    const res = await fetch(`${root}?sections=${SECTION}`, { headers: { Accept: 'application/json' } });
    const data = await res.json();
    renderSection(data[SECTION]);
  }

  /* Add to cart ------------------------------------------------------------ */
  async function addFromForm(form, submitter) {
    const fd = new FormData(form);
    ['purchase_type', 'frequency'].forEach((k) => fd.delete(k));
    if (fd.get('selling_plan') === '') fd.delete('selling_plan');
    fd.append('sections', SECTION);
    fd.append('sections_url', window.location.pathname);

    const errorEl = form.querySelector('[data-form-error]');
    if (errorEl) { errorEl.hidden = true; errorEl.textContent = ''; }
    const buttons = [submitter, ...form.querySelectorAll('[type="submit"]')].filter(Boolean);
    buttons.forEach((b) => { b.classList.add('is-loading'); b.setAttribute('aria-busy', 'true'); });

    try {
      const res = await fetch(url('cartAdd', '/cart/add') + '.js', {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: fd
      });
      const data = await res.json();
      if (!res.ok || data.status) {
        const msg = data.description || data.message || (window.theme && window.theme.strings && window.theme.strings.cartError) || 'Something went wrong. Please try again.';
        if (errorEl) { errorEl.textContent = msg; errorEl.hidden = false; } else { renderError(msg); }
        return;
      }
      if (data.sections && data.sections[SECTION]) renderSection(data.sections[SECTION]); else await refresh();
      document.dispatchEvent(new CustomEvent('cart:added', { detail: data }));
      const d = drawer();
      if (isCartPage()) { window.location.reload(); return; }
      if (d && d.dataset.openOnAdd !== 'false') open();
      else if (!d) window.location.href = url('cart', '/cart');
    } catch (e) {
      form.removeAttribute('data-product-form');
      form.submit();
    } finally {
      buttons.forEach((b) => { b.classList.remove('is-loading'); b.removeAttribute('aria-busy'); });
    }
  }

  function renderError(msg) {
    const d = drawer();
    if (d && d.classList.contains('is-open')) announce(msg);
    else window.alert(msg); // eslint-disable-line no-alert
  }

  /* Change quantity -------------------------------------------------------- */
  async function change(key, quantity, trigger) {
    const item = trigger && trigger.closest('[data-cart-item]');
    if (item) item.classList.add('is-updating');
    try {
      const res = await fetch(url('cartChange', '/cart/change') + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: key, quantity: Math.max(0, quantity), sections: [SECTION], sections_url: window.location.pathname })
      });
      const data = await res.json();
      if (!res.ok || data.status) { renderError(data.description || data.message || 'Something went wrong. Please try again.'); if (item) item.classList.remove('is-updating'); return; }
      if (isCartPage()) { window.location.reload(); return; }
      if (data.sections && data.sections[SECTION]) renderSection(data.sections[SECTION]); else await refresh();
      const d = drawer();
      const target = d && (d.querySelector(`[data-cart-item="${CSS.escape(key)}"] [data-cart-qty]`) || d.querySelector('[data-cart-close]'));
      if (target) target.focus();
    } catch (e) {
      window.location.href = trigger && trigger.href ? trigger.href : url('cart', '/cart');
    }
  }

  /* Events ------------------------------------------------------------------ */
  document.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-product-form]');
    if (!form || !window.fetch) return;
    e.preventDefault();
    addFromForm(form, e.submitter);
  });

  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-cart-toggle]');
    if (toggle && !isCartPage()) {
      if (open()) e.preventDefault();
      return;
    }
    if (e.target.closest('[data-cart-close]') || e.target.closest('[data-cart-overlay]')) { e.preventDefault(); close(); return; }
    const qty = e.target.closest('[data-cart-qty]');
    if (qty && window.fetch) {
      e.preventDefault();
      change(qty.dataset.key, parseInt(qty.dataset.qty, 10), qty);
    }
  });

  document.addEventListener('keydown', (e) => {
    const d = drawer();
    if (!d || !d.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {
      const items = focusables(d);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === d)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* Cart page: keep the note in sync with the checkout form. */
  document.addEventListener('input', (e) => {
    if (e.target.id !== 'CartNote') return;
    const mirror = document.querySelector('[data-cart-note-mirror]');
    if (mirror) mirror.value = e.target.value;
  });

  /* Back/forward cache: make sure the count is fresh. */
  window.addEventListener('pageshow', (e) => { if (e.persisted && drawer()) refresh().catch(() => {}); });

  window.LelapCart = { open, close, refresh };
})();
