/* mochii club — app shell, screens and state */
(function () {
  const { esc, money } = R;
  const $ = (s, el = document) => el.querySelector(s);
  const phone = $('#phone');
  const LS = 'receipts.state';

  // ---------- state ----------
  const DEFAULT_SQUADS = [
    { id: 'nodash', name: 'No-DoorDash November', emoji: '🛵', color: '#ff8fb8', cat: 'Delivery', limit: 100, stakes: 'loser buys the group boba 🧋', members: ['me', 'marcus', 'maya'], code: 'DASH26', streak: 3 },
    { id: 'beans', name: 'Coffee Cutters', emoji: '☕', color: '#ffa173', cat: 'Coffee', limit: 60, stakes: 'loser brews everyone cold brew for a week', members: ['me', 'priya', 'dev', 'jordan'], code: 'BEAN42', streak: 1 },
    { id: 'tour', name: 'Broke but Booked', emoji: '🎤', color: '#b5e48c', cat: 'Entertainment', limit: 150, stakes: 'winner picks the next concert', members: ['jordan', 'me', 'priya'], code: 'TOUR88', streak: 5 },
  ];
  const PUBLIC_SQUADS = {
    GYMRAT: { name: 'Gym Rats Who Actually Go', emoji: '🏋️', color: '#6fdba8', cat: 'Subscriptions', limit: 30, stakes: 'cancel one sub or do 50 pushups', members: ['dev', 'maya'] },
    UBER0: { name: 'Legs Exist', emoji: '🚶', color: '#5b8cff', cat: 'Transport', limit: 80, stakes: 'loser walks everyone to class', members: ['jordan', 'marcus'] },
  };

  let S = load();
  function load() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(LS)) || {}; } catch {}
    return { name: '', onboarded: false, source: 'demo', budget: 1500, csvTxns: null, extraTxns: [], challenge: null, squads: null, feed: null, ...s };
  }
  function save() { try { localStorage.setItem(LS, JSON.stringify(S)); } catch {} }

  const DATA = R.generate();
  let A = {}; // analysis per person id
  let PEOPLE = [];
  function recompute() {
    const mine = myTxns();
    A = {};
    PEOPLE = R.PEOPLE.map((p) => {
      const person = p.id === 'me' ? { ...p, name: displayName(), budget: S.budget } : p;
      const a = R.analyze(p.id === 'me' ? mine : DATA[p.id], { budget: person.budget });
      A[p.id] = a;
      return { person, a };
    });
    if (!S.squads) S.squads = DEFAULT_SQUADS;
    if (!S.feed) S.feed = seedFeed();
    cloudSync();
  }

  // ---------- Tiger Data sync (js/db.js) ----------
  // Uploads purchases when the data set changes; the server ignores duplicates.
  let syncT;
  function cloudSync() {
    clearTimeout(syncT);
    syncT = setTimeout(async () => {
      if (!R.db.on || !S.onboarded) return;
      const txns = myTxns();
      const key = `${R.db.userId}:${S.source}:${txns.length}`;
      if (S.syncKey === key) return;
      try { await R.db.syncTxns(displayName(), txns, S.source === 'csv' ? 'csv' : 'demo'); S.syncKey = key; save(); }
      catch (e) { console.warn('cloud sync failed', e); }
    }, 400);
  }
  const privacy = (local) => (R.db.on ? '🔒 saved to your private mochii club account on Tiger Cloud · turn off in ⚙️' : local);
  const myTxns = () => [...(S.source === 'csv' && S.csvTxns ? S.csvTxns : DATA.me), ...S.extraTxns];
  const displayName = () => S.name.trim().slice(0, 18) || 'You';
  const personById = (id) => PEOPLE.find((p) => p.person.id === id);
  const nameOf = (id) => (id === 'me' ? displayName() : personById(id)?.person.name || id);

  // ---------- helpers ----------
  let toastT;
  function toast(msg) {
    let t = $('.toast', phone);
    if (!t) { t = document.createElement('div'); t.className = 'toast'; phone.appendChild(t); }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400);
  }
  function sheet(html, onMount) {
    closeSheet();
    const bd = document.createElement('div'); bd.className = 'backdrop';
    const sh = document.createElement('div'); sh.className = 'sheet';
    sh.innerHTML = `<div class="grab"></div>${html}`;
    phone.append(bd, sh);
    requestAnimationFrame(() => { bd.classList.add('on'); sh.classList.add('on'); });
    bd.onclick = closeSheet;
    if (onMount) onMount(sh);
    return sh;
  }
  function closeSheet() {
    phone.querySelectorAll('.backdrop, .sheet').forEach((el) => {
      el.classList.remove('on'); setTimeout(() => el.remove(), 300);
    });
  }
  const avatar = (p, cls = '') => `<div class="avatar ${cls}" style="background:${p.color}">${p.emoji}</div>`;
  const gradeColor = (g) => ({ A: '#6fdba8', B: '#b5e48c', C: '#ffd97a', D: '#ffa173', F: '#ff6b81' }[g]);
  const b64 = { enc: (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    dec: (s) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))) };
  const baseUrl = () => location.href.split('#')[0];
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove(); return ok;
    }
  }

  // ---------- routing ----------
  function route() {
    R.Story.active?.destroy();
    const h = location.hash.replace(/^#\/?/, '');
    const [page, arg] = h.split('/');
    if (page === 'share' && arg) return renderShare(arg);
    if (!S.onboarded) {
      if (page === 'join' && arg) S.pendingJoin = arg;
      return renderWelcome();
    }
    if (page === 'join' && arg) { location.replace('#/squads'); setTimeout(() => joinSquad(arg), 300); return; }
    renderShell(page === 'wrapped' ? 'home' : page === 'friends-wrapped' ? 'friends' : page || 'home');
    if (page === 'wrapped') playSolo();
    if (page === 'friends-wrapped') playFriends();
  }
  window.addEventListener('hashchange', route);

  // ---------- welcome / onboarding ----------
  // Two-step walkthrough: 1) your name, 2) where your receipts come from.
  const SOURCES = [
    { id: 'demo', em: '🏦', title: 'Connect your bank', sub: 'demo bank · 3 months of real-looking data', tag: 'fastest', cta: 'connect bank' },
    { id: 'csv', em: '📄', title: 'Upload a bank statement', sub: 'CSV export from any bank · or try a sample', cta: 'upload statement' },
    { id: 'gmail', em: '📧', title: 'Scan Gmail receipts', sub: 'Gemini reads your order confirmation emails', cta: 'scan my inbox' },
  ];
  function renderWelcome(step = S.name.trim() && S.welcomeStep === 2 ? 2 : 1) {
    const dots = `<div class="ob-dots" aria-label="step ${step} of 2">${[1, 2].map((i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>`;
    const shapes = `<div class="shape circle" style="width:300px;height:300px;top:-60px;right:-90px;background:var(--pink);animation:float 7s ease-in-out infinite alternate"></div>
      <div class="shape star" style="width:64px;height:64px;top:26px;right:170px;background:#22182a;animation:spin 20s linear infinite"></div>
      <div class="shape ring" style="width:110px;height:110px;top:70px;right:24px;border-width:14px;border-color:var(--purple);animation:float 6s ease-in-out infinite alternate-reverse"></div>`;
    if (step === 1) {
      phone.innerHTML = `<div class="welcome">${shapes}
        <div class="ob-top"><div class="logo"><span class="mochi" aria-hidden="true"></span>mochi<b>i</b><span class="club">club</span></div>${dots}</div>
        <h1>your money had a month. let’s talk about it.</h1>
        <p class="lead">spotify wrapped for your bank statement, plus friends who keep you accountable.</p>
        <form class="ob-name" id="obName">
          <label for="nm">first things first, what do we call you?</label>
          <input class="input" id="nm" maxlength="18" placeholder="your name" value="${esc(S.name)}" autocomplete="given-name" enterkeyhint="next">
          <button class="btn dark block" id="obNext" ${S.name.trim() ? '' : 'disabled'}>continue →</button>
        </form>
        <div class="fine">${privacy('🔒 everything stays in your browser')}</div>
      </div>`;
      const nm = $('#nm', phone); const next = $('#obNext', phone);
      nm.addEventListener('input', () => { S.name = nm.value; save(); next.disabled = !nm.value.trim(); });
      $('#obName', phone).onsubmit = (e) => { e.preventDefault(); if (!nm.value.trim()) return nm.focus(); S.welcomeStep = 2; save(); renderWelcome(2); };
      setTimeout(() => nm.focus(), 50);
      return;
    }
    let pick = S.welcomeSource || 'demo';
    phone.innerHTML = `<div class="welcome step2">
      <div class="ob-top"><button class="ob-back" id="obBack" aria-label="back">←</button><div class="logo"><span class="mochi" aria-hidden="true"></span>mochi<b>i</b><span class="club">club</span></div>${dots}</div>
      <h2 class="ob-h">nice to meet you, ${esc(displayName())} 👋</h2>
      <p class="lead">where should we pull your receipts from?</p>
      <div class="ob-sources" role="radiogroup">${SOURCES.map((o) => `
        <button class="ob-src ${o.id === pick ? 'on' : ''}" role="radio" aria-checked="${o.id === pick}" data-src="${o.id}">
          <span class="em">${o.em}</span><span class="grow"><b>${o.title}${o.tag ? ` <i class="tag">${o.tag}</i>` : ''}</b><small>${o.sub}</small></span><span class="radio"></span>
        </button>`).join('')}</div>
      <button class="btn dark block" id="obGo">${SOURCES.find((o) => o.id === pick).cta} →</button>
      <div class="fine">${privacy('🔒 read-only · stays on your device · switch anytime')}</div>
    </div>`;
    phone.querySelectorAll('[data-src]').forEach((b) => (b.onclick = () => {
      pick = b.dataset.src; S.welcomeSource = pick; save();
      phone.querySelectorAll('[data-src]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
      $('#obGo', phone).textContent = `${SOURCES.find((o) => o.id === pick).cta} →`;
    }));
    $('#obBack', phone).onclick = () => { S.welcomeStep = 1; save(); renderWelcome(1); };
    $('#obGo', phone).onclick = () => {
      if (pick === 'demo') finishOnboarding('demo');
      else if (pick === 'gmail') openGmailScan(true);
      else openImporter({ fromWelcome: true });
    };
  }
  function finishOnboarding(source) {
    S.source = source === 'csv' ? 'csv' : 'demo';
    S.onboarded = true; delete S.welcomeStep; delete S.welcomeSource; save(); recompute();
    const join = S.pendingJoin; delete S.pendingJoin;
    location.hash = join ? `#/join/${join}` : '#/home';
    if (!join) setTimeout(playSolo, 350);
  }

  // ---------- CSV import flow: drop -> reading -> review -> wrapped ----------
  const BANKS = ['Chase', 'BofA', 'Capital One', 'Amex', 'Discover', 'Wells Fargo', 'Apple Card', 'Chime', 'Citi'];
  const QUIPS = ['counting the starbucks runs ☕', 'spotting the 2am purchases 🌙', 'finding subscriptions you forgot 👻',
    'judging your doordash habit 🛵', 'sorting the chaos into categories 🗂️', 'ignoring your paychecks (we only roast spending) 💸'];
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const monthRange = (txns) => {
    const ks = [...new Set(txns.map((t) => localKey(new Date(t.date))))].sort();
    const lb = (k) => R.monthLabel(k).slice(0, 3);
    return { n: ks.length, label: ks.length > 1 ? `${lb(ks[0])}–${lb(ks[ks.length - 1])}` : lb(ks[0]) };
  };

  function openImporter({ fromWelcome = false, file = null, sample = false } = {}) {
    closeImporter();
    const el = document.createElement('div'); el.className = 'importer'; phone.appendChild(el);
    let csvText = '', fileName = '', sign = null, txns = null;

    const close = () => closeImporter();
    const steps = (n) => `<div class="imp-top"><button class="icon-btn" data-imp="back" aria-label="back">←</button>
      <div class="imp-steps">${[1, 2, 3].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div><span class="imp-count">${n}/3</span></div>`;

    function drop() {
      el.innerHTML = `${steps(1)}
        <div class="shape circle" style="width:220px;height:220px;top:-70px;right:-80px;background:var(--purple);opacity:.55;animation:float 7s ease-in-out infinite alternate"></div>
        <div class="imp-body">
          <div class="kicker">bring your own receipts</div>
          <h2 class="imp-h">show us the statement 👀</h2>
          <p class="imp-sub">drop a bank CSV and we’ll turn it into your wrapped. no login, no linking, no drama.</p>
          <label class="dropzone" id="dz" tabindex="0">
            <input type="file" accept=".csv,text/csv" hidden id="impFile">
            <div class="dz-em">📄</div>
            <b class="dz-t">drag your CSV here</b>
            <small class="dz-s">or tap to pick a file</small>
          </label>
          <button class="sample-btn" data-imp="sample"><span class="em">⚡</span><span class="grow"><b>no CSV? use a sample statement</b><small>3 months of a very real college student</small></span><span class="arrow">→</span></button>
          <div class="banks"><small>works with</small>${BANKS.map((b) => `<span>${b}</span>`).join('')}<span>+ most banks</span></div>
          <details class="howto"><summary>how do I get my CSV? 🤔</summary>
            <ol><li>open your bank’s <b>website</b> (the app usually can’t export, sadly)</li>
              <li>go to <b>activity</b> or <b>statements</b> → <b>download</b> / <b>export</b></li>
              <li>pick <b>CSV</b> and the last <b>3 months</b>. more months = spicier wrapped</li></ol>
            <button class="link" data-imp="download">download the sample CSV to see the format ⬇</button>
          </details>
          <p class="imp-fine">${R.db.on ? '🔒 parsed on your device, then saved to your private account on Tiger Cloud (turn off in ⚙️).' : '🔒 parsed on your device. nothing gets uploaded, not even to us.'}</p>
        </div>`;
      const dz = $('#dz', el); const inp = $('#impFile', el);
      inp.onchange = () => inp.files[0] && readFile(inp.files[0]);
      dz.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } };
      let depth = 0;
      dz.ondragenter = (e) => { e.preventDefault(); depth++; dz.classList.add('over'); $('.dz-t', dz).textContent = 'yesss drop it 🫳'; };
      dz.ondragleave = () => { if (--depth <= 0) { depth = 0; dz.classList.remove('over'); $('.dz-t', dz).textContent = 'drag your CSV here'; } };
      dz.ondragover = (e) => e.preventDefault();
      dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) readFile(f); };
    }

    async function readFile(f) {
      if (!/\.csv$/i.test(f.name) && !/csv|text\/plain/.test(f.type)) return toast('that’s not a CSV bestie 🙅');
      try { csvText = await f.text(); fileName = f.name; sign = null; parse(true); }
      catch { toast('couldn’t read that file 😵'); }
    }
    function useSample() { csvText = R.buildSampleCSV(); fileName = 'sample-statement.csv'; sign = null; parse(true); }

    function parse(animate) {
      try {
        try { txns = R.parseCSV(csvText); sign = null; }
        catch (e) {
          if (e.code !== 'CSV_SIGN_REQUIRED') throw e;
          sign = sign || R.guessSpendingSign(csvText);
          txns = R.parseCSV(csvText, { spendingSign: sign });
        }
      } catch (e) { return fail(e.message); }
      animate ? reading() : review();
    }

    function fail(msg) {
      el.innerHTML = `${steps(1)}<div class="imp-body imp-center">
        <div class="dz-em big">😵‍💫</div><h2 class="imp-h">ok that CSV is giving… nothing</h2>
        <p class="imp-sub">${/^Need columns/.test(msg) ? '' : esc(msg.toLowerCase()) + '. '}we need columns like <b>Date</b>, <b>Description</b> and <b>Amount</b> (or Debit/Credit).</p>
        <button class="btn block" data-imp="retry">try another file</button>
        <button class="btn block ghost" data-imp="sample" style="margin-top:10px">⚡ use the sample instead</button></div>`;
    }

    function reading() {
      const preview = txns.filter((t, i) => i % Math.max(1, Math.floor(txns.length / 7)) === 0).slice(-7);
      el.innerHTML = `${steps(2)}<div class="imp-body">
        <div class="kicker">${esc(fileName)}</div>
        <h2 class="imp-h">reading your receipts…</h2>
        <div class="read-meter"><i id="rm"></i></div>
        <div class="read-row"><span class="spinner"></span><span id="quip">${QUIPS[0]}</span><b class="num" id="rc">0</b></div>
        <div class="scan-list" id="rl"></div></div>`;
      const rm = $('#rm', el), rc = $('#rc', el), rl = $('#rl', el), quip = $('#quip', el);
      const dur = reduceMotion() ? 500 : 2600; const t0 = performance.now(); let shown = 0;
      const tick = (now) => {
        if (!el.isConnected) return;
        const p = Math.min(1, (now - t0) / dur);
        rm.style.width = `${p * 100}%`;
        rc.textContent = Math.round(p * txns.length);
        quip.textContent = QUIPS[Math.min(QUIPS.length - 1, Math.floor(p * QUIPS.length))];
        while (shown < Math.ceil(p * preview.length)) {
          const t = preview[shown++]; const c = R.CATEGORIES[t.category] || R.CATEGORIES.Other;
          rl.insertAdjacentHTML('afterbegin', `<div class="scan-item"><span style="font-size:20px">${c.emoji}</span>
            <div><b>${esc(t.merchant)}</b><small>${new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small></div>
            <span class="cat-tag" style="--c:${c.color}">${esc(t.category)}</span><span class="num amt-s">${money(t.amount)}</span></div>`);
        }
        if (p < 1) requestAnimationFrame(tick); else setTimeout(() => el.isConnected && review(), reduceMotion() ? 0 : 350);
      };
      requestAnimationFrame(tick);
    }

    function review() {
      const total = txns.reduce((s, t) => s + t.amount, 0);
      const range = monthRange(txns);
      const byCat = Object.entries(txns.reduce((m, t) => ((m[t.category] = (m[t.category] || 0) + t.amount), m), {})).sort((a, b) => b[1] - a[1]);
      const merchants = Object.values(txns.reduce((m, t) => {
        const g = (m[t.merchant] ||= { name: t.merchant, cat: t.category, amt: 0, n: 0 }); g.amt += t.amount; g.n++; return m;
      }, {})).sort((a, b) => b.amt - a.amt);
      const unsorted = merchants.filter((m) => m.cat === 'Other');
      const top = merchants.filter((m) => m.cat !== 'Other').slice(0, 5);
      const mRow = (m) => `<div class="m-row"><div class="ic">${R.CATEGORIES[m.cat].emoji}</div>
        <div class="grow"><b>${esc(m.name)}</b><small>${m.n}× · ${money(m.amt, 0)}</small></div>
        <button class="cat-tag" style="--c:${R.CATEGORIES[m.cat].color}" data-imp="recat" data-m="${esc(m.name)}">${esc(m.cat)} ✎</button></div>`;
      el.innerHTML = `${steps(3)}<div class="imp-body">
        <div class="kicker">${esc(fileName)}</div>
        <h2 class="imp-h">the receipts are in 🧾</h2>
        <div class="tiles">
          <div class="tile lime"><b class="num">${txns.length}</b><small>purchases</small></div>
          <div class="tile pink"><b class="num">${money(total, 0)}</b><small>spent total</small></div>
          <div class="tile purple"><b>${range.label}</b><small>${range.n} month${range.n > 1 ? 's' : ''}</small></div>
        </div>
        ${txns.meta?.skipped ? `<p class="imp-note">💸 skipped ${txns.meta.skipped > 1 ? `${txns.meta.skipped} deposits & refunds` : '1 deposit or refund'}. we only roast spending.</p>` : ''}
        ${range.n < 2 ? `<p class="imp-note warn">only 1 month found. add 2–3 months to unlock “vs last month” + predictions 🔮</p>` : ''}
        ${sign ? `<div class="sign-row"><span>purchases show up as</span><div class="seg">
          <button class="${sign === 'negative' ? 'on' : ''}" data-imp="sign" data-v="negative">−6.45</button>
          <button class="${sign === 'positive' ? 'on' : ''}" data-imp="sign" data-v="positive">+6.45</button></div></div>` : ''}
        <div class="stack">${byCat.map(([c, v]) => `<i style="flex:${v};background:${R.CATEGORIES[c].color}" title="${esc(c)}"></i>`).join('')}</div>
        <div class="legend">${byCat.slice(0, 6).map(([c, v]) => `<span><i style="background:${R.CATEGORIES[c].color}"></i>${R.CATEGORIES[c].emoji} ${esc(c)} <b class="num">${Math.round((v / total) * 100)}%</b></span>`).join('')}</div>
        ${unsorted.length ? `<div class="section-h"><h3>we couldn’t place these 🤷</h3><small>tap to sort</small></div>
          <div class="card m-list">${unsorted.slice(0, 8).map(mRow).join('')}</div>`
        : `<p class="imp-note good">we sorted every single purchase. we’re kinda good at this 💅</p>`}
        <div class="section-h"><h3>your top spots</h3><small>wrong? tap to fix</small></div>
        <div class="card m-list">${top.map(mRow).join('')}</div>
        <div class="imp-cta"><button class="btn block" data-imp="go">generate my wrapped ✨</button>
          <button class="link" data-imp="retry">use a different file</button></div></div>`;
    }

    function recat(name) {
      const cur = txns.find((t) => t.merchant === name)?.category;
      sheet(`<h3>${esc(name)} is…</h3><p class="sub">we’ll apply it to every ${esc(name)} purchase.</p>
        <div class="cat-grid">${Object.entries(R.CATEGORIES).map(([c, v]) => `<button class="${c === cur ? 'on' : ''}" data-c="${c}" style="--c:${v.color}"><span>${v.emoji}</span>${c}</button>`).join('')}</div>`, (sh) => {
        sh.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => {
          const c = b.dataset.c;
          txns.forEach((t) => { if (t.merchant === name) { t.category = c; t.recurring = c === 'Subscriptions'; } });
          closeSheet(); review(); toast(`${name} → ${R.CATEGORIES[c].emoji} ${c}`);
        }));
      });
    }

    function go() {
      S.csvTxns = [...txns]; S.csvIncome = txns.income || []; S.source = 'csv'; save();
      closeImporter();
      if (fromWelcome) return finishOnboarding('csv');
      recompute(); cal.month = null;
      if (location.hash !== '#/home') location.hash = '#/home'; else route();
      setTimeout(playSolo, 350);
    }

    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-imp]'); if (!b) return;
      const act = b.dataset.imp;
      if (act === 'back') close();
      else if (act === 'sample') useSample();
      else if (act === 'retry') drop();
      else if (act === 'download') {
        const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([R.buildSampleCSV()], { type: 'text/csv' })); l.download = 'sample-statement.csv'; l.click();
      }
      else if (act === 'sign') { sign = b.dataset.v; try { txns = R.parseCSV(csvText, { spendingSign: sign }); review(); } catch (err) { toast(err.message); } }
      else if (act === 'recat') recat(b.dataset.m);
      else if (act === 'go') go();
    });
    requestAnimationFrame(() => el.classList.add('on'));
    if (file) readFile(file); else if (sample) useSample(); else drop();
  }
  function closeImporter() {
    phone.querySelectorAll('.importer').forEach((el) => { el.classList.remove('on'); setTimeout(() => el.remove(), 300); });
  }
  // dropping a CSV anywhere on the phone opens the importer instead of navigating the browser to the file
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files[0];
    if (f && !e.target.closest?.('.dropzone') && !R.Story.active) openImporter({ fromWelcome: !S.onboarded, file: f });
  });

  // ---------- Gmail / MCP receipt scan ----------
  function openGmailScan(fromWelcome) {
    const sample = DATA.me.filter((t) => !t.recurring).slice(-60).filter((_, i) => i % 6 === 0).slice(0, 7);
    const subj = { Delivery: 'Your order is on its way', Shopping: 'Your order has shipped', Transport: 'Your trip receipt', Coffee: 'Thanks for your order', Food: 'Order confirmation', Entertainment: 'Your tickets are here', Groceries: 'Your receipt' };
    sheet(`<h3>📧 scanning your inbox</h3>
      <p class="sub">An MCP server pulls order &amp; receipt emails from Gmail; Gemini extracts merchant, amount and category from each one.</p>
      <div class="row muted" style="font-size:14px"><span class="spinner"></span><span id="scanStatus">connecting to gmail via MCP…</span></div>
      <div class="scan-list" id="scanList"></div>
      <button class="btn block" id="scanDone" disabled>building your wrapped…</button>
      <div class="section-h"><h3>try it live</h3><small>${R.gemini.enabled ? 'Gemini connected ✨' : 'add a Gemini key in ⚙️ for AI parsing'}</small></div>
      <textarea class="input" id="rcpt" placeholder="paste any receipt / order confirmation email here…"></textarea>
      <div class="row" style="margin-top:10px"><button class="btn sm ghost" id="rcptSample">use sample</button><button class="btn sm" id="rcptGo">parse receipt ✨</button></div>
      <div id="rcptOut" style="margin-top:12px"></div>`, (sh) => {
      const list = $('#scanList', sh); const status = $('#scanStatus', sh);
      let i = 0;
      const iv = setInterval(() => {
        if (!sh.isConnected) return clearInterval(iv);
        if (i < sample.length) {
          const t = sample[i++];
          status.textContent = `found ${i * 6 + 3} receipts… parsing with Gemini`;
          list.insertAdjacentHTML('beforeend', `<div class="scan-item"><span style="font-size:20px">${R.CATEGORIES[t.category].emoji}</span>
            <div><b>${esc(t.merchant)}</b><small>“${subj[t.category] || 'Receipt'}” · ${new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small></div><span class="ok">${money(t.amount)} ✓</span></div>`);
        } else {
          clearInterval(iv);
          status.parentElement.innerHTML = `<span style="color:var(--mint);font-weight:800">✓ ${DATA.me.length} transactions across 3 months</span>`;
          const b = $('#scanDone', sh); b.disabled = false; b.textContent = fromWelcome ? 'see my wrapped →' : 'done';
          b.onclick = () => { closeSheet(); if (fromWelcome) finishOnboarding('demo'); };
        }
      }, 420);
      $('#rcptSample', sh).onclick = () => {
        $('#rcpt', sh).value = `From: DoorDash <no-reply@doordash.com>\nSubject: Order Confirmation for ${displayName()} from Chipotle Mexican Grill\n\nThanks for your order! Your Dasher is on the way.\n1x Burrito Bowl (double chicken)  $14.25\n1x Chips & Guac  $5.10\nDelivery Fee  $2.99\nService Fee  $3.48\nDasher Tip  $4.00\nTotal Charged: $29.82\nOctober 8, 2026 11:47 PM`;
      };
      $('#rcptGo', sh).onclick = async () => {
        const txt = $('#rcpt', sh).value.trim(); if (!txt) return toast('paste a receipt first');
        const out = $('#rcptOut', sh); out.innerHTML = '<span class="spinner"></span> reading receipt…';
        let r;
        try { r = await R.ai.parseReceipt(txt); }
        catch (e) { out.textContent = e.message; return; }
        const cat = R.CATEGORIES[r.category] ? r.category : 'Other';
        out.innerHTML = `<div class="card"><div class="txn"><div class="ic">${R.CATEGORIES[cat].emoji}</div><div class="grow"><b>${esc(r.merchant)}</b><small>${esc(cat)} · ${esc(r.date)} · ${esc(r.items || '')}</small></div><div class="amt num">${money(+r.amount || 0)}</div></div>
          <div class="row" style="justify-content:space-between;margin-top:8px"><small class="muted">parsed via ${r.via === 'gemini' ? '✨ Gemini' : 'offline regex'}</small><button class="btn sm" id="rcptAdd">add to my spending</button></div></div>`;
        $('#rcptAdd', sh).onclick = () => {
          try { r = R.validateReceipt(r); } catch (e) { out.textContent = e.message; return; }
          S.extraTxns.push({ ...R.parseTransactionDate(r.date), merchant: r.merchant, category: cat, amount: r.amount, recurring: cat === 'Subscriptions' });
          save(); recompute(); toast('added 🧾'); if (S.onboarded && !fromWelcome) route();
          $('#rcptAdd', sh).disabled = true; $('#rcptAdd', sh).textContent = 'added ✓';
        };
      };
    });
  }

  // ---------- shell ----------
  const TABS = [['home', '🧾', 'Wrapped'], ['future', '🔮', 'Future'], ['learn', '🎓', 'Learn'], ['friends', '👯', 'Friends'], ['squads', '🤝', 'Squads'], ['roasts', '🔥', 'Roasts']];
  function renderShell(page) {
    if (!TABS.some((t) => t[0] === page)) page = 'home';
    phone.innerHTML = `
      <div class="topbar"><div class="logo"><span class="mochi" aria-hidden="true"></span>mochi<b>i</b><span class="club">club</span></div>
        <div class="row" style="gap:8px"><button class="icon-btn" data-act="gmail" title="import receipts">📧</button><button class="icon-btn" data-act="settings" title="settings">⚙️</button></div></div>
      <main class="screen" id="screen"></main>
      <nav class="tabbar">${TABS.map(([id, ic, lb]) => `<a class="tab ${id === page ? 'on' : ''}" href="#/${id}"><span>${ic}</span>${lb}</a>`).join('')}</nav>`;
    const screen = $('#screen', phone);
    ({ home: renderHome, future: renderFuture, learn: renderLearn, friends: renderFriends, squads: renderSquads, roasts: renderRoasts })[page](screen);
  }

  // ---------- LEARN (js/learn.js) ----------
  function renderLearn(el) {
    R.learn.render(el, { phone, toast, sheet, closeSheet, name: displayName, rerender: () => (location.hash === '#/learn' ? route() : (location.hash = '#/learn')) });
  }

  // ---------- FUTURE (js/forecast.js + js/future.js) ----------
  const myIncome = () => (S.source === 'csv' ? S.csvIncome || [] : R.forecast.demoIncome());
  const futureCtx = () => ({ phone, toast, sheet, closeSheet, name: displayName, txns: myTxns, income: myIncome });
  function renderFuture(el) { R.future.render(el, futureCtx()); }

  // ---------- HOME ----------
  function renderHome(el) {
    const a = A.me;
    const C = 2 * Math.PI * 44;
    const ch = S.challenge;
    el.innerHTML = `
      <h1 class="title">${esc(a.monthLabel)}<br><span class="muted">receipts</span></h1>
      ${R.learn.homeCard()}
      ${R.future.homeCard(futureCtx())}
      <div class="hero" data-act="play">
        <div class="shape blob" style="width:220px;height:220px;top:-50px;right:-50px;background:var(--pink);animation:morph 8s ease-in-out infinite alternate"></div>
        <div class="shape star" style="width:64px;height:64px;bottom:26px;right:28px;background:var(--lime);animation:spin 16s linear infinite"></div>
        <div class="shape ring" style="width:90px;height:90px;top:18px;right:26px;border-width:12px;border-color:var(--yellow);animation:float 5s ease-in-out infinite alternate"></div>
        <div class="kicker">just dropped</div>
        <h2>your ${esc(a.monthLabel)} wrapped is ready</h2>
        <span class="btn dark play">▶ play it</span>
      </div>

      <div class="card predict" style="margin-top:12px">
        <div style="font-weight:800">🔮 ${ch ? 'challenge active' : 'we predict'} · ${esc(a.nextLabel)}</div>
        ${ch ? `<div class="big num">beat ${money(ch.target, 0)}</div>
          <div class="muted" style="font-weight:600">that’s ${money(ch.target / 31, 0)}/day. your squads have been notified 👀</div>
          <div class="progress"><i style="width:${Math.round((9 / 31) * 100)}%"></i></div>
          <div class="row" style="justify-content:space-between;font-size:13px;font-weight:700"><span>day 9 of 31</span><span>${money(ch.target - (ch.target / 31) * 9, 0)} left to spend</span></div>`
        : `<div class="big num">${money(a.prediction, 0)}</div>
          <div class="muted" style="font-weight:600">that’s our bet for next month. prove me wrong.</div>
          <button class="btn dark sm" style="margin-top:12px" data-act="challenge">challenge accepted 🤝</button>`}
      </div>

      <div class="section-h"><h3>calendar</h3><small>tap a day</small></div>
      <div class="card cal" id="cal"></div>

      <div class="section-h"><h3>health score</h3><small>${esc(a.score.vibe)}</small></div>
      <div class="card score-card">
        <div class="ring"><svg width="104" height="104"><circle cx="52" cy="52" r="44" stroke="var(--surface-2)" stroke-width="12" fill="none"/>
          <circle class="fg" cx="52" cy="52" r="44" stroke="${gradeColor(a.score.grade)}" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${C * (1 - a.score.score / 100)}"/></svg>
          <div class="lbl"><div><b class="num">${a.score.score}</b><small>grade ${a.score.grade}</small></div></div></div>
        <div class="parts">${a.score.parts.map((p) => `<div class="part"><div class="row" style="justify-content:space-between"><span>${p.label}</span><span class="muted num">${Math.round(p.pts)}/${p.max}</span></div><div class="bar"><i style="width:0" data-w="${(p.pts / p.max) * 100}%"></i></div></div>`).join('')}</div>
      </div>

      <div class="section-h"><h3>glow-up plan</h3><small>save up to ${money(a.insights.reduce((s, i) => s + i.save, 0), 0)}/yr</small></div>
      <div id="plan"></div>
      ${a.insights.slice(0, 4).map((i) => `<div class="card insight"><div class="em">${i.emoji}</div><div class="grow"><h4>${esc(i.title)}</h4><p>${esc(i.body)}</p><div class="save">save ~${money(i.save, 0)}/yr</div></div></div>`).join('')}
      <button class="btn block ghost" style="margin-top:12px" data-act="plan">✨ build my glow-up plan${R.gemini.enabled ? ' with Gemini' : ''}</button>

      <div class="section-h"><h3>where it went</h3><small>vs ${esc(a.prevLabel || 'last month')}</small></div>
      <div class="card cats">${a.byCat.slice(0, 7).map((c) => {
        const prev = a.catDeltas.find((d) => d.cat === c.cat)?.prev || 0;
        const dp = prev ? Math.round(((c.amt - prev) / prev) * 100) : null;
        return `<div class="cat-row"><div class="top"><span>${R.CATEGORIES[c.cat].emoji} ${esc(c.cat)} ${dp !== null ? `<span class="delta ${dp > 0 ? 'up' : 'down'}">${dp > 0 ? '▲' : '▼'}${Math.abs(dp)}%</span>` : ''}</span><span class="num">${money(c.amt, 0)}</span></div>
          <div class="bar"><i style="width:${a.byCat[0].amt > 0 ? (c.amt / a.byCat[0].amt) * 100 : 0}%;background:${R.CATEGORIES[c.cat].color}"></i></div></div>`;
      }).join('')}</div>

      <div class="section-h"><h3>recent</h3><small>${S.source === 'csv' ? 'from your CSV' : 'demo bank'} · tap to get roasted</small></div>
      <div class="card" style="padding:6px 16px">${recentTxns().map((t, i) => `<div class="txn"><div class="ic">${R.CATEGORIES[t.category]?.emoji || '🧾'}</div>
        <div class="grow"><b>${esc(t.merchant)}</b><small>${new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${t.noTime ? '' : ' · ' + new Date(t.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</small></div>
        <div style="text-align:right"><div class="amt num">${money(t.amount)}</div><button class="roast-it" data-act="roastTxn" data-i="${i}">🔥 roast</button></div></div>`).join('')}</div>
      <button class="btn block ghost" style="margin-top:12px" data-act="gmail">📧 add a receipt from email</button>
      ${S.source === 'csv' ? '' : `<div class="byo" data-act="import"><span class="em">📄</span><div class="grow"><b>this is demo money 👀</b><small>drop your real bank CSV for your actual wrapped</small></div><span class="arrow">→</span></div>`}`;
    renderCalendar();
    requestAnimationFrame(() => setTimeout(() => {
      el.querySelectorAll('[data-off]').forEach((c) => (c.style.strokeDashoffset = c.dataset.off));
      el.querySelectorAll('[data-w]').forEach((b) => (b.style.width = b.dataset.w));
    }, 80));
  }
  // ---------- spending calendar ----------
  const pad2 = (n) => String(n).padStart(2, '0');
  const localKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  let cal = { month: null, day: null };
  function renderCalendar() {
    const box = $('#cal'); if (!box) return;
    const txns = myTxns();
    const months = [...new Set(txns.map((t) => localKey(new Date(t.date))))].sort();
    if (!months.includes(cal.month)) { cal.month = A.me.month; cal.day = null; }
    const [y, m] = cal.month.split('-').map(Number);
    const nd = new Date(y, m, 0).getDate();
    const lead = new Date(y, m - 1, 1).getDay();
    const days = Array.from({ length: nd + 1 }, () => ({ amt: 0, txns: [] }));
    for (const t of txns) {
      const d = new Date(t.date);
      if (localKey(d) !== cal.month) continue;
      days[d.getDate()].amt += t.amount; days[d.getDate()].txns.push(t);
    }
    const max = Math.max(1, ...days.map((d) => d.amt));
    const spendDays = days.slice(1).filter((d) => d.amt > 0).length;
    const peak = days.reduce((best, d, i) => (i && d.amt > (days[best]?.amt || 0) ? i : best), 1);
    if (cal.day === null || cal.day > nd) cal.day = peak;
    const total = days.reduce((s, d) => s + d.amt, 0);
    const mi = months.indexOf(cal.month);
    const today = new Date();
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<div></div>');
    for (let d = 1; d <= nd; d++) {
      const amt = days[d].amt;
      const k = amt ? 0.14 + 0.86 * Math.pow(amt / max, 0.7) : 0;
      const isToday = localKey(today) === cal.month && today.getDate() === d;
      cells.push(`<button class="cal-d ${d === cal.day ? 'sel' : ''} ${isToday ? 'today' : ''} ${k > 0.55 ? 'hot' : ''}" data-act="calDay" data-d="${d}"
        style="${amt ? `background:rgba(181,228,140,${k.toFixed(2)})` : ''}" aria-label="${R.monthLabel(cal.month)} ${d}: ${money(amt)}">
        <b>${d}</b><small>${amt ? (amt >= 100 ? '$' + Math.round(amt) : money(amt, 0)) : '·'}</small></button>`);
    }
    const sel = days[cal.day];
    const selDate = new Date(y, m - 1, cal.day);
    box.innerHTML = `
      <div class="cal-head">
        <button class="icon-btn sm" data-act="calNav" data-dir="-1" ${mi <= 0 ? 'disabled' : ''} aria-label="previous month"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>
        <div style="text-align:center"><b>${R.monthLabel(cal.month)} ${y}</b><small>${money(total, 0)} · ${spendDays} spend days · ${nd - spendDays} no-spend</small></div>
        <button class="icon-btn sm" data-act="calNav" data-dir="1" ${mi >= months.length - 1 ? 'disabled' : ''} aria-label="next month"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>
      </div>
      <div class="cal-grid">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w) => `<span class="cal-w">${w}</span>`).join('')}${cells.join('')}</div>
      <div class="cal-legend"><span>less</span>${[0.14, 0.4, 0.7, 1].map((a) => `<i style="background:rgba(181,228,140,${a})"></i>`).join('')}<span>more</span></div>
      <div class="cal-detail">
        <div class="row" style="justify-content:space-between;margin-bottom:4px">
          <b>${selDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</b>
          <b class="num" style="color:var(--lime)">${money(sel.amt)}</b>
        </div>
        ${sel.txns.length ? sel.txns.sort((a, b) => a.date.localeCompare(b.date)).map((t) => `<div class="txn"><div class="ic">${R.CATEGORIES[t.category]?.emoji || '🧾'}</div>
          <div class="grow"><b>${esc(t.merchant)}</b><small>${esc(t.category)}${t.noTime ? '' : ' · ' + new Date(t.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</small></div>
          <div class="amt num">${money(t.amount)}</div></div>`).join('')
          : '<p class="muted" style="padding:10px 0;font-size:14px">no-spend day ✨ your wallet got to rest.</p>'}
      </div>`;
  }

  const recentTxns = () => {
    const all = myTxns().filter((t) => !t.recurring);
    return all.sort((x, y) => y.date.localeCompare(x.date)).slice(0, 10);
  };

  async function showPlan(btn) {
    const box = $('#plan'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> cooking…';
    const p = await R.ai.glowUp(A.me, displayName());
    box.innerHTML = `<div class="card plan" style="margin-bottom:12px"><div class="muted" style="font-size:12px;font-weight:700">${p.fallback ? 'YOUR PLAN' : '✨ GEMINI PLAN'}</div><h4>${esc(p.headline)}</h4>
      ${p.steps.map((s) => `<div class="step"><div style="font-size:22px">${esc(s.emoji)}</div><div class="grow"><b>${esc(s.title)}</b><p>${esc(s.detail)}</p></div><div class="save">+${money(s.save, 0)}/mo</div></div>`).join('')}</div>`;
    btn.innerHTML = '↺ regenerate plan'; btn.disabled = false;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ---------- FRIENDS ----------
  function renderFriends(el) {
    const sup = R.superlatives(PEOPLE);
    const pal = ['#ff8fb8', '#b5e48c', '#ffa173', '#a18bff', '#7fdcd0', '#ffd97a', '#5b8cff', '#6fdba8'];
    const ranked = [...PEOPLE].sort((x, y) => y.a.score.score - x.a.score.score);
    el.innerHTML = `
      <h1 class="title">friends</h1>
      <div class="hero friends" data-act="playFriends" style="min-height:200px">
        <div class="shape circle" style="width:180px;height:180px;top:-40px;right:-30px;background:var(--lime);animation:float 6s ease-in-out infinite alternate"></div>
        <div class="shape burst" style="width:64px;height:64px;bottom:24px;right:28px;background:#22182a;animation:spin 14s linear infinite"></div>
        <div class="kicker" style="color:#22182a">${PEOPLE.length} friends · ${esc(A.me.monthLabel)}</div>
        <h2 style="color:#22182a">friends wrapped</h2>
        <span class="btn dark play">▶ play</span>
      </div>
      <div class="section-h"><h3>most likely to…</h3><small>swipe →</small></div>
      <div class="hscroll">${sup.map((s, i) => `<div class="superl" style="background:${pal[i % pal.length]};${i === 3 || i === 6 ? 'color:#fff' : ''}">
        <div class="em">${s.emoji}</div><h4>${esc(s.title)}</h4>
        <div class="who">${avatar(s.who.person, 'sm')}${esc(s.who.person.id === 'me' ? displayName() : s.name)}</div><small>${esc(s.stat)}</small></div>`).join('')}</div>
      <div class="section-h"><h3>leaderboard</h3><small>by health score</small></div>
      <div class="card" style="padding:8px">${ranked.map((f, i) => `<div class="lb-row ${f.person.id === 'me' ? 'me' : ''}" data-act="profile" data-id="${f.person.id}">
        <div class="rank">${i + 1}</div>${avatar(f.person)}
        <div class="grow"><b>${esc(f.person.id === 'me' ? displayName() + ' (you)' : f.person.name)}</b><div class="muted" style="font-size:12px">${esc(f.a.aura.title)}</div></div>
        <div style="text-align:right;margin-right:6px"><b class="num">${money(f.a.total, 0)}</b><div class="delta ${f.a.deltaPct > 0 ? 'up' : 'down'}">${f.a.deltaPct > 0 ? '▲' : '▼'}${Math.abs(Math.round(f.a.deltaPct * 100))}%</div></div>
        <div class="grade" style="background:${gradeColor(f.a.score.grade)}">${f.a.score.grade}</div></div>`).join('')}</div>
      <button class="btn block ghost" style="margin-top:12px" data-act="invite">➕ invite friends</button>`;
  }

  function openProfile(id) {
    const f = personById(id); const a = f.a; const p = f.person;
    sheet(`<div style="text-align:center">${avatar(p, 'lg')}
        <h3 style="margin-top:10px">${esc(id === 'me' ? displayName() : p.name)}</h3><div class="muted">${esc(p.handle)}</div>
        <div class="pill" style="margin-top:10px;background:linear-gradient(90deg,${a.aura.grad[0]},${a.aura.grad[1]});color:#22182a">${esc(a.aura.title)}</div></div>
      <div class="row" style="margin:18px 0;gap:8px">
        <div class="card grow" style="padding:12px;text-align:center"><div class="muted" style="font-size:12px">spent</div><b class="num">${money(a.total, 0)}</b></div>
        <div class="card grow" style="padding:12px;text-align:center;margin:0"><div class="muted" style="font-size:12px">vs last mo</div><b class="delta ${a.deltaPct > 0 ? 'up' : 'down'}" style="font-size:16px">${a.deltaPct > 0 ? '+' : ''}${Math.round(a.deltaPct * 100)}%</b></div>
        <div class="card grow" style="padding:12px;text-align:center;margin:0"><div class="muted" style="font-size:12px">score</div><b>${a.score.score} · ${a.score.grade}</b></div>
      </div>
      <div class="cats">${a.byCat.slice(0, 3).map((c) => `<div class="cat-row"><div class="top"><span>${R.CATEGORIES[c.cat].emoji} ${esc(c.cat)}</span><span class="num">${money(c.amt, 0)}</span></div><div class="bar"><i style="width:${a.byCat[0].amt > 0 ? (c.amt / a.byCat[0].amt) * 100 : 0}%;background:${R.CATEGORIES[c.cat].color}"></i></div></div>`).join('')}</div>
      <p class="muted" style="margin-top:14px;font-size:14px">${a.topMerchant && a.mostVisited ? `top merchant: <b style="color:#fff">${esc(a.topMerchant.name)}</b> (${money(a.topMerchant.amt, 0)}) · on repeat: <b style="color:#fff">${esc(a.mostVisited.name)} ×${a.mostVisited.count}</b>` : 'no non-subscription spending this month'}${a.subs.length ? `<br>subscriptions: ${a.subs.map((s) => `${esc(s.name)} (${money(s.amt)})`).join(', ')}` : ''}</p>
      <div id="pr" class="card" style="margin-top:14px;display:none"></div>
      <div class="share-actions">
        <button class="btn" data-x="wrap">▶ their wrapped</button>
        ${id !== 'me' ? `<button class="btn ghost" data-x="roast">🔥 roast</button><button class="btn ghost" data-x="nudge">👀 nudge</button>` : ''}
      </div>`, (sh) => {
      sh.querySelector('[data-x=wrap]').onclick = () => { closeSheet(); playSolo(id); };
      const r = sh.querySelector('[data-x=roast]');
      if (r) r.onclick = async () => {
        const box = $('#pr', sh); box.style.display = 'block'; box.innerHTML = '<span class="spinner"></span>';
        const txt = await R.ai.roast(a, p.name);
        box.innerHTML = `<div style="font-weight:700;font-size:16px;line-height:1.35">${esc(txt)}</div>`;
      };
      const n = sh.querySelector('[data-x=nudge]');
      if (n) n.onclick = () => { toast(`nudged ${p.name}: “put the phone down” 📵`); closeSheet(); };
    });
  }

  // ---------- SQUADS ----------
  function squadStatus(sq) {
    return sq.members.map((id) => {
      const a = A[id]; const amt = a?.byCat.find((c) => c.cat === sq.cat)?.amt || 0;
      return { id, amt, ok: amt <= sq.limit };
    }).sort((x, y) => x.amt - y.amt);
  }
  function renderSquads(el) {
    el.innerHTML = `
      <h1 class="title">squads</h1>
      <p class="muted" style="margin:-8px 4px 16px">accountability groups. set a cap, bet on each other, get roasted when you slip.</p>
      <div class="row" style="gap:8px"><button class="btn grow" data-act="newSquad">＋ new squad</button><button class="btn ghost" data-act="joinSquad">join w/ code</button></div>
      ${S.squads.map((sq) => {
        const st = squadStatus(sq); const okN = st.filter((m) => m.ok).length;
        const max = Math.max(1, sq.limit * 1.6, ...st.map((m) => m.amt));
        return `<div class="card squad" style="margin-top:12px">
          <div class="head"><div class="em" style="background:${sq.color}22">${sq.emoji}</div>
            <div class="grow"><h4>${esc(sq.name)}</h4><div class="muted" style="font-size:13px">${R.CATEGORIES[sq.cat].emoji} ${esc(sq.cat)} ≤ ${money(sq.limit, 0)}/mo · 🔥 ${sq.streak || 0} wk streak</div></div>
            <div class="pill" style="background:${okN === st.length ? 'var(--mint)' : 'var(--surface-2)'};color:${okN === st.length ? '#22182a' : 'inherit'}">${okN}/${st.length} on track</div></div>
          ${st.map((m) => {
            const p = personById(m.id).person;
            return `<div class="member">${avatar(p, 'sm')}<div style="width:58px;font-weight:700">${esc(m.id === 'me' ? 'you' : p.name)}</div>
              <div class="bar"><i style="width:${Math.min(100, (m.amt / max) * 100)}%;background:${m.ok ? 'var(--mint)' : 'var(--red)'}"></i><i style="left:${(sq.limit / max) * 100}%;width:2px;background:#fff;border-radius:0"></i></div>
              <div class="v num">${money(m.amt, 0)} ${m.ok ? '✅' : '💀'}</div></div>`;
          }).join('')}
          <div class="stakes"><span>🎲 ${esc(sq.stakes)}</span><button style="font-weight:800;color:var(--lime)" data-act="invSquad" data-code="${esc(sq.code)}">invite</button></div>
        </div>`;
      }).join('')}`;
  }
  function newSquadSheet(prefill = {}) {
    sheet(`<h3>new squad</h3><p class="sub">pick a category, set a monthly cap, choose your victims.</p>
      <div class="field"><label>name</label><input class="input" id="sqName" placeholder="e.g. Uber Anonymous" value="${esc(prefill.name || '')}"></div>
      <div class="row" style="gap:10px"><div class="field" style="width:80px"><label>emoji</label><input class="input" id="sqEmoji" value="${esc(prefill.emoji || '💸')}" maxlength="2" style="text-align:center"></div>
        <div class="field grow"><label>category</label><select class="input" id="sqCat">${Object.keys(R.CATEGORIES).filter((c) => c !== 'Other').map((c) => `<option ${c === (prefill.cat || 'Delivery') ? 'selected' : ''}>${c}</option>`).join('')}</select></div></div>
      <div class="field"><label>monthly cap ($)</label><input class="input" id="sqLimit" type="number" value="${prefill.limit || 100}" min="0"></div>
      <div class="field"><label>stakes</label><input class="input" id="sqStakes" placeholder="loser buys boba" value="${esc(prefill.stakes || 'loser buys everyone boba 🧋')}"></div>
      <div class="field"><label>members</label><div class="friend-pick">${PEOPLE.filter((p) => p.person.id !== 'me').map((p) => `<label><input type="checkbox" value="${p.person.id}">${avatar(p.person, 'sm')}${esc(p.person.name)}</label>`).join('')}</div></div>
      <button class="btn block" id="sqCreate">create squad</button>`, (sh) => {
      $('#sqCreate', sh).onclick = () => {
        const limit = Number($('#sqLimit', sh).value);
        if (!$('#sqLimit', sh).value.trim() || !Number.isFinite(limit) || limit < 0) return toast('enter a monthly cap of zero or more');
        const name = $('#sqName', sh).value.trim() || 'Unnamed Squad';
        const members = ['me', ...[...sh.querySelectorAll('.friend-pick input:checked')].map((i) => i.value)];
        const colors = ['#ff8fb8', '#b5e48c', '#ffa173', '#a18bff', '#7fdcd0', '#5b8cff'];
        const code = (name.replace(/[^a-z]/gi, '').slice(0, 4).toUpperCase() || 'SQAD') + Math.floor(10 + Math.random() * 89);
        S.squads.unshift({ id: 'sq' + Date.now(), name, emoji: $('#sqEmoji', sh).value || '💸', color: colors[S.squads.length % colors.length],
          cat: $('#sqCat', sh).value, limit, stakes: $('#sqStakes', sh).value, members, code, streak: 0 });
        save(); closeSheet(); route(); toast('squad created 🤝 invite link copied');
        copy(`${baseUrl()}#/join/${code}`);
      };
    });
  }
  function joinSquad(code) {
    code = String(code || '').toUpperCase().trim();
    if (!code) return;
    if (S.squads.some((s) => s.code === code)) return toast('you’re already in that squad');
    const pub = PUBLIC_SQUADS[code];
    if (!pub) return toast('no squad with that code 🤔 try GYMRAT');
    S.squads.unshift({ id: 'sq' + Date.now(), code, streak: 2, ...pub, members: ['me', ...pub.members] });
    save(); route(); toast(`joined ${pub.name} ${pub.emoji}`);
  }

  // ---------- ROASTS ----------
  function seedFeed() {
    const pick = (id, f) => DATA[id].filter((t) => !t.recurring && t.date.startsWith('2026-09')).sort(f)[0];
    const biggest = (x, y) => y.amount - x.amount;
    const lateOne = (id, m) => DATA[id].filter((t) => t.merchant === m && [0, 1, 2, 3].includes(new Date(t.date).getHours()))[0] || pick(id, biggest);
    return [
      { who: 'priya', t: pick('priya', biggest), roast: 'the receipt says “final sale.” so does your savings account.', by: 'Gemini', reacts: { '💀': 14, '🔥': 6, '😭': 9, '🧢': 3 }, comments: [{ who: 'marcus', text: 'it was NOT on sale 💀' }, { who: 'priya', text: 'it was spiritually on sale' }] },
      { who: 'marcus', t: lateOne('marcus', 'DoorDash'), roast: 'a 1am doordash isn’t a meal, it’s a cry for help. the dasher knows your dog’s name.', by: 'Gemini', reacts: { '💀': 22, '🔥': 4, '😭': 11, '🧢': 0 }, comments: [{ who: 'maya', text: 'the kitchen is RIGHT there' }] },
      { who: 'jordan', t: pick('jordan', (x, y) => (y.merchant === 'Uber') - (x.merchant === 'Uber') || y.amount - x.amount), roast: 'paying uber surge pricing to go somewhere you’ll spend more money. the circle of broke.', by: 'Dev', reacts: { '💀': 8, '🔥': 12, '😭': 2, '🧢': 1 }, comments: [] },
      { who: 'dev', t: pick('dev', (x, y) => (y.merchant === 'Steam') - (x.merchant === 'Steam') || y.amount - x.amount), roast: 'another game for the backlog. your steam library has more unplayed titles than your bank has dollars.', by: 'Gemini', reacts: { '💀': 10, '🔥': 3, '😭': 5, '🧢': 0 }, comments: [{ who: 'jordan', text: 'he’s gonna play it for 11 minutes' }] },
      { who: 'maya', t: pick('maya', biggest), roast: 'biggest purchase of the month is… groceries. boring. responsible. we hate it here (proud of you).', by: 'Priya', reacts: { '💀': 2, '🔥': 19, '😭': 1, '🧢': 0 }, comments: [{ who: 'priya', text: 'teach me your ways' }] },
    ].map((p, i) => ({ id: 'seed' + i, who: p.who, merchant: p.t.merchant, amount: p.t.amount, category: p.t.category, date: p.t.date, note: p.t.note, roast: p.roast, by: p.by, reacts: p.reacts, mine: {}, comments: p.comments }));
  }

  function renderRoasts(el) {
    el.innerHTML = `
      <h1 class="title">roast board</h1>
      <p class="muted" style="margin:-8px 4px 16px">confess a purchase. let the group chat (and Gemini) judge.</p>
      <button class="btn block" data-act="confess">🙏 confess a purchase</button>
      ${S.feed.map((p) => {
        const person = personById(p.who).person;
        return `<div class="card post" style="margin-top:12px" data-id="${p.id}">
        <div class="who">${avatar(person)}<div class="grow"><b>${esc(p.who === 'me' ? displayName() : person.name)}</b><small>${esc(person.handle)} · ${new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small></div><span class="pill">${R.CATEGORIES[p.category]?.emoji || '🧾'} ${esc(p.category)}</span></div>
        <div class="receipt"><div class="line"><span>${esc(String(p.merchant).toUpperCase())}</span><span>${new Date(p.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span></div>
          ${p.note ? `<div style="margin-top:6px;opacity:.7">“${esc(p.note)}”</div>` : ''}
          <div class="line tot"><span>TOTAL</span><span>${money(p.amount)}</span></div></div>
        <div class="roast">${esc(p.roast)}<span class="by">— roasted by ${esc(p.by)}</span></div>
        <div class="reacts">${Object.entries(p.reacts).map(([e, n]) => `<button class="react ${p.mine[e] ? 'on' : ''}" data-act="react" data-e="${e}">${e} ${n + (p.mine[e] ? 1 : 0)}</button>`).join('')}</div>
        <div class="comments">${p.comments.map((c) => `<p><b>${esc(nameOf(c.who))}</b>${esc(c.text)}</p>`).join('')}</div>
        <form class="comment-box" data-act="comment"><input class="input" placeholder="add a roast…" maxlength="120"><button class="btn sm">send</button></form>
      </div>`;
      }).join('')}`;
  }

  async function postRoast(t, who = 'me') {
    toast('roasting… 🔥');
    const roast = await R.ai.roastPurchase(t, who === 'me' ? 'this person' : nameOf(who));
    S.feed.unshift({ id: 'p' + Date.now(), who, merchant: t.merchant, amount: t.amount, category: t.category, date: t.date, note: t.note,
      roast, by: R.gemini.enabled ? 'Gemini' : 'roast bot', reacts: { '💀': 0, '🔥': 0, '😭': 0, '🧢': 0 }, mine: {},
      comments: [{ who: 'marcus', text: 'LMAOOO' }] });
    save(); location.hash = '#/roasts'; route();
  }
  function confessSheet() {
    sheet(`<h3>confess 🙏</h3><p class="sub">what did you buy. be honest. the group chat will know.</p>
      <div class="field"><label>where</label><input class="input" id="cfM" placeholder="e.g. Sephora"></div>
      <div class="row" style="gap:10px"><div class="field grow"><label>how much ($)</label><input class="input" id="cfA" type="number" step="0.01" placeholder="49.99"></div>
        <div class="field grow"><label>category</label><select class="input" id="cfC">${Object.keys(R.CATEGORIES).map((c) => `<option>${c}</option>`).join('')}</select></div></div>
      <div class="field"><label>your defense (optional)</label><input class="input" id="cfN" placeholder="it was on sale"></div>
      <button class="btn block" id="cfGo">get roasted 🔥</button>`, (sh) => {
      $('#cfM', sh).oninput = (e) => { const c = R.categorize(e.target.value); if (c !== 'Other') $('#cfC', sh).value = c; };
      $('#cfGo', sh).onclick = () => {
        const m = $('#cfM', sh).value.trim(); const amt = parseFloat($('#cfA', sh).value);
        if (!m || !Number.isFinite(amt) || !(amt > 0)) return toast('need a place and a positive amount');
        closeSheet();
        postRoast({ merchant: m, amount: amt, category: $('#cfC', sh).value, date: new Date().toISOString(), note: $('#cfN', sh).value.trim() || undefined });
      };
    });
  }

  // ---------- settings ----------
  function settingsSheet() {
    const g = R.gemini.config;
    sheet(`<h3>settings</h3><p class="sub">${R.db.on ? 'saved in this browser and synced to Tiger Cloud.' : 'everything is stored locally in this browser.'}</p>
      <div class="field"><label>display name</label><input class="input" id="stName" maxlength="18" value="${esc(S.name.trim().slice(0, 18))}" placeholder="You"></div>
      <div class="field"><label>monthly budget ($)</label><input class="input" id="stBudget" type="number" min="0.01" step="0.01" value="${S.budget}"></div>
      <div class="section-h" style="margin-top:8px"><h3>✨ Gemini</h3><small>${R.gemini.enabled ? 'connected' : 'off — using roast bot'}</small></div>
      <div class="field"><label>API key (aistudio.google.com/apikey)</label><input class="input" id="stKey" type="password" value="${esc(g.key || '')}" placeholder="AIza…"></div>
      <div class="field"><label>model</label><input class="input" id="stModel" value="${esc(g.model || 'gemini-2.5-flash')}"></div>
      <button class="btn sm ghost" id="stTest">test connection</button> <span id="stTestOut" class="muted" style="font-size:13px;margin-left:6px"></span>
      <div class="section-h" style="margin-top:8px"><h3>🎧 ElevenLabs voice</h3><small>${R.voice.eleven ? 'connected' : 'off — using browser voice'}</small></div>
      <div class="field"><label>API key (elevenlabs.io → profile → API keys)</label><input class="input" id="stVoiceKey" type="password" value="${esc(R.voice.config.key || '')}" placeholder="sk_…"></div>
      <div class="field"><label>voice ID (optional)</label><input class="input" id="stVoiceId" value="${esc(R.voice.config.voiceId || '')}" placeholder="21m00Tcm4TlvDq8ikWAM"></div>
      <button class="btn sm ghost" id="stVoiceTest">🔊 test voice</button>
      <div class="section-h" style="margin-top:8px"><h3>🐯 Tiger Data</h3><small>${R.db.available ? esc(R.db.engine) : 'not connected'}</small></div>
      ${R.db.available ? `<label class="row tiger-toggle"><input type="checkbox" id="stCloud" ${R.db.enabled ? 'checked' : ''}><span>sync my purchases and lessons to Tiger Cloud</span></label>
        <div id="stTiger" class="card tiger-card"><span class="spinner"></span> asking the database…</div>`
        : '<p class="muted" style="font-size:13px;margin-bottom:8px">run the app through the backend with DATABASE_URL set to enable cloud sync.</p>'}
      <div class="section-h"><h3>data</h3><small>${S.source === 'csv' ? `CSV · ${S.csvTxns?.length || 0} txns` : 'demo bank'}</small></div>
      <div class="row" style="gap:8px;flex-wrap:wrap">
        <button class="btn sm ghost" id="stCsv">📄 import statement</button>
        ${S.source === 'csv' ? '<button class="btn sm ghost" id="stDemo">back to demo data</button>' : ''}
        <button class="btn sm ghost" id="stReset" style="color:var(--red)">reset everything</button>
      </div>
      <button class="btn block" id="stSave" style="margin-top:22px">save</button>`, (sh) => {
      $('#stSave', sh).onclick = () => {
        const budget = Number($('#stBudget', sh).value);
        if (!Number.isFinite(budget) || budget <= 0) return toast('enter a positive monthly budget');
        S.name = $('#stName', sh).value.slice(0, 18); S.budget = budget;
        R.gemini.save({ key: $('#stKey', sh).value.trim(), model: $('#stModel', sh).value.trim() || 'gemini-2.5-flash' });
        saveVoice(sh);
        save(); recompute(); closeSheet(); route(); toast('saved ✓');
      };
      $('#stTest', sh).onclick = async () => {
        R.gemini.save({ key: $('#stKey', sh).value.trim(), model: $('#stModel', sh).value.trim() || 'gemini-2.5-flash' });
        const out = $('#stTestOut', sh); out.textContent = 'testing…';
        try { const r = await R.gemini.generate('Reply with exactly: mochii club ok', { temperature: 0 }); out.textContent = '✅ ' + r.slice(0, 40); }
        catch (e) { out.textContent = '❌ ' + e.message.slice(0, 80); }
      };
      $('#stVoiceTest', sh).onclick = () => { saveVoice(sh); R.voice.speak(`hey ${displayName()}, compound interest is just interest earning interest. let's get your money right.`); };
      $('#stCsv', sh).onclick = () => { closeSheet(); openImporter(); };
      const cloud = $('#stCloud', sh);
      if (cloud) {
        cloud.onchange = () => { R.db.enabled = cloud.checked; delete S.syncKey; save(); if (cloud.checked) cloudSync(); toast(cloud.checked ? 'cloud sync on ☁️' : 'cloud sync off'); };
        tigerCard($('#stTiger', sh));
      }
      const d = $('#stDemo', sh); if (d) d.onclick = () => { S.source = 'demo'; save(); recompute(); closeSheet(); route(); };
      $('#stReset', sh).onclick = () => { if (confirm('reset all local data?')) { localStorage.removeItem(LS); localStorage.removeItem('receipts.learn'); localStorage.removeItem('receipts.uid'); location.hash = ''; location.reload(); } };
    });
  }

  // Live numbers straight from the database (TimescaleDB time_bucket over the daily_spend continuous aggregate).
  async function tigerCard(box) {
    const [ins, st] = await Promise.all([R.db.insights(), R.db.stats()]);
    if (!box.isConnected) return;
    if (!ins || !st) { box.textContent = 'couldn’t reach the database right now.'; return; }
    const max = Math.max(1, ...ins.weekly.map((w) => w.total));
    box.innerHTML = `<div class="row" style="justify-content:space-between"><b>your weekly spend, from the db</b><small class="muted">${ins.engine === 'timescaledb' ? 'time_bucket · continuous aggregate' : 'postgres'}</small></div>
      <div class="tiger-bars">${ins.weekly.map((w) => `<i style="height:${Math.max(4, (w.total / max) * 100)}%" title="${new Date(w.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${money(w.total, 0)}"></i>`).join('') || '<small class="muted">no purchases synced yet</small>'}</div>
      <div class="tiger-stats"><span><b class="num">${ins.learning.lessons}</b>lessons</span><span><b class="num">${ins.learning.active_days}</b>active days</span><span><b class="num">${ins.learning.xp}</b>xp</span></div>
      <small class="muted">whole club: ${st.users} members · ${st.transactions.toLocaleString()} purchases · ${st.learn_events} lesson events${st.hypertables.length ? ` · ${st.hypertables.map((h) => `${h.name} (${h.num_chunks} chunks)`).join(', ')}` : ''}</small>`;
  }
  const saveVoice = (sh) => R.voice.save({ key: $('#stVoiceKey', sh).value.trim(), voiceId: $('#stVoiceId', sh).value.trim() || undefined });

  // ---------- wrapped players ----------
  function playSolo(id = 'me') {
    const f = personById(id); if (!f) return;
    const nm = id === 'me' ? displayName() : f.person.name;
    new R.Story(phone, R.soloSlides({
      a: f.a, name: nm, friends: id === 'me' ? PEOPLE : null,
      onChallenge: () => {
        if (id !== 'me') return toast(`challenged ${nm} 😈`);
        S.challenge = { target: Math.round(f.a.prediction * 0.9), month: f.a.nextLabel, at: Date.now() }; save(); toast('challenge locked in 🔒');
      },
      onShare: (kind) => share(kind, f.a, nm),
    }), { onClose: () => { if (/wrapped/.test(location.hash)) history.replaceState(null, '', '#/home'); route(); } });
  }
  function playFriends() {
    new R.Story(phone, R.friendSlides({ people: PEOPLE, name: displayName(), onShare: (k) => share(k) }),
      { onClose: () => { if (/wrapped/.test(location.hash)) history.replaceState(null, '', '#/friends'); route(); } });
  }

  async function share(kind, a, name) {
    if (kind === 'img') {
      await document.fonts?.ready;
      const c = R.shareImage(R.summaryData(a, name));
      c.toBlob((b) => { const l = document.createElement('a'); l.href = URL.createObjectURL(b); l.download = `mochii-club-${a.monthLabel.toLowerCase()}-wrapped.png`; l.click(); });
      return toast('image saved ⬇');
    }
    const url = kind === 'friends' ? `${baseUrl()}#/welcome` : `${baseUrl()}#/share/${b64.enc(R.summaryData(a, name))}`;
    const text = kind === 'friends' ? 'our group chat’s money got wrapped 💀 join the mochii club 🍡' : `my ${a.monthLabel} money aura: ${a.aura.title} 💀`;
    if (navigator.share && /Mobi/i.test(navigator.userAgent)) { try { await navigator.share({ title: 'mochii club', text, url }); return; } catch {} }
    await copy(url); toast('link copied 🔗 send it to the group chat');
  }

  // ---------- public share page ----------
  function renderShare(code) {
    let d; try { d = R.validateSummary(b64.dec(code)); } catch { phone.innerHTML = '<div class="welcome"><h1>link broke 💀</h1></div>'; return; }
    phone.innerHTML = `<div class="welcome" style="background:#22182a;color:#fff">
      <div class="logo"><span class="mochi" aria-hidden="true"></span>mochi<b>i</b><span class="club">club</span></div>
      <div style="margin:auto 0;padding:30px 0">
        <p style="font-size:18px;font-weight:600;margin-bottom:14px">${esc(d.n === 'You' ? 'someone' : d.n)} shared their wrapped with you 👀</p>
        ${R.summaryCard(d)}
      </div>
      <a class="btn block" href="#/welcome" style="text-decoration:none">join the mochii club 🍡</a>
      <p class="fine" style="color:#fff">spotify wrapped for your bank account</p>
    </div>`;
  }

  // ---------- global click delegation ----------
  phone.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]'); if (!t) return;
    const act = t.dataset.act;
    if (act === 'play') playSolo();
    else if (act === 'playFriends') playFriends();
    else if (act === 'settings') settingsSheet();
    else if (act === 'learn') location.hash = '#/learn';
    else if (act === 'gmail' && S.onboarded) openGmailScan(false);
    else if (act === 'import') openImporter();
    else if (act === 'plan') showPlan(t);
    else if (act === 'challenge') { S.challenge = { target: Math.round(A.me.prediction * 0.9), month: A.me.nextLabel }; save(); route(); toast('challenge locked in 🔒'); }
    else if (act === 'roastTxn') postRoast(recentTxns()[+t.dataset.i]);
    else if (act === 'profile') openProfile(t.dataset.id);
    else if (act === 'invite') { copy(`${baseUrl()}#/welcome`); toast('invite link copied 🔗'); }
    else if (act === 'newSquad') newSquadSheet();
    else if (act === 'joinSquad') sheet(`<h3>join a squad</h3><p class="sub">got a code from the group chat? (try <b>GYMRAT</b> or <b>UBER0</b>)</p>
        <div class="field"><input class="input" id="jc" placeholder="CODE" style="text-transform:uppercase;letter-spacing:.1em;font-weight:800"></div><button class="btn block" id="jcGo">join</button>`,
      (sh) => { $('#jcGo', sh).onclick = () => { const c = $('#jc', sh).value; closeSheet(); joinSquad(c); }; });
    else if (act === 'invSquad') { copy(`${baseUrl()}#/join/${t.dataset.code}`); toast(`invite copied · code ${t.dataset.code}`); }
    else if (act === 'confess') confessSheet();
    else if (act === 'calDay') { cal.day = +t.dataset.d; renderCalendar(); }
    else if (act === 'calNav') {
      const months = [...new Set(myTxns().map((x) => localKey(new Date(x.date))))].sort();
      const next = months[months.indexOf(cal.month) + +t.dataset.dir];
      if (next) { cal.month = next; cal.day = null; renderCalendar(); }
    }
    else if (act === 'react') {
      const p = S.feed.find((x) => x.id === t.closest('.post').dataset.id); const em = t.dataset.e;
      p.mine[em] = !p.mine[em]; save();
      t.classList.toggle('on', p.mine[em]); t.textContent = `${em} ${p.reacts[em] + (p.mine[em] ? 1 : 0)}`;
    }
  });
  phone.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-act=comment]'); if (!f) return;
    e.preventDefault();
    const inp = f.querySelector('input'); const text = inp.value.trim(); if (!text) return;
    const p = S.feed.find((x) => x.id === f.closest('.post').dataset.id);
    p.comments.push({ who: 'me', text }); save();
    f.previousElementSibling.insertAdjacentHTML('beforeend', `<p><b>${esc(displayName())}</b>${esc(text)}</p>`);
    inp.value = '';
  });

  // ---------- boot ----------
  recompute();
  route();
  // Check for the backend after first paint; re-render the welcome copy and sync once we know.
  R.db.init().then(() => { if (!R.db.available) return; if (!S.onboarded) route(); cloudSync(); });
})();
