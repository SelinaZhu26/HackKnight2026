/* mochii club — forecast engine
 * Lightweight, explainable spending + balance prediction. No ML library, just statistics you can defend:
 *  - subscriptions / repeat bills are scheduled on the day they normally hit
 *  - everyday spending is modeled per day-of-week (recency-weighted mean + variance, shrunk toward the overall mean)
 *  - paychecks are detected from deposits (twice a month, every 2 weeks, monthly…) and scheduled forward
 *  - the cone = 50% / 80% intervals: day-to-day noise adds up like a random walk (√n) plus uncertainty in the
 *    mean itself, which grows linearly, so long horizons get honestly wide
 * Also: habit breakdowns, meal lens, red flags, net (earned − spent) buckets, runway and goal parsing.
 * Pure functions only, so it runs in Node for tests.
 */
(function (global) {
  const R = (global.R = global.R || {});
  const DAY = 86400000;
  const Z80 = 1.2816, Z50 = 0.6745;
  const HALF_LIFE = 30;    // days: recent spending matters more
  const SHRINK = 4;        // pseudo-observations pulling each weekday toward the overall mean

  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const sum = (a, f = (x) => x) => a.reduce((s, x) => s + f(x), 0);
  const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtDate = (d) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  const fmtMonth = (d) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

  const F = (R.forecast = { dayKey, monthKey, addDays, startOfDay, fmtDate, fmtMonth, DAY });

  F.HORIZONS = [
    { id: '1D', label: 'tomorrow', days: 1 },
    { id: '2D', label: 'next 2 days', days: 2 },
    { id: '1W', label: 'next week', days: 7, flagship: true },
    { id: '2W', label: 'next 2 weeks', days: 14 },
    { id: '1M', label: 'next month', days: 30, flagship: true },
    { id: '3M', label: 'next 3 months', days: 91, flagship: true },
    { id: '6M', label: 'next 6 months', days: 182, flagship: true },
    { id: '1Y', label: 'next year', days: 365, flagship: true },
  ];

  // Demo paychecks for the seeded demo person: a campus job paying twice a month, plus the odd Venmo.
  F.demoIncome = function () {
    const out = [];
    for (const mo of R.MONTHS || []) {
      for (const d of [1, 15]) out.push({ date: new Date(mo.y, mo.m, d, 9).toISOString(), source: 'Campus Dining', amount: 640 });
    }
    const last = (R.MONTHS || [])[R.MONTHS.length - 1];
    if (last) out.push({ date: new Date(last.y, last.m, 20, 18, 4).toISOString(), source: 'Venmo Cashout', amount: 42 });
    return out.sort((a, b) => a.date.localeCompare(b.date));
  };

  // ---------- paycheck detection ----------
  function detectIncome(income) {
    const bySource = new Map();
    for (const t of income) {
      if (!bySource.has(t.source)) bySource.set(t.source, []);
      bySource.get(t.source).push({ d: startOfDay(new Date(t.date)), amt: t.amount });
    }
    const schedules = [], irregular = [];
    for (const [source, list] of bySource) {
      list.sort((a, b) => a.d - b.d);
      if (list.length < 2) { irregular.push(...list); continue; }
      const gaps = list.slice(1).map((x, i) => Math.round((x.d - list[i].d) / DAY));
      const gap = median(gaps);
      const amount = +median(list.slice(-3).map((x) => x.amt)).toFixed(2);
      const doms = [...new Set(list.map((x) => x.d.getDate()))];
      const last = list[list.length - 1].d;
      if (gap >= 12 && gap <= 18 && doms.length <= 3) schedules.push({ source, amount, kind: 'dom', doms: doms.slice(0, 2).sort((a, b) => a - b), freq: 'twice a month', last });
      else if (gap >= 26 && gap <= 35) schedules.push({ source, amount, kind: 'dom', doms: [list[list.length - 1].d.getDate()], freq: 'monthly', last });
      else if (gap >= 6 && gap <= 8) schedules.push({ source, amount, kind: 'interval', interval: 7, freq: 'weekly', last });
      else if (gap >= 13 && gap <= 15) schedules.push({ source, amount, kind: 'interval', interval: 14, freq: 'every 2 weeks', last });
      else irregular.push(...list);
    }
    return { schedules, irregular };
  }

  // Manual override from the accounts sheet: { amount, freq: weekly|biweekly|semimonthly|monthly, next: 'YYYY-MM-DD' }
  function scheduleFromPaycheck(p) {
    const [y, m, d] = String(p.next || '').split('-').map(Number);
    const next = y ? new Date(y, m - 1, d) : new Date();
    const base = { source: p.source || 'Paycheck', amount: +p.amount || 0, manual: true };
    if (p.freq === 'weekly') return { ...base, kind: 'interval', interval: 7, freq: 'weekly', last: addDays(next, -7) };
    if (p.freq === 'biweekly') return { ...base, kind: 'interval', interval: 14, freq: 'every 2 weeks', last: addDays(next, -14) };
    if (p.freq === 'monthly') return { ...base, kind: 'dom', doms: [next.getDate()], freq: 'monthly', last: addDays(next, -30) };
    const a = next.getDate(), b = a > 15 ? a - 15 : a + 15;
    return { ...base, kind: 'dom', doms: [Math.min(a, b), Math.max(a, b)], freq: 'twice a month', last: addDays(next, -15) };
  }

  function paysOn(s, day) {
    if (day <= s.last) return false;
    if (s.kind === 'interval') return Math.round((day - s.last) / DAY) % s.interval === 0;
    const dim = daysInMonth(day.getFullYear(), day.getMonth());
    return s.doms.some((dom) => Math.min(dom, dim) === day.getDate());
  }

  // ---------- model ----------
  F.build = function (txns, income = [], opts = {}) {
    const spend = txns.filter((t) => t.amount > 0);
    const lastSpend = spend.length ? Math.max(...spend.map((t) => +new Date(t.date))) : Date.now();
    const lastIn = income.length ? Math.max(...income.map((t) => +new Date(t.date))) : 0;
    // "today" = the day after your latest transaction, so the forecast starts where your data ends
    const anchor = addDays(startOfDay(new Date(Math.max(lastSpend, lastIn))), 1);
    const first = spend.length ? startOfDay(new Date(Math.min(...spend.map((t) => +new Date(t.date))))) : addDays(anchor, -30);
    const windowDays = Math.max(7, Math.min(90, Math.round((anchor - first) / DAY)));
    const wStart = addDays(anchor, -windowDays);

    // recurring bills still active in the last ~45 days
    const recurring = [];
    const recGroups = new Map();
    for (const t of spend.filter((x) => x.recurring)) {
      if (!recGroups.has(t.merchant)) recGroups.set(t.merchant, []);
      recGroups.get(t.merchant).push(t);
    }
    for (const [merchant, list] of recGroups) {
      list.sort((a, b) => a.date.localeCompare(b.date));
      const last = list[list.length - 1];
      const ld = new Date(last.date);
      if ((anchor - ld) / DAY > 45) continue;
      recurring.push({ merchant, amount: last.amount, dom: ld.getDate(), category: last.category, ghost: !!last.ghost, last: startOfDay(ld) });
    }

    // discretionary daily totals inside the window
    const daily = new Map();
    const catTotals = {}, merchStats = new Map();
    for (const t of spend) {
      if (t.recurring) continue;
      const d = startOfDay(new Date(t.date));
      if (d < wStart || d >= anchor) continue;
      const k = dayKey(d);
      daily.set(k, (daily.get(k) || 0) + t.amount);
      catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
      const m = merchStats.get(t.merchant) || { merchant: t.merchant, category: t.category, n: 0, amt: 0 };
      m.n++; m.amt += t.amount; merchStats.set(t.merchant, m);
    }
    const obs = [];
    for (let i = 0; i < windowDays; i++) {
      const d = addDays(wStart, i);
      const age = Math.round((anchor - d) / DAY);
      obs.push({ dow: d.getDay(), v: daily.get(dayKey(d)) || 0, w: Math.pow(0.5, age / HALF_LIFE) });
    }
    const wsum = sum(obs, (o) => o.w);
    const mAll = sum(obs, (o) => o.w * o.v) / wsum;
    const vAll = sum(obs, (o) => o.w * (o.v - mAll) ** 2) / wsum;
    const dow = Array.from({ length: 7 }, (_, k) => {
      const os = obs.filter((o) => o.dow === k);
      const w = sum(os, (o) => o.w);
      const n = os.length;
      const mean = w ? sum(os, (o) => o.w * o.v) / w : mAll;
      const v = w ? sum(os, (o) => o.w * (o.v - mean) ** 2) / w : vAll;
      return { mean: (n * mean + SHRINK * mAll) / (n + SHRINK), var: (n * v + SHRINK * vAll) / (n + SHRINK) };
    });
    const nEff = wsum * wsum / sum(obs, (o) => o.w * o.w);
    const seMean = Math.sqrt(vAll / Math.max(1, nEff));
    const discTotal = sum(Object.values(catTotals));
    const catShare = Object.fromEntries(Object.entries(catTotals).map(([c, v]) => [c, discTotal ? v / discTotal : 0]));
    const habits = [...merchStats.values()].map((m) => ({ ...m, perDay: m.n / windowDays, avg: m.amt / m.n })).sort((a, b) => b.amt - a.amt);

    const det = detectIncome(income);
    const schedules = opts.paycheck && +opts.paycheck.amount > 0 ? [scheduleFromPaycheck(opts.paycheck)] : det.schedules;
    const irregIn = det.irregular.filter((x) => x.d >= wStart);
    const irregularDaily = sum(irregIn, (x) => x.amt) / windowDays;

    return { anchor, windowDays, wStart, dow, mAll, vAll, seMean, recurring, catShare, habits, schedules, irregularDaily, detected: det.schedules };
  };

  // Daily steps from the anchor. spend* are cumulative from 0; bal* from startBalance.
  F.project = function (model, days, { startBalance = 0 } = {}) {
    const pts = [];
    let mean = 0, varSum = 0, rec = 0, inc = 0;
    const byMerchant = new Map();
    for (let i = 0; i < days; i++) {
      const d = addDays(model.anchor, i);
      const dow = model.dow[d.getDay()];
      mean += dow.mean; varSum += dow.var;
      const dim = daysInMonth(d.getFullYear(), d.getMonth());
      for (const r of model.recurring) {
        if (d > r.last && Math.min(r.dom, dim) === d.getDate()) {
          rec += r.amount;
          byMerchant.set(r.merchant, (byMerchant.get(r.merchant) || 0) + r.amount);
        }
      }
      for (const s of model.schedules) if (paysOn(s, d)) inc += s.amount;
      inc += model.irregularDaily;
      const sd = Math.sqrt(varSum + ((i + 1) * model.seMean) ** 2);
      const spend = rec + mean;
      pts.push({
        d, i, spend,
        lo80: rec + Math.max(0, mean - Z80 * sd), hi80: spend + Z80 * sd,
        lo50: rec + Math.max(0, mean - Z50 * sd), hi50: spend + Z50 * sd,
        income: inc,
        bal: startBalance + inc - spend,
        balLo80: startBalance + inc - (spend + Z80 * sd), balHi80: startBalance + inc - (rec + Math.max(0, mean - Z80 * sd)),
        balLo50: startBalance + inc - (spend + Z50 * sd), balHi50: startBalance + inc - (rec + Math.max(0, mean - Z50 * sd)),
      });
    }
    const end = pts[pts.length - 1] || { spend: 0, lo80: 0, hi80: 0, income: 0, bal: startBalance };
    const drivers = model.habits.slice(0, 6).map((h) => ({ ...h, times: h.perDay * days, cost: h.perDay * days * h.avg }))
      .filter((h) => h.times >= 0.5).sort((a, b) => b.cost - a.cost).slice(0, 4);
    const subs = [...byMerchant.entries()].map(([merchant, amt]) => ({ merchant, amt })).sort((a, b) => b.amt - a.amt);
    return { pts, total: end.spend, lo: end.lo80, hi: end.hi80, recurringTotal: rec, everydayTotal: mean, income: end.income, endBal: end.bal, drivers, subs };
  };

  // Rebuild past daily balances backwards from today's balance.
  F.history = function (txns, income, model, days, balanceNow = 0) {
    const out = [];
    const spendBy = new Map(), inBy = new Map();
    for (const t of txns) { const k = dayKey(new Date(t.date)); spendBy.set(k, (spendBy.get(k) || 0) + t.amount); }
    for (const t of income) { const k = dayKey(new Date(t.date)); inBy.set(k, (inBy.get(k) || 0) + t.amount); }
    let bal = balanceNow, cum = 0;
    const spends = [];
    for (let i = 1; i <= days; i++) {
      const d = addDays(model.anchor, -i);
      const k = dayKey(d);
      spends.unshift({ d, s: spendBy.get(k) || 0, inc: inBy.get(k) || 0 });
    }
    // balance at the END of each day
    const bals = [];
    for (let i = spends.length - 1; i >= 0; i--) { bals[i] = bal; bal = bal - spends[i].inc + spends[i].s; }
    const start = { d: addDays(model.anchor, -days - 1), spend: 0, bal };
    out.push(start);
    for (let i = 0; i < spends.length; i++) { cum += spends[i].s; out.push({ d: spends[i].d, spend: cum, bal: bals[i] }); }
    return out;
  };

  // ---------- runway: when does the expected balance hit $0? ----------
  F.runway = function (model, balance) {
    const p = F.project(model, 1095, { startBalance: balance });
    const monthly = (x) => (x / 1095) * 30.44;
    const net = monthly(p.income - p.total);
    const hit = p.pts.find((x) => x.bal < 0);
    const months = hit ? hit.i / 30.44 : null;
    return { net, monthlyIn: monthly(p.income), monthlyOut: monthly(p.total), hit: hit ? hit.d : null, months, balance };
  };

  // ---------- habits: average per month with breakdowns ----------
  const SLOTS = [['morning', 5, 11], ['afternoon', 11, 16], ['evening', 16, 22], ['late night', 22, 29]];
  const slotOf = (h) => (h < 5 ? 'late night' : SLOTS.find(([, a, b]) => h >= a && h < b)[0]);
  function monthsSpan(txns) {
    if (!txns.length) return 1;
    const ds = txns.map((t) => +new Date(t.date));
    return Math.max(1, (Math.max(...ds) - Math.min(...ds)) / DAY / 30.44);
  }
  function breakdown(list, months) {
    const hasTime = list.length && !list.some((t) => t.noTime);
    const total = sum(list, (t) => t.amount);
    const merch = new Map();
    for (const t of list) { const m = merch.get(t.merchant) || { name: t.merchant, amt: 0, n: 0 }; m.amt += t.amount; m.n++; merch.set(t.merchant, m); }
    const time = hasTime ? Object.fromEntries(SLOTS.map(([s]) => [s, 0])) : null;
    if (time) for (const t of list) time[slotOf(new Date(t.date).getHours())] += t.amount;
    const weekend = sum(list.filter((t) => [0, 6].includes(new Date(t.date).getDay())), (t) => t.amount);
    const keys = [...new Set(list.map((t) => monthKey(new Date(t.date))))].sort();
    const lastM = keys[keys.length - 1];
    const lastList = list.filter((t) => monthKey(new Date(t.date)) === lastM);
    const last = sum(lastList, (t) => t.amount);
    const before = keys.length > 1 ? (total - last) / (keys.length - 1) : null;
    return {
      perMonth: total / months, visitsPerMonth: list.length / months, avgTicket: list.length ? total / list.length : 0,
      merchants: [...merch.values()].map((m) => ({ ...m, perMonth: m.amt / months, visitsPerMonth: m.n / months })).sort((a, b) => b.amt - a.amt).slice(0, 4),
      time, weekendShare: total ? weekend / total : 0, trend: before ? last / before - 1 : null, count: list.length,
      lastMonth: last, lastCount: lastList.length, before,
    };
  }
  F.habits = function (txns) {
    const months = monthsSpan(txns);
    const cats = new Map();
    for (const t of txns) { if (!cats.has(t.category)) cats.set(t.category, []); cats.get(t.category).push(t); }
    return [...cats.entries()].map(([cat, list]) => ({ cat, ...breakdown(list, months) })).sort((a, b) => b.perMonth - a.perMonth);
  };
  const MEALS = [['breakfast', '🥐', 5, 11], ['lunch', '🥗', 11, 16], ['dinner', '🍝', 16, 22], ['late-night munchies', '🌙', 22, 29]];
  F.meals = function (txns) {
    const food = txns.filter((t) => ['Coffee', 'Food', 'Delivery'].includes(t.category) && !t.noTime);
    if (!food.length) return null;
    const months = monthsSpan(txns);
    return MEALS.map(([meal, emoji, a, b]) => {
      const list = food.filter((t) => { let h = new Date(t.date).getHours(); if (h < 5) h += 24; return h >= a && h < b; });
      return { meal, emoji, ...breakdown(list, months) };
    }).filter((m) => m.count).sort((a, b) => b.perMonth - a.perMonth);
  };

  // ---------- red flags: habits you might not notice ----------
  F.redFlags = function (txns, model, run) {
    const months = monthsSpan(txns);
    const disc = txns.filter((t) => !t.recurring);
    const flags = [];
    const yr = (perMonth) => perMonth * 12;
    const small = disc.filter((t) => t.amount < 10);
    if (small.length / months >= 15) {
      const pm = sum(small, (t) => t.amount) / months;
      flags.push({ id: 'small', sev: 2, emoji: '🪙', title: 'death by $5 cuts', body: `${Math.round(small.length / months)} purchases under $10 every month. each one feels like nothing.`, repeats: Math.round(small.length / months * 12), yearly: yr(pm) });
    }
    const autopilot = model.habits.filter((h) => h.perDay * 30.44 >= 10 && !['Transport', 'Groceries'].includes(h.category)).slice(0, 2);
    for (const h of autopilot) {
      flags.push({ id: 'auto-' + h.merchant, sev: 2, emoji: '🤖', title: `${h.merchant} on autopilot`, body: `~${Math.round(h.perDay * 30.44)}×/month at ~${R.money(h.avg)}. that’s not a treat anymore, that’s a subscription you didn’t sign up for.`, repeats: Math.round(h.perDay * 365), yearly: h.perDay * 365 * h.avg });
    }
    const del = disc.filter((t) => t.category === 'Delivery');
    if (del.length / months >= 3) {
      const pm = sum(del, (t) => t.amount) / months;
      flags.push({ id: 'delivery', sev: 3, emoji: '🛵', title: 'the delivery tax', body: `fees, markups & tips run ~30% on top of the food. that’s ~${R.money(pm * 0.3, 0)}/mo just to not walk.`, repeats: Math.round(del.length / months * 12), yearly: yr(pm * 0.3) });
    }
    const subs = model.recurring;
    const subMonthly = sum(subs, (s) => s.amount);
    if (subs.length >= 4) flags.push({ id: 'subs', sev: 2, emoji: '🔁', title: `${subs.length} subscriptions quietly billing`, body: `${R.money(subMonthly)}/mo on autopay. ${subs.filter((s) => s.ghost).length ? `${subs.filter((s) => s.ghost).map((s) => s.merchant).join(', ')} look unused 👻.` : 'audit the ones you forgot about.'}`, repeats: subs.length * 12, yearly: subMonthly * 12 });
    const timed = disc.filter((t) => !t.noTime);
    const late = timed.filter((t) => { const h = new Date(t.date).getHours(); return h >= 23 || h < 4; });
    if (timed.length && late.length / timed.length >= 0.12) {
      const pm = sum(late, (t) => t.amount) / months;
      flags.push({ id: 'late', sev: 2, emoji: '🌙', title: 'the 2am you is expensive', body: `${Math.round((late.length / timed.length) * 100)}% of your purchases happen between 11pm and 4am. sleepy brain says yes to everything.`, repeats: Math.round(late.length / months * 12), yearly: yr(pm) });
    }
    const wkEnd = disc.filter((t) => [0, 5, 6].includes(new Date(t.date).getDay()));
    const ratio = (sum(wkEnd, (t) => t.amount) / 3) / Math.max(1, sum(disc.filter((t) => ![0, 5, 6].includes(new Date(t.date).getDay())), (t) => t.amount) / 4);
    if (ratio >= 1.4) flags.push({ id: 'weekend', sev: 1, emoji: '🪩', title: 'weekend you vs weekday you', body: `you spend ${ratio.toFixed(1)}× more per day Fri–Sun. weekday you is carrying the team.`, repeats: 156, yearly: 0 });
    for (const h of F.habits(txns)) {
      // a habit creeping up, not one big splurge: needs a few purchases behind it
      if (h.trend !== null && h.trend >= 0.25 && h.perMonth >= 40 && h.lastCount >= 4 && h.cat !== 'Subscriptions') {
        flags.push({ id: 'spike-' + h.cat, sev: 2, emoji: '📈', title: `${h.cat} is creeping up`, body: `up ${Math.round(h.trend * 100)}% last month vs your usual. small creep now = new normal later.`, repeats: 12, yearly: (h.lastMonth - h.before) * 12 });
      }
    }
    if (run && run.net < 0) flags.unshift({ id: 'burn', sev: 3, emoji: '🔥', title: 'you spend more than you make', body: `−${R.money(-run.net, 0)} every month on average, even after paychecks. savings are doing the heavy lifting.`, repeats: 12, yearly: -run.net * 12 });
    return flags.sort((a, b) => b.sev - a.sev || b.yearly - a.yearly);
  };

  // ---------- net = earned − spent, bucketed ----------
  F.net = function (txns, income, model, period) {
    const sow = (d) => addDays(d, -d.getDay());
    const keyFn = { daily: (d) => dayKey(d), weekly: (d) => dayKey(sow(d)), monthly: (d) => monthKey(d), yearly: (d) => String(d.getFullYear()) }[period];
    const label = {
      daily: (d) => fmtDate(d), weekly: (d) => fmtDate(sow(d)), monthly: (d) => MONTHS[d.getMonth()], yearly: (d) => String(d.getFullYear()),
    }[period];
    const buckets = new Map();
    const get = (d) => { const k = keyFn(d); if (!buckets.has(k)) buckets.set(k, { key: k, label: label(d), d, earned: 0, spent: 0, projected: false }); return buckets.get(k); };
    const cutoff = { daily: addDays(model.anchor, -30), weekly: addDays(sow(model.anchor), -7 * 11), monthly: new Date(0), yearly: new Date(0) }[period];
    for (const t of txns) { const d = new Date(t.date); if (d >= cutoff && d < model.anchor) get(startOfDay(d)).spent += t.amount; }
    for (const t of income) { const d = new Date(t.date); if (d >= cutoff && d < model.anchor) get(startOfDay(d)).earned += t.amount; }
    // fill gaps so every period shows up
    if (period === 'daily') for (let i = 30; i >= 1; i--) get(addDays(model.anchor, -i));
    if (period === 'weekly') for (let i = 11; i >= 0; i--) { const d = addDays(sow(addDays(model.anchor, -1)), -7 * i); if (d >= cutoff) get(d); }
    const actual = [...buckets.values()].sort((a, b) => a.d - b.d);
    // projected periods continue the S&P-style "future" look
    const ahead = { daily: 7, weekly: 4, monthly: 3, yearly: 1 }[period];
    const proj = F.project(model, period === 'yearly' ? 366 + 365 : period === 'monthly' ? 100 : period === 'weekly' ? 35 : 7);
    const pb = new Map();
    let prevInc = 0, prevSpend = 0;
    for (const p of proj.pts) {
      const k = keyFn(p.d);
      const existing = buckets.get(k);
      if (!pb.has(k)) pb.set(k, existing ? { ...existing } : { key: k, label: label(p.d), d: p.d, earned: 0, spent: 0 });
      const b = pb.get(k);
      b.earned += p.income - prevInc; b.spent += p.spend - prevSpend; b.projected = true; b.partial = !!existing;
      prevInc = p.income; prevSpend = p.spend;
    }
    const projected = [...pb.values()].sort((a, b) => a.d - b.d);
    const merged = actual.filter((a) => !pb.has(a.key)).concat(projected.slice(0, ahead + (projected[0]?.partial ? 1 : 0)));
    return merged.map((b) => ({ ...b, net: b.earned - b.spent }));
  };

  // ---------- daily receipts ----------
  F.days = function (txns, income) {
    const by = new Map();
    const get = (d) => { const k = dayKey(d); if (!by.has(k)) by.set(k, { key: k, d: startOfDay(d), items: [], inflow: [], total: 0, earned: 0 }); return by.get(k); };
    for (const t of txns) { const g = get(new Date(t.date)); g.items.push(t); g.total += t.amount; }
    for (const t of income) { const g = get(new Date(t.date)); g.inflow.push(t); g.earned += t.amount; }
    const days = [...by.values()].sort((a, b) => b.d - a.d);
    const spendDays = days.filter((d) => d.total > 0);
    const avg = spendDays.length ? sum(spendDays, (d) => d.total) / spendDays.length : 0;
    const ranked = [...spendDays].sort((a, b) => b.total - a.total);
    for (const d of days) {
      d.items.sort((a, b) => a.date.localeCompare(b.date));
      d.vsAvg = avg ? d.total / avg - 1 : 0;
      d.rank = ranked.indexOf(d) + 1;
      const cats = {};
      for (const t of d.items) cats[t.category] = (cats[t.category] || 0) + t.amount;
      d.topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    }
    return { days, avg, count: spendDays.length };
  };

  // ---------- goals: "i wanna spend at most $400 this week" ----------
  const CAT_WORDS = {
    Coffee: /coffee|starbucks|latte|boba|caf[eé]|dunkin/, Delivery: /deliver|doordash|uber ?eats|grubhub|takeout/, Food: /food|eating out|restaurant|lunch|dinner|breakfast|chipotle|fast food/,
    Shopping: /shop|amazon|clothes|target|online/, Groceries: /grocer/, Transport: /uber|lyft|ride|transport|gas|transit/,
    Entertainment: /entertain|concert|games?|movies?|steam|tickets?/, Beauty: /beauty|makeup|sephora|skincare/, Subscriptions: /subscri|streaming|netflix|spotify/,
  };
  F.parseGoal = function (text) {
    const s = String(text || '').toLowerCase();
    const m = s.match(/\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k\b)?/);
    const amount = m ? parseFloat(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1) : null;
    const period = /\b(today|tonight|a day|per day|daily|each day)\b/.test(s) ? 'day' : /\b(week|weekly|7 days)\b/.test(s) ? 'week' : /\b(year|yearly|annual|12 months)\b/.test(s) ? 'year' : 'month';
    let category = null;
    for (const [c, re] of Object.entries(CAT_WORDS)) if (re.test(s)) { category = c; break; }
    let type = 'cap';
    if (/\b(save|stash|put away|keep|grow|stack)\b/.test(s)) type = 'save';
    else if (/\b(stop|quit|cut|less|no more|fewer|half)\b/.test(s) && !amount && category) type = 'cut';
    if (type === 'cap' && !amount) return null;
    if (type === 'save' && !amount) return null;
    const label = type === 'save' ? `save ${R.money(amount, 0)} this ${period}` : type === 'cut' ? `cut ${category.toLowerCase()} in half` : `spend ≤ ${R.money(amount, 0)}${category ? ' on ' + category.toLowerCase() : ''} this ${period}`;
    return { type, amount: amount || null, period, category, label, text: String(text).trim().slice(0, 120) };
  };

  F.periodWindow = function (period, anchor) {
    const today = addDays(anchor, -1);
    if (period === 'day') return { start: anchor, end: addDays(anchor, 1), label: 'tomorrow' };
    if (period === 'week') { const s = addDays(today, -today.getDay()); return { start: s, end: addDays(s, 7), label: 'this week' }; }
    if (period === 'year') return { start: new Date(today.getFullYear(), 0, 1), end: new Date(today.getFullYear() + 1, 0, 1), label: String(today.getFullYear()) };
    // month: if data ends on the last day of a month, plan the next one
    const s = anchor.getDate() === 1 ? new Date(anchor) : new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: s, end: new Date(s.getFullYear(), s.getMonth() + 1, 1), label: R.monthLabel ? R.monthLabel(monthKey(s)) : MONTHS[s.getMonth()] };
  };

  F.goalStatus = function (goal, txns, income, model) {
    const w = F.periodWindow(goal.period, model.anchor);
    const inWin = (t) => { const d = new Date(t.date); return d >= w.start && d < w.end && d < model.anchor; };
    const match = (t) => !goal.category || t.category === goal.category;
    const spent = sum(txns.filter((t) => inWin(t) && match(t)), (t) => t.amount);
    const earned = sum(income.filter(inWin), (t) => t.amount);
    const daysLeft = Math.max(0, Math.round((w.end - Math.max(w.start, model.anchor)) / DAY));
    const p = F.project(model, daysLeft);
    const share = goal.category ? (model.catShare[goal.category] || 0) : 1;
    const recur = goal.category ? sum(p.subs.filter((s) => model.recurring.find((r) => r.merchant === s.merchant)?.category === goal.category), (s) => s.amt) : p.recurringTotal;
    const futureSpend = p.everydayTotal * share + recur;
    const projected = spent + futureSpend;
    const total = Math.round((w.end - w.start) / DAY);
    const elapsed = total - daysLeft;
    if (goal.type === 'save') {
      const projNet = earned + p.income - projected;
      return { ...w, spent, projected, earned: earned + p.income, net: projNet, target: goal.amount, ok: projNet >= goal.amount, pct: Math.max(0, Math.min(1, projNet / goal.amount)), daysLeft, elapsed, total, gap: goal.amount - projNet };
    }
    if (goal.type === 'cut') {
      const base = (model.catShare[goal.category] || 0) * model.mAll * total;
      const target = base / 2;
      return { ...w, spent, projected, target, ok: projected <= target, pct: Math.min(1, spent / Math.max(1, target)), daysLeft, elapsed, total, allowance: daysLeft ? Math.max(0, target - spent) / daysLeft : 0, gap: projected - target };
    }
    return { ...w, spent, projected, target: goal.amount, ok: projected <= goal.amount, pct: Math.min(1, spent / goal.amount), daysLeft, elapsed, total, allowance: daysLeft ? Math.max(0, goal.amount - spent) / daysLeft : 0, gap: projected - goal.amount };
  };

  if (typeof module !== 'undefined') module.exports = R;
})(typeof window !== 'undefined' ? window : globalThis);
