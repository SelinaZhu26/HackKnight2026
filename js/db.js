/* mochii club — cloud sync to Tiger Data (TimescaleDB) through the backend's /api routes.
 * The app stays local-first: if the backend or database isn't there (e.g. a plain static server),
 * everything keeps working from localStorage and nothing is sent anywhere.
 * API keys (Gemini, ElevenLabs) are never synced.
 */
(function (global) {
  const R = (global.R = global.R || {});
  const UID = 'receipts.uid';
  const PREF = 'receipts.cloud';
  const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

  const post = (path, body) => fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: body && JSON.stringify(body).length < 60000 })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${path} ${r.status}`))));

  R.db = {
    available: false,
    engine: '',
    lastSync: null,
    get enabled() { return get(PREF) !== 'off'; },
    set enabled(v) { set(PREF, v ? 'on' : 'off'); },
    get on() { return this.available && this.enabled; },

    // Anonymous account id, created once per browser.
    get userId() {
      let id = get(UID);
      if (!id) { id = crypto.randomUUID?.() || '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)); set(UID, id); }
      return id;
    },

    async init() {
      if (typeof fetch === 'undefined' || location.protocol === 'file:') return;
      try {
        const r = await fetch('/api/health', { signal: AbortSignal.timeout(2000), cache: 'no-store' });
        const j = r.ok ? await r.json() : {};
        this.available = j.db === 'ok'; this.engine = j.engine || '';
      } catch { this.available = false; }
    },

    // Upload purchases (idempotent on the server). Chunked to keep requests small.
    async syncTxns(name, txns, source) {
      if (!this.on || !txns?.length) return null;
      const user = { id: this.userId, name };
      let inserted = 0;
      for (let i = 0; i < txns.length; i += 1000) {
        const chunk = txns.slice(i, i + 1000).map((t) => ({ date: t.date, merchant: t.merchant, category: t.category, amount: t.amount }));
        inserted += (await post('/api/sync', { user, source, txns: chunk })).inserted;
      }
      this.lastSync = new Date();
      return inserted;
    },

    event(name, e) {
      if (!this.on) return;
      post('/api/events', { user: { id: this.userId, name }, events: [{ ts: new Date().toISOString(), ...e }] }).catch(() => {});
    },

    insights() { return fetch(`/api/insights?user=${this.userId}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null); },
    stats() { return fetch('/api/stats', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
