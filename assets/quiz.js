/* lelap — Sleep quiz: steps, progress, scoring, health screening, "building your plan", result. */
(function () {
  'use strict';
  const KEY = 'lelap:quiz';
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    clear() { try { localStorage.removeItem(KEY); } catch (e) { /* storage unavailable */ } }
  };
  const ORDER = ['sleep-classic', 'sleep-deep', 'sleep-reset', 'sleep-calm'];
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init(root) {
    const body = document.body;
    const total = parseInt(root.dataset.total, 10) || 1;
    const bar = root.querySelector('[data-quiz-bar]');
    const progress = root.querySelector('[data-quiz-progress]');
    const intro = root.querySelector('[data-step="intro"]');
    const questions = [...root.querySelectorAll('[data-step="q"]')];
    const building = root.querySelector('[data-step="building"]');
    const plan = root.querySelector('[data-step="plan"]');
    const notfit = root.querySelector('[data-step="notfit"]');
    const steps = [intro, ...questions, building, plan, notfit];
    let current = intro;
    let timer = null;

    /* ---------- helpers ---------- */
    const inputsOf = (q) => [...q.querySelectorAll('input[type="radio"], input[type="checkbox"]')];
    const answered = (q) => {
      if (q.dataset.type === 'text') { const t = q.querySelector('input[type="text"]'); return !!(t && t.value.trim()); }
      return inputsOf(q).some((i) => i.checked);
    };
    const firstName = () => {
      const el = root.querySelector('[data-quiz-name]');
      const v = el ? el.value.trim() : '';
      return v ? v.charAt(0).toUpperCase() + v.slice(1) : '';
    };

    function setProgress(pct) {
      bar.style.width = pct + '%';
      progress.setAttribute('aria-valuenow', Math.round(pct));
    }

    let leaving = null;
    function show(step, opts) {
      if (timer) { clearTimeout(timer); timer = null; }
      const prev = current;
      const back = steps.indexOf(step) < steps.indexOf(prev);
      // Progress moves right away so the bar animates with the click.
      if (step === intro) setProgress(2);
      else if (step.dataset.step === 'q') setProgress((parseInt(step.dataset.index, 10) / total) * 100);
      else setProgress(100);
      const swap = () => {
        steps.forEach((s) => { if (s) { s.hidden = s !== step; s.classList.remove('is-entering', 'is-leaving', 'is-back'); } });
        if (!reduceMotion) { void step.offsetWidth; step.classList.add('is-entering'); step.classList.toggle('is-back', back); }
        current = step;
        const result = step === plan || step === notfit;
        body.classList.toggle('quiz-result', result);
        root.classList.toggle('is-result', result);
        if (!(opts && opts.noScroll)) window.scrollTo({ top: 0, behavior: 'auto' });
        const focusEl = step.querySelector('h1, h2');
        if (focusEl && !(opts && opts.noFocus)) { focusEl.setAttribute('tabindex', '-1'); focusEl.focus({ preventScroll: true }); }
        save();
      };
      if (leaving) { clearTimeout(leaving); leaving = null; }
      // Animate the current step out (fade + slide), then bring the next one in.
      if (!reduceMotion && prev && prev !== step && !prev.hidden && !(opts && opts.instant)) {
        current = step;
        prev.classList.remove('is-entering');
        prev.classList.add('is-leaving');
        prev.classList.toggle('is-back', back);
        leaving = setTimeout(() => { leaving = null; swap(); }, 180);
      } else swap();
    }

    /* ---------- state ---------- */
    function snapshot() {
      const answers = {};
      questions.forEach((q) => {
        const name = q.dataset.name;
        if (q.dataset.type === 'text') answers[name] = (q.querySelector('input[type="text"]') || {}).value || '';
        else answers[name] = inputsOf(q).filter((i) => i.checked).map((i) => i.value);
        const d = q.querySelector('[data-quiz-detail]');
        if (d && d.value) answers[name + '_detail'] = d.value;
      });
      return answers;
    }
    function save() {
      if (current === plan || current === notfit) { store.clear(); return; }
      const idx = current.dataset.step === 'q' ? parseInt(current.dataset.index, 10) : 0;
      store.set({ step: idx, answers: snapshot() });
    }
    function restore(state) {
      if (!state || !state.answers) return;
      questions.forEach((q) => {
        const v = state.answers[q.dataset.name];
        if (q.dataset.type === 'text') { const t = q.querySelector('input[type="text"]'); if (t && typeof v === 'string') t.value = v; }
        else if (Array.isArray(v)) inputsOf(q).forEach((i) => { i.checked = v.indexOf(i.value) !== -1; });
        const d = q.querySelector('[data-quiz-detail]');
        if (d && state.answers[q.dataset.name + '_detail']) d.value = state.answers[q.dataset.name + '_detail'];
        sync(q);
      });
    }

    /* ---------- question UI ---------- */
    function sync(q) {
      const next = q.querySelector('[data-quiz-next]');
      if (next) next.disabled = !answered(q);
      const follow = q.querySelector('[data-quiz-follow]');
      if (follow) follow.hidden = !inputsOf(q).some((i) => i.checked && i.dataset.outcome === 'followup');
      inputsOf(q).forEach((i) => i.closest('.quiz-option').classList.toggle('is-checked', i.checked));
    }

    questions.forEach((q) => {
      q.addEventListener('change', (e) => {
        const t = e.target;
        if (t.type === 'checkbox' && t.checked) {
          // "None of these" clears the other answers, and vice versa.
          inputsOf(q).forEach((i) => {
            if (i === t) return;
            if (t.dataset.outcome === 'exclusive' || i.dataset.outcome === 'exclusive') i.checked = false;
          });
        }
        sync(q);
        save();
      });
      q.addEventListener('input', (e) => { if (e.target.type === 'text') { sync(q); } });
      q.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.type === 'text') { e.preventDefault(); if (answered(q)) next(q); }
      });
      const btn = q.querySelector('[data-quiz-next]');
      if (btn) btn.addEventListener('click', () => next(q));
      const back = q.querySelector('[data-quiz-back]');
      if (back) back.addEventListener('click', () => {
        if (q !== current) return;
        const i = questions.indexOf(q);
        show(i > 0 ? questions[i - 1] : intro);
      });
      sync(q);
    });

    function next(q) {
      if (!answered(q) || q !== current) return;
      const stop = inputsOf(q).find((i) => i.checked && i.dataset.outcome === 'not_fit');
      if (stop) { showNotFit(stop.dataset.notfit); return; }
      const i = questions.indexOf(q);
      if (i < questions.length - 1) show(questions[i + 1]);
      else runBuilding();
    }

    /* ---------- outcome ---------- */
    function selected() {
      return questions.flatMap((q) => inputsOf(q).filter((i) => i.checked));
    }
    function scores() {
      const s = {};
      ORDER.forEach((f) => { s[f] = 0; });
      selected().forEach((i) => {
        const f = i.dataset.formula;
        if (f && f !== 'none' && s[f] !== undefined) s[f] += parseInt(i.dataset.points, 10) || 0;
      });
      return s;
    }
    function recommend() {
      const s = scores();
      let best = ORDER[0];
      ORDER.forEach((f) => { if (s[f] > s[best]) best = f; });
      const alts = ORDER.filter((f) => f !== best).sort((a, b) => (s[b] - s[a]) || (ORDER.indexOf(a) - ORDER.indexOf(b))).slice(0, 2);
      return { best, alts };
    }

    function fillNames() {
      const n = firstName();
      root.querySelectorAll('[data-quiz-name-out]').forEach((el) => {
        el.textContent = n;
        el.hidden = !n;
        // Without a name, drop the comma: "Your sleep plan." / "Thanks for being honest."
        const lead = el.parentNode.querySelector('[data-quiz-lead]');
        if (lead) {
          if (!lead.dataset.text) lead.dataset.text = lead.textContent;
          lead.textContent = n ? lead.dataset.text : lead.dataset.text.replace(/[,\s]+$/, '');
        }
      });
    }

    function summary() {
      return questions.map((q) => {
        const a = q.dataset.type === 'text'
          ? ((q.querySelector('input[type="text"]') || {}).value || '')
          : inputsOf(q).filter((i) => i.checked).map((i) => i.value).join(', ');
        const d = q.querySelector('[data-quiz-detail]');
        return q.dataset.question + ': ' + a + (d && d.value ? ' (' + d.value + ')' : '');
      }).join(' | ');
    }

    function runBuilding() {
      show(building);
      const tasks = [...building.querySelectorAll('[data-quiz-task]')];
      const ms = parseInt(root.dataset.buildingMs, 10) || 4000;
      const per = ms / (tasks.length + 1);
      tasks.forEach((t) => t.classList.remove('is-done', 'is-busy'));
      let k = 0;
      const tick = () => {
        tasks.forEach((t, j) => { t.classList.toggle('is-done', j < k); t.classList.toggle('is-busy', j === k); });
        k += 1;
        if (k <= tasks.length) timer = setTimeout(tick, per);
        else timer = setTimeout(showPlan, per);
      };
      tick();
    }

    function showPlan() {
      const { best, alts } = recommend();
      // Mark the cart so the drawer shows "Sleep assessment completed" (snippets/cart-drawer-body.liquid).
      try {
        const root = (window.theme && window.theme.routes && window.theme.routes.root) || '/';
        fetch(root.replace(/\/?$/, '/') + 'cart/update.js', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ attributes: { assessment: 'completed', 'Recommended formula': best } })
        }).catch(() => {});
      } catch (e) { /* non-blocking */ }
      fillNames();
      plan.querySelectorAll('[data-plan-for]').forEach((p) => { p.hidden = p.dataset.planFor !== best; });
      plan.querySelectorAll('[data-alt-for]').forEach((a) => {
        a.hidden = alts.indexOf(a.dataset.altFor) === -1;
        a.style.order = alts.indexOf(a.dataset.altFor);
      });
      const panel = plan.querySelector('[data-plan-for="' + best + '"]');
      const list = panel.querySelector('[data-quiz-reasons]');
      list.innerHTML = '';
      const seen = {};
      const reasons = selected().filter((i) => i.dataset.reasonTitle && !seen[i.dataset.reasonTitle] && (seen[i.dataset.reasonTitle] = true));
      reasons.sort((a, b) => (b.dataset.formula === best) - (a.dataset.formula === best));
      reasons.slice(0, 3).forEach((i) => {
        const li = document.createElement('li');
        li.innerHTML = '<span class="quiz-rec__tick" aria-hidden="true">' + checkSvg + '</span><span><strong></strong><span></span></span>';
        li.querySelector('strong').textContent = i.dataset.reasonTitle;
        li.querySelector('strong + span').textContent = i.dataset.reasonText;
        list.appendChild(li);
      });
      panel.querySelector('.quiz-rec__why').hidden = reasons.length === 0;
      const sum = panel.querySelector('[data-quiz-summary]');
      if (sum) sum.value = summary().slice(0, 1800);
      show(plan);
    }

    function showNotFit(reason) {
      fillNames();
      const p = notfit.querySelector('[data-quiz-notfit-text]');
      if (p && reason) p.textContent = p.dataset.template.split('[reason]').join(reason);
      show(notfit);
    }

    /* ---------- plan selector (subscription / one-time) ---------- */
    plan.addEventListener('change', (e) => {
      const r = e.target.closest('[data-quiz-purchase]');
      if (!r) return;
      const wrap = r.closest('[data-quiz-buy]');
      const subscribe = r.value === 'subscription';
      const planInput = wrap.querySelector('[data-quiz-plan-input]');
      if (planInput) planInput.disabled = !subscribe;
      const cta = wrap.querySelector('[data-quiz-cta]');
      if (cta && !cta.disabled) cta.textContent = subscribe ? cta.dataset.subLabel : cta.dataset.fullLabel;
      wrap.querySelectorAll('.quiz-plan-opt').forEach((o) => o.classList.toggle('is-checked', o.contains(r)));
    });
    plan.querySelectorAll('[data-quiz-purchase]:checked').forEach((r) => r.closest('.quiz-plan-opt').classList.add('is-checked'));

    /* ---------- intro / header ---------- */
    const saved = store.get();
    const resumeBtn = root.querySelector('[data-quiz-resume]');
    root.querySelector('[data-quiz-start]').addEventListener('click', () => { store.clear(); questions.forEach((q) => { inputsOf(q).forEach((i) => { i.checked = false; }); q.querySelectorAll('input[type="text"]').forEach((t) => { t.value = ''; }); sync(q); }); show(questions[0]); });
    resumeBtn.addEventListener('click', () => {
      const st = store.get();
      restore(st);
      const idx = st && st.step ? st.step : 1;
      show(questions[Math.min(Math.max(idx, 1), questions.length) - 1]);
    });
    root.querySelector('[data-quiz-exit]').addEventListener('click', (e) => {
      save();
      window.location.href = e.currentTarget.dataset.href || '/';
    });
    if (saved) restore(saved);
    setProgress(2);

    const checkSvg = (root.querySelector('.quiz-option__mark') || { innerHTML: '' }).innerHTML;

    // Theme editor: show the step that contains the selected block.
    document.addEventListener('shopify:block:select', (e) => {
      const step = e.target.closest('[data-step]');
      if (step && root.contains(step)) show(step, { noScroll: true, noFocus: true, instant: true });
    });
  }

  const boot = () => document.querySelectorAll('[data-quiz]').forEach((r) => { if (!r.dataset.bound) { r.dataset.bound = '1'; init(r); } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  document.addEventListener('shopify:section:load', boot);
})();
