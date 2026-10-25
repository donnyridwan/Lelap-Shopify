/* lelap — Refund request: reference number + "sent" summary (the contact form does not echo values back). */
(function () {
  'use strict';
  const KEY = 'lelap:refund';
  const store = {
    get() { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; } },
    set(v) { try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };

  document.querySelectorAll('[data-refund]').forEach((root) => {
    const form = root.querySelector('[data-refund-form]') || root.querySelector('form');
    const refInput = root.querySelector('[data-refund-ref]');
    if (refInput) {
      // RF-0000 style reference included in the email to the care team.
      const ref = 'RF-' + String(Math.floor(1000 + Math.random() * 9000));
      refInput.value = ref;
      form.addEventListener('submit', () => {
        const val = (sel) => { const el = form.querySelector(sel); return el ? el.value : ''; };
        store.set({
          ref,
          email: val('[data-refund-email]') || val('input[name="contact[email]"]'),
          order: val('[data-refund-order]') || val('input[name="contact[Order]"]'),
          amount: val('input[name="contact[Amount]"]'),
          method: val('input[name="contact[Refund to]"]:checked')
        });
      });
    }
    const saved = store.get();
    if (saved) {
      root.querySelectorAll('[data-refund-fill]').forEach((el) => {
        const v = saved[el.dataset.refundFill];
        if (v) el.textContent = v;
      });
    }
  });
})();
