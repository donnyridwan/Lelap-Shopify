/* lelap — product page: gallery, purchase options (selling plans), sticky add-to-cart. */
(function () {
  'use strict';

  const money = (cents) => (window.LelapMoney ? window.LelapMoney(cents) : '$' + (cents / 100).toFixed(2));
  const moneyShort = (cents) => money(cents).replace(/[.,]00(?=\D*$)/, '');

  function initGallery(root) {
    const gallery = root.querySelector('[data-gallery]');
    if (!gallery || gallery.dataset.bound) return;
    gallery.dataset.bound = '1';
    const main = gallery.querySelector('[data-gallery-main]');
    const img = gallery.querySelector('[data-gallery-img]');
    const thumbs = gallery.querySelectorAll('[data-gallery-thumb]');
    thumbs.forEach((thumb) => {
      thumb.addEventListener('click', () => {
        if (!img) return;
        img.removeAttribute('srcset');
        if (thumb.dataset.srcset) img.setAttribute('srcset', thumb.dataset.srcset);
        img.src = thumb.dataset.src;
        img.alt = thumb.dataset.alt || '';
        main.classList.toggle('pdp-gallery__main--cover', thumb.dataset.fit === 'cover');
        thumbs.forEach((t) => {
          const on = t === thumb;
          t.classList.toggle('is-active', on);
          if (on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
        });
      });
    });
  }

  function initBuyBox(root) {
    const form = root.querySelector('form[data-product-form]');
    if (!form || form.dataset.buyboxBound) return;
    form.dataset.buyboxBound = '1';

    let data = { variants: [] };
    const json = root.querySelector('[data-product-json]');
    try { if (json) data = JSON.parse(json.textContent); } catch (e) { /* ignore */ }

    const hasPlans = root.dataset.hasPlans === 'true';
    const variantInput = form.querySelector('[data-variant-input]');
    const planInput = form.querySelector('[data-selling-plan-input]');
    const freqProp = form.querySelector('[data-frequency-property]');
    const freqWrap = form.querySelector('[data-frequency]');
    const options = form.querySelectorAll('[data-purchase-option]');
    const radios = form.querySelectorAll('[data-purchase-radio]');
    const freqRadios = form.querySelectorAll('input[name="frequency"]');
    const subPriceEl = form.querySelector('[data-sub-price]');
    const fullPriceEl = form.querySelector('[data-full-price]');
    const oncePriceEl = form.querySelector('[data-once-price]');
    const button = form.querySelector('[data-add-button]');
    const sticky = root.querySelector('[data-sticky-atc]');
    const stickyPrice = root.querySelector('[data-sticky-price]');
    const stickyNote = root.querySelector('[data-sticky-note]');
    const variantSelect = form.querySelector('[data-variant-select]');

    const currentVariant = () => data.variants.find((v) => String(v.id) === String(variantInput.value)) || data.variants[0];
    const mode = () => { const r = form.querySelector('[data-purchase-radio]:checked'); return r ? r.value : 'subscribe'; };
    const selectedFreq = () => form.querySelector('input[name="frequency"]:checked');

    function subPrice(variant) {
      const f = selectedFreq();
      if (variant && hasPlans && f) {
        const a = (variant.allocations || []).find((x) => String(x.plan) === String(f.dataset.planId));
        if (a) return a.price;
      }
      if (variant) return Math.round(variant.price * 0.8);
      return f ? Number(f.dataset.price) : 0;
    }

    function update() {
      const v = currentVariant();
      const isSub = mode() === 'subscribe';
      options.forEach((o) => o.classList.toggle('is-selected', o.dataset.purchaseOption === mode()));
      if (freqWrap) freqWrap.hidden = !isSub;
      const f = selectedFreq();
      if (planInput) planInput.value = isSub && hasPlans && f ? f.dataset.planId : '';
      if (freqProp) { freqProp.disabled = !isSub; freqProp.value = isSub && f ? f.value : ''; }
      if (v) {
        const sp = subPrice(v);
        if (subPriceEl) subPriceEl.textContent = moneyShort(sp);
        if (fullPriceEl) fullPriceEl.textContent = moneyShort(v.price);
        if (oncePriceEl) oncePriceEl.textContent = moneyShort(v.price);
        if (stickyPrice) stickyPrice.textContent = moneyShort(isSub ? sp : v.price);
        if (button) {
          button.disabled = !v.available;
          button.textContent = v.available ? data.buttonLabel : data.soldOut;
        }
      }
      if (stickyNote) stickyNote.textContent = isSub ? stickyNote.dataset.subNote : stickyNote.dataset.onceNote;
    }

    radios.forEach((r) => r.addEventListener('change', update));
    freqRadios.forEach((r) => r.addEventListener('change', update));
    if (variantSelect) variantSelect.addEventListener('change', () => { variantInput.value = variantSelect.value; update(); });
    update();

  }

  function init(root) {
    (root || document).querySelectorAll('[data-product-section]').forEach((section) => {
      initGallery(section);
      initBuyBox(section);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();
  document.addEventListener('shopify:section:load', (e) => init(e.target));
})();
