# receipts. 🧾

**Spotify Wrapped for your finances + social accountability for Gen Z.**

Connect your bank (or let Gemini read your receipt emails) and get a monthly, story-style *Wrapped* of your spending. Then get roasted for it and team up with friends to actually spend less.

Built for HackKnight 2026. Tracks: 💰 Best Financial Hack · ✨ Best Use of Gemini API

## Run it

No build step and no install. It's plain HTML/CSS/JS.

```bash
python3 -m http.server 5173
# open http://localhost:5173
```

(Or open `index.html` directly. A local server is only needed for share links to look right.)

On desktop it renders inside a phone frame with a pitch panel beside it. On a phone it runs full screen.

## Features

| | |
|---|---|
| **Solo Wrapped** | 13-slide animated story: total spent, vs last month, top categories, top merchants ("on repeat"), late-night spending, "the one that hurt", subscription audit with 👻 unused subs, money aura, health score, AI roast, prediction, group-chat rank, and a share card |
| **Prove me wrong** 🔮 | Predicts next month from a weighted 3-month history plus momentum. Accept the challenge and it becomes a target with a daily allowance |
| **Glow-up plan** | Rule-based insights ranked by $/yr you could save (delivery markup, coffee, ghost subs, late-night buys, category spikes, weekend splurges). Gemini turns them into a 3-step plan |
| **Health score** | 0–100 score with a letter grade, built from budget, trend, impulse control, subscriptions, and cooking at home |
| **Friends Wrapped** 👯 | Group total, "most likely to…" superlatives (Starbucks tattoo, DoorDash first-name basis, The Saver…), and a health-score leaderboard |
| **Friend profiles** | Their aura, categories, and score. Play *their* Wrapped, roast them, or nudge them |
| **Squads** 🤝 | Accountability groups with a category cap, stakes ("loser buys boba"), live on-track bars, and invite links / join codes (try `GYMRAT`) |
| **Roast board** 🔥 | Confess a purchase and get roasted by Gemini. Friends react 💀🔥😭🧢 and comment |
| **Sharing** 🔗 | Shareable link (`#/share/…` with the summary encoded in the URL) and a 1080×1920 PNG story card |
| **Data in** | Demo bank (3 months, 6 people), **real CSV upload** (most bank export formats), or **Gmail receipts** (MCP + Gemini flow, plus a live "paste a receipt email → Gemini extracts it" parser) |

## Gemini

Open ⚙️ Settings, paste a key from https://aistudio.google.com/apikey, and hit *test connection*. Gemini then powers:

- personalized roasts (Wrapped slide, friend profiles, roast board)
- the glow-up plan (structured JSON output)
- receipt-email parsing into a transaction (the core of the MCP Gmail pipeline)

Without a key, everything falls back to the built-in roast bot and regex parsing, so the demo never breaks on stage.

> ⚠️ For the MVP the key is stored in `localStorage` and called from the browser. Move it behind a server before shipping.

## 2-minute demo script

1. Type a name and click **Connect bank**. The Wrapped story auto-plays. Use ← → or tap to move, and hold to pause.
2. On the prediction slide, hit **challenge accepted**. At the end, hit **share link**, then paste it in a new tab to show the public share page.
3. **Home**: health score, then **✨ build my glow-up plan**, then 🔥 roast a recent transaction.
4. **Friends**: play **Friends Wrapped**, then tap Marcus → **roast**.
5. **Squads**: show the bars and stakes, then **join w/ code** → `GYMRAT`.
6. 📧 (top right): the Gmail scan animation, then **use sample** → **parse receipt ✨** → add it.

## Code map

```
index.html        shell + desktop pitch panel
styles.css        all styling (Wrapped-style color blocks, shapes, story player)
js/data.js        seeded dummy data for you + 5 friends, CSV parser, categorizer
js/analytics.js   stats, prediction, health score, insights, aura, superlatives, fallback roasts
js/gemini.js      Gemini REST client + AI features with offline fallbacks
js/wrapped.js     story player, solo/friends slides, share card + PNG renderer
js/app.js         routing, screens, sheets, squads, roast board, settings, state (localStorage)
```

## Next steps

- Real bank connection (Plaid) and a real Gmail MCP server feeding `R.ai.parseReceipt`
- Backend for accounts, friends, and squads (all local right now)
- Push notifications for squad slips and "prove me wrong" check-ins
