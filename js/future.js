/* mochii club — Future: the forecast playground
 * A fixed set of widget templates (forecast, runway alarm, habit ripple, habits, red flags, net, daily receipts,
 * accounts) that people arrange however they like, plus a goal bar where AI (Gemini, or the offline planner)
 * re-arranges the space around what you're trying to do. State lives in localStorage under receipts.future.
 */
(function (global) {
  const R = (global.R = global.R || {});
  const F = R.forecast;
  const LS = 'receipts.future';
  const esc = (s) => R.esc(String(s ?? ''));
  const money = (n, dp) => (n < 0 ? '−' + R.money(-n, dp) : R.money(n, dp));
  const signed = (n, dp = 0) => (n >= 0 ? '+' : '−') + money(Math.abs(n), dp);
  const compact = (n) => { const a = Math.abs(n); const s = n < 0 ? '−' : ''; return a >= 10000 ? `${s}$${Math.round(a / 1000)}k` : a >= 1000 ? `${s}$${(a / 1000).toFixed(1)}k` : `${s}$${Math.round(a)}`; };
  const $ = (s, el) => el.querySelector(s);
  const reduceMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ACCENTS = { lime: '#b5e48c', pink: '#ff8fb8', purple: '#a18bff', blue: '#5b8cff', orange: '#ffa173', mint: '#6fdba8' };
  const WIDGETS = {
    forecast: { emoji: '📈', title: 'crystal ball', desc: 'what you’ll spend next, from tomorrow to next year' },
    runway:   { emoji: '🚨', title: 'runway alarm', desc: 'when your money runs out at this pace' },
    ripple:   { emoji: '🔁', title: '1 decision → 100', desc: 'how one small habit repeats all year' },
    habits:   { emoji: '🧠', title: 'money habits', desc: 'your monthly averages, broken down' },
    flags:    { emoji: '🚩', title: 'red flags', desc: 'spending patterns you might not notice' },
    net:      { emoji: '⚖️', title: 'net worth-ish', desc: 'earned − spent, by day, week, month and year' },
    receipts: { emoji: '🧾', title: 'daily receipts', desc: 'print and share a receipt for any day' },
    accounts: { emoji: '🏦', title: 'balances', desc: 'your accounts and paychecks' },
  };
  const DEFAULT_ORDER = ['forecast', 'runway', 'ripple', 'habits', 'flags', 'net', 'receipts', 'accounts'];
  const ACCOUNT_TYPES = {
    checking:   { emoji: '💳', label: 'checking / debit', liquid: true },
    savings:    { emoji: '🏦', label: 'savings', liquid: true },
    cash:       { emoji: '💵', label: 'cash', liquid: true },
    credit:     { emoji: '🧾', label: 'credit card (owed)', liquid: true, debt: true },
    brokerage:  { emoji: '📈', label: 'stocks / brokerage', hurdle: true },
    crypto:     { emoji: '🪙', label: 'crypto', hurdle: true },
    retirement: { emoji: '🧓', label: 'retirement (401k / IRA)', hurdle: true },
  };

  function fresh() {
    return {
      accounts: [
        { id: 'a1', type: 'checking', name: 'Everyday Checking', balance: 1284.5, inRunway: true, synced: 'demo' },
        { id: 'a2', type: 'savings', name: 'High-Yield Savings', balance: 1000, inRunway: true, synced: 'demo' },
      ],
      paycheck: null, order: [...DEFAULT_ORDER], hidden: [], accent: 'lime', hz: 4, mode: 'spend', netPeriod: 'monthly',
      lens: 'categories', goal: null, plan: null, prevLayout: null, focusCat: null, edit: false,
    };
  }
  let S = load();
  function load() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(LS)) || {}; } catch {}
    const f = { ...fresh(), ...s };
    f.order = [...new Set([...f.order.filter((id) => WIDGETS[id]), ...DEFAULT_ORDER])];
    return f;
  }
  function save() { try { localStorage.setItem(LS, JSON.stringify({ ...S, edit: false })); } catch {} }

  // ---------- data ----------
  let ctx = null, root = null, M = null, D = null;
  function compute(c) {
    const txns = c.txns();
    const income = c.income();
    const model = F.build(txns, income, { paycheck: S.paycheck });
    const liquid = S.accounts.filter((a) => a.inRunway).reduce((s, a) => s + (ACCOUNT_TYPES[a.type]?.debt ? -a.balance : a.balance), 0);
    const run = F.runway(model, liquid);
    return { txns, income, model, liquid, run };
  }

  // ---------- page ----------
  function render(el, c) {
    ctx = c; root = el;
    D = compute(c); M = D.model;
    const accent = ACCENTS[S.accent] || ACCENTS.lime;
    const order = S.order.filter((id) => !S.hidden.includes(id));
    el.innerHTML = `<div class="fx ${S.edit ? 'editing' : ''}" style="--accent:${accent}">
      <div class="fx-head">
        <h1 class="title">the future<br><span class="muted">per your receipts</span></h1>
        <button class="fx-pill ${S.edit ? 'on' : ''}" data-fx="edit">${S.edit ? '✓ done' : '✏️ customize'}</button>
      </div>
      ${S.edit ? editTray() : ''}
      <div id="fxGoal">${goalBlock()}</div>
      ${order.map((id, i) => `<section class="fw" data-w="${id}">
        ${S.edit ? `<div class="fw-ctrl"><span>${WIDGETS[id].emoji} ${WIDGETS[id].title}</span>
          <button data-fx="up" data-id="${id}" ${i === 0 ? 'disabled' : ''} aria-label="move up">↑</button>
          <button data-fx="down" data-id="${id}" ${i === order.length - 1 ? 'disabled' : ''} aria-label="move down">↓</button>
          <button data-fx="hide" data-id="${id}" aria-label="hide">🙈</button></div>` : ''}
        <div class="fw-body" id="fw-${id}"></div></section>`).join('')}
      ${S.edit && S.hidden.length ? `<div class="fx-tray"><div class="fx-tray-h">hidden blocks · tap to add back</div>
        ${S.hidden.map((id) => `<button class="fx-add" data-fx="show" data-id="${id}"><span>${WIDGETS[id].emoji}</span><span class="grow"><b>${WIDGETS[id].title}</b><small>${WIDGETS[id].desc}</small></span><span>＋</span></button>`).join('')}</div>` : ''}
      <p class="fx-fine">predictions use your last ${M.windowDays} days. they’re estimates, not prophecies 🔮</p>
    </div>`;
    for (const id of order) mountWidget(id);
    if (!el.dataset.fxBound) { el.dataset.fxBound = '1'; el.addEventListener('click', onClick); el.addEventListener('input', onInput); el.addEventListener('keydown', onKey); }
  }
  const rerender = () => render(root, ctx);
  function mountWidget(id) {
    const box = root && $('#fw-' + id, root); if (!box) return;
    ({ forecast: wForecast, runway: wRunway, ripple: wRipple, habits: wHabits, flags: wFlags, net: wNet, receipts: wReceipts, accounts: wAccounts })[id](box);
  }

  function editTray() {
    return `<div class="fx-edit-tray">
      <p><b>your space, your rules.</b> same building blocks for everyone, arranged however you want. move, hide, recolor.</p>
      <div class="swatches">${Object.entries(ACCENTS).map(([k, v]) => `<button class="sw ${S.accent === k ? 'on' : ''}" data-fx="accent" data-v="${k}" style="background:${v}" aria-label="${k}"></button>`).join('')}</div>
      <button class="link" data-fx="resetLayout">reset layout</button></div>`;
  }

  // ---------- goal bar + AI planner ----------
  const GOAL_CHIPS = ['spend at most $400 this week', 'save $500 this month', 'cut coffee in half', 'max $60 on delivery this week'];
  function goalBlock() {
    if (S.planning) return `<div class="goal-card planning"><span class="spinner"></span><div><b>✨ redesigning your space…</b><small>${R.gemini.enabled ? 'Gemini is' : 'the planner is'} reading your habits</small></div></div>`;
    if (!S.goal) return `<div class="goal-card">
      <div class="goal-k">🎯 got a goal?</div>
      <div class="goal-input"><input class="input" id="goalIn" maxlength="120" placeholder="“i wanna spend at most $400 this week”" autocomplete="off"><button class="btn sm" data-fx="goal">✨</button></div>
      <div class="goal-chips">${GOAL_CHIPS.map((g) => `<button data-fx="goalChip" data-v="${esc(g)}">${esc(g)}</button>`).join('')}</div>
      <small class="goal-hint">AI rearranges this page around your goal. you can always undo.</small></div>`;
    const g = S.goal, st = F.goalStatus(g, D.txns, D.income, M);
    const pctProj = Math.min(1.25, st.projected / Math.max(1, st.target));
    let status;
    if (g.type === 'save') status = st.ok ? `on pace to save ${money(st.net, 0)} 💅` : `on pace for ${signed(st.net)} net. you’re ${money(st.gap, 0)} short 😬`;
    else status = st.ok ? `on track 💅 ${st.daysLeft ? `you can spend ~${money(st.allowance, 0)}/day for ${st.daysLeft} more day${st.daysLeft > 1 ? 's' : ''}` : ''}` : `at this pace you’ll go ${money(st.gap, 0)} over 😬 ${st.daysLeft ? `keep it under ${money(st.allowance, 0)}/day to make it` : ''}`;
    const bar = g.type === 'save'
      ? `<div class="goal-bar"><i style="width:${Math.round(st.pct * 100)}%"></i></div><div class="goal-meta"><span>projected net ${signed(st.net)}</span><span>goal ${money(st.target, 0)}</span></div>`
      : `<div class="goal-bar"><i style="width:${Math.min(100, (st.spent / Math.max(1, st.target)) * 80)}%"></i><em style="left:${Math.min(100, pctProj * 80)}%" title="projected"></em><s style="left:80%"></s></div>
         <div class="goal-meta"><span>${money(st.spent, 0)} spent so far</span><span>projected ${money(st.projected, 0)} / ${money(st.target, 0)}</span></div>`;
    return `<div class="goal-card set ${st.ok ? 'ok' : 'bad'}">
      <div class="row" style="justify-content:space-between"><div class="goal-k">🎯 ${esc(st.label)}</div><button class="link" data-fx="clearGoal">clear</button></div>
      <h3>${esc(g.label)}</h3>
      ${bar}
      <p class="goal-status">${status}</p>
      ${S.plan ? `<details class="goal-plan"><summary>✨ ${esc(S.plan.headline || 'we rearranged your space for this')}</summary>
        <ul>${(S.plan.changes || []).map((c) => `<li>${esc(c)}</li>`).join('')}</ul><small>planned by ${S.plan.via === 'gemini' ? '✨ Gemini' : 'the offline planner'}</small></details>` : ''}
      ${S.prevLayout ? `<button class="link" data-fx="undoLayout">undo layout changes</button>` : ''}
    </div>`;
  }

  const HZ_FOR = { day: 0, week: 2, month: 4, year: 7 };
  const CAT_ACCENT = { Coffee: 'orange', Food: 'orange', Delivery: 'pink', Shopping: 'purple', Beauty: 'pink', Transport: 'blue', Groceries: 'mint', Entertainment: 'lime', Subscriptions: 'blue', Other: 'lime' };
  function offlinePlan(goal) {
    const changes = [];
    let order, mode = 'spend';
    if (goal.type === 'save') {
      order = ['runway', 'net', 'forecast', 'accounts', 'ripple', 'flags', 'habits', 'receipts'];
      mode = 'balance';
      changes.push('put the runway alarm + net graph first, since saving is about what’s left over', 'switched the crystal ball to balance mode');
    } else if (goal.category) {
      order = ['forecast', 'habits', 'ripple', 'flags', 'receipts', 'runway', 'net', 'accounts'];
      changes.push(`zoomed habits in on ${goal.category.toLowerCase()}`, `moved “1 decision → 100” up so you see what each ${goal.category.toLowerCase()} run costs`);
    } else {
      order = ['forecast', 'ripple', 'flags', 'receipts', 'habits', 'runway', 'net', 'accounts'];
      changes.push('pinned the crystal ball to the top', 'daily receipts moved up so you can check each day');
    }
    const hz = HZ_FOR[goal.period] ?? 4;
    changes.unshift(`set the forecast to “${F.HORIZONS[hz].label}” to match your goal`);
    const accent = goal.type === 'save' ? 'mint' : CAT_ACCENT[goal.category] || 'lime';
    changes.push(`recolored your space ${accent} ${goal.type === 'save' ? '💚' : '🎨'}`);
    return { order, hidden: [], hz, mode, accent, focusCat: goal.category, headline: 'we rearranged your space for this goal', changes, via: 'offline' };
  }
  async function aiPlan(text) {
    const local = F.parseGoal(text);
    if (!R.gemini.enabled) return local && { goal: local, plan: offlinePlan(local) };
    const stats = { monthlySpend: Math.round(D.run.monthlyOut), monthlyIncome: Math.round(D.run.monthlyIn), topHabits: M.habits.slice(0, 5).map((h) => ({ merchant: h.merchant, category: h.category, perMonth: +(h.perDay * 30.44).toFixed(1), avg: +h.avg.toFixed(2) })) };
    const prompt = `You design the home screen of "mochii club", a Gen Z money app. A user typed a goal. Return JSON only:
{"goal":{"type":"cap"|"save"|"cut","amount":number|null,"period":"day"|"week"|"month"|"year","category":one of ${JSON.stringify(Object.keys(R.CATEGORIES))} or null,"label":"short lowercase label"},
 "order":[widget ids, most useful first],"hidden":[widget ids to hide, at most 2],"horizon":"1D"|"2D"|"1W"|"2W"|"1M"|"3M"|"6M"|"1Y","mode":"spend"|"balance",
 "accent":one of ${JSON.stringify(Object.keys(ACCENTS))},"headline":"lowercase, funny, max 8 words","changes":[2-4 short lowercase sentences saying what you changed and why]}
Widgets: ${Object.entries(WIDGETS).map(([id, w]) => `${id} = ${w.desc}`).join('; ')}.
User stats: ${JSON.stringify(stats)}
Goal: ${JSON.stringify(String(text).slice(0, 200))}`;
    try {
      const r = await R.gemini.generate(prompt, { json: true, temperature: 0.6 });
      const g = r.goal || {};
      const type = ['cap', 'save', 'cut'].includes(g.type) ? g.type : local?.type;
      const amount = Number.isFinite(+g.amount) && +g.amount > 0 ? +g.amount : local?.amount ?? null;
      const period = ['day', 'week', 'month', 'year'].includes(g.period) ? g.period : local?.period || 'month';
      const category = Object.hasOwn(R.CATEGORIES, g.category) ? g.category : local?.category ?? null;
      if (!type || (type !== 'cut' && !amount) || (type === 'cut' && !category)) throw new Error('bad goal');
      const goal = { type, amount, period, category, text, label: String(g.label || local?.label || text).slice(0, 60) };
      const order = (Array.isArray(r.order) ? r.order : []).filter((id) => WIDGETS[id]);
      const hz = F.HORIZONS.findIndex((h) => h.id === r.horizon);
      return { goal, plan: {
        order: [...new Set([...order, ...DEFAULT_ORDER])], hidden: (Array.isArray(r.hidden) ? r.hidden : []).filter((id) => WIDGETS[id] && id !== 'forecast').slice(0, 2),
        hz: hz >= 0 ? hz : HZ_FOR[period], mode: r.mode === 'balance' ? 'balance' : 'spend', accent: ACCENTS[r.accent] ? r.accent : 'lime', focusCat: category,
        headline: String(r.headline || '').slice(0, 60), changes: (Array.isArray(r.changes) ? r.changes : []).slice(0, 4).map((c) => String(c).slice(0, 120)), via: 'gemini' } };
    } catch { return local && { goal: local, plan: offlinePlan(local) }; }
  }
  async function setGoal(text) {
    if (!String(text || '').trim()) return ctx.toast('type a goal first 🎯');
    S.planning = true; $('#fxGoal', root).innerHTML = goalBlock();
    const [r] = await Promise.all([aiPlan(text), new Promise((ok) => setTimeout(ok, reduceMotion() ? 0 : 900))]);
    S.planning = false;
    if (!r) { $('#fxGoal', root).innerHTML = goalBlock(); return ctx.toast('try something like “spend at most $400 this week”'); }
    S.prevLayout = { order: S.order, hidden: S.hidden, hz: S.hz, mode: S.mode, accent: S.accent, focusCat: S.focusCat, lens: S.lens };
    const p = r.plan;
    Object.assign(S, { goal: r.goal, plan: p, order: p.order, hidden: p.hidden, hz: p.hz, mode: p.mode, accent: p.accent, focusCat: p.focusCat, lens: 'categories' });
    save(); rerender(); root.scrollTop = 0; root.closest('.screen')?.scrollTo?.({ top: 0, behavior: 'smooth' });
    ctx.toast('✨ your space just got a glow-up');
  }

  // ---------- 📈 forecast ----------
  function wForecast(box) {
    box.innerHTML = `<div class="fw-h"><h3>📈 crystal ball</h3><div class="seg sm">
        <button class="${S.mode === 'spend' ? 'on' : ''}" data-fx="mode" data-v="spend">spending</button>
        <button class="${S.mode === 'balance' ? 'on' : ''}" data-fx="mode" data-v="balance">balance</button></div></div>
      <div id="fcDyn"></div>
      <div class="hz">
        <input type="range" min="0" max="${F.HORIZONS.length - 1}" step="1" value="${S.hz}" id="hzIn" aria-label="forecast horizon" style="--p:${(S.hz / (F.HORIZONS.length - 1)) * 100}%">
        <div class="hz-ticks">${F.HORIZONS.map((h, i) => `<button class="${h.flagship ? 'flag' : ''} ${i === S.hz ? 'on' : ''}" data-fx="hz" data-v="${i}">${h.id}</button>`).join('')}</div>
      </div>`;
    forecastDyn();
  }
  function forecastDyn() {
    const box = $('#fcDyn', root); if (!box) return;
    const h = F.HORIZONS[S.hz];
    const p = F.project(M, h.days, { startBalance: D.liquid });
    const histDays = Math.max(14, Math.min(M.windowDays, Math.round(h.days * 0.75)));
    const hist = F.history(D.txns, D.income, M, histDays, D.liquid);
    const end = F.addDays(M.anchor, h.days - 1);
    const bal = S.mode === 'balance';
    const head = bal
      ? `<div class="fc-k">your balance by ${F.fmtDate(end)}${h.days > 300 ? ` ${end.getFullYear()}` : ''}</div>
         <div class="fc-big num">${money(p.endBal, 0)}</div>
         <div class="fc-sub"><span class="chg ${p.endBal >= D.liquid ? 'up' : 'down'}">${p.endBal >= D.liquid ? '▲' : '▼'} ${signed(p.endBal - D.liquid)} (${D.liquid ? Math.round(((p.endBal - D.liquid) / Math.abs(D.liquid)) * 100) : 0}%)</span> likely ${money(p.pts.at(-1).balLo80, 0)} to ${money(p.pts.at(-1).balHi80, 0)}</div>`
      : `<div class="fc-k">${esc(h.label)}, you’ll probably spend</div>
         <div class="fc-big num">${money(p.total, 0)}</div>
         <div class="fc-sub"><span class="chg">≈ ${money(p.total / h.days, 0)}/day</span> 80% chance it lands between ${money(p.lo, 0)} and ${money(p.hi, 0)}</div>`;
    const subs = p.subs.length ? `<div class="drv"><span class="em">🔁</span><span class="grow"><b>${p.subs.length} subscription${p.subs.length > 1 ? 's' : ''} hit</b><small>${esc(p.subs.slice(0, 3).map((s) => s.merchant).join(', '))}${p.subs.length > 3 ? '…' : ''} · locked in</small></span><b class="num">${money(p.recurringTotal, 0)}</b></div>` : '';
    const drivers = p.drivers.map((d) => `<div class="drv"><span class="em">${R.CATEGORIES[d.category]?.emoji || '🧾'}</span><span class="grow"><b>${esc(d.merchant)}</b><small>~${d.times < 10 ? d.times.toFixed(1) : Math.round(d.times)}× at ${money(d.avg)}</small></span><b class="num">${money(d.cost, 0)}</b></div>`).join('');
    const pay = bal && p.income > 0 ? `<div class="drv"><span class="em">💸</span><span class="grow"><b>paychecks + money in</b><small>${esc(M.schedules.map((s) => `${s.source} · ${s.freq}`).join(', ') || 'average deposits')}</small></span><b class="num pos">+${money(p.income, 0)}</b></div>` : '';
    box.innerHTML = `${head}${lowData()}
      <div class="chart-wrap">${chartSVG(hist, p, bal)}<div class="chart-tip" hidden></div></div>
      <div class="drivers"><div class="drv-h">what’s driving it</div>${pay}${subs}${drivers || '<small class="muted">not enough history yet</small>'}</div>`;
    bindScrub(box, hist, p, bal);
  }

  // Paydays make balance lines saw-tooth; on long horizons draw a 2-week rolling average (numbers above stay exact).
  const smooth = (vals, w) => vals.map((_, i) => { const a = Math.max(0, i - (w >> 1)), b = Math.min(vals.length, i + (w >> 1) + 1); let s = 0; for (let k = a; k < b; k++) s += vals[k]; return s / (b - a); });
  function chartSVG(hist, p, bal) {
    const W = 340, H = 190, pl = 4, pr = 44, pt = 14, pb = 22;
    const histEnd = hist.at(-1).spend;
    let hv = hist.map((x) => (bal ? x.bal : x.spend));
    let fv = p.pts.map((x) => bal ? { m: x.bal, lo: x.balLo80, hi: x.balHi80, lo5: x.balLo50, hi5: x.balHi50 } : { m: histEnd + x.spend, lo: histEnd + x.lo80, hi: histEnd + x.hi80, lo5: histEnd + x.lo50, hi5: histEnd + x.hi50 });
    if (bal && p.pts.length > 45) {
      hv = smooth(hv, 15);
      const keys = ['m', 'lo', 'hi', 'lo5', 'hi5'];
      const cols = Object.fromEntries(keys.map((k) => [k, smooth(fv.map((f) => f[k]), 15)]));
      fv = fv.map((_, i) => Object.fromEntries(keys.map((k) => [k, cols[k][i]])));
      // keep the line continuous at "today"
      const d0 = hv.at(-1) - fv[0].m; fv = fv.map((f, i) => { const w = Math.max(0, 1 - i / 15); return Object.fromEntries(keys.map((k) => [k, f[k] + d0 * w])); });
    }
    const all = [...hv, ...fv.flatMap((f) => [f.lo, f.hi])];
    let lo = Math.min(...all), hi = Math.max(...all);
    if (!bal) lo = 0;
    if (bal && lo > 0 && lo < (hi - lo) * 0.6) lo = 0;
    const padY = (hi - lo) * 0.08 || 10; hi += padY; if (lo !== 0) lo -= padY;
    const n = hv.length + fv.length - 1;
    const X = (i) => pl + (i / n) * (W - pl - pr);
    const Y = (v) => pt + (1 - (v - lo) / (hi - lo || 1)) * (H - pt - pb);
    const h0 = hv.length - 1;
    const line = (vals, off) => vals.map((v, i) => `${i ? 'L' : 'M'}${X(i + off).toFixed(1)},${Y(v).toFixed(1)}`).join('');
    const band = (a, b) => {
      const top = [hv[h0], ...fv.map((f) => f[b])], bot = [hv[h0], ...fv.map((f) => f[a])];
      return `${line(top, h0)}${bot.reverse().map((v, i) => `L${X(h0 + (bot.length - 1 - i)).toFixed(1)},${Y(v).toFixed(1)}`).join('')}Z`;
    };
    const histPath = line(hv, 0);
    const area = `${histPath}L${X(h0).toFixed(1)},${Y(Math.max(lo, 0)).toFixed(1)}L${X(0).toFixed(1)},${Y(Math.max(lo, 0)).toFixed(1)}Z`;
    const ticks = [0, 0.5, 1].map((t) => lo + t * (hi - lo));
    const zero = bal && lo < 0 ? `<line x1="${pl}" x2="${W - pr}" y1="${Y(0)}" y2="${Y(0)}" class="zero"/><text x="${pl + 4}" y="${Y(0) - 5}" class="zero-t">broke line 💀</text>` : '';
    const last = fv.at(-1);
    return `<svg viewBox="0 0 ${W} ${H}" class="fc-chart" role="img" aria-label="forecast chart">
      <defs><linearGradient id="fcArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
        <linearGradient id="fcCone" x1="0" x2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".05"/><stop offset="1" stop-color="var(--accent)" stop-opacity=".3"/></linearGradient></defs>
      ${ticks.map((v) => `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" class="grid" data-v="${v}"/><text x="${W - pr + 6}" y="${Y(v) + 4}" class="ax">${compact(v)}</text>`).join('')}
      ${zero}
      <path d="${area}" fill="url(#fcArea)"/>
      <path d="${band('lo', 'hi')}" fill="url(#fcCone)" class="cone"/>
      <path d="${band('lo5', 'hi5')}" fill="var(--accent)" opacity=".22" class="cone"/>
      <path d="${histPath}" class="hist"/>
      <path d="${line([hv[h0], ...fv.map((f) => f.m)], h0)}" class="proj"/>
      <line x1="${X(h0)}" x2="${X(h0)}" y1="${pt - 6}" y2="${H - pb}" class="today"/>
      <text x="${X(h0)}" y="${H - 6}" class="ax mid">today</text>
      <text x="${pl}" y="${H - 6}" class="ax">${F.fmtDate(hist[0].d)}</text>
      <text x="${W - pr}" y="${H - 6}" class="ax end">${F.fmtDate(p.pts.at(-1).d)}</text>
      <circle cx="${X(n)}" cy="${Y(last.m)}" r="9" class="pulse"/><circle cx="${X(n)}" cy="${Y(last.m)}" r="4.5" class="dot"/>
      <line class="scrub" x1="0" x2="0" y1="${pt}" y2="${H - pb}" visibility="hidden"/><circle class="scrub-dot" r="4" visibility="hidden"/>
      <rect class="hit" x="0" y="0" width="${W}" height="${H}" fill="transparent"/></svg>`;
  }
  function bindScrub(box, hist, p, bal) {
    const svg = $('svg', box), tip = $('.chart-tip', box), line = $('.scrub', svg), dot = $('.scrub-dot', svg);
    const W = 340, pl = 4, pr = 44;
    const histEnd = hist.at(-1).spend;
    const pts = [...hist.map((x) => ({ d: x.d, v: bal ? x.bal : x.spend, past: true })), ...p.pts.map((x) => ({ d: x.d, v: bal ? x.bal : histEnd + x.spend, lo: bal ? x.balLo80 : histEnd + x.lo80, hi: bal ? x.balHi80 : histEnd + x.hi80 }))];
    const ys = [...svg.querySelectorAll('.grid')].map((g) => +g.getAttribute('y1'));
    const move = (e) => {
      const r = svg.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(pts.length - 1, Math.round(((x - pl) / (W - pl - pr)) * (pts.length - 1))));
      const pt = pts[i]; const px = pl + (i / (pts.length - 1)) * (W - pl - pr);
      // map value to y using the drawn grid lines (lo at ys[0], hi at ys[2])
      const loV = parseVal(svg, 0), hiV = parseVal(svg, 2);
      const py = ys[0] + ((pt.v - loV) / (hiV - loV || 1)) * (ys[2] - ys[0]);
      line.setAttribute('x1', px); line.setAttribute('x2', px); line.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', px); dot.setAttribute('cy', py); dot.setAttribute('visibility', 'visible');
      tip.hidden = false;
      tip.innerHTML = `<b>${F.fmtDate(pt.d)}</b> ${pt.past ? '' : '<i>forecast</i>'}<br>${bal ? 'balance' : 'spent so far'} <b class="num">${money(pt.v, 0)}</b>${pt.lo !== undefined ? `<br><small>${money(pt.lo, 0)}–${money(pt.hi, 0)}</small>` : ''}`;
      tip.style.left = `${Math.min(70, Math.max(0, (px / W) * 100 - 15))}%`;
    };
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerdown', move);
    svg.addEventListener('pointerleave', () => { tip.hidden = true; line.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); });
  }
  // the chart stores its scale on the grid lines; recover lo/hi from tick values we drew
  function parseVal(svg, idx) { return +svg.querySelectorAll('.grid')[idx].dataset.v; }

  // be upfront when there isn't much history to learn from
  function lowData() {
    const n = D.txns.length;
    return M.windowDays < 21 || n < 15 ? `<p class="lowdata">🌱 only ${M.windowDays} days / ${n} purchases so far. treat this as a vibe check. it gets sharper with 30+ days.</p>` : '';
  }

  // ---------- 🚨 runway ----------
  function wRunway(box) {
    const r = D.run, liquid = D.liquid;
    const nAcc = S.accounts.filter((a) => a.inRunway).length;
    const paySrc = M.schedules.map((s) => `${esc(s.source)} (${money(s.amount, 0)}, ${s.freq})`).join(', ');
    const fix = (() => {
      if (r.net >= 0) return '';
      const h = M.habits.find((x) => x.n >= 2 && x.perDay * 30.44 >= 2 && x.category !== 'Transport');
      if (!h) return '';
      const n = Math.ceil(-r.net / h.avg);
      return `<p class="rw-fix">🩹 the fix: skip ~${n} ${esc(h.merchant)} run${n > 1 ? 's' : ''} a month (${money(h.avg)} each) and you break even.</p>`;
    })();
    let card;
    if (r.hit) {
      const mo = r.months < 1 ? `${Math.max(1, Math.round(r.months * 30.44))} days` : `${Math.round(r.months)} month${Math.round(r.months) === 1 ? '' : 's'}`;
      card = `<div class="rw alarm"><div class="rw-k">🚨 alarm</div>
        <h3>if you keep spending like this, you’ll drain all your money in <u>${mo}</u>.</h3>
        <p>that’s around <b>${F.fmtMonth(r.hit)}</b>. you have ${money(liquid, 0)} across ${nAcc} account${nAcc === 1 ? '' : 's'}.</p>
        <div class="rw-meter"><i style="width:${Math.max(4, Math.min(100, (r.months / 24) * 100))}%"></i><span>today</span><span>$0 💀</span></div></div>`;
    } else if (r.net < 0) {
      card = `<div class="rw warn"><div class="rw-k">⚠️ slow leak</div><h3>you’re fine for 3+ years, but you’re losing ${money(-r.net, 0)} every month.</h3><p>leaks are easier to fix while they’re small.</p></div>`;
    } else {
      card = `<div class="rw good"><div class="rw-k">📈 stacking</div><h3>you’re stacking ${signed(r.net)} a month 💅</h3><p>keep it up and you’d have <b>${money(liquid + r.net * 12, 0)}</b> by ${F.fmtMonth(F.addDays(M.anchor, 365))}.</p></div>`;
    }
    const noPay = !M.schedules.length ? `<button class="rw-nopay" data-fx="editPay">⚠️ we didn’t find a paycheck in your data, so this assumes nothing’s coming in. <b>add your paycheck →</b></button>` : '';
    box.innerHTML = `${card}${noPay}${lowData()}
      <details class="rw-q"><summary>“but i get paid from my job?” 🤔</summary>
        <p>already counted. we track money in vs money out:</p>
        <div class="rw-io"><div><small>money in / mo</small><b class="num pos">+${money(r.monthlyIn, 0)}</b></div><div><small>money out / mo</small><b class="num neg">−${money(r.monthlyOut, 0)}</b></div><div><small>net / mo</small><b class="num ${r.net >= 0 ? 'pos' : 'neg'}">${signed(r.net)}</b></div></div>
        <p class="muted">${paySrc ? `paychecks we found: ${paySrc}.` : 'no regular paycheck found yet. add one in balances so this gets accurate.'} every payday the forecast re-checks earned vs spent.</p></details>
      ${fix}
      <button class="yolo" data-fx="yolo">“i don’t care, you only live once. i’ll spend how i want” 🤷</button>
      <div class="yolo-a" hidden>${r.net < 0
        ? `<b>valid. truly.</b> it’s your money. we’re not here to stop you, just to show you the receipt first. YOLO is a vibe, but ${r.hit ? `${F.fmtMonth(r.hit)} you` : 'future you'} still has to pay rent. even “spend whatever” works better when you pick <i>what</i> it’s for 🫶`
        : `<b>honestly? go for it.</b> you’re net positive, so you’ve got ~${money(r.net, 0)}/mo of guilt-free fun money. YOLO responsibly 🫶`}</div>`;
  }

  // ---------- 🔁 ripple: one decision → many ----------
  function wRipple(box) {
    const hs = M.habits.filter((h) => h.n >= 2 && h.perDay * 30.44 >= 2 && h.category !== 'Transport').map((h) => ({ ...h, perMonth: h.perDay * 30.44, yearly: h.perDay * 365 * h.avg }))
      .sort((a, b) => b.yearly - a.yearly).slice(0, 4);
    const taps = Math.round(hs.reduce((s, h) => s + h.perMonth * 12, 0));
    box.innerHTML = `<div class="fw-h"><h3>🔁 1 decision → ${taps || 'many'}</h3></div>
      <p class="fw-sub">money is easy to spend because it’s one small yes at a time. here’s what each of those yeses turns into over a year.</p>
      ${hs.map((h, i) => `<button class="rp" data-fx="ripple" data-i="${i}">
        <div class="rp-top"><span class="em">${R.CATEGORIES[h.category]?.emoji || '🧾'}</span><span class="grow"><b>one ${esc(h.merchant)}</b><small>${money(h.avg)} · feels like nothing</small></span>
          <span class="rp-x">× ${Math.round(h.perMonth * 12)}/yr</span><b class="rp-y num">${money(h.yearly, 0)}</b></div>
        <div class="dots">${Array.from({ length: Math.min(36, Math.round(h.perMonth * 12 / 4)) }, (_, k) => `<i style="animation-delay:${k * 18}ms"></i>`).join('')}</div>
        <div class="rp-what" hidden>✂️ do it half as often → keep <b>${money(h.yearly / 2, 0)}</b> a year. that’s ${ideas(h.yearly / 2)}.</div></button>`).join('') || '<p class="muted">no repeat habits yet. impressive tbh.</p>'}
      ${hs.length ? '<small class="muted">each dot ≈ 4 purchases. tap one to see the “what if”.</small>' : ''}`;
  }
  function ideas(v) {
    if (v >= 1500) return 'a flight somewhere warm ✈️';
    if (v >= 800) return 'a new phone 📱';
    if (v >= 400) return 'concert tickets with the floor seats 🎤';
    if (v >= 150) return 'a really good pair of shoes 👟';
    return 'a lot of guilt-free boba 🧋';
  }

  // ---------- 🧠 habits ----------
  function wHabits(box) {
    const meals = F.meals(D.txns);
    const lens = S.lens === 'meals' && meals ? 'meals' : 'categories';
    const rows = lens === 'meals' ? meals.map((m) => ({ key: m.meal, emoji: m.emoji, name: m.meal, ...m }))
      : F.habits(D.txns).map((c) => ({ key: c.cat, emoji: R.CATEGORIES[c.cat]?.emoji || '🧾', name: c.cat.toLowerCase(), color: R.CATEGORIES[c.cat]?.color, ...c }));
    const max = Math.max(1, ...rows.map((r) => r.perMonth));
    const focus = S.focusCat && lens === 'categories' ? S.focusCat : null;
    box.innerHTML = `<div class="fw-h"><h3>🧠 money habits</h3>${meals ? `<div class="seg sm">
        <button class="${lens === 'categories' ? 'on' : ''}" data-fx="lens" data-v="categories">categories</button>
        <button class="${lens === 'meals' ? 'on' : ''}" data-fx="lens" data-v="meals">meals</button></div>` : ''}</div>
      <p class="fw-sub">your monthly averages. tap any row for the full breakdown.</p>
      ${rows.map((r) => `<details class="hb" ${r.key === focus ? 'open' : ''}><summary>
          <span class="em">${r.emoji}</span><span class="grow"><b>~${money(r.perMonth, 0)}/mo on ${esc(r.name)}</b>
          <span class="hb-bar"><i style="width:${(r.perMonth / max) * 100}%;background:${r.color || 'var(--accent)'}"></i></span></span>
          ${r.trend !== null && Math.abs(r.trend) >= 0.1 ? `<span class="delta ${r.trend > 0 ? 'up' : 'down'}">${r.trend > 0 ? '▲' : '▼'}${Math.abs(Math.round(r.trend * 100))}%</span>` : ''}</summary>
        <div class="hb-body">
          <div class="hb-stats"><span><b>${r.visitsPerMonth.toFixed(r.visitsPerMonth < 10 ? 1 : 0)}×</b>/mo</span><span><b>${money(r.avgTicket)}</b> avg</span><span><b>${Math.round(r.weekendShare * 100)}%</b> on weekends</span></div>
          ${r.merchants.map((m) => `<div class="hb-m"><span class="grow">${esc(m.merchant || m.name)}</span><small>${m.visitsPerMonth.toFixed(1)}×/mo</small><b class="num">${money(m.perMonth, 0)}/mo</b></div>`).join('')}
          ${r.time ? `<div class="hb-time">${Object.entries(r.time).map(([k, v]) => `<div><i style="height:${Math.max(4, (v / Math.max(1, ...Object.values(r.time))) * 34)}px"></i><small>${k === 'late night' ? '🌙' : k === 'morning' ? '🌅' : k === 'afternoon' ? '☀️' : '🌆'}</small></div>`).join('')}</div>` : ''}
        </div></details>`).join('') || '<p class="muted">no spending yet</p>'}`;
  }

  // ---------- 🚩 red flags ----------
  function wFlags(box) {
    const flags = F.redFlags(D.txns, M, D.run).slice(0, 6);
    box.innerHTML = `<div class="fw-h"><h3>🚩 ${flags.length} red flag${flags.length === 1 ? '' : 's'}</h3><small class="muted">decision literacy</small></div>
      ${flags.map((f) => `<div class="flag sev${f.sev}"><span class="em">${f.emoji}</span><div class="grow"><b>${esc(f.title)}</b><p>${esc(f.body)}</p>
        ${f.yearly > 0 ? `<small>repeats ~${f.repeats}×/yr → <b>${money(f.yearly, 0)}/yr</b></small>` : ''}</div></div>`).join('') || '<p class="good-note">no red flags. green flags only 💚</p>'}`;
  }

  // ---------- ⚖️ net = earned − spent ----------
  function wNet(box) {
    const per = S.netPeriod;
    const bs = F.net(D.txns, D.income, M, per);
    const actual = bs.filter((b) => !b.projected);
    const avg = actual.length ? actual.reduce((s, b) => s + b.net, 0) / actual.length : 0;
    const W = 340, H = 150, pt = 10, pb = 24;
    const mx = Math.max(1, ...bs.map((b) => Math.abs(b.net)));
    const bw = (W - 8) / bs.length;
    const mid = pt + (H - pt - pb) / 2;
    const sc = (H - pt - pb) / 2 / mx;
    const every = Math.ceil(bs.length / 7);
    box.innerHTML = `<div class="fw-h"><h3>⚖️ net = earned − spent</h3></div>
      <div class="seg full">${['daily', 'weekly', 'monthly', 'yearly'].map((p) => `<button class="${per === p ? 'on' : ''}" data-fx="netPer" data-v="${p}">${p}</button>`).join('')}</div>
      <div class="net-sum"><div><small>avg ${per.replace('ly', '').replace('dai', 'day')}</small><b class="num ${avg >= 0 ? 'pos' : 'neg'}">${signed(avg)}</b></div>
        <div><small>${actual.at(-1)?.label || ''}</small><b class="num ${actual.at(-1)?.net >= 0 ? 'pos' : 'neg'}">${actual.length ? signed(actual.at(-1).net) : '—'}</b></div>
        <div><small>next (forecast)</small><b class="num ${bs.find((b) => b.projected)?.net >= 0 ? 'pos' : 'neg'}">${bs.find((b) => b.projected) ? signed(bs.find((b) => b.projected).net) : '—'}</b></div></div>
      <svg viewBox="0 0 ${W} ${H}" class="net-chart"><defs><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2.5" height="5" fill="#fff" opacity=".35"/></pattern></defs>
        <line x1="0" x2="${W}" y1="${mid}" y2="${mid}" class="grid"/>
        ${bs.map((b, i) => { const h = Math.max(1.5, Math.abs(b.net) * sc); const y = b.net >= 0 ? mid - h : mid; const x = 4 + i * bw + bw * 0.14;
          return `<g class="nb" data-fx="netBar" data-i="${i}"><rect x="${x}" y="${y}" width="${bw * 0.72}" height="${h}" rx="${Math.min(5, bw * 0.2)}" class="${b.net >= 0 ? 'pos' : 'neg'} ${b.projected ? 'proj' : ''}"/>
            ${b.projected ? `<rect x="${x}" y="${y}" width="${bw * 0.72}" height="${h}" rx="${Math.min(5, bw * 0.2)}" fill="url(#hatch)"/>` : ''}
            ${i % every === 0 || i === bs.length - 1 ? `<text x="${x + bw * 0.36}" y="${H - 8}" class="ax mid">${esc(b.label)}</text>` : ''}
            <rect x="${4 + i * bw}" y="0" width="${bw}" height="${H}" fill="transparent"/></g>`; }).join('')}
      </svg>
      <div class="net-detail" id="netDetail"><small class="muted">striped bars = forecast. tap a bar for details.</small></div>`;
    box._bs = bs;
  }

  // ---------- 🧾 daily receipts ----------
  const VIBES = { Coffee: 'caffeinated capitalist ☕', Food: 'snack strategist 🌯', Delivery: 'doordash dependent 🛵', Shopping: 'add-to-cart assassin 🛍️', Beauty: 'glow-up investor 💄', Transport: 'main character commute 🚕', Groceries: 'suspiciously responsible 🥦', Entertainment: 'main character energy 🎟️', Subscriptions: 'autopay andy 🔁', Other: 'enigma 🧾' };
  const FOOTERS = ['no refunds on bad decisions 💅', 'thank u, next (paycheck)', 'keep this receipt. your bank did.', 'this receipt is a safe space', 'you ate. so did your wallet.', 'tomorrow is a new budget 🌅', 'certified receipt moment 🧾'];
  const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  function receiptLines(day, name) {
    const d = day.d;
    const no = String(Math.round((d - new Date(d.getFullYear(), 0, 0)) / F.DAY)).padStart(4, '0');
    const L = [];
    const timeOf = (t) => (t.noTime ? '' : new Date(t.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    L.push({ t: 'logo', v: 'mochii club' });
    L.push({ t: 'c', v: `DAILY RECEIPT · NO. ${no}` });
    L.push({ t: 'c', v: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() });
    L.push({ t: 'rule' });
    L.push({ t: 'row', a: 'CUSTOMER', b: String(name || 'YOU').toUpperCase() });
    L.push({ t: 'dash' });
    if (!day.items.length) L.push({ t: 'c', v: '🏆 NO-SPEND DAY 🏆' }, { t: 'c', v: 'literally $0. iconic.', s: 1 });
    for (const t of day.items) {
      L.push({ t: 'row', a: `${R.CATEGORIES[t.category]?.emoji || '🧾'} ${t.merchant.toUpperCase()}`, b: money(t.amount) });
      L.push({ t: 'sub', v: [timeOf(t), t.category.toUpperCase()].filter(Boolean).join(' · ') });
    }
    L.push({ t: 'dash' });
    L.push({ t: 'row', a: 'ITEMS', b: String(day.items.length) });
    L.push({ t: 'big', a: 'TOTAL SPENT', b: money(day.total) });
    if (day.inflow.length) {
      for (const i of day.inflow) L.push({ t: 'row', a: `+ ${i.source.toUpperCase()}`, b: money(i.amount) });
      L.push({ t: 'row', a: 'NET TODAY', b: signed(day.earned - day.total, 2) });
    }
    L.push({ t: 'dash' });
    if (day.topCat) L.push({ t: 'c', v: `DAY VIBE: ${VIBES[day.topCat].toUpperCase()}` });
    if (day.items.length && D.daysInfo.avg) L.push({ t: 'c', v: `${Math.abs(Math.round(day.vsAvg * 100))}% ${day.vsAvg >= 0 ? 'MORE' : 'LESS'} THAN YOUR AVG DAY` });
    if (day.rank && day.rank <= 10) L.push({ t: 'c', v: `#${day.rank} MOST EXPENSIVE DAY ${day.rank <= 3 ? '🔥' : ''}` });
    L.push({ t: 'bar', v: day.key });
    L.push({ t: 'c', v: FOOTERS[hash(day.key) % FOOTERS.length], s: 1 });
    return L;
  }
  function receiptHTML(day, name, cls = '') {
    return `<div class="rcpt ${cls}">${receiptLines(day, name).map((l) => {
      if (l.t === 'logo') return `<div class="r-logo">${esc(l.v)}</div>`;
      if (l.t === 'c') return `<div class="r-c ${l.s ? 'sm' : ''}">${esc(l.v)}</div>`;
      if (l.t === 'rule') return '<div class="r-rule"></div>';
      if (l.t === 'dash') return '<div class="r-dash"></div>';
      if (l.t === 'sub') return `<div class="r-sub">${esc(l.v)}</div>`;
      if (l.t === 'bar') return `<div class="r-bar">${barcode(l.v).map((w) => `<i style="width:${w}px"></i>`).join('')}</div>`;
      return `<div class="r-row ${l.t === 'big' ? 'big' : ''}"><span>${esc(l.a)}</span><span>${esc(l.b)}</span></div>`;
    }).join('')}</div>`;
  }
  const barcode = (seed) => { let h = hash(seed); return Array.from({ length: 34 }, () => { h = (h * 1103515245 + 12345) >>> 0; return 1 + (h % 4); }); };

  function wReceipts(box) {
    D.daysInfo = D.daysInfo || F.days(D.txns, D.income);
    const latest = D.daysInfo.days[0];
    if (!latest) { box.innerHTML = '<div class="fw-h"><h3>🧾 daily receipts</h3></div><p class="muted">no days yet</p>'; return; }
    box.innerHTML = `<div class="fw-h"><h3>🧾 daily receipts</h3><small class="muted">${D.daysInfo.days.length} days printed</small></div>
      <p class="fw-sub">every day gets a receipt. print it, share it, collect them all.</p>
      <div class="rc-peek" data-fx="openDay" data-k="${latest.key}">${receiptHTML(latest, ctx.name(), 'mini')}</div>
      <div class="row" style="gap:8px;margin-top:12px"><button class="btn sm grow" data-fx="openDay" data-k="${latest.key}">🖨️ print ${F.fmtDate(latest.d).toLowerCase()}</button><button class="btn sm ghost grow" data-fx="catalog">📚 catalog</button></div>`;
  }

  function overlay(html) {
    closeOverlay();
    const el = document.createElement('div'); el.className = 'fx-overlay'; el.style.setProperty('--accent', ACCENTS[S.accent] || ACCENTS.lime);
    el.innerHTML = html; ctx.phone.appendChild(el);
    requestAnimationFrame(() => el.classList.add('on'));
    el.addEventListener('click', onClick);
    return el;
  }
  function closeOverlay() { ctx?.phone.querySelectorAll('.fx-overlay').forEach((el) => { el.classList.remove('on'); setTimeout(() => el.remove(), 280); }); }

  function openCatalog(month) {
    D.daysInfo = D.daysInfo || F.days(D.txns, D.income);
    const all = D.daysInfo.days;
    const months = [...new Set(all.map((d) => F.monthKey(d.d)))];
    const cur = month || months[0];
    const days = all.filter((d) => F.monthKey(d.d) === cur);
    const monthTotal = days.reduce((s, d) => s + d.total, 0);
    overlay(`<div class="ov-top"><button class="icon-btn" data-fx="closeOv" aria-label="close">←</button><b>receipt catalog 🧾</b><span></span></div>
      <div class="ov-body">
        <div class="cat-months">${months.map((m) => `<button class="${m === cur ? 'on' : ''}" data-fx="catMonth" data-v="${m}">${R.monthLabel(m).toLowerCase()}</button>`).join('')}</div>
        <p class="fw-sub">${days.length} receipts · ${money(monthTotal, 0)} total · avg day ${money(D.daysInfo.avg, 0)}</p>
        <div class="cat-grid-r">${days.map((d) => `<button class="mini-r" data-fx="openDay" data-k="${d.key}">
          <span class="mr-d">${F.fmtDate(d.d).toUpperCase()}</span><span class="mr-w">${d.d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()}</span>
          <span class="mr-e">${d.items.slice(0, 5).map((t) => R.CATEGORIES[t.category]?.emoji || '🧾').join('') || '🏆'}</span>
          <span class="mr-t num">${money(d.total)}</span>
          ${d.rank && d.rank <= 3 ? `<span class="mr-tag hot">🔥 #${d.rank}</span>` : d.earned ? '<span class="mr-tag pay">💸 payday</span>' : ''}</button>`).join('')}</div>
      </div>`);
  }

  function openDay(key) {
    D.daysInfo = D.daysInfo || F.days(D.txns, D.income);
    const days = D.daysInfo.days;
    const i = days.findIndex((d) => d.key === key); if (i < 0) return;
    const day = days[i];
    overlay(`<div class="ov-top"><button class="icon-btn" data-fx="closeOv" aria-label="close">←</button><b>${F.fmtDate(day.d).toLowerCase()} receipt</b><span></span></div>
      <div class="ov-body printer-wrap">
        <div class="printer"><div class="slot"></div><span class="led"></span></div>
        <div class="paper-clip"><div class="paper ${reduceMotion() ? '' : 'printing'}">${receiptHTML(day, ctx.name())}</div></div>
        <div class="row ov-actions">
          <button class="icon-btn" data-fx="openDay" data-k="${days[i + 1]?.key || ''}" ${days[i + 1] ? '' : 'disabled'} aria-label="previous day">‹</button>
          <button class="btn sm grow" data-fx="shareDay" data-k="${key}">share ↗</button>
          <button class="btn sm ghost" data-fx="saveDay" data-k="${key}">save ⬇</button>
          <button class="icon-btn" data-fx="openDay" data-k="${days[i - 1]?.key || ''}" ${days[i - 1] ? '' : 'disabled'} aria-label="next day">›</button>
        </div>
        <button class="link" data-fx="catalog">see all receipts</button>
      </div>`);
  }

  // PNG version of a receipt (1080 wide) for stories / group chats
  async function receiptPNG(day) {
    await document.fonts?.load?.('16px "Space Mono"').catch(() => {});
    const lines = receiptLines(day, ctx.name());
    const S2 = 2, W = 540, PW = 380, px = (W - PW) / 2, lh = { logo: 44, c: 20, sm: 18, rule: 16, dash: 16, row: 22, sub: 16, big: 30, bar: 62 };
    const ph = 40 + lines.reduce((s, l) => s + (l.t === 'c' && l.s ? lh.sm : lh[l.t] || 20), 0) + 30;
    const H = Math.max(960, ph + 200);
    const c = document.createElement('canvas'); c.width = W * S2; c.height = H * S2;
    const g = c.getContext('2d'); g.scale(S2, S2);
    const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, ACCENTS[S.accent] || '#b5e48c'); bg.addColorStop(1, '#ff8fb8');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#22182a'; g.font = '800 26px "Fredoka", system-ui'; g.textAlign = 'center';
    g.fillText('my receipt for the day 🧾', W / 2, 60);
    const top = (H - ph) / 2 + 20;
    g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 30; g.shadowOffsetY = 12;
    g.fillStyle = '#fbfaf3';
    g.beginPath(); g.moveTo(px, top);
    const zig = 10;
    for (let x = px; x < px + PW; x += zig) { g.lineTo(x + zig / 2, top - 6); g.lineTo(x + zig, top); }
    g.lineTo(px + PW, top + ph);
    for (let x = px + PW; x > px; x -= zig) { g.lineTo(x - zig / 2, top + ph + 6); g.lineTo(x - zig, top + ph); }
    g.closePath(); g.fill(); g.restore();
    let y = top + 30;
    const mono = (w, s) => `${w} ${s}px "Space Mono", ui-monospace, Menlo, monospace`;
    g.fillStyle = '#16161b';
    for (const l of lines) {
      if (l.t === 'logo') { g.font = '800 34px "Fredoka", system-ui'; g.textAlign = 'center'; g.fillText(l.v, W / 2, y + 18); y += lh.logo; continue; }
      if (l.t === 'c') { g.font = mono(400, l.s ? 11 : 12); g.textAlign = 'center'; g.fillText(l.v, W / 2, y + 12); y += l.s ? lh.sm : lh.c; continue; }
      if (l.t === 'sub') { g.font = mono(400, 10); g.textAlign = 'left'; g.fillStyle = '#6b6b78'; g.fillText(l.v, px + 34, y + 9); g.fillStyle = '#16161b'; y += lh.sub; continue; }
      if (l.t === 'rule' || l.t === 'dash') { g.strokeStyle = '#16161b'; g.lineWidth = l.t === 'rule' ? 2 : 1; g.setLineDash(l.t === 'dash' ? [4, 4] : []); g.beginPath(); g.moveTo(px + 22, y + 8); g.lineTo(px + PW - 22, y + 8); g.stroke(); g.setLineDash([]); y += lh[l.t]; continue; }
      if (l.t === 'bar') { let x = px + 60; for (const w of barcode(l.v)) { g.fillRect(x, y + 6, w * 1.6, 44); x += w * 1.6 + 3; } y += lh.bar; continue; }
      g.font = mono(l.t === 'big' ? 700 : 400, l.t === 'big' ? 16 : 12);
      g.textAlign = 'left'; g.fillText(l.a.slice(0, 30), px + 22, y + 14);
      g.textAlign = 'right'; g.fillText(l.b, px + PW - 22, y + 14);
      y += lh[l.t] || 22;
    }
    g.textAlign = 'center'; g.font = '700 16px "Fredoka", system-ui'; g.fillStyle = '#22182a';
    g.fillText('mochii club · your soft little money buddy', W / 2, H - 34);
    return new Promise((ok) => c.toBlob(ok, 'image/png'));
  }
  async function shareDay(key, saveOnly) {
    const day = D.daysInfo.days.find((d) => d.key === key); if (!day) return;
    const blob = await receiptPNG(day);
    const file = new File([blob], `receipt-${key}.png`, { type: 'image/png' });
    if (!saveOnly && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'my receipt for the day', text: `my ${F.fmtDate(day.d)} receipt: ${money(day.total)} 🧾` }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
    ctx.toast('receipt saved ⬇');
  }

  // ---------- 🏦 accounts + paychecks ----------
  function wAccounts(box) {
    const det = M.detected;
    const pay = S.paycheck ? `${esc(S.paycheck.source || 'Paycheck')} · ${money(+S.paycheck.amount, 0)} · ${{ weekly: 'weekly', biweekly: 'every 2 weeks', semimonthly: 'twice a month', monthly: 'monthly' }[S.paycheck.freq]} <span class="tag">manual</span>`
      : det.length ? det.map((s) => `${esc(s.source)} · ${money(s.amount, 0)} · ${s.freq}`).join('<br>') + ' <span class="tag">auto-detected</span>' : 'no paycheck found yet';
    box.innerHTML = `<div class="fw-h"><h3>🏦 balances</h3><button class="link" data-fx="addAcct">＋ connect</button></div>
      <div class="acct-total"><small>counts toward runway</small><b class="num">${money(D.liquid)}</b></div>
      ${S.accounts.map((a) => { const t = ACCOUNT_TYPES[a.type] || ACCOUNT_TYPES.checking; return `<button class="acct" data-fx="editAcct" data-id="${a.id}">
        <span class="em">${t.emoji}</span><span class="grow"><b>${esc(a.name)}</b><small>${t.label}${a.synced ? ` · ${a.synced === 'demo' ? 'demo sync' : 'synced'}` : ' · manual'}${a.inRunway ? '' : ' · not in runway'}</small></span>
        <b class="num ${t.debt ? 'neg' : ''}">${t.debt ? '−' : ''}${money(a.balance)}</b></button>`; }).join('')}
      <div class="pay-line"><span class="em">💸</span><span class="grow"><small>paychecks</small><div>${pay}</div></span><button class="link" data-fx="editPay">edit</button></div>`;
  }
  function acctSheet(id) {
    const a = S.accounts.find((x) => x.id === id);
    const pickType = (sh) => sh.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => acctForm(b.dataset.t)));
    if (!a) {
      ctx.sheet(`<h3>connect an account</h3><p class="sub">pick what to track. balances power the runway alarm + balance forecast.</p>
        <div class="acct-types">${Object.entries(ACCOUNT_TYPES).map(([k, t]) => `<button data-t="${k}"><span>${t.emoji}</span><b>${t.label}</b>${t.hurdle ? '<small>🚧 manual for now</small>' : ''}</button>`).join('')}</div>`, pickType);
      return;
    }
    acctForm(a.type, a);
  }
  function acctForm(type, a) {
    const t = ACCOUNT_TYPES[type];
    ctx.sheet(`<h3>${t.emoji} ${a ? 'edit' : 'add'} ${t.label}</h3>
      ${t.hurdle ? `<p class="hurdle">🚧 <b>hurdle:</b> live sync for stocks, crypto and retirement needs a brokerage data partner (e.g. Plaid Investments). it’s on the roadmap. for now, type the balance in and we’ll keep it out of your runway.</p>` : `<button class="btn block ghost" id="acSync">🔗 sync with your bank (demo)</button><p class="sub" style="margin-top:8px">demo only: a real build would use Plaid Link. you can also just type it in 👇</p>`}
      <div class="field"><label>name</label><input class="input" id="acName" maxlength="28" value="${esc(a?.name || t.label.replace(/\s*\(.*\)/, '').replace(/^\w/, (c) => c.toUpperCase()))}"></div>
      <div class="field"><label>${t.debt ? 'amount owed' : 'balance'} ($)</label><input class="input" id="acBal" type="number" step="0.01" min="0" value="${a ? a.balance : ''}" placeholder="0.00"></div>
      <label class="check"><input type="checkbox" id="acRun" ${(a ? a.inRunway : !t.hurdle) ? 'checked' : ''}> count it in my runway (money i can actually spend)</label>
      <button class="btn block" id="acSave" style="margin-top:14px">${a ? 'save' : 'add account'}</button>
      ${a ? '<button class="btn block ghost" id="acDel" style="margin-top:8px;color:var(--red)">remove</button>' : ''}`, (sh) => {
      const sync = $('#acSync', sh);
      if (sync) sync.onclick = () => {
        sync.innerHTML = '<span class="spinner"></span> connecting to your bank…'; sync.disabled = true;
        setTimeout(() => { if (!sh.isConnected) return; $('#acBal', sh).value = (type === 'savings' ? 1000 + Math.random() * 3000 : type === 'credit' ? 120 + Math.random() * 600 : 300 + Math.random() * 1800).toFixed(2); sync.innerHTML = '✓ synced (demo)'; sh.dataset.synced = 'demo'; }, 1300);
      };
      $('#acSave', sh).onclick = () => {
        const bal = Number($('#acBal', sh).value);
        if (!Number.isFinite(bal) || bal < 0) return ctx.toast('enter a balance (0 or more)');
        const rec = { id: a?.id || 'a' + Date.now().toString(36), type, name: $('#acName', sh).value.trim() || t.label, balance: +bal.toFixed(2), inRunway: $('#acRun', sh).checked, synced: sh.dataset.synced || (a?.synced && +a.balance === +bal ? a.synced : null) };
        S.accounts = a ? S.accounts.map((x) => (x.id === a.id ? rec : x)) : [...S.accounts, rec];
        save(); ctx.closeSheet(); rerender(); ctx.toast(a ? 'saved ✓' : `${t.emoji} account added`);
      };
      const del = $('#acDel', sh);
      if (del) del.onclick = () => { S.accounts = S.accounts.filter((x) => x.id !== a.id); save(); ctx.closeSheet(); rerender(); };
    });
  }
  function paySheet() {
    const p = S.paycheck || {};
    const det = M.detected[0];
    const nextDefault = F.dayKey(F.addDays(M.anchor, 7));
    ctx.sheet(`<h3>💸 your paycheck</h3><p class="sub">${det ? `we auto-detected <b>${esc(det.source)}</b> (${money(det.amount, 0)}, ${det.freq}). override it if it’s off.` : 'we couldn’t find a regular paycheck in your data. add it so the forecast knows what’s coming in.'}</p>
      <div class="field"><label>from</label><input class="input" id="pSrc" maxlength="24" value="${esc(p.source || det?.source || 'My job')}"></div>
      <div class="field"><label>take-home per paycheck ($)</label><input class="input" id="pAmt" type="number" min="0" step="0.01" value="${p.amount || det?.amount || ''}"></div>
      <div class="field"><label>how often</label><select class="input" id="pFreq">${[['weekly', 'every week'], ['biweekly', 'every 2 weeks'], ['semimonthly', 'twice a month'], ['monthly', 'once a month']].map(([v, l]) => `<option value="${v}" ${(p.freq || (det?.freq === 'twice a month' ? 'semimonthly' : det?.freq === 'every 2 weeks' ? 'biweekly' : det?.freq === 'weekly' ? 'weekly' : 'monthly')) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label>next payday</label><input class="input" id="pNext" type="date" value="${p.next || nextDefault}"></div>
      <button class="btn block" id="pSave">save paycheck</button>
      ${S.paycheck ? '<button class="btn block ghost" id="pAuto" style="margin-top:8px">go back to auto-detect</button>' : ''}`, (sh) => {
      $('#pSave', sh).onclick = () => {
        const amount = Number($('#pAmt', sh).value);
        if (!Number.isFinite(amount) || amount <= 0) return ctx.toast('enter your take-home pay');
        S.paycheck = { source: $('#pSrc', sh).value.trim() || 'Paycheck', amount, freq: $('#pFreq', sh).value, next: $('#pNext', sh).value || nextDefault };
        save(); ctx.closeSheet(); rerender(); ctx.toast('paycheck saved 💸');
      };
      const auto = $('#pAuto', sh); if (auto) auto.onclick = () => { S.paycheck = null; save(); ctx.closeSheet(); rerender(); };
    });
  }

  // ---------- events ----------
  function moveWidget(id, dir) {
    const vis = S.order.filter((x) => !S.hidden.includes(x));
    const i = vis.indexOf(id), j = i + dir;
    if (j < 0 || j >= vis.length) return;
    [vis[i], vis[j]] = [vis[j], vis[i]];
    S.order = [...vis, ...S.order.filter((x) => S.hidden.includes(x))];
    save(); rerender();
  }
  function onClick(e) {
    const b = e.target.closest('[data-fx]'); if (!b) return;
    const act = b.dataset.fx, v = b.dataset.v;
    if (act === 'edit') { S.edit = !S.edit; rerender(); }
    else if (act === 'up') moveWidget(b.dataset.id, -1);
    else if (act === 'down') moveWidget(b.dataset.id, 1);
    else if (act === 'hide') { S.hidden = [...S.hidden, b.dataset.id]; save(); rerender(); }
    else if (act === 'show') { S.hidden = S.hidden.filter((x) => x !== b.dataset.id); save(); rerender(); }
    else if (act === 'accent') { S.accent = v; save(); rerender(); }
    else if (act === 'resetLayout') { Object.assign(S, { order: [...DEFAULT_ORDER], hidden: [], accent: 'lime', focusCat: null }); save(); rerender(); }
    else if (act === 'goal') setGoal($('#goalIn', root)?.value);
    else if (act === 'goalChip') { const inp = $('#goalIn', root); if (inp) inp.value = v; setGoal(v); }
    else if (act === 'clearGoal') { S.goal = null; S.plan = null; save(); rerender(); }
    else if (act === 'undoLayout') { Object.assign(S, S.prevLayout, { prevLayout: null, plan: null }); save(); rerender(); ctx.toast('layout restored ↩'); }
    else if (act === 'mode') { S.mode = v; save(); mountWidget('forecast'); }
    else if (act === 'hz') { S.hz = +v; save(); mountWidget('forecast'); }
    else if (act === 'yolo') { const a = b.nextElementSibling; a.hidden = !a.hidden; }
    else if (act === 'ripple') { const w = $('.rp-what', b); w.hidden = !w.hidden; }
    else if (act === 'lens') { S.lens = v; save(); mountWidget('habits'); }
    else if (act === 'netPer') { S.netPeriod = v; save(); mountWidget('net'); }
    else if (act === 'netBar') {
      const bs = b.closest('.fw-body')._bs; const x = bs?.[+b.dataset.i]; if (!x) return;
      $('#netDetail', root).innerHTML = `<b>${esc(x.label)}${x.projected ? ' (forecast)' : ''}</b> · earned <span class="pos">${money(x.earned, 0)}</span> · spent <span class="neg">${money(x.spent, 0)}</span> · net <b class="${x.net >= 0 ? 'pos' : 'neg'}">${signed(x.net)}</b>`;
    }
    else if (act === 'openDay') { if (b.dataset.k) openDay(b.dataset.k); }
    else if (act === 'catalog') openCatalog();
    else if (act === 'catMonth') openCatalog(v);
    else if (act === 'closeOv') closeOverlay();
    else if (act === 'shareDay') shareDay(b.dataset.k, false);
    else if (act === 'saveDay') shareDay(b.dataset.k, true);
    else if (act === 'addAcct') acctSheet(null);
    else if (act === 'editAcct') acctSheet(b.dataset.id);
    else if (act === 'editPay') paySheet();
  }
  function onInput(e) {
    if (e.target.id === 'hzIn') {
      S.hz = +e.target.value; e.target.style.setProperty('--p', `${(S.hz / (F.HORIZONS.length - 1)) * 100}%`);
      root.querySelectorAll('.hz-ticks button').forEach((t, i) => t.classList.toggle('on', i === S.hz));
      forecastDyn(); save();
    }
  }
  function onKey(e) { if (e.target.id === 'goalIn' && e.key === 'Enter') setGoal(e.target.value); }

  // small teaser for Home
  function homeCard(c) {
    try {
      const d = compute(c);
      const r = d.run;
      const txt = r.hit ? `at this pace you hit $0 in ${Math.max(1, Math.round(r.months))} months 💀` : r.net >= 0 ? `you’re stacking ${signed(r.net)}/mo 📈` : `you’re leaking ${money(-r.net, 0)}/mo`;
      return `<a class="fx-home ${r.hit ? 'alarm' : ''}" href="#/future"><span class="em">🔮</span><span class="grow"><b>${txt}</b><small>forecast, red flags & daily receipts · tap to see your future</small></span><span class="arrow">→</span></a>`;
    } catch { return ''; }
  }

  R.future = { render, homeCard, receiptLines, _state: () => S };
})(typeof window !== 'undefined' ? window : globalThis);
