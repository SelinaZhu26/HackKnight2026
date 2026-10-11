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

For a Next.js server, see [`backend/README.md`](backend/README.md). Run `npm ci`
and `npm run dev` from `backend/`; it copies and serves the existing frontend
without converting it to React. Production uses `npm run build` and `npm start`.

For Docker, set the image repository and version in `.env`, then run
`docker compose -f compose.yaml -f compose.build.yaml up --build -d --wait`
from this directory and open http://localhost:3001. The base Compose file can
deploy the published image using `docker compose pull` and
`docker compose up -d --wait`. See [`backend/README.md`](backend/README.md) for
publishing, deployment, and Nginx integration.

On desktop it renders inside a phone frame with a pitch panel beside it. On a phone it runs full screen.

CSV imports use debit/credit columns or recognized transaction types when available. For amount-only exports, choose whether purchases are negative or positive before importing; the opposite sign is excluded. Date-only imports use local calendar dates (`YYYY-MM-DD`, `YYYY/MM/DD`, bank `MM/DD/YYYY` / `MM-DD-YYYY` including two-digit bank years, or English month names such as `September 1, 2026`), while ISO timestamps retain their time and offset.

Run the focused regression suite with `node --test tests/regressions.test.js tests/learn.test.js`. Optional browser checks use `node tests/browser.cjs` with Playwright on the Node module path and Chrome installed; they start their own local server and use disposable browser contexts.

## Features

| | |
|---|---|
| **Learn** 🎓 | Duolingo-style money course from `lesson-plan.md`: 12 units, 72 lessons on a winding path. Each lesson has a short tip, then quick exercises (match pairs, fill in the blank, multiple choice, number crunching), then an "explain it" question that Gemini tutors with progressive hints and an "I'm stuck" worked answer. Unit challenges, "jump here?" test-outs, and a guidebook per unit |
| **Consistency loop** 🔥 | XP, daily goal ring, daily quests, streaks with a streak freeze (earned by finishing all quests), hearts that regenerate (explain-it questions never cost hearts), 1–3 stars per lesson, a weekly friends league, confetti and sounds. Home shows a streak nudge card |
| **Smart practice** 🧠 | Adaptive review that tracks a 1–5 difficulty level from your accuracy. With a key, Gemini writes fresh questions at that level on topics you've finished (validated before display). Offline, it remixes your past exercises, favoring ones you missed. Earns back a heart |
| **Voice** 🎧 | 🔊 on any tip or question, plus a voice mode that reads every prompt and tutor reply aloud. Uses ElevenLabs when a key is set in ⚙️, otherwise browser speech |
| **Solo Wrapped** | 13-slide animated story: total spent, vs last month, top categories, top merchants ("on repeat"), late-night spending, "the one that hurt", subscription audit with 👻 unused subs, money aura, health score, AI roast, prediction, group-chat rank, and a share card |
| **Prove me wrong** 🔮 | Predicts next month from a weighted 3-month history plus momentum. Accept the challenge and it becomes a target with a daily allowance |
| **Glow-up plan** | Rule-based insights ranked by $/yr you could save (delivery markup, coffee, ghost subs, late-night buys, category spikes, weekend splurges). Gemini turns them into a 3-step plan |
| **Spending calendar** 📅 | Month grid on Home, with each day shaded by how much you spent. Tap a day to see its transactions, and switch months with the arrows. It opens on your most expensive day |
| **Health score** | 0–100 score with a letter grade, built from budget, trend, impulse control, subscriptions, and cooking at home |
| **Friends Wrapped** 👯 | Group total, "most likely to…" superlatives (Starbucks tattoo, DoorDash first-name basis, The Saver…), and a health-score leaderboard |
| **Friend profiles** | Their aura, categories, and score. Play *their* Wrapped, roast them, or nudge them |
| **Squads** 🤝 | Accountability groups with a category cap, stakes ("loser buys boba"), live on-track bars, and invite links / join codes (try `GYMRAT`) |
| **Roast board** 🔥 | Confess a purchase and get roasted by Gemini. Friends react 💀🔥😭🧢 and comment |
| **Sharing** 🔗 | Shareable link (`#/share/…` with the summary encoded in the URL) and a 1080×1920 PNG story card |
| **Data in** | Demo bank (3 months, 6 people), **CSV import** (below), or **Gmail receipts** (MCP + Gemini flow, plus a live "paste a receipt email → Gemini extracts it" parser) |
| **CSV import** 📄 | 3-step flow: drag and drop (or tap) a bank CSV, or load the **⚡ sample statement** with one tap. Then an animated "reading your receipts" step, then a review screen with totals, a category breakdown, and tap-to-fix categories for merchants we couldn't place. Messy bank descriptors are cleaned up (`SQ *BLUE BOTTLE #12` becomes Blue Bottle), deposits are skipped, the purchase sign is auto-detected with a toggle to flip it, and repeat charges are flagged as subscriptions. Works from onboarding, Settings, the Home card, or by dropping a file anywhere |

## Gemini

Open ⚙️ Settings, paste a key from https://aistudio.google.com/apikey, and hit *test connection*. Gemini then powers:

- personalized roasts (Wrapped slide, friend profiles, roast board)
- the glow-up plan (structured JSON output)
- receipt-email parsing into a transaction (the core of the MCP Gmail pipeline)
- the Learn tutor (grades "explain it" answers by meaning, gives one focused follow-up) and adaptive smart-practice questions

Without a Gemini key, Learn grades explain-it answers with a per-lesson keyword rubric and reveals the model answer after three tries.

For voice, paste an ElevenLabs API key (and optionally a voice ID) in ⚙️ Settings. It's stored in `localStorage` like the Gemini key.

Without a key, everything falls back to the built-in roast bot and regex parsing, so the demo never breaks on stage.

> ⚠️ For the MVP the key is stored in `localStorage` and called from the browser. Move it behind a server before shipping.

## 2-minute demo script

1. Type a name and click **Connect bank**. The Wrapped story auto-plays. Use ← → or tap to move, and hold to pause.
2. On the prediction slide, hit **challenge accepted**. At the end, hit **share link**, then paste it in a new tab to show the public share page.
3. **Home**: health score, then **✨ build my glow-up plan**, then 🔥 roast a recent transaction.
4. **Friends**: play **Friends Wrapped**, then tap Marcus → **roast**.
5. **Squads**: show the bars and stakes, then **join w/ code** → `GYMRAT`.
6. ⚙️ → **📄 import statement** → **⚡ use a sample statement**, fix a category, then **generate my wrapped**.
7. **Learn**: tap the glowing node → **start**, do a lesson (try a wrong answer to lose a heart), finish it to see the streak screen. Tap 🎧 for voice mode, or **jump here?** on Unit 6 to test out.
8. 📧 (top right): the Gmail scan animation, then **use sample** → **parse receipt ✨** → add it.

## Code map

```
index.html        shell + desktop pitch panel
styles.css        all styling (Wrapped-style color blocks, shapes, story player)
js/data.js        seeded dummy data for you + 5 friends, CSV parser, merchant cleanup, categorizer, sample statement
js/analytics.js   stats, prediction, health score, insights, aura, superlatives, fallback roasts
js/gemini.js      Gemini REST client + AI features with offline fallbacks
js/wrapped.js     story player, solo/friends slides, share card + PNG renderer
js/curriculum.js  the 72-lesson course data (tips, exercises, tutor rubrics) from lesson-plan.md
js/learn.js       Learn tab: path, lesson player, XP/streaks/hearts/quests/league, Gemini tutor + practice
js/voice.js       ElevenLabs text-to-speech with a browser-speech fallback
js/app.js         routing, screens, sheets, squads, roast board, settings, state (localStorage)
```

## Next steps

- Real bank connection (Plaid) and a real Gmail MCP server feeding `R.ai.parseReceipt`
- Backend for accounts, friends, and squads (all local right now)
- Push notifications for squad slips and "prove me wrong" check-ins
