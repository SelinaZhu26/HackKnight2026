/* mochii — whimsy layer. Self-contained easter eggs; everything hooks in via delegation.
 *
 *  • hover any logo      → mochi hops, squints, letters wave, hearts float up
 *  • eyes                → every logo mochi watches your cursor
 *  • click the logo      → boop + speech bubble; 7 quick boops = mochi party 🍡
 *  • type "mochi"        → a buddy peeks up and waves
 *  • idle 30s            → buddy falls asleep (z z z), wakes when you're back
 *  • ↑↑↓↓←→←→BA          → secret rainbow mode + dango rain
 *  • 11pm–4am            → logo gets a sleepy moon
 *  • open devtools       → say hi
 */
(function () {
  const phone = document.getElementById('phone');
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const typing = (e) => e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');

  // ---------- particles ----------
  function burst(x, y, n = 5, set = ['💗', '✨', '🌸', '💕']) {
    if (calm) n = Math.min(n, 2);
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      p.className = 'wh-p'; p.textContent = pick(set);
      p.style.left = x + 'px'; p.style.top = y + 'px';
      p.style.setProperty('--dx', rnd(-40, 40) + 'px');
      p.style.setProperty('--dy', rnd(-70, -35) + 'px');
      p.style.setProperty('--r', rnd(-40, 40) + 'deg');
      p.style.animationDelay = i * 60 + 'ms';
      p.style.fontSize = rnd(12, 20) + 'px';
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1400 + i * 60);
    }
  }
  function rain(n = 40, set = ['🍡', '🌸', '💗', '✨', '🍥']) {
    const host = phone || document.body;
    if (calm) n = 8;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      p.className = 'wh-rain'; p.textContent = pick(set);
      p.style.left = rnd(0, 100) + '%';
      p.style.fontSize = rnd(18, 34) + 'px';
      p.style.setProperty('--dx', rnd(-60, 60) + 'px');
      p.style.setProperty('--r', rnd(-360, 360) + 'deg');
      const dur = rnd(1.8, 3.4);
      p.style.animationDuration = dur + 's';
      p.style.animationDelay = rnd(0, 1.2) + 's';
      host.appendChild(p);
      setTimeout(() => p.remove(), (dur + 1.3) * 1000);
    }
  }

  // ---------- speech bubble ----------
  let bubbleEl, bubbleT;
  // (x, y) is the top-left of the thing speaking; `below` is its bottom edge, used when there's no room above
  function say(text, x, y, ms = 1800, below = y + 40) {
    if (bubbleEl) bubbleEl.remove();
    clearTimeout(bubbleT);
    const b = document.createElement('div');
    b.className = 'wh-bubble'; b.textContent = text;
    document.body.appendChild(b);
    const w = b.offsetWidth;
    b.style.left = Math.max(8, Math.min(innerWidth - w - 8, x)) + 'px';
    const above = y - b.offsetHeight - 6;
    if (above < 8) b.classList.add('flip');
    b.style.top = (above < 8 ? below + 6 : above) + 'px';
    bubbleEl = b;
    bubbleT = setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 260); }, ms);
  }

  // ---------- logo hover: wave letters + hearts ----------
  function wrapLetters(logo) {
    if (logo.dataset.wh) return;
    logo.dataset.wh = '1';
    let i = 0;
    const walk = (node) => {
      for (const n of [...node.childNodes]) {
        if (n.nodeType === 3 && n.textContent.trim()) {
          const frag = document.createDocumentFragment();
          for (const ch of n.textContent) {
            const s = document.createElement('span');
            s.className = 'wl'; s.textContent = ch; s.style.setProperty('--i', i++);
            frag.appendChild(s);
          }
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName === 'B') walk(n);
      }
    };
    walk(logo);
  }
  let lastHearts = 0;
  document.addEventListener('mouseover', (e) => {
    const logo = e.target.closest('.logo');
    if (!logo || logo.contains(e.relatedTarget)) return;
    wrapLetters(logo);
    if (Date.now() - lastHearts < 700) return;
    lastHearts = Date.now();
    const m = logo.querySelector('.mochi');
    if (m) { const r = m.getBoundingClientRect(); burst(r.left + r.width / 2, r.top, 4); }
  });

  // ---------- eyes follow the cursor ----------
  let raf = 0, mx = 0, my = 0;
  document.addEventListener('pointermove', (e) => {
    mx = e.clientX; my = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      document.querySelectorAll('.logo .mochi, .wh-buddy .mochi').forEach((m) => {
        const r = m.getBoundingClientRect();
        const dx = mx - (r.left + r.width / 2), dy = my - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 200);
        m.style.setProperty('--ex', ((dx / d) * 0.07 * k).toFixed(3) + 'em');
        m.style.setProperty('--ey', ((dy / d) * 0.05 * k).toFixed(3) + 'em');
      });
    });
  }, { passive: true });

  // ---------- click the logo: boop, quotes, party ----------
  const LINES = [
    'hiii 🍡', 'boop!', 'i’m made of rice and hope', 'save ur coins pls 🪙', 'u got this bestie ✨',
    'stop poking me i’m budgeting', 'have u drank water today', 'one (1) less doordash?? 🥺',
    'i believe in ur savings account', 'squish me again i dare u', 'mochi > iced coffee (cheaper)',
    'certified money buddy 💗', 'hehe', 'compound interest is my love language',
  ];
  let boops = [];
  document.addEventListener('click', (e) => {
    const logo = e.target.closest('.logo');
    if (!logo || logo.closest('.story')) return;
    const m = logo.querySelector('.mochi');
    if (m) { m.classList.remove('wh-boop'); void m.offsetWidth; m.classList.add('wh-boop'); setTimeout(() => m.classList.remove('wh-boop'), 460); }
    const r = (m || logo).getBoundingClientRect();
    burst(r.left + r.width / 2, r.top, 3, ['💗', '💕']);
    const now = Date.now();
    boops = boops.filter((t) => now - t < 2500).concat(now);
    if (boops.length >= 7) {
      boops = [];
      say('MOCHI PARTY 🎉🍡', r.left, r.top, 2600, r.bottom);
      rain(46);
    } else if (boops.length >= 4) say(pick(['ok ok ok', 'ur gonna squish me flat', 'stop it (don’t stop)', 'one more and i’ll party']), r.left, r.top, 1800, r.bottom);
    else say(pick(LINES), r.left, r.top, 1800, r.bottom);
  });

  // ---------- buddy (peek / sleep) ----------
  let buddy;
  function getBuddy() {
    if (buddy && buddy.isConnected) return buddy;
    if (!phone) return null;
    buddy = document.createElement('div');
    buddy.className = 'wh-buddy';
    buddy.setAttribute('aria-hidden', 'true');
    buddy.innerHTML = '<span class="mochi"></span><span class="z">z</span><span class="z">z</span><span class="z">Z</span>';
    buddy.addEventListener('click', (e) => {
      e.stopPropagation();
      const r = buddy.getBoundingClientRect();
      if (buddy.classList.contains('sleep')) { wake(); say('!! i was not sleeping', r.left - 60, r.top); }
      else { say(pick(['hi hi 👋', 'pat pat', 'i live here now', 'ok bye 💨']), r.left - 40, r.top); setTimeout(hideBuddy, 1200); }
      burst(r.left + r.width / 2, r.top, 4);
    });
    phone.appendChild(buddy);
    return buddy;
  }
  function hideBuddy() { if (buddy) buddy.classList.remove('on', 'sleep', 'wave'); }
  function peek() {
    const b = getBuddy(); if (!b) return;
    b.classList.remove('sleep'); b.classList.add('on', 'wave');
    setTimeout(() => {
      const r = b.getBoundingClientRect();
      say(pick(['u called? 🍡', 'that’s my name!!', 'mochi reporting for duty', 'hehe hi']), r.left - 70, r.top);
    }, 450);
    setTimeout(hideBuddy, 3200);
  }

  // idle → sleepy buddy
  let idleT, asleep = false;
  function wake() { if (asleep) { asleep = false; hideBuddy(); } }
  function resetIdle() {
    wake();
    clearTimeout(idleT);
    idleT = setTimeout(() => {
      if (document.querySelector('.story, .sheet.on')) return resetIdle();
      const b = getBuddy(); if (!b) return;
      asleep = true; b.classList.add('on', 'sleep');
    }, 30000);
  }
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => document.addEventListener(ev, (e) => {
    if (asleep && buddy && buddy.contains(e.target)) return; // let the click handler react
    resetIdle();
  }, { passive: true }));
  let moveT = 0;
  document.addEventListener('pointermove', () => { if (Date.now() - moveT > 1000) { moveT = Date.now(); resetIdle(); } }, { passive: true });
  resetIdle();

  // ---------- keyboard secrets ----------
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let keys = [], word = '';
  document.addEventListener('keydown', (e) => {
    if (typing(e)) return;
    keys = keys.concat(e.key.length === 1 ? e.key.toLowerCase() : e.key).slice(-KONAMI.length);
    if (KONAMI.every((k, i) => keys[i] === k)) {
      keys = [];
      document.body.classList.add('wh-secret');
      rain(60, ['🍡', '🌈', '✨', '💖', '🍥', '🪙']);
      const r = (phone || document.body).getBoundingClientRect();
      say('secret mochi mode unlocked 🌈', r.left + 40, r.top + 90, 3000);
      setTimeout(() => document.body.classList.remove('wh-secret'), 6000);
    }
    if (e.key.length === 1) {
      word = (word + e.key.toLowerCase()).slice(-5);
      if (word === 'mochi') { word = ''; peek(); }
    }
  });

  // ---------- night owl ----------
  function nightCheck() {
    const h = new Date().getHours();
    document.body.classList.toggle('wh-night', h >= 23 || h < 4);
  }
  nightCheck(); setInterval(nightCheck, 60000);

  // ---------- pitch tagline: dango sparkle ----------
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest('.pitch .tagline');
    if (!t || t.contains(e.relatedTarget)) return;
    const r = t.getBoundingClientRect();
    burst(r.left + 14, r.top, 3, ['🍡', '✨']);
  });

  // ---------- devtools hello ----------
  console.log('%c  (｡•ᴗ•｡)  %c psst. hi dev 🍡  try the konami code, type "mochi", or boop the logo 7 times.',
    'background:#ffd3e3;color:#22182a;font-size:16px;border-radius:999px;padding:4px 8px',
    'color:#ff8fb8;font-weight:bold');

  window.mochiiWhimsy = { burst, rain, say, peek };
})();
