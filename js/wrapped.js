/* mochii club — the Wrapped story player + slides */
(function (global) {
  const R = (global.R = global.R || {});
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  R.esc = esc;
  const money = (n, d) => R.money(n, d);

  // ---------- decorative shapes ----------
  // compact spec: [kind, size, top%, left%, color, extra classes]
  function shapes(list) {
    return list.map(([k, size, top, left, color, cls = ''], i) => {
      const ring = k === 'ring';
      const style = `width:${size}px;height:${size}px;top:${top}%;left:${left}%;` +
        (ring ? `border-width:${Math.round(size / 9)}px;border-color:${color};` : `background:${color};`) +
        `animation-delay:${i * 0.15}s`;
      return `<div class="shape ${k} ${cls}" style="${style}"></div>`;
    }).join('');
  }

  // ---------- story player ----------
  R.Story = class {
    constructor(host, slides, { onClose, duration = 7000 } = {}) {
      R.Story.active?.destroy();
      R.Story.active = this;
      this.closed = false;
      this.host = host; this.slides = slides; this.onClose = onClose; this.duration = duration;
      this.i = -1; this.elapsed = 0; this.paused = false;
      this.el = document.createElement('div');
      this.el.className = 'story';
      this.el.innerHTML = `
        <div class="bars">${slides.map(() => '<div><i></i></div>').join('')}</div>
        <div class="top"><div class="logo"><span class="mochi" aria-hidden="true"></span>mochi<b>i</b><span class="club">club</span></div><button class="x" aria-label="close">✕</button></div>
        <div class="paused">paused</div>
        ${slides.map((s, i) => `<section class="slide" data-i="${i}" style="background:${s.bg};color:${s.fg || '#fff'}">
          ${s.shapes ? shapes(s.shapes) : ''}<div class="content">${s.html}</div></section>`).join('')}`;
      host.appendChild(this.el);
      this.slideEls = [...this.el.querySelectorAll('.slide')];
      this.barEls = [...this.el.querySelectorAll('.bars div')];

      $('.x', this.el).addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
      let downAt = 0, downX = 0;
      this.el.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button, a, input, .no-tap')) return;
        downAt = Date.now(); downX = e.clientX; this.setPaused(true, true);
      });
      this.el.addEventListener('pointerup', (e) => {
        if (!downAt) return;
        const held = Date.now() - downAt; downAt = 0; this.setPaused(false, true);
        if (held > 350) return; // long-press = pause only
        const r = this.el.getBoundingClientRect();
        if (downX - r.left < r.width * 0.3) this.prev(); else this.next();
      });
      this.el.addEventListener('pointerleave', () => { if (downAt) { downAt = 0; this.setPaused(false, true); } });
      this.onKey = (e) => {
        if (e.target.matches('input, textarea')) return;
        if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); this.next(); }
        else if (e.key === 'ArrowLeft') this.prev();
        else if (e.key === 'Escape') this.close();
        else if (e.key === 'p') this.setPaused(!this.paused);
      };
      document.addEventListener('keydown', this.onKey);
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick.bind(this));
      this.go(0);
    }
    setPaused(p, hold) { this.paused = p; this.el.classList.toggle('is-paused', p && !hold); }
    tick(now) {
      if (this.closed) return;
      if (!this.el.isConnected) return this.destroy();
      const dt = now - this.last; this.last = now;
      const s = this.slides[this.i];
      if (!this.paused && s && !s.hold) {
        this.elapsed += dt;
        const d = s.duration || this.duration;
        this.barEls[this.i].querySelector('i').style.width = Math.min(100, (this.elapsed / d) * 100) + '%';
        if (this.elapsed >= d) this.next();
      }
      if (!this.closed) this.raf = requestAnimationFrame(this.tick.bind(this));
    }
    go(i) {
      if (this.closed) return;
      if (i < 0) i = 0;
      if (i >= this.slides.length) return this.close();
      const prevEl = this.slideEls[this.i];
      this.slides[this.i]?.onExit?.();
      if (prevEl) prevEl.classList.remove('active');
      this.i = i; this.elapsed = 0;
      this.barEls.forEach((b, j) => { b.classList.toggle('done', j < i); b.querySelector('i').style.width = j < i ? '100%' : '0'; });
      const s = this.slides[i]; const el = this.slideEls[i];
      if (s.hold) this.barEls[i].querySelector('i').style.width = '100%';
      this.el.classList.toggle('dark-ui', (s.fg || '#fff') !== '#fff');
      // restart CSS animations
      el.classList.remove('active'); void el.offsetWidth; el.classList.add('active');
      animateCounts(el);
      if (s.onEnter) s.onEnter(el, this);
    }
    next() { this.go(this.i + 1); }
    prev() { this.go(this.i - 1); }
    destroy() { this.close({ notify: false, immediate: true }); }
    close({ notify = true, immediate = false } = {}) {
      if (this.closed) return;
      this.closed = true;
      if (R.Story.active === this) R.Story.active = null;
      cancelAnimationFrame(this.raf);
      document.removeEventListener('keydown', this.onKey);
      this.slides[this.i]?.onExit?.();
      this.el.style.transition = 'opacity .25s'; this.el.style.opacity = 0;
      if (immediate) this.el.remove(); else setTimeout(() => this.el.remove(), 250);
      if (notify && this.onClose) this.onClose();
    }
  };

  function animateCounts(el) {
    el.querySelectorAll('[data-count]').forEach((n) => {
      const to = +n.dataset.count; const pre = n.dataset.pre || ''; const suf = n.dataset.suf || '';
      const dp = +(n.dataset.dp || 0); const delay = +(n.dataset.delay || 300); const dur = 1400;
      n.textContent = pre + (0).toFixed(dp) + suf;
      const t0 = performance.now() + delay;
      const step = (now) => {
        if (!n.isConnected) return;
        const p = Math.max(0, Math.min(1, (now - t0) / dur));
        const e = 1 - Math.pow(1 - p, 4);
        n.textContent = pre + (to * e).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }) + suf;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    // bars: elements with data-w get width/height set after paint
    setTimeout(() => el.querySelectorAll('[data-w]').forEach((b) => (b.style.width = b.dataset.w)), 120);
    setTimeout(() => el.querySelectorAll('[data-h]').forEach((b) => (b.style.height = b.dataset.h)), 120);
  }

  function typewriter(node, text) {
    node.innerHTML = '<span></span><i class="caret"></i>';
    const span = node.firstChild; let i = 0;
    const iv = setInterval(() => {
      if (!node.isConnected) return clearInterval(iv);
      i += 2; span.textContent = text.slice(0, i);
      if (i >= text.length) { clearInterval(iv); }
    }, 28);
    return () => clearInterval(iv);
  }

  // ---------- Solo Wrapped ----------
  R.soloSlides = function (ctx) {
    const { a, name, friends, onChallenge, onShare } = ctx;
    const nm = name === 'You' ? 'bestie' : name;
    const up = a.deltaPct >= 0;
    const S = [];

    S.push({
      bg: 'var(--lime)', fg: '#0a0a0c', duration: 5000,
      shapes: [['circle', 260, -8, 55, 'var(--pink)', 'enter'], ['star', 110, 84, -4, '#0a0a0c', 'spin'], ['ring', 170, 80, 62, 'var(--purple)', 'enter']],
      html: `<div class="eyebrow r">hey ${esc(nm)} 👋</div>
        <div class="mega r">your ${esc(a.monthLabel)} wrapped is here.</div>
        <div class="body r">your bank account has been keeping receipts. let’s unwrap them 🧾</div>`,
    });

    S.push({
      bg: 'var(--purple)', shapes: [['blob', 300, 58, 40, 'var(--pink)', 'morph'], ['circle', 70, 14, 78, 'var(--lime)', 'enter']],
      html: `<div class="eyebrow r">in ${esc(a.monthLabel)} you spent</div>
        <div class="mega r num" data-count="${a.total.toFixed(2)}" data-pre="$" data-dp="2" data-delay="500">$0</div>
        <div class="body r">across <b>${a.count}</b> transactions. that’s <b>${money(a.avgPerDay)}</b> a day, every day, no days off.</div>
        <div class="body r" style="opacity:.8">${a.budgetPct > 1 ? `budget was ${money(a.budget, 0)}. we don’t talk about the budget.` : `${Math.round(a.budgetPct * 100)}% of your ${money(a.budget, 0)} budget. we see you.`}</div>`,
    });

    if (a.prevTotal) {
      const max = Math.max(a.total, a.prevTotal);
      S.push({
        bg: up ? 'var(--pink)' : 'var(--mint)', fg: '#0a0a0c',
        shapes: [['burst', 150, 8, 70, '#0a0a0c', 'spin'], ['circle', 90, 84, -4, '#fff', 'enter']],
        html: `<div class="eyebrow r">compared to ${esc(a.prevLabel)}…</div>
          <div class="mega r num">${up ? '+' : '−'}<span data-count="${Math.abs(Math.round(a.deltaPct * 100))}" data-suf="%">0%</span></div>
          <div class="vs-bars r">
            <div class="col"><b>${money(a.prevTotal, 0)}</b><div data-h="${(a.prevTotal / max) * 100}%" style="background:rgba(10,10,12,.25)"></div><small>${esc(a.prevLabel)}</small></div>
            <div class="col"><b>${money(a.total, 0)}</b><div data-h="${(a.total / max) * 100}%" style="background:#0a0a0c"></div><small>${esc(a.monthLabel)}</small></div>
          </div>
          <div class="body r">${up ? 'you said you’d do better this month. you lied. 🙂' : 'growth. character development. we’re actually proud of you.'}</div>`,
      });
    }

    const top5 = a.byCat.slice(0, 5);
    S.push({
      bg: 'var(--navy)', duration: 8000, shapes: [['ring', 220, -6, 60, 'var(--blue)', 'enter']],
      html: `<div class="eyebrow r">where it all went</div>
        <div class="big r">your top categories</div>
        <div class="cat-bars r">${top5.map((c) => `<div class="cb">
          <div class="lbl"><span>${R.CATEGORIES[c.cat].emoji} ${esc(c.cat)}</span><span class="num">${money(c.amt, 0)}</span></div>
          <div class="track"><i data-w="${top5[0].amt > 0 ? (c.amt / top5[0].amt) * 100 : 0}%" style="background:${R.CATEGORIES[c.cat].color}"></i></div></div>`).join('')}</div>`,
    });

    const tm = a.byMerchant.slice(0, 5);
    if (tm.length) S.push({
      bg: 'var(--orange)', fg: '#0a0a0c', duration: 8000,
      shapes: [['star', 140, 6, 68, 'var(--yellow)', 'spin'], ['circle', 220, 78, 50, '#0a0a0c', 'enter']],
      html: `<div class="eyebrow r">your top merchants</div>
        <div class="toplist r">${tm.map((m, i) => `<div class="it ${i === 0 ? 'first' : ''}"><span class="n">${i + 1}</span><span>${esc(m.name)}</span><small class="num">${money(m.amt, 0)}</small></div>`).join('')}</div>
        <div class="body r">on repeat: <b>${esc(a.mostVisited.name)}</b>, ${a.mostVisited.count} times. that’s your most-streamed song fr.</div>
        <div class="tiny r">you’re in the top 1% of ${esc(tm[0].name)} customers on campus.* &nbsp; *probably</div>`,
    });

    if (a.late.hasTime && a.late.count > 0) {
      S.push({
        bg: '#0b0b2a',
        shapes: [['star', 22, 12, 12, '#fff'], ['star', 14, 22, 80, '#fff'], ['star', 30, 70, 85, 'var(--yellow)'], ['star', 16, 84, 18, '#fff'], ['circle', 160, 4, 62, 'var(--yellow)', 'enter']],
        html: `<div class="eyebrow r">after 11pm, you become someone else 🌙</div>
          <div class="mega r num" data-count="${a.late.count}">0</div>
          <div class="body r">late-night purchases worth <b>${money(a.late.amt, 0)}</b>${a.late.top ? `. mostly <b>${esc(a.late.top.key)}</b>` : ''}.</div>
          <div class="body r" style="opacity:.75">sleep is free. just saying.</div>`,
      });
    }

    if (a.biggest) {
      const d = new Date(a.biggest.date);
      S.push({
        bg: 'var(--red)', shapes: [['burst', 260, 52, 46, 'var(--yellow)', 'spin'], ['circle', 60, 14, 80, '#fff', 'enter']],
        html: `<div class="eyebrow r">the one that hurt 💸</div>
          <div class="huge r">${esc(a.biggest.merchant)}</div>
          <div class="mega r num" data-count="${a.biggest.amount}" data-pre="$" data-dp="2">$0</div>
          <div class="body r">${d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}${a.late.hasTime ? ` at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}. ${a.biggest.note ? `“${esc(a.biggest.note)}”` : 'we’re not gonna ask.'}</div>`,
      });
    }

    if (a.subs.length) {
      S.push({
        bg: 'var(--teal)', fg: '#0a0a0c', duration: 8000, shapes: [['ring', 200, -8, 64, '#0a0a0c', 'enter']],
        html: `<div class="eyebrow r">subscription check 🔁</div>
          <div class="big r">${money(a.subsTotal)}/mo on ${a.subs.length} subs</div>
          <div class="sub-list r">${a.subs.map((s) => `<div class="s ${s.ghost ? 'ghost' : ''}"><span>${esc(s.name)}${s.ghost ? '<span class="tag">👻 unused</span>' : ''}</span><span class="num">${money(s.amt)}</span></div>`).join('')}</div>
          ${a.ghostSubs.length ? `<div class="body r">${a.ghostSubs.length} ghost${a.ghostSubs.length > 1 ? 's' : ''} haunting your card = <b>${money(a.ghostSubs.reduce((s, x) => s + x.amt, 0) * 12, 0)}/yr</b> for nothing.</div>` : ''}`,
      });
    }

    S.push({
      bg: `linear-gradient(160deg, ${a.aura.grad[0]}, ${a.aura.grad[1]})`, fg: '#0a0a0c', duration: 7500,
      html: `<div class="aura-orb" style="background:radial-gradient(circle at 30% 30%, #fff, ${a.aura.grad[0]} 45%, ${a.aura.grad[1]})">${R.CATEGORIES[a.aura.key]?.emoji || '🏆'}</div>
        <div class="eyebrow r" style="text-align:center">your money aura is</div>
        <div class="huge r" style="text-align:center">${esc(a.aura.title)}</div>
        <div class="body r" style="text-align:center">${esc(a.aura.blurb)}</div>`,
    });

    const C = 2 * Math.PI * 88;
    S.push({
      bg: '#0a0a0c', duration: 7500, shapes: [['circle', 300, -10, 40, 'rgba(198,255,61,.08)', 'enter']],
      html: `<div class="eyebrow r">your financial health score</div>
        <div class="r" style="display:flex;justify-content:center;margin:22px 0">
          <div style="position:relative;width:220px;height:220px">
            <svg width="220" height="220" style="transform:rotate(-90deg)"><circle cx="110" cy="110" r="88" stroke="rgba(255,255,255,.1)" stroke-width="22" fill="none"/>
            <circle class="score-arc" cx="110" cy="110" r="88" stroke="var(--lime)" stroke-width="22" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" style="transition:stroke-dashoffset 1.6s cubic-bezier(.2,.8,.2,1) .5s"/></svg>
            <div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center"><div><div class="mega num" data-count="${a.score.score}" data-delay="500" style="margin:0">0</div><div style="font-weight:800;font-size:20px">grade ${a.score.grade}</div></div></div>
          </div></div>
        <div class="big r" style="text-align:center">“${esc(a.score.vibe)}”</div>
        <div class="tiny r" style="text-align:center">budget · trend · impulse control · subscriptions · cooking at home</div>`,
      onEnter: (el) => setTimeout(() => { const arc = $('.score-arc', el); if (arc) arc.style.strokeDashoffset = C * (1 - a.score.score / 100); }, 60),
    });

    let roastText = null; let stopType = null;
    S.push({
      bg: '#16161b', duration: 11000,
      shapes: [['blob', 210, 86, -16, 'var(--orange)', 'morph'], ['blob', 160, -4, 70, 'var(--red)', 'morph']],
      html: `<div class="eyebrow r">we asked ✨${R.gemini.enabled ? 'Gemini' : 'the roast bot'} to roast you 🔥</div>
        <div class="roast-text r"><span class="dots"><span></span><span></span><span></span></span></div>`,
      onEnter: async (el, story) => {
        const node = $('.roast-text', el);
        if (stopType) stopType();
        if (!roastText) roastText = await R.ai.roast(a, name);
        if (story.closed || story.slideEls[story.i] !== el) return;
        stopType = typewriter(node, roastText);
      },
      onExit: () => { if (stopType) stopType(); stopType = null; },
    });

    S.push({
      bg: 'var(--yellow)', fg: '#0a0a0c', hold: true,
      shapes: [['circle', 200, 76, 56, 'var(--pink)', 'enter'], ['star', 90, 8, 76, '#0a0a0c', 'spin']],
      html: `<div class="eyebrow r">our prediction for ${esc(a.nextLabel)} 🔮</div>
        <div class="mega r num" data-count="${Math.round(a.prediction)}" data-pre="$">$0</div>
        <div class="body r">based on your last 3 months + your… momentum. we’re rarely wrong.</div>
        <div class="huge r" style="margin-top:18px">prove me wrong.</div>
        <div class="r" style="margin-top:22px"><button class="btn dark" data-act="challenge">challenge accepted 🤝</button></div>`,
      onEnter: (el, story) => {
        const b = $('[data-act=challenge]', el);
        b.onclick = (e) => { e.stopPropagation(); onChallenge(); b.textContent = 'locked in. see you next month 🔒'; b.disabled = true; setTimeout(() => story.next(), 1100); };
      },
    });

    if (friends && friends.length > 1) {
      const ranked = [...friends].sort((x, y) => y.a.total - x.a.total);
      const myRank = ranked.findIndex((f) => f.person.id === 'me') + 1;
      S.push({
        bg: 'var(--blue)', duration: 8000, shapes: [['ring', 160, 80, 70, 'var(--lime)', 'enter']],
        html: `<div class="eyebrow r">meanwhile, in the group chat…</div>
          <div class="big r">you were the #${myRank} biggest spender of ${ranked.length}</div>
          <div class="rank-list r">${ranked.map((f, i) => `<div class="rr ${f.person.id === 'me' ? 'me' : ''}"><span>${i + 1}</span><span>${f.person.emoji}</span><span>${esc(f.person.id === 'me' ? name : f.person.name)}</span><span class="num">${money(f.a.total, 0)}</span></div>`).join('')}</div>`,
      });
    }

    S.push({
      bg: '#0a0a0c', hold: true,
      html: `<div class="eyebrow r" style="margin-bottom:14px">that’s a wrap 🎬</div>
        <div class="r">${R.summaryCard(R.summaryData(a, name))}</div>
        <div class="share-actions r">
          <button class="btn" data-act="link">🔗 share link</button>
          <button class="btn white" data-act="img">⬇ save image</button>
          <button class="btn ghost" data-act="replay">↺ replay</button>
        </div>`,
      onEnter: (el, story) => {
        $('[data-act=link]', el).onclick = (e) => { e.stopPropagation(); onShare('link'); };
        $('[data-act=img]', el).onclick = (e) => { e.stopPropagation(); onShare('img'); };
        $('[data-act=replay]', el).onclick = (e) => { e.stopPropagation(); story.go(0); };
      },
    });
    return S;
  };

  // ---------- summary card (shared by story, share page, image) ----------
  R.summaryData = (a, name) => ({
    n: name, m: a.monthLabel, t: Math.round(a.total), d: Math.round(a.deltaPct * 100),
    au: a.aura.key, c: a.byCat[0]?.cat, tm: a.topMerchant?.name, v: a.mostVisited?.count, vm: a.mostVisited?.name,
    s: a.score.score, g: a.score.grade, p: Math.round(a.prediction), nx: a.nextLabel,
  });

  // Share URLs are untrusted. Keep optional merchant stats optional for subscription-only months.
  R.validateSummary = (d) => {
    if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('Invalid summary');
    const string = (key, optional = false) => {
      if (optional && d[key] === undefined) return;
      if (typeof d[key] !== 'string' || d[key].length > 200) throw new Error('Invalid summary');
    };
    const number = (key, min, max = Infinity, optional = false) => {
      if (optional && d[key] === undefined) return;
      if (typeof d[key] !== 'number' || !Number.isFinite(d[key]) || d[key] < min || d[key] > max) throw new Error('Invalid summary');
    };
    ['n', 'm', 'au', 'g', 'nx'].forEach((k) => string(k));
    ['c', 'tm', 'vm'].forEach((k) => string(k, true));
    number('t', 0); number('d', -100); number('p', 0); number('s', 0, 100); number('v', 0, Infinity, true);
    if (!Object.hasOwn(R.AURAS, d.au) || (d.c !== undefined && !Object.hasOwn(R.CATEGORIES, d.c)) || !['A', 'B', 'C', 'D', 'F'].includes(d.g)) throw new Error('Invalid summary');
    return d;
  };

  R.summaryCard = (d) => {
    R.validateSummary(d);
    const aura = R.AURAS[d.au] || R.AURAS.Other;
    return `<div class="summary" style="background:linear-gradient(150deg, ${aura.grad[0]}, ${aura.grad[1]})">
      ${shapes([['circle', 160, -20, 62, 'rgba(255,255,255,.35)'], ['star', 54, 4, 86, 'rgba(10,10,12,.85)', 'spin']])}
      <div style="position:relative;font-weight:800;font-size:14px;opacity:.75">${esc(d.n === 'You' ? 'my' : d.n + '’s')} ${esc(d.m)} wrapped</div>
      <div class="aura-t">${esc(aura.title)}</div>
      <div class="sgrid">
        <div><small>Spent</small><b class="num">$${(+d.t).toLocaleString()}</b></div>
        <div><small>vs last month</small><b>${d.d >= 0 ? '+' : ''}${d.d}%</b></div>
        <div><small>Top category</small><b>${R.CATEGORIES[d.c]?.emoji || ''} ${esc(d.c || 'No spending')}</b></div>
        <div><small>Top merchant</small><b>${esc(d.tm || 'None this month')}</b></div>
        <div><small>On repeat</small><b>${d.vm && d.v !== undefined ? `${esc(d.vm)} ×${d.v}` : '—'}</b></div>
        <div><small>Health score</small><b>${d.s}/100 · ${esc(d.g)}</b></div>
      </div>
      <div class="foot"><span>${esc(d.nx)} prediction: $${(+d.p).toLocaleString()}</span><span>mochii club 🍡</span></div>
    </div>`;
  };

  // ---------- share image (1080x1920 PNG) ----------
  R.shareImage = function (d) {
    R.validateSummary(d);
    const aura = R.AURAS[d.au] || R.AURAS.Other;
    const W = 1080, H = 1920;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, aura.grad[0]); grad.addColorStop(1, aura.grad[1]);
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.arc(880, 260, 330, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0a0a0c'; g.beginPath(); g.arc(120, 1700, 200, 0, Math.PI * 2); g.fill();
    const F = (w, s) => `${w} ${s}px "Bricolage Grotesque", system-ui, sans-serif`;
    g.fillStyle = '#0a0a0c';
    g.font = F(800, 64); g.fillText('mochii club', 90, 160);
    g.font = F(700, 52); g.globalAlpha = 0.75; g.fillText(`${d.n === 'You' ? 'my' : d.n + '’s'} ${d.m} wrapped`, 90, 380); g.globalAlpha = 1;
    // wrap aura title
    g.font = F(800, 120);
    const words = aura.title.split(' '); let line = ''; let y = 520;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (g.measureText(test).width > 900) { g.fillText(line, 90, y); line = w; y += 120; } else line = test;
    }
    g.fillText(line, 90, y);
    const stats = [
      ['SPENT', '$' + (+d.t).toLocaleString()], ['VS LAST MONTH', (d.d >= 0 ? '+' : '') + d.d + '%'],
      ['TOP CATEGORY', d.c || 'No spending'], ['TOP MERCHANT', d.tm || 'None this month'], ['ON REPEAT', d.vm && d.v !== undefined ? `${d.vm} ×${d.v}` : '—'], ['HEALTH SCORE', `${d.s}/100 · ${d.g}`],
    ];
    stats.forEach(([k, v], i) => {
      const x = 90 + (i % 2) * 460; const yy = y + 200 + Math.floor(i / 2) * 210;
      g.font = F(700, 34); g.globalAlpha = 0.7; g.fillText(k, x, yy); g.globalAlpha = 1;
      g.font = F(800, 62); g.fillText(String(v).slice(0, 14), x, yy + 72);
    });
    g.fillStyle = '#fff'; g.font = F(800, 46);
    g.fillText(`${d.nx} prediction: $${(+d.p).toLocaleString()}`, 360, 1720);
    g.font = F(600, 34); g.globalAlpha = 0.8; g.fillText('prove me wrong → join the mochii club 🍡', 360, 1780);
    return c;
  };

  // ---------- Friends Wrapped ----------
  R.friendSlides = function (ctx) {
    const { people, name, onShare } = ctx;
    const sup = R.superlatives(people);
    const total = people.reduce((s, p) => s + p.a.total, 0);
    const label = people[0].a.monthLabel;
    const pal = ['var(--pink)', 'var(--lime)', 'var(--orange)', 'var(--purple)', 'var(--teal)', 'var(--yellow)', 'var(--blue)', 'var(--mint)'];
    const disp = (p) => (p.person.id === 'me' ? name : p.person.name);
    const S = [];
    S.push({
      bg: 'var(--pink)', fg: '#0a0a0c', duration: 5000,
      shapes: [['circle', 240, -10, 54, 'var(--lime)', 'enter'], ['burst', 140, 70, 0, '#0a0a0c', 'spin']],
      html: `<div class="eyebrow r">the group chat’s</div><div class="mega r">${esc(label)} wrapped 👯</div>
        <div class="body r">${people.length} friends. 1 shared delusion that “it’s fine.”</div>`,
    });
    S.push({
      bg: 'var(--purple)', shapes: [['blob', 280, 60, 40, 'var(--lime)', 'morph']],
      html: `<div class="eyebrow r">together you spent</div>
        <div class="mega r num" data-count="${Math.round(total)}" data-pre="$">$0</div>
        <div class="body r">that’s ${R.equiv(total)}. as a group. in one month.</div>`,
    });
    sup.forEach((s, i) => {
      const fg = ['var(--purple)', 'var(--blue)'].includes(pal[i % pal.length]) ? '#fff' : '#0a0a0c';
      S.push({
        bg: pal[i % pal.length], fg, duration: 5500,
        shapes: [['circle', 180, 75, 60, 'rgba(255,255,255,.35)', 'enter'], ['star', 80, 8, 78, fg === '#fff' ? '#fff' : '#0a0a0c', 'spin']],
        html: `<div class="superl-slide"><div class="eyebrow r">${s.emoji} superlative ${i + 1}/${sup.length}</div>
          <div class="big r">${esc(s.title)}</div>
          <div class="who-big r pop"><div class="avatar" style="background:${s.who.person.color}">${s.who.person.emoji}</div><b>${esc(disp(s.who))}</b></div>
          <div class="body r">${esc(s.stat)}</div></div>`,
      });
    });
    const ranked = [...people].sort((x, y) => y.a.score.score - x.a.score.score);
    S.push({
      bg: '#0a0a0c', duration: 8000,
      html: `<div class="eyebrow r">health score leaderboard 🏆</div>
        <div class="big r">who’s actually got it together</div>
        <div class="rank-list r">${ranked.map((f, i) => `<div class="rr ${f.person.id === 'me' ? 'me' : ''}"><span>${['🥇', '🥈', '🥉'][i] || i + 1}</span><span>${f.person.emoji}</span><span>${esc(disp(f))}</span><span class="num">${f.a.score.score} · ${f.a.score.grade}</span></div>`).join('')}</div>`,
    });
    S.push({
      bg: 'var(--lime)', fg: '#0a0a0c', hold: true,
      shapes: [['circle', 200, 80, 60, 'var(--pink)', 'enter']],
      html: `<div class="eyebrow r">next month’s side quest</div>
        <div class="huge r">start a squad. bet on each other. loser buys boba. 🧋</div>
        <div class="share-actions r"><button class="btn dark" data-act="squad">start a squad</button><button class="btn ghost" data-act="link" style="background:rgba(10,10,12,.1);color:#0a0a0c">🔗 share</button></div>`,
      onEnter: (el, story) => {
        $('[data-act=squad]', el).onclick = (e) => { e.stopPropagation(); story.close(); location.hash = '#/squads'; };
        $('[data-act=link]', el).onclick = (e) => { e.stopPropagation(); onShare('friends'); };
      },
    });
    return S;
  };
})(typeof window !== 'undefined' ? window : globalThis);
