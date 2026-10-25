/* lelap theme — global UI behaviours (menu, accordions, tabs, carousels). */
(function () {
  'use strict';

  const lockScroll = (on) => { document.documentElement.style.overflow = on ? 'hidden' : ''; };

  /* Mobile menu --------------------------------------------------------- */
  function initMenu() {
    const menu = document.querySelector('[data-mobile-menu]');
    if (!menu) return;
    const openers = document.querySelectorAll('[data-menu-open]');
    const close = () => {
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      openers.forEach((b) => b.setAttribute('aria-expanded', 'false'));
      lockScroll(false);
    };
    openers.forEach((btn) => btn.addEventListener('click', () => {
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      btn.setAttribute('aria-expanded', 'true');
      lockScroll(true);
    }));
    menu.querySelectorAll('[data-menu-close], a').forEach((el) => el.addEventListener('click', close));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) close(); });
  }

  /* Desktop mega menu ------------------------------------------------------ */
  function initMegaMenu() {
    const menu = document.querySelector('[data-mega-menu]');
    const toggle = document.querySelector('[data-mega-toggle]');
    if (!menu || !toggle) return;
    const set = (open) => { menu.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); };
    toggle.addEventListener('click', (e) => { e.stopPropagation(); set(menu.hidden); });
    menu.querySelectorAll('[data-mega-close]').forEach((el) => el.addEventListener('click', () => set(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { set(false); toggle.focus(); } });
    document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target) && e.target !== toggle) set(false); });
  }

  /* Accordions (FAQ) — single-open groups -------------------------------- */
  function initAccordions(root) {
    (root || document).querySelectorAll('[data-accordion]').forEach((group) => {
      if (group.dataset.bound) return;
      group.dataset.bound = '1';
      const single = group.dataset.accordion === 'single';
      group.querySelectorAll('details').forEach((d) => {
        d.addEventListener('toggle', () => {
          if (single && d.open) group.querySelectorAll('details[open]').forEach((o) => { if (o !== d) o.open = false; });
        });
      });
    });
  }

  /* Tabs --------------------------------------------------------------------- */
  function initTabs(root) {
    (root || document).querySelectorAll('[data-tabs]').forEach((tabs) => {
      if (tabs.dataset.bound) return;
      tabs.dataset.bound = '1';
      const buttons = tabs.querySelectorAll('[data-tab]');
      const panels = tabs.querySelectorAll('[data-tab-panel]');
      buttons.forEach((btn) => btn.addEventListener('click', () => {
        const key = btn.dataset.tab;
        buttons.forEach((b) => { const on = b === btn; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', on); });
        panels.forEach((p) => { p.hidden = p.dataset.tabPanel !== key; });
      }));
    });
  }

  /* Horizontal scrollers with prev/next buttons ------------------------------ */
  function initScrollers(root) {
    (root || document).querySelectorAll('[data-scroller]').forEach((wrap) => {
      if (wrap.dataset.bound) return;
      wrap.dataset.bound = '1';
      const track = wrap.querySelector('[data-scroller-track]');
      if (!track) return;
      const step = () => (track.firstElementChild ? track.firstElementChild.getBoundingClientRect().width + 24 : track.clientWidth);
      wrap.querySelectorAll('[data-scroller-prev]').forEach((b) => b.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' })));
      wrap.querySelectorAll('[data-scroller-next]').forEach((b) => b.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' })));
    });
  }

  /* Money formatting shared helper ------------------------------------------ */
  window.LelapMoney = function (cents, format) {
    const fmt = format || (window.theme && window.theme.moneyFormat) || '${{amount}}';
    const value = (cents / 100);
    const map = {
      amount: value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
      amount_no_decimals: Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','),
      amount_with_comma_separator: value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
      amount_no_decimals_with_comma_separator: Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    };
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, (_, k) => map[k] || map.amount);
  };


  /* Motion: scroll reveals, header shadow, smooth accordions, cart bump ------ */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const REVEAL_GROUPS = [
    '.need__head', '.need__large-track', '.need__small', '.how__head', '.how__steps', '.pgrid__head', '.pgrid__grid',
    '.care__inner', '.cmp__head', '.cmp__card', '.cmp__cta', '.benefits__head', '.benefits__steps', '.benefits__howto',
    '.benefits__collage', '.ingr__head', '.ingr__track', '.reviews__head', '.reviews__grid', '.guarantee__panel',
    '.faq__title', '.faq__list', '.safety__box', '.final-cta__panel', '.social-proof__inner',
    '.pg-hero__copy', '.pg-hero__media', '.help-topics', '.blog-head', '.c-shop__grid'
  ];
  const STAGGER_CHILDREN = ['.need__large-track', '.need__small', '.how__steps', '.pgrid__grid', '.care__inner', '.benefits__steps',
    '.benefits__collage', '.ingr__track', '.reviews__grid', '.faq__list', '.social-proof__inner', '.help-topics', '.c-shop__grid'];

  function initReveal(root) {
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    const targets = [];
    (root || document).querySelectorAll(REVEAL_GROUPS.join(',')).forEach((el) => {
      if (el.closest('.mega-menu, .mobile-menu, .cart-drawer')) return;
      const stagger = STAGGER_CHILDREN.some((sel) => el.matches(sel));
      const items = stagger ? Array.from(el.children) : [el];
      items.forEach((item, i) => {
        if (item.hasAttribute('data-reveal')) return;
        item.setAttribute('data-reveal', '');
        item.style.setProperty('--reveal-delay', Math.min(i, 6) * 80 + 'ms');
        targets.push(item);
      });
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-revealed'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    targets.forEach((t) => io.observe(t));
  }

  function initHeaderShadow() {
    const onScroll = () => document.body.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function animateDetails(d, open) {
    const summary = d.querySelector('summary');
    const start = d.offsetHeight;
    d.setAttribute('data-animating', '');
    if (open) d.open = true;
    const end = open ? d.scrollHeight : summary.offsetHeight + parseFloat(getComputedStyle(d).paddingTop) + parseFloat(getComputedStyle(d).paddingBottom) + 1;
    const anim = d.animate({ height: [start + 'px', end + 'px'] }, { duration: 320, easing: 'cubic-bezier(.22,.61,.36,1)' });
    anim.onfinish = () => { if (!open) d.open = false; d.removeAttribute('data-animating'); };
  }
  function initSmoothDetails(root) {
    if (reduceMotion || !Element.prototype.animate) return;
    (root || document).querySelectorAll('[data-accordion] details').forEach((d) => {
      if (d.dataset.smooth) return;
      d.dataset.smooth = '1';
      const summary = d.querySelector('summary');
      if (!summary) return;
      summary.addEventListener('click', (e) => {
        e.preventDefault();
        if (d.hasAttribute('data-animating')) return;
        const willOpen = !d.open;
        if (willOpen) {
          const group = d.closest('[data-accordion]');
          if (group && group.dataset.accordion === 'single') group.querySelectorAll('details[open]').forEach((o) => { if (o !== d) animateDetails(o, false); });
        }
        animateDetails(d, willOpen);
      });
    });
  }

  function initCartBump() {
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      let last = el.textContent;
      new MutationObserver(() => {
        if (el.textContent !== last && Number(el.textContent) > Number(last || 0)) {
          el.classList.remove('is-bumped'); void el.offsetWidth; el.classList.add('is-bumped');
        }
        last = el.textContent;
      }).observe(el, { childList: true, characterData: true, subtree: true });
    });
  }

  function init(root) { initAccordions(root); initTabs(root); initScrollers(root); initSmoothDetails(root); initReveal(root); }

  document.addEventListener('DOMContentLoaded', () => { initMenu(); initMegaMenu(); initHeaderShadow(); initCartBump(); init(document); });
  document.addEventListener('shopify:section:load', (e) => init(e.target));
  window.LelapUI = { init };
})();
