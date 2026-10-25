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

  function init(root) { initAccordions(root); initTabs(root); initScrollers(root); }

  document.addEventListener('DOMContentLoaded', () => { initMenu(); initMegaMenu(); init(document); });
  document.addEventListener('shopify:section:load', (e) => init(e.target));
  window.LelapUI = { init };
})();
