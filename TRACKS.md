# mochii club 🍡: tracks cheat sheet

**Pitch:** Spotify Wrapped for your bank statement. Get roasted, learn money, and team up with friends to actually spend less.

---

## 💰 Best Financial Hack
**One-liner:** Wrapped makes Gen Z look at their spending, and squads plus a Duolingo-style course make them change it.
- **Wrapped:** a 13-slide story covering totals, top merchants, late-night buys, 👻 unused subs, health score (0–100) and a share card.
- **Future:** a runway forecast, a "prove me wrong" prediction, and a glow-up plan ranked by $/yr saved.
- **Learn:** 12 units and 72 lessons, with streaks, hearts and a league.
- **Data in:** demo bank, CSV import (messy descriptors get cleaned) or Gmail receipts.
- **Demo:** onboarding → ⚡ sample statement → Wrapped → glow-up plan.

## ✨ Best Use of Gemini API
**One-liner:** Gemini is our tutor, roaster and parser. It grades reasoning instead of keywords, reads receipt emails into transactions, and writes plans as structured JSON.
- **Learn tutor:** grades "explain it" answers by meaning, gives progressive hints, and has an "I'm stuck" worked answer.
- **Smart practice:** writes new questions at your 1–5 level, validated before display.
- **Receipt parsing:** turns an email into `{merchant, date, amount, category}` with JSON mode, validated before saving.
- **Roasts and glow-up plan:** personal, built from your real stats.
- **Model:** `gemini-3.5-flash`. If it's overloaded, the app switches straight to `gemini-3.8-flash`, then retries once. Every feature has an offline fallback, so the demo never breaks.
- **Demo:** ⚙️ → paste key → *test connection* → Learn "explain it" → Gmail "paste a receipt".
- Code: `js/gemini.js`

## 🐯 Tiger Data
**One-liner:** Money is time-series data, so purchases live in TimescaleDB hypertables and weekly trends come from a continuous aggregate with `time_bucket`, not JS loops.
- Hypertables: `transactions` and `learn_events`. Continuous aggregate: `daily_spend`.
- Sync is local-first and idempotent, and users can turn it off. API keys are never synced.
- **Demo:** ⚙️ → 🐯 Tiger Data shows weekly spend and chunk counts computed in the database. Details: `TIGER.md`

## ◎ Solana
**One-liner:** "Loser buys boba," made real. Friends stake SOL into a squad pot, winners are paid when the month settles, and only pass/fail plus a salted hash goes on-chain.
- Micro-stakes are viable because fees are about $0.0003 and blocks take about 400 ms. The pot is an address, not a friend.
- **Verify my hash:** you can prove your own result without revealing your spending.
- Squad links are **Blinks**.
- **Demo:** join code `SNACK` → stake → settle → verify. Details: `SOLANA.md`

## 🎧 ElevenLabs (if entering)
**One-liner:** Voice mode reads every lesson and tutor reply aloud, so you can learn money hands-free.
- Uses ElevenLabs when a key is set in ⚙️, otherwise browser speech.

---

**Run:** `python3 -m http.server 5173` (static) or `cd backend && npm ci && npm run dev` (with Tiger). Tests: `node --test tests/regressions.test.js tests/learn.test.js`
**Keys:** on mochii.club, Gemini and ElevenLabs keys live in the server's `.env` behind rate-limited `/api/ai/*` routes, so judges get AI with zero setup and never see a key. Anyone can still paste their own key in ⚙️.
