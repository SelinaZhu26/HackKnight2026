# 🔮 Future tab (branch `future-forecast`)

A new **Future** tab that predicts where your money is going and lets you shape the page around a goal.

## What's in it

| block | what it does |
|---|---|
| 🎯 **goal bar** | Type a goal ("i wanna spend at most $400 this week"). Gemini (or the offline planner if no key is set) parses it, tracks progress (spent so far + projected), and **rearranges the page**: order, forecast horizon, chart mode and accent color. You can undo it. |
| 📈 **crystal ball** | S&P-style forecast: history line, dashed median, and a 50%/80% confidence cone. Slider: 1D · 2D · **1W** · 2W · **1M** · **3M** · **6M** · **1Y** (flagships in bold). Spending or balance mode, scrub the chart for any date, plus "what's driving it" (subscriptions + top habits). |
| 🚨 **runway alarm** | "if you keep spending like this, you'll drain all your money in N months". Uses paychecks vs spending ("but i get paid?" is answered inline), a break-even fix, and a "YOLO" response. |
| 🔁 **1 decision → 100** | Shows how a single $6 purchase repeats over a year, the yearly cost, and the "do it half as often" savings. |
| 🧠 **money habits** | "~$300/mo on breakfast"-style averages by category, or by **meal** (breakfast / lunch / dinner / late-night). Tap a row for top merchants, visits/mo, average ticket, weekend share and time of day. |
| 🚩 **red flags** | Death by $5 cuts, merchants on autopilot, the delivery tax, the 2am purchases, subscription pile-up, category creep, spending more than you make. Each one shows "repeats ~N×/yr → $X/yr". |
| ⚖️ **net = earned − spent** | Diverging bars, daily / weekly / monthly / yearly, with forecast periods hatched. |
| 🧾 **daily receipts** | A thermal-style receipt for every day, with a printer animation, a catalog by month, and a share/save 1080×1920 PNG. |
| 🏦 **balances** | Checking, savings, cash and credit (demo "sync" or manual). Stocks, crypto and retirement are manual for now (🚧 hurdle: needs a brokerage data partner). Paychecks are auto-detected, with a manual override. |
| ✏️ **customize** | A fixed playground: the same blocks for everyone. Move, hide or recolor them; the skeleton stays fixed. |

## Prediction engine (`js/forecast.js`)

Pure functions, no dependencies, and it runs in Node.

- **Recurring bills** are scheduled on the day of the month they usually hit.
- **Everyday spending** is modeled per weekday from the last ≤90 days: a recency-weighted mean (30-day half-life) and variance, shrunk toward the overall daily mean.
- **Paychecks** are detected from deposits (twice a month, every 2 weeks, weekly, monthly) and scheduled forward. One-off money in is averaged.
- **The cone:** daily noise adds up like a random walk (√n), and uncertainty in the mean adds linear growth. That gives 50% and 80% bands that widen honestly over long horizons.
- With under 21 days or fewer than 15 purchases, the UI says so instead of overclaiming.

CSV imports now keep deposits (`txns.income`) so net and runway work on real data. Transfers between your own accounts and card payments are excluded.

## Files

`js/forecast.js` (engine), `js/future.js` (UI), `future.css`, plus small hooks in `js/app.js` (tab + Home teaser), `js/data.js` (CSV income) and `index.html` (scripts, Space Mono font).
