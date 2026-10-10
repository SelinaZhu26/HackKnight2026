/* receipts. — dummy data generator
 * Deterministic (seeded) fake bank transactions for you + your friends.
 * Swap this out for Plaid / Gmail-receipt (MCP + Gemini) ingestion later.
 */
(function (global) {
  const R = (global.R = global.R || {});

  // ---------- seeded RNG ----------
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = (rng, a, b) => a + rng() * (b - a);
  const randInt = (rng, a, b) => Math.floor(rand(rng, a, b + 1));
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

  // ---------- categories ----------
  R.CATEGORIES = {
    Coffee:        { emoji: '☕', color: '#ff7a1a' },
    Food:          { emoji: '🌯', color: '#ffd23f' },
    Delivery:      { emoji: '🛵', color: '#ff4fa3' },
    Shopping:      { emoji: '🛍️', color: '#8b5cf6' },
    Beauty:        { emoji: '💄', color: '#ff8fc7' },
    Transport:     { emoji: '🚕', color: '#3d8bff' },
    Groceries:     { emoji: '🥦', color: '#2ee59d' },
    Entertainment: { emoji: '🎟️', color: '#c6ff3d' },
    Subscriptions: { emoji: '🔁', color: '#00d1d1' },
    Other:         { emoji: '🧾', color: '#b8b8c8' },
  };

  // hours: m=morning l=lunch e=evening n=night(late) a=any
  const M = {
    'Starbucks':        { cat: 'Coffee', min: 4.75, max: 8.95, h: 'm' },
    'Dunkin':           { cat: 'Coffee', min: 2.99, max: 6.49, h: 'm' },
    'Blue Bottle':      { cat: 'Coffee', min: 5.5, max: 8.5, h: 'm' },
    'Chipotle':         { cat: 'Food', min: 11.25, max: 15.8, h: 'l' },
    'Sweetgreen':       { cat: 'Food', min: 13.5, max: 18.9, h: 'l' },
    "Joe's Pizza":      { cat: 'Food', min: 3.5, max: 12, h: 'n' },
    'Taco Bell':        { cat: 'Food', min: 5.49, max: 14.2, h: 'n' },
    'Halal Cart':       { cat: 'Food', min: 8, max: 12, h: 'n' },
    'DoorDash':         { cat: 'Delivery', min: 19, max: 44, h: 'e' },
    'Uber Eats':        { cat: 'Delivery', min: 21, max: 47, h: 'e' },
    'Amazon':           { cat: 'Shopping', min: 9.99, max: 89, h: 'n' },
    'Target':           { cat: 'Shopping', min: 14, max: 76, h: 'a' },
    'SHEIN':            { cat: 'Shopping', min: 24, max: 72, h: 'n' },
    'Urban Outfitters': { cat: 'Shopping', min: 39, max: 118, h: 'a' },
    'Sephora':          { cat: 'Beauty', min: 18, max: 78, h: 'a' },
    'Uber':             { cat: 'Transport', min: 9, max: 34, h: 'n' },
    'Lyft':             { cat: 'Transport', min: 8, max: 29, h: 'e' },
    'Transit':          { cat: 'Transport', min: 2.9, max: 2.9, h: 'm' },
    "Trader Joe's":     { cat: 'Groceries', min: 22, max: 68, h: 'a' },
    'Whole Foods':      { cat: 'Groceries', min: 28, max: 92, h: 'a' },
    'AMC Theatres':     { cat: 'Entertainment', min: 14, max: 29, h: 'e' },
    'Ticketmaster':     { cat: 'Entertainment', min: 68, max: 189, h: 'n' },
    'Steam':            { cat: 'Entertainment', min: 9.99, max: 59.99, h: 'n' },
    'Bowlero':          { cat: 'Entertainment', min: 18, max: 40, h: 'e' },
  };
  R.MERCHANTS = M;

  const SUBS = {
    'Spotify':        { amt: 5.99, ghost: false },
    'Netflix':        { amt: 15.49, ghost: false },
    'Hulu':           { amt: 9.99, ghost: true },
    'iCloud+':        { amt: 2.99, ghost: false },
    'Duolingo Super': { amt: 12.99, ghost: true },
    'Planet Fitness': { amt: 15.0, ghost: true },
    'Crunchyroll':    { amt: 7.99, ghost: false },
    'Xbox Game Pass': { amt: 16.99, ghost: false },
    'Adobe CC':       { amt: 19.99, ghost: true },
  };
  R.SUBS = SUBS;

  function hourFor(rng, h) {
    switch (h) {
      case 'm': return randInt(rng, 7, 11);
      case 'l': return randInt(rng, 11, 15);
      case 'e': return rng() < 0.25 ? pick(rng, [23, 0, 1]) : randInt(rng, 17, 22);
      case 'n': return rng() < 0.45 ? pick(rng, [23, 0, 1, 2, 3]) : randInt(rng, 12, 22);
      default: return randInt(rng, 9, 22);
    }
  }

  // ---------- people ----------
  // visits = merchant -> avg visits per month. trend multiplies the most recent month.
  R.PEOPLE = [
    {
      id: 'me', name: 'You', handle: '@you', emoji: '🫵', color: '#c6ff3d', budget: 1500, seed: 7,
      visits: { Starbucks: 16, 'Blue Bottle': 4, Chipotle: 6, "Joe's Pizza": 4, DoorDash: 6, 'Uber Eats': 3,
        Amazon: 6, Target: 2, Uber: 5, Transit: 10, "Trader Joe's": 3, Steam: 1, 'AMC Theatres': 1 },
      subs: ['Spotify', 'Netflix', 'Hulu', 'iCloud+', 'Duolingo Super', 'Planet Fitness'],
      trend: 1.14,
      splurge: { m: 'Ticketmaster', amt: 214.5, note: 'floor seats. no regrets (some regrets)' },
    },
    {
      id: 'maya', name: 'Maya', handle: '@mayasaves', emoji: '🧘', color: '#2ee59d', budget: 800, seed: 21,
      visits: { "Trader Joe's": 6, Transit: 30, Dunkin: 3, Chipotle: 2, Target: 1, 'AMC Theatres': 1 },
      subs: ['Spotify', 'iCloud+'], trend: 0.92,
    },
    {
      id: 'marcus', name: 'Marcus', handle: '@marcuseats', emoji: '🍗', color: '#ff4fa3', budget: 1100, seed: 33,
      visits: { DoorDash: 17, 'Uber Eats': 9, 'Taco Bell': 6, 'Halal Cart': 5, Uber: 4, Steam: 1, Starbucks: 3 },
      subs: ['Spotify', 'Netflix', 'Xbox Game Pass', 'Crunchyroll'], trend: 1.08,
    },
    {
      id: 'priya', name: 'Priya', handle: '@priyaxo', emoji: '💅', color: '#8b5cf6', budget: 1400, seed: 45,
      visits: { Sephora: 4, SHEIN: 5, 'Urban Outfitters': 3, Amazon: 6, Sweetgreen: 8, Starbucks: 9, Lyft: 5, Target: 3 },
      subs: ['Spotify', 'Netflix', 'Hulu', 'Adobe CC'], trend: 1.21,
      splurge: { m: 'Urban Outfitters', amt: 168.0, note: 'it was on sale (it was not on sale)' },
    },
    {
      id: 'jordan', name: 'Jordan', handle: '@jordanontour', emoji: '🎤', color: '#3d8bff', budget: 900, seed: 57,
      visits: { Uber: 14, Lyft: 6, Ticketmaster: 1.5, Bowlero: 2, "Joe's Pizza": 6, Chipotle: 5, Dunkin: 6 },
      subs: ['Spotify', 'Planet Fitness', 'Netflix'], trend: 1.02,
    },
    {
      id: 'dev', name: 'Dev', handle: '@devgames', emoji: '🎮', color: '#ff7a1a', budget: 750, seed: 69,
      visits: { Steam: 5, 'Taco Bell': 9, "Joe's Pizza": 5, Amazon: 5, Starbucks: 4, Transit: 14, 'Whole Foods': 2 },
      subs: ['Spotify', 'Xbox Game Pass', 'Crunchyroll', 'Duolingo Super'], trend: 0.88,
    },
  ];

  // Generate months: index 0 = oldest. Current "wrapped" month is the last one.
  R.MONTHS = [
    { key: '2026-07', label: 'July', y: 2026, m: 6 },
    { key: '2026-08', label: 'August', y: 2026, m: 7 },
    { key: '2026-09', label: 'September', y: 2026, m: 8 },
  ];

  function daysIn(y, m) { return new Date(y, m + 1, 0).getDate(); }

  function genMonth(person, month, idx) {
    const rng = mulberry32(person.seed * 1000 + idx * 97);
    const txns = [];
    // older months drift back from the trend so recent month looks like a change
    const mult = idx === R.MONTHS.length - 1 ? person.trend : idx === R.MONTHS.length - 2 ? 1 : 1 / Math.sqrt(person.trend);
    const nd = daysIn(month.y, month.m);
    for (const [name, avg] of Object.entries(person.visits)) {
      const info = M[name];
      const n = Math.max(0, Math.round(avg * mult * rand(rng, 0.8, 1.2)));
      for (let i = 0; i < n; i++) {
        const day = randInt(rng, 1, nd);
        const hour = hourFor(rng, info.h);
        txns.push({
          date: new Date(month.y, month.m, day, hour, randInt(rng, 0, 59)).toISOString(),
          merchant: name, category: info.cat,
          amount: +rand(rng, info.min, info.max).toFixed(2),
        });
      }
    }
    for (const s of person.subs) {
      txns.push({
        date: new Date(month.y, month.m, (s.length * 3) % 27 + 1, 4, 0).toISOString(),
        merchant: s, category: 'Subscriptions', amount: SUBS[s].amt, recurring: true, ghost: SUBS[s].ghost,
      });
    }
    if (person.splurge && idx === R.MONTHS.length - 1) {
      txns.push({
        date: new Date(month.y, month.m, 14, 1, 37).toISOString(),
        merchant: person.splurge.m, category: M[person.splurge.m].cat, amount: person.splurge.amt, note: person.splurge.note,
      });
    }
    return txns.sort((a, b) => a.date.localeCompare(b.date));
  }

  R.generate = function () {
    const out = {};
    for (const p of R.PEOPLE) {
      out[p.id] = R.MONTHS.map((mo, i) => genMonth(p, mo, i)).flat();
    }
    return out;
  };

  // ---------- CSV import (real bank exports) ----------
  const KEYWORDS = [
    [/starbucks|dunkin|coffee|cafe|blue bottle|peet|dutch bros|boba|bubble tea|kung fu tea|gong cha/i, 'Coffee'],
    [/doordash|uber\s*eats|grubhub|postmates|seamless|instacart/i, 'Delivery'],
    [/uber|lyft|transit|mta|nj ?transit|septa|metro|parking|shell|exxon|gas/i, 'Transport'],
    [/spotify|netflix|hulu|disney|icloud|apple\.com|duolingo|planet fitness|crunchyroll|game pass|adobe|youtube|prime video|chatgpt|patreon/i, 'Subscriptions'],
    [/trader joe|whole foods|kroger|aldi|safeway|shoprite|wegmans|costco|grocery|stop ?& ?shop|publix/i, 'Groceries'],
    [/amazon|amzn|target|walmart|cvs|walgreens|duane reade|shein|urban|h&m|zara|nike|best buy|temu|etsy|uniqlo/i, 'Shopping'],
    [/sephora|ulta|beauty/i, 'Beauty'],
    [/ticketmaster|amc|steam|bowl|cinema|stubhub|playstation|nintendo|eventbrite/i, 'Entertainment'],
    [/chipotle|sweetgreen|pizza|taco|mcdonald|wendy|burger|chick|halal|restaurant|grill|kitchen|sushi|wings|panera|subway|wawa|7-eleven|sheetz|deli|bagel/i, 'Food'],
  ];
  R.categorize = function (desc) {
    for (const [re, c] of KEYWORDS) if (re.test(desc)) return c;
    return 'Other';
  };

  function splitCSVLine(line) {
    const out = []; let cur = ''; let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (ch === ',' && !q) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  }

  // Date-only values are local calendar dates; timestamps retain their time and offset.
  R.parseTransactionDate = function (value) {
    const text = String(value || '').trim();
    const iso = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
    const bank = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4}|\d{2})$/);
    const named = text.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    if (iso || bank || named) {
      let [y, m, day] = iso ? iso.slice(1).map(Number) : bank ? [+bank[3], +bank[1], +bank[2]] : [+named[3], monthNames.findIndex((name) => name === named[1].toLowerCase() || name.slice(0, 3) === named[1].toLowerCase()) + 1, +named[2]];
      if (bank && bank[3].length === 2) y += y < 50 ? 2000 : 1900;
      const d = new Date(y, m - 1, day, 12);
      if (d.getFullYear() !== y || d.getMonth() !== m - 1 || d.getDate() !== day) return null;
      return { date: d.toISOString(), noTime: true };
    }
    // Only accept genuine timestamp forms here, so invalid date-only formats cannot roll over.
    if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(text)) return null;
    const calendar = R.parseTransactionDate(text.slice(0, 10));
    const d = new Date(text);
    return calendar && !isNaN(d) ? { date: d.toISOString(), noTime: false } : null;
  };

  // Amount-only exports need an explicit sign. Debit/credit and recognized types take precedence.
  R.parseCSV = function (text, { spendingSign } = {}) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) throw new Error('CSV looks empty');
    const head = splitCSVLine(lines[0]).map((h) => h.toLowerCase());
    const find = (re) => head.findIndex((h) => re.test(h));
    const iDate = find(/date|posted/);
    const iDesc = find(/desc|merchant|name|payee|memo|details/);
    const iAmt = find(/^amount|amount$|amt/);
    const iType = find(/^(transaction[ _-]?)?type$|^debit\s*\/\s*credit$/);
    const iDebit = head.findIndex((h, i) => i !== iType && /debit|withdraw/.test(h));
    const iCredit = head.findIndex((h, i) => i !== iType && /credit|deposit/.test(h));
    if (iDate < 0 || iDesc < 0 || (iAmt < 0 && iDebit < 0)) {
      throw new Error('Need columns like Date, Description, Amount');
    }
    const rows = lines.slice(1).map(splitCSVLine);
    const amount = (value) => {
      const raw = String(value || '').replace(/[$,\s]/g, '').replace(/^\((.+)\)$/, '-$1');
      return raw ? Number(raw) : NaN;
    };
    const typeOf = (row) => {
      const type = (row[iType] || '').trim();
      if (/^(credit|cr|c|deposit|refund|income|payment|return)$/i.test(type)) return 'credit';
      if (/^(debit|dr|d|purchase|withdrawal|charge|sale|fee)$/i.test(type)) return 'debit';
      return null;
    };
    if (iDebit < 0 && !['negative', 'positive'].includes(spendingSign) && rows.some((r) => Number.isFinite(amount(r[iAmt])) && amount(r[iAmt]) !== 0 && !typeOf(r))) {
      const error = new Error('Choose whether purchases are negative or positive in this CSV');
      error.code = 'CSV_SIGN_REQUIRED';
      throw error;
    }
    const txns = [];
    const income = [];
    // Money in (paychecks, Venmo, refunds) is kept separately for net = earned - spent.
    // Moving money between your own accounts isn't income, so transfers and card payments are left out.
    const addIncome = (r, value) => {
      const desc = (r[iDesc] || '').replace(/\s{2,}/g, ' ');
      const parsedDate = R.parseTransactionDate(r[iDate]);
      if (!parsedDate || !(value > 0) || /transfer (from|to)|online transfer|payment,? thank you|autopay|card payment/i.test(desc)) return;
      const source = desc.replace(/\b(payroll|dir(ect)?\s*dep(osit)?|ach( credit)?|ppd id.*|deposit)\b/gi, ' ').replace(/\s{2,}/g, ' ').trim() || desc;
      income.push({ ...parsedDate, source: R.prettyMerchant(source), amount: +value.toFixed(2) });
    };
    for (const r of rows) {
      let amt;
      if (iDebit >= 0) {
        amt = amount(r[iDebit]);
        const credit = amount(r[iCredit]);
        if (Number.isFinite(credit) && credit !== 0) { addIncome(r, Math.abs(credit)); continue; }
        if (typeOf(r) === 'credit') { addIncome(r, Math.abs(amt)); continue; }
        if (!Number.isFinite(amt) || amt <= 0) continue;
      } else {
        amt = amount(r[iAmt]);
        if (!Number.isFinite(amt) || amt === 0) continue;
        const type = typeOf(r);
        if (type === 'credit' || (!type && (spendingSign === 'negative' ? amt >= 0 : amt <= 0))) { addIncome(r, Math.abs(amt)); continue; }
        amt = Math.abs(amt);
      }
      const parsedDate = R.parseTransactionDate(r[iDate]);
      if (!parsedDate) continue;
      const desc = (r[iDesc] || 'Unknown').replace(/\s{2,}/g, ' ');
      const merchant = R.prettyMerchant(desc);
      const category = M[merchant]?.cat || (SUBS[merchant] && 'Subscriptions') || R.categorize(desc);
      const rounded = +amt.toFixed(2);
      if (rounded <= 0) continue;
      txns.push({ ...parsedDate, merchant, category, amount: rounded, recurring: category === 'Subscriptions' });
    }
    if (!txns.length) throw new Error('No spending rows found');
    detectRecurring(txns);
    txns.sort((a, b) => a.date.localeCompare(b.date));
    txns.meta = { rows: rows.length, skipped: rows.length - txns.length };
    txns.income = income.sort((a, b) => a.date.localeCompare(b.date));
    return txns;
  };

  // Which sign purchases most likely use in an amount-only export (purchases outnumber paychecks).
  R.guessSpendingSign = function (text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const head = splitCSVLine(lines[0] || '').map((h) => h.toLowerCase());
    const iAmt = head.findIndex((h) => /^amount|amount$|amt/.test(h));
    let neg = 0, pos = 0;
    for (const l of lines.slice(1)) {
      const v = Number(String(splitCSVLine(l)[iAmt] || '').replace(/[$,\s]/g, '').replace(/^\((.+)\)$/, '-$1'));
      if (v < 0) neg++; else if (v > 0) pos++;
    }
    return neg >= pos ? 'negative' : 'positive';
  };

  // Same merchant, same amount, in 2+ different months -> probably a subscription.
  function detectRecurring(txns) {
    const groups = new Map();
    for (const t of txns) {
      if (t.category !== 'Other') continue;
      const k = t.merchant + '|' + t.amount;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(t);
    }
    for (const g of groups.values()) {
      const months = new Set(g.map((t) => t.date.slice(0, 7)));
      if (months.size >= 2 && months.size === g.length) g.forEach((t) => { t.category = 'Subscriptions'; t.recurring = true; });
    }
  }

  // "SQ *BLUE BOTTLE COFFEE #12" -> "Blue Bottle". Known brands win, everything else gets title-cased.
  const norm = (x) => x.toLowerCase().replace(/[^a-z0-9]/g, '');
  const BRANDS = () => [...Object.keys(M), ...Object.keys(SUBS)].map((n) => [norm(n), n]).sort((a, b) => b[0].length - a[0].length);
  const ALIASES = [[/^amzn|^amazon/i, 'Amazon'], [/^(mta|nyct)/i, 'Transit'], [/^(dd |doordash)/i, 'DoorDash'], [/^apple\.com\/bill/i, 'Apple'], [/youtube/i, 'YouTube']];
  R.prettyMerchant = function (desc) {
    let d = desc.trim()
      .replace(/^(purchase authorized on \d+\/\d+|checkcard \d+|debit card purchase|pos (purchase|debit)?|recurring payment|card purchase)\s*/i, '')
      .replace(/^(sq|tst|sp|pp|paypal|py|in|sum|google)\s?\*\s*/i, '');
    for (const [re, name] of ALIASES) if (re.test(d)) return name;
    const n = norm(d);
    for (const [k, name] of BRANDS()) if (n.startsWith(k)) return name;
    d = d.replace(/[#*\/].*$/, '').replace(/\s\d{3,}.*$/, '').replace(/\b(store|inc|llc|co)\b\.?/gi, '').trim() || desc;
    return d.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\b[b-df-hj-np-tv-z]{2,4}\b/gi, (w) => w.toUpperCase()).replace(/\s{2,}/g, ' ').slice(0, 28);
  };

  // A realistic 3-month bank export built from the demo person, with raw bank descriptors + paychecks.
  const DESCRIPTORS = {
    Starbucks: 'STARBUCKS STORE #1123', Dunkin: 'DUNKIN #348811', 'Blue Bottle': 'SQ *BLUE BOTTLE COFFEE', Chipotle: 'CHIPOTLE 2291',
    "Joe's Pizza": "TST* JOE'S PIZZA BROADWAY", DoorDash: 'DOORDASH*CHIPOTLE', 'Uber Eats': 'UBER EATS HELP.UBER.COM',
    Amazon: 'AMAZON.COM*2K31B8', Target: 'TARGET 00012345', Uber: 'UBER *TRIP HELP.UBER.COM', Transit: 'MTA*NYCT PAYGO',
    "Trader Joe's": 'TRADER JOE S #552', Steam: 'STEAMGAMES.COM 4259522', 'AMC Theatres': 'AMC THEATRES 34TH ST',
    Spotify: 'SPOTIFY USA', Netflix: 'NETFLIX.COM', Hulu: 'HULU 877-8244858', 'iCloud+': 'APPLE.COM/BILL ICLOUD',
    'Duolingo Super': 'DUOLINGO SUPER', 'Planet Fitness': 'PLANET FITNESS CLUB FEES',
  };
  R.buildSampleCSV = function () {
    const p2 = (n) => String(n).padStart(2, '0');
    const stamp = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:00`;
    const rows = R.generate().me.map((t) => [new Date(t.date), DESCRIPTORS[t.merchant] || t.merchant.toUpperCase(), -t.amount]);
    for (const mo of R.MONTHS) {
      rows.push([new Date(mo.y, mo.m, 1, 9), 'CAMPUS DINING PAYROLL DIR DEP', 640]);
      rows.push([new Date(mo.y, mo.m, 15, 9), 'CAMPUS DINING PAYROLL DIR DEP', 640]);
    }
    rows.push([new Date(2026, 8, 20, 18, 4), 'VENMO CASHOUT', 42]);
    rows.sort((a, b) => a[0] - b[0]);
    const q = (x) => (/[",]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x);
    return ['Transaction Date,Description,Amount', ...rows.map(([d, desc, amt]) => `${stamp(d)},${q(desc)},${amt.toFixed(2)}`)].join('\n');
  };

  if (typeof module !== 'undefined') module.exports = R;
})(typeof window !== 'undefined' ? window : globalThis);
