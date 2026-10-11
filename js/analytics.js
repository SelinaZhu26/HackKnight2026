/* mochii club — analytics engine
 * Turns a flat transaction list into Wrapped stats, insights, predictions and roasts.
 */
(function (global) {
  const R = (global.R = global.R || {});

  const sum = (arr, f = (x) => x) => arr.reduce((s, x) => s + f(x), 0);
  const pad = (n) => String(n).padStart(2, '0');
  // bucket by *local* date so a 1am purchase stays in the right month
  const monthKey = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
  const dayKey = (iso) => { const d = new Date(iso); return `${monthKey(iso)}-${pad(d.getDate())}`; };
  R.money = (n, dp) => {
    const d = dp ?? (Math.abs(n) >= 1000 ? 0 : 2);
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  };
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  R.monthLabel = (key) => MONTH_NAMES[+key.slice(5, 7) - 1];
  R.nextMonthLabel = (key) => MONTH_NAMES[+key.slice(5, 7) % 12];

  // local hour from ISO (generated data stores local time converted to ISO)
  const hourOf = (t) => new Date(t.date).getHours();
  const dowOf = (t) => new Date(t.date).getDay();

  function groupBy(txns, key) {
    const m = new Map();
    for (const t of txns) {
      const k = typeof key === 'function' ? key(t) : t[key];
      if (!m.has(k)) m.set(k, { key: k, amt: 0, count: 0, txns: [] });
      const g = m.get(k); g.amt += t.amount; g.count++; g.txns.push(t);
    }
    return [...m.values()].sort((a, b) => b.amt - a.amt);
  }

  // ---------- personality ("money aura") ----------
  const AURAS = {
    Coffee:        { title: 'The Caffeinated Capitalist', blurb: 'Your blood type is oat milk. Baristas know your name AND your trauma.', grad: ['#ff7a1a', '#ffd23f'] },
    Delivery:      { title: 'The DoorDash Dependent', blurb: 'Your kitchen is decorative. The delivery guy is your closest friend.', grad: ['#ff4fa3', '#ff7a1a'] },
    Food:          { title: 'The Snack Strategist', blurb: 'Every meal is a "treat yourself" moment. Every. Single. One.', grad: ['#ffd23f', '#ff4fa3'] },
    Shopping:      { title: 'The Add-to-Cart Assassin', blurb: 'Your Amazon driver has a key to your building. Probably.', grad: ['#8b5cf6', '#ff4fa3'] },
    Beauty:        { title: 'The Glow-Up Investor', blurb: 'Skincare is self-care is a line item. Valid, but expensive.', grad: ['#ff8fc7', '#8b5cf6'] },
    Transport:     { title: 'The Uber Elite', blurb: 'Walking is for people who have time. You have a 4.92 rating.', grad: ['#3d8bff', '#00d1d1'] },
    Groceries:     { title: 'The Suspiciously Responsible', blurb: 'You buy vegetables on purpose. Your friends are concerned.', grad: ['#2ee59d', '#c6ff3d'] },
    Entertainment: { title: 'The Main Character', blurb: 'Concerts, games, vibes. Your bank account is the side quest.', grad: ['#c6ff3d', '#3d8bff'] },
    Subscriptions: { title: 'The Subscription Hoarder', blurb: 'Free trials don’t end, they evolve. You pay for apps you’ve never opened.', grad: ['#00d1d1', '#8b5cf6'] },
    Saver:         { title: 'The Frugal Final Boss', blurb: 'Under budget, no notes. Teach the rest of the group chat.', grad: ['#2ee59d', '#3d8bff'] },
    Other:         { title: 'The Enigma', blurb: 'Your spending defies categories. Respect.', grad: ['#b8b8c8', '#8b5cf6'] },
  };
  R.AURAS = AURAS;

  // ---------- core analysis ----------
  R.analyze = function (allTxns, opts = {}) {
    const budget = Number.isFinite(opts.budget) && opts.budget > 0 ? opts.budget : 1400;
    const months = [...new Set(allTxns.map((t) => monthKey(t.date)))].sort();
    const cur = opts.month || months[months.length - 1] || monthKey(new Date());
    const ci = months.indexOf(cur);
    const prev = months[ci - 1];
    const prev2 = months[ci - 2];
    const txns = allTxns.filter((t) => monthKey(t.date) === cur);
    const prevTxns = prev ? allTxns.filter((t) => monthKey(t.date) === prev) : [];
    const prev2Txns = prev2 ? allTxns.filter((t) => monthKey(t.date) === prev2) : [];
    const hasTime = !txns.some((t) => t.noTime);

    const total = sum(txns, (t) => t.amount);
    const prevTotal = sum(prevTxns, (t) => t.amount);
    const prev2Total = sum(prev2Txns, (t) => t.amount);
    const daysInMonth = new Date(+cur.slice(0, 4), +cur.slice(5, 7), 0).getDate();

    const byCat = groupBy(txns, 'category').map((g) => ({ ...g, cat: g.key, pct: total > 0 ? g.amt / total : 0 }));
    const prevByCat = Object.fromEntries(groupBy(prevTxns, 'category').map((g) => [g.key, g.amt]));
    const catDeltas = byCat.map((c) => ({ cat: c.cat, amt: c.amt, prev: prevByCat[c.cat] || 0, delta: c.amt - (prevByCat[c.cat] || 0) }))
      .sort((a, b) => b.delta - a.delta);

    const nonSub = txns.filter((t) => !t.recurring);
    const byMerchant = groupBy(nonSub, 'merchant').map((g) => ({ ...g, name: g.key }));
    const byVisits = [...byMerchant].sort((a, b) => b.count - a.count);
    const biggest = [...nonSub].sort((a, b) => b.amount - a.amount)[0];

    const late = hasTime ? nonSub.filter((t) => { const h = hourOf(t); return h >= 23 || h < 4; }) : [];
    const lateByM = groupBy(late, 'merchant');

    const dow = Array(7).fill(0);
    for (const t of nonSub) dow[dowOf(t)] += t.amount;
    const daysSpent = new Set(txns.map((t) => dayKey(t.date))).size;

    const subs = groupBy(txns.filter((t) => t.recurring), 'merchant').map((g) => ({ name: g.key, amt: g.amt, ghost: g.txns[0].ghost }));
    const subsTotal = sum(subs, (s) => s.amt);

    const coffee = byCat.find((c) => c.cat === 'Coffee');
    const delivery = byCat.find((c) => c.cat === 'Delivery');

    // prediction: weighted history + momentum, so "prove me wrong" has teeth
    const hist = [total, prevTotal || total, prev2Total || prevTotal || total];
    const weighted = hist[0] * 0.55 + hist[1] * 0.3 + hist[2] * 0.15;
    const momentum = (hist[0] - hist[1]) * 0.35;
    const prediction = Math.max(0, weighted + momentum);

    // aura: top non-subscription category, unless they're comfortably under budget
    const topReal = byCat.find((c) => c.cat !== 'Subscriptions') || byCat[0];
    const auraKey = total < budget * 0.7 ? 'Saver' : topReal ? topReal.cat : 'Other';

    const a = {
      month: cur, monthLabel: R.monthLabel(cur), prevLabel: prev ? R.monthLabel(prev) : null, nextLabel: R.nextMonthLabel(cur),
      total, prevTotal, count: txns.length, avgPerDay: total / daysInMonth, daysInMonth, noSpendDays: daysInMonth - daysSpent,
      deltaPct: prevTotal ? (total - prevTotal) / prevTotal : 0,
      byCat, catDeltas, byMerchant, byVisits, topMerchant: byMerchant[0], mostVisited: byVisits[0], biggest,
      late: { count: late.length, amt: sum(late, (t) => t.amount), top: lateByM[0], hasTime },
      dow, subs, subsTotal, ghostSubs: subs.filter((s) => s.ghost),
      coffee: coffee ? { amt: coffee.amt, count: coffee.count } : { amt: 0, count: 0 },
      delivery: delivery ? { amt: delivery.amt, count: delivery.count } : { amt: 0, count: 0 },
      prediction, budget, budgetPct: total / budget,
      aura: { key: auraKey, ...AURAS[auraKey] },
    };
    a.score = R.healthScore(a);
    a.insights = R.insights(a);
    return a;
  };

  // ---------- financial health score (0-100) ----------
  R.healthScore = function (a) {
    const parts = [];
    const clamp = (v, max) => Math.max(0, Math.min(max, v));
    const catAmt = (c) => a.byCat.find((x) => x.cat === c)?.amt || 0;
    parts.push({ label: 'Budget', pts: clamp(35 * (1.4 - a.budgetPct) / 0.8, 35), max: 35 });
    parts.push({ label: 'Trend', pts: clamp(12 - a.deltaPct * 30, 20), max: 20 });
    const impulse = a.total > 0 ? (a.delivery.amt + a.late.amt) / a.total : 0;
    parts.push({ label: 'Impulse control', pts: clamp(20 * (1 - impulse / 0.6), 20), max: 20 });
    parts.push({ label: 'Subscriptions', pts: clamp(15 - a.ghostSubs.length * 4, 15), max: 15 });
    const g = catAmt('Groceries');
    const eatOut = g + catAmt('Food') + catAmt('Delivery') + catAmt('Coffee');
    parts.push({ label: 'Cooking at home', pts: eatOut ? clamp(10 * g / eatOut * 1.5, 10) : 10, max: 10 });
    const score = Math.round(sum(parts, (p) => p.pts));
    const grade = score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : score >= 35 ? 'D' : 'F';
    const vibe = { A: 'financially iconic', B: 'mostly slaying', C: 'mid, but fixable', D: 'it’s giving overdraft', F: 'call your mom' }[grade];
    return { score, grade, vibe, parts };
  };

  // ---------- actionable insights (sorted by $ you could save / yr) ----------
  const EQUIV = [
    [1200, 'a round-trip flight to Tokyo'], [500, 'a PS5'], [250, 'a weekend trip'],
    [150, 'concert floor seats'], [60, 'a month of groceries'], [0, 'a really nice dinner'],
  ];
  R.equiv = (n) => {
    for (const [min, label] of EQUIV) if (n >= min * 1.1 || min === 0) return min ? `${Math.max(1, Math.floor(n / min))}× ${label}` : label;
  };

  R.insights = function (a) {
    const out = [];
    if (a.delivery.amt > 60) {
      const fees = a.delivery.amt * 0.3;
      out.push({ id: 'delivery', emoji: '🛵', title: 'The delivery tax is real',
        body: `${a.delivery.count} orders = ~${R.money(fees, 0)} in fees, tips & markup alone. Pick up half of them yourself.`,
        save: fees * 0.5 * 12, cat: 'Delivery' });
    }
    if (a.coffee.count > 8) {
      const save = a.coffee.amt * 0.5 - a.coffee.count * 0.5 * 0.6;
      out.push({ id: 'coffee', emoji: '☕', title: `${a.coffee.count} coffees. In one month.`,
        body: `Brewing every other one at home saves ${R.money(save, 0)}/mo. That’s ${R.equiv(save * 12)} a year.`,
        save: save * 12, cat: 'Coffee' });
    }
    if (a.ghostSubs.length) {
      const g = sum(a.ghostSubs, (s) => s.amt);
      out.push({ id: 'subs', emoji: '👻', title: `${a.ghostSubs.length} ghost subscription${a.ghostSubs.length > 1 ? 's' : ''}`,
        body: `${a.ghostSubs.map((s) => s.name).join(', ')} — no matching activity. Cancel and pocket ${R.money(g * 12, 0)}/yr.`,
        save: g * 12, cat: 'Subscriptions' });
    }
    if (a.late.count >= 3) {
      out.push({ id: 'late', emoji: '🌙', title: '11pm–4am you is not to be trusted',
        body: `${a.late.count} purchases (${R.money(a.late.amt, 0)}) after 11pm${a.late.top ? `, mostly ${a.late.top.key}` : ''}. Try a night-mode card lock.`,
        save: a.late.amt * 0.6 * 12, cat: null });
    }
    const spike = a.catDeltas[0];
    if (spike && spike.delta > 40 && spike.prev > 0) {
      out.push({ id: 'spike', emoji: '📈', title: `${spike.cat} went up ${Math.round((spike.delta / spike.prev) * 100)}%`,
        body: `${R.money(spike.prev, 0)} → ${R.money(spike.amt, 0)} vs ${a.prevLabel}. Set a ${R.money(Math.ceil(spike.prev / 10) * 10, 0)} cap with your squad.`,
        save: spike.delta * 12, cat: spike.cat });
    }
    const wkend = a.dow[0] + a.dow[5] + a.dow[6];
    const wk = a.dow[1] + a.dow[2] + a.dow[3] + a.dow[4];
    if (wkend / 3 > (wk / 4) * 1.4) {
      out.push({ id: 'weekend', emoji: '🎉', title: 'Weekend you has no chill',
        body: wk > 0 ? `You spend ${((wkend / 3) / (wk / 4)).toFixed(1)}× more per day Fri–Sun. Pre-plan one free weekend activity.` : 'All your non-subscription spending is Fri–Sun. Pre-plan one free weekend activity.',
        save: (wkend / 3 - wk / 4) * 3 * 4 * 0.3 * 12, cat: null });
    }
    if (a.budgetPct > 1) {
      out.push({ id: 'budget', emoji: '🚨', title: `${Math.round((a.budgetPct - 1) * 100)}% over budget`,
        body: `You set ${R.money(a.budget, 0)} and spent ${R.money(a.total, 0)}. Daily allowance next month: ${R.money(a.budget / 31, 0)}/day.`,
        save: (a.total - a.budget) * 12, cat: null });
    }
    return out.sort((x, y) => y.save - x.save);
  };

  // ---------- template roasts (fallback when no Gemini key) ----------
  R.fallbackRoast = function (a, name = 'you') {
    const lines = [];
    const tm = a.topMerchant;
    if (a.coffee.count > 10) lines.push(`${a.coffee.count} coffees in ${a.monthLabel}. at this point you don’t drink coffee, you sponsor it.`);
    if (a.delivery.count > 6) lines.push(`${a.delivery.count} delivery orders. your fridge filed a missing persons report.`);
    if (a.late.count > 3) lines.push(`${a.late.count} purchases after 11pm. sleep is free, ${name}. Amazon is not.`);
    if (a.ghostSubs.length) lines.push(`paying for ${a.ghostSubs[0].name} you haven’t touched is a choice. a bad one.`);
    if (a.deltaPct > 0.1) lines.push(`up ${Math.round(a.deltaPct * 100)}% from ${a.prevLabel}. the glow-up was supposed to be financial.`);
    if (a.deltaPct < -0.05) lines.push(`down ${Math.round(-a.deltaPct * 100)}% from ${a.prevLabel}. ok who hacked your account and started being responsible`);
    if (tm) lines.push(`${R.money(tm.amt, 0)} at ${tm.name}. they should be paying YOU rent at this point.`);
    if (a.total < a.budget * 0.8) lines.push(`under budget?? in this economy?? who raised you`);
    return lines.slice(0, 3).join(' ') || `your spending is so mid even we can’t roast it.`;
  };

  // ---------- friends ("most likely to") ----------
  R.superlatives = function (people) {
    // people: [{person, a}]
    const by = (f, dir = -1) => [...people].sort((x, y) => dir * (f(x.a) - f(y.a)))[0];
    const fmt = (p) => p.person.name;
    const list = [];
    const c = by((a) => a.coffee.amt);
    list.push({ emoji: '☕', title: 'Most likely to have a Starbucks loyalty tattoo', who: c, stat: `${c.a.coffee.count} coffees · ${R.money(c.a.coffee.amt, 0)}` });
    const d = by((a) => a.delivery.amt);
    list.push({ emoji: '🛵', title: 'Most likely to be on a first-name basis with the DoorDash guy', who: d, stat: `${d.a.delivery.count} orders · ${R.money(d.a.delivery.amt, 0)}` });
    const s = by((a) => a.budgetPct, 1);
    list.push({ emoji: '🏆', title: 'The Saver — most likely to retire at 35', who: s, stat: `${Math.round(s.a.budgetPct * 100)}% of budget used` });
    const l = by((a) => a.late.amt);
    list.push({ emoji: '🌙', title: 'Most likely to buy something at 2am and forget', who: l, stat: `${l.a.late.count} late-night buys · ${R.money(l.a.late.amt, 0)}` });
    const shop = by((a) => (a.byCat.find((x) => x.cat === 'Shopping')?.amt || 0) + (a.byCat.find((x) => x.cat === 'Beauty')?.amt || 0));
    list.push({ emoji: '🛍️', title: 'Most likely to say "it was on sale"', who: shop, stat: `${R.money((shop.a.byCat.find((x) => x.cat === 'Shopping')?.amt || 0) + (shop.a.byCat.find((x) => x.cat === 'Beauty')?.amt || 0), 0)} on shopping` });
    const t = by((a) => a.byCat.find((x) => x.cat === 'Transport')?.amt || 0);
    list.push({ emoji: '🚕', title: 'Most likely to Uber 0.4 miles', who: t, stat: `${R.money(t.a.byCat.find((x) => x.cat === 'Transport')?.amt || 0, 0)} on rides` });
    const sub = by((a) => a.subsTotal);
    list.push({ emoji: '🔁', title: 'Most likely to still be paying for a free trial from 2024', who: sub, stat: `${sub.a.subs.length} subs · ${R.money(sub.a.subsTotal)}/mo` });
    const glow = by((a) => a.deltaPct, 1);
    list.push({ emoji: '📉', title: 'Biggest financial glow-up', who: glow, stat: `${Math.round(glow.a.deltaPct * 100)}% vs last month` });
    return list.map((x) => ({ ...x, name: fmt(x.who) }));
  };

  if (typeof module !== 'undefined') module.exports = R;
})(typeof window !== 'undefined' ? window : globalThis);
