/* receipts. — Gemini API layer
 * Calls Gemini directly from the browser with a key the user pastes in Settings
 * (stored in localStorage only). Everything has a no-key fallback so the demo never breaks.
 */
(function (global) {
  const R = (global.R = global.R || {});
  const LS = 'receipts.gemini';

  R.gemini = {
    get config() {
      try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; }
    },
    save(cfg) { try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch {} },
    get enabled() { return !!this.config.key; },

    async generate(prompt, { json = false, temperature = 1.0 } = {}) {
      const { key, model = 'gemini-2.5-flash' } = this.config;
      if (!key) throw new Error('no-key');
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature, ...(json ? { responseMimeType: 'application/json' } : {}) },
        }),
      });
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 160)}`);
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
      return json ? JSON.parse(text.replace(/^```json|```$/g, '').trim()) : text.trim();
    },
  };

  const VOICE = `You are "receipts.", a Gen Z personal-finance app that is Spotify Wrapped for bank statements.
Voice: lowercase, funny, chronically online, a little savage but never mean about income, body, or identity.
Roast the CHOICES, not the person. No slurs, no profanity beyond "damn". Use 0-2 emojis.`;

  function statsBlob(a, name) {
    return JSON.stringify({
      name, month: a.monthLabel, total: Math.round(a.total), budget: a.budget, vsLastMonthPct: Math.round(a.deltaPct * 100),
      topCategories: a.byCat.slice(0, 4).map((c) => ({ cat: c.cat, amt: Math.round(c.amt), n: c.count })),
      topMerchant: a.topMerchant && { name: a.topMerchant.name, amt: Math.round(a.topMerchant.amt), visits: a.topMerchant.count },
      coffees: a.coffee.count, deliveryOrders: a.delivery.count, lateNightPurchases: a.late.count,
      ghostSubscriptions: a.ghostSubs.map((s) => s.name), biggestPurchase: a.biggest && { m: a.biggest.merchant, amt: a.biggest.amount },
      healthScore: a.score.score, aura: a.aura.title,
    });
  }

  R.ai = {
    async roast(a, name) {
      try {
        return await R.gemini.generate(`${VOICE}
Write a 2-3 sentence roast of this person's month of spending. Be specific with their numbers and merchants. Max 55 words.
DATA: ${statsBlob(a, name)}`);
      } catch (e) { return R.fallbackRoast(a, name === 'You' ? 'bestie' : name); }
    },

    async glowUp(a, name) {
      try {
        const plan = await R.gemini.generate(`${VOICE}
Create a realistic 3-step plan to spend less next month. Each step must cite their real numbers and include a $ monthly saving estimate.
Return JSON: {"headline": string (<=8 words), "steps":[{"emoji":string,"title":string(<=6 words),"detail":string(<=25 words),"save":number}]}
DATA: ${statsBlob(a, name)}`, { json: true, temperature: 0.8 });
        if (plan?.steps?.length) return plan;
        throw new Error('bad');
      } catch (e) {
        return {
          headline: 'your glow-up era starts now',
          steps: a.insights.slice(0, 3).map((i) => ({ emoji: i.emoji, title: i.title, detail: i.body, save: Math.round(i.save / 12) })),
          fallback: true,
        };
      }
    },

    async roastPurchase(t, who) {
      try {
        return await R.gemini.generate(`${VOICE}
One-line roast (max 18 words) of ${who} spending $${t.amount.toFixed(2)} at ${t.merchant} (${t.category})${t.note ? `, they said: "${t.note}"` : ''}.`);
      } catch (e) {
        const lines = {
          Coffee: [`$${t.amount.toFixed(2)} for bean water. the barista has your birthday saved.`, `this coffee had better come with a mortgage.`],
          Delivery: [`paying a stranger $${(t.amount * 0.3).toFixed(0)} to walk your food up the stairs. iconic.`, `the restaurant is 6 minutes away. you have legs.`],
          Shopping: [`"i needed it" — narrator: they did not need it.`, `adding to cart is not cardio.`],
          Transport: [`ubering a distance a golden retriever could walk.`, `$${t.amount.toFixed(0)} to avoid a 12 minute walk. respect the commitment.`],
          Entertainment: [`main character behavior. side character bank account.`, `the vibes were immaculate. the balance was not.`],
        };
        const arr = lines[t.category] || [`$${t.amount.toFixed(2)} at ${t.merchant}?? explain yourself.`];
        return arr[Math.floor(Math.random() * arr.length)];
      }
    },

    // Email-receipt → transaction. This is the piece the MCP Gmail server would feed.
    async parseReceipt(text) {
      try {
        const r = await R.gemini.generate(`Extract the purchase from this receipt/order email.
Return JSON {"merchant":string,"amount":number,"date":"YYYY-MM-DD","category":one of ${JSON.stringify(Object.keys(R.CATEGORIES))},"items":string(<=8 words)}.
EMAIL:\n${text.slice(0, 6000)}`, { json: true, temperature: 0 });
        return { ...r, via: 'gemini' };
      } catch (e) {
        const amt = (text.match(/(?:total|amount|charged)[^$\d]{0,20}\$?\s?(\d+[.,]\d{2})/i) || text.match(/\$(\d+[.,]\d{2})/) || [])[1];
        const from = (text.match(/from[:\s]+([A-Z][\w&' ]{2,24})/i) || text.match(/(?:order|receipt) from ([\w&' ]{2,24})/i) || [])[1];
        const merchant = (from || text.split('\n')[0] || 'Unknown').trim().slice(0, 24);
        return {
          merchant, amount: amt ? parseFloat(amt.replace(',', '.')) : 0,
          date: new Date().toISOString().slice(0, 10), category: R.categorize(text), items: 'parsed offline (no Gemini key)', via: 'regex',
        };
      }
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
