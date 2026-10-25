/* lelap — customer account behaviours (auth panels, password helpers, address modal, care messages, check-ins). */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const store = {
    get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
    sget(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } },
    sset(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };

  /* Show / hide password ------------------------------------------------- */
  document.addEventListener('click', (e) => {
    const eye = e.target.closest('[data-eye]');
    if (!eye) return;
    const input = eye.parentElement.querySelector('input');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    eye.setAttribute('aria-pressed', show ? 'true' : 'false');
  });

  /* Auth panels: login ↔ recover ↔ sent ↔ updated ------------------------ */
  function showPanel(name, focus) {
    const panels = $$('[data-auth-panel]');
    if (!panels.length) return;
    panels.forEach((p) => { p.hidden = p.dataset.authPanel !== name; });
    const p = $(`[data-auth-panel="${name}"]`);
    if (focus && p) { const f = p.querySelector('input:not([type=hidden]), h1, h2'); if (f) { f.setAttribute('tabindex', f.tabIndex < 0 ? '-1' : f.tabIndex); f.focus(); } }
  }
  function initAuth() {
    if (!$('[data-auth-panel]')) return;
    const initial = $('[data-auth-initial]');
    let start = initial ? initial.dataset.authInitial : 'login';
    if (start === 'login') {
      if (/password_updated/.test(window.location.search)) start = 'updated';
      else if (window.location.hash === '#recover') start = 'recover';
    }
    showPanel(start);
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-auth-show]');
      if (!t) return;
      e.preventDefault();
      showPanel(t.dataset.authShow, true);
      if (t.dataset.authShow === 'recover') history.replaceState(null, '', '#recover');
      else if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
    });
    /* Remember the email used for the reset link so "Check your inbox" can show it. */
    const recover = $('form[data-recover-form]');
    if (recover) recover.addEventListener('submit', () => { const em = recover.querySelector('input[type=email]'); if (em) store.sset('lelap-recover-email', em.value); });
    const emailOut = $('[data-recover-email]');
    if (emailOut) { const em = store.sget('lelap-recover-email'); if (em) emailOut.textContent = em; }
    /* Resend countdown */
    const resend = $('[data-resend]');
    if (resend) {
      let n = Number(resend.dataset.resend || 45);
      const label = resend.dataset.label || 'Resend';
      const tick = () => {
        if (n <= 0) { resend.disabled = false; resend.textContent = label; return; }
        resend.disabled = true; resend.textContent = `${label} in 0:${String(n).padStart(2, '0')}`; n -= 1; setTimeout(tick, 1000);
      };
      tick();
      resend.addEventListener('click', () => { showPanel('recover', true); });
    }
  }

  /* New password helpers -------------------------------------------------- */
  function initPasswordRules() {
    const form = $('[data-password-rules]');
    if (!form) return;
    const pw = form.querySelector('[data-pw]');
    const confirm = form.querySelector('[data-pw-confirm]');
    const bars = $$('.auth-strength__bars span', form);
    const label = form.querySelector('.auth-strength__label');
    const rules = { len: form.querySelector('[data-rule="len"]'), num: form.querySelector('[data-rule="num"]'), match: form.querySelector('[data-rule="match"]') };
    const words = (label && label.dataset.words ? label.dataset.words.split('|') : ['Weak password', 'Fair password', 'Good password', 'Strong password']);
    const update = () => {
      const v = pw.value;
      const ok = { len: v.length >= 8, num: /\d/.test(v), match: v.length > 0 && v === confirm.value };
      Object.keys(rules).forEach((k) => rules[k] && rules[k].classList.toggle('is-ok', ok[k]));
      let score = 0;
      if (v.length >= 8) score++;
      if (/\d/.test(v)) score++;
      if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
      if (v.length >= 12 || /[^A-Za-z0-9]/.test(v)) score++;
      bars.forEach((b, i) => b.classList.toggle('is-on', v.length > 0 && i < Math.max(1, score)));
      if (label) label.textContent = v.length ? words[Math.max(0, score - 1)] : '';
    };
    pw.addEventListener('input', update); confirm.addEventListener('input', update); update();
    form.addEventListener('submit', (e) => {
      if (pw.value.length < 8 || !/\d/.test(pw.value) || pw.value !== confirm.value) { e.preventDefault(); update(); pw.focus(); }
    });
  }

  /* Greeting by local time ------------------------------------------------ */
  function initGreeting() {
    $$('[data-greeting]').forEach((el) => {
      const h = new Date().getHours();
      const key = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
      const word = el.dataset[key];
      if (word) el.querySelector('[data-greeting-word]').textContent = word;
    });
  }

  /* Sleep check-in (stored on this device) -------------------------------- */
  function initCheckin() {
    const box = $('[data-checkin]');
    if (!box) return;
    const today = new Date().toISOString().slice(0, 10);
    let log = {};
    try { log = JSON.parse(store.get('lelap-checkins') || '{}'); } catch (e) { log = {}; }
    const btns = $$('[data-score]', box);
    const streakEl = $('[data-streak]', box);
    const paint = () => {
      btns.forEach((b) => b.setAttribute('aria-pressed', String(log[today]) === b.dataset.score ? 'true' : 'false'));
      let streak = 0; const d = new Date();
      for (;;) { const k = d.toISOString().slice(0, 10); if (log[k]) { streak++; d.setDate(d.getDate() - 1); } else break; }
      if (streakEl) streakEl.textContent = streak > 0 ? (streakEl.dataset.template || '[n]-night streak.').replace('[n]', streak) : '';
    };
    btns.forEach((b) => b.addEventListener('click', () => { log[today] = Number(b.dataset.score); store.set('lelap-checkins', JSON.stringify(log)); paint(); }));
    paint();
  }

  /* Address modal ------------------------------------------------------------ */
  function initAddresses() {
    const modals = $$('[data-address-modal]');
    if (!modals.length) return;
    let last = null;
    const open = (m) => { last = document.activeElement; m.hidden = false; document.documentElement.style.overflow = 'hidden'; const f = m.querySelector('input:not([type=hidden]):not([type=radio]), select'); if (f) f.focus(); };
    const close = (m) => { m.hidden = true; document.documentElement.style.overflow = ''; if (last) last.focus(); };
    document.addEventListener('click', (e) => {
      const o = e.target.closest('[data-address-open]');
      if (o) { const m = document.getElementById(o.dataset.addressOpen); if (m) { e.preventDefault(); open(m); } return; }
      const c = e.target.closest('[data-address-close]');
      if (c) { e.preventDefault(); close(c.closest('[data-address-modal]')); }
    });
    document.addEventListener('keydown', (e) => {
      const m = modals.find((x) => !x.hidden);
      if (!m) return;
      if (e.key === 'Escape') { close(m); return; }
      if (e.key !== 'Tab') return;
      /* keep focus inside the open dialog */
      const items = Array.from(m.querySelectorAll('a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select, textarea')).filter((n) => n.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastItem.focus(); }
      else if (!e.shiftKey && document.activeElement === lastItem) { e.preventDefault(); first.focus(); }
    });
    modals.forEach((m) => {
      const form = m.querySelector('form');
      /* Provinces for the selected country (Shopify data-provinces). */
      const country = m.querySelector('[data-country]');
      const province = m.querySelector('[data-province]');
      const fillProvinces = () => {
        if (!country || !province) return;
        const opt = country.options[country.selectedIndex];
        let list = [];
        try { list = JSON.parse(opt.getAttribute('data-provinces') || '[]'); } catch (e) { list = []; }
        const current = province.dataset.default || province.value;
        province.innerHTML = '';
        list.forEach(([code, name]) => { const o = document.createElement('option'); o.value = code; o.textContent = name; if (code === current || name === current) o.selected = true; province.appendChild(o); });
        province.closest('.auth-field').hidden = list.length === 0;
      };
      if (country) {
        const want = country.dataset.default;
        if (want) Array.from(country.options).forEach((o) => { if (o.value === want) o.selected = true; });
        country.addEventListener('change', fillProvinces); fillProvinces();
      }
      /* Label chip + delivery notes are stored together in the company field: "Office · leave at reception". */
      if (form) form.addEventListener('submit', () => {
        const label = form.querySelector('input[name="address_label"]:checked');
        const notes = form.querySelector('[data-address-notes]');
        const company = form.querySelector('[data-address-company]');
        if (company) company.value = [label ? label.value : '', notes ? notes.value.trim() : ''].filter(Boolean).join(' · ');
      });
      if (m.hasAttribute('data-open-on-load')) open(m);
    });
  }

  /* Care team messages + profile requests via the contact form ------------- */
  async function postContact(form) {
    const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'text/html' } });
    return res.ok;
  }
  function initCare() {
    const form = $('[data-care-form]');
    if (!form) return;
    const input = form.querySelector('[data-care-input]');
    const body = form.querySelector('[data-care-body]');
    const list = $('[data-care-messages]');
    const empty = $('[data-care-empty]');
    $$('[data-care-suggest]').forEach((b) => b.addEventListener('click', () => { input.value = b.textContent.trim(); input.focus(); }));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) { input.focus(); return; }
      body.value = text;
      const ok = await postContact(form).catch(() => false);
      if (!ok) { form.submit(); return; }
      if (empty) empty.hidden = true;
      if (list) {
        list.hidden = false;
        const b = document.createElement('div');
        b.className = 'acct-bubble acct-bubble--me';
        const p = document.createElement('p'); p.textContent = text;
        const s = document.createElement('small');
        const t = new Date();
        s.textContent = `${list.dataset.you || 'You'} · ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
        b.append(p, s); list.appendChild(b); b.scrollIntoView({ block: 'nearest' });
      }
      input.value = '';
      const live = $('[data-care-live]'); if (live) { live.hidden = false; }
    });
  }
  function initContactToggles() {
    $$('[data-pref-form]').forEach((form) => {
      const body = form.querySelector('[data-pref-body]');
      const flash = form.querySelector('[data-pref-flash]');
      $$('input[type=checkbox]', form).forEach((cb) => cb.addEventListener('change', async () => {
        body.value = $$('input[type=checkbox]', form).map((c) => `${c.dataset.label}: ${c.checked ? 'on' : 'off'}`).join('\n');
        const ok = await postContact(form).catch(() => false);
        if (flash) { flash.hidden = !ok; }
      }));
    });
  }

  function init() { initAuth(); initPasswordRules(); initGreeting(); initCheckin(); initAddresses(); initCare(); initContactToggles(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
