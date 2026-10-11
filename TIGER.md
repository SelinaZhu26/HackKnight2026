# 🐯 mochii club × Tiger Data

mochii club stores every member's purchases and learning activity in **Tiger Cloud (TimescaleDB on Postgres)**. Money is time-series data, so the database does the time math: weekly trends come from a **continuous aggregate** queried with **`time_bucket`**, not from JavaScript loops.

## What's stored

| table | kind | what's in it |
|---|---|---|
| `users` | regular table | anonymous id (a UUID made in the browser) and display name |
| `transactions` | **hypertable** (30-day chunks on `ts`) | every purchase: time, merchant, category, amount, source (demo / CSV / Gmail) |
| `learn_events` | **hypertable** | each finished lesson, practice or test-out: lesson id, xp, accuracy |
| `daily_spend` | **continuous aggregate** | spend per user × day × category, refreshed every 10 min, real-time for new rows |

Schema: [`backend/lib/schema.js`](backend/lib/schema.js). It's applied automatically on the first API call and is safe to re-run.

## How data flows

```
browser (js/db.js) ──POST /api/sync────▶ Next.js route ──INSERT … unnest(…) ON CONFLICT DO NOTHING──▶ transactions (hypertable)
                   ──POST /api/events──▶ Next.js route ──────────────────────────────────────────────▶ learn_events (hypertable)
⚙️ Settings panel ◀─GET /api/insights── time_bucket('7 days') over daily_spend (continuous aggregate)
                   ◀─GET /api/stats───── row counts + hypertable chunk counts (aggregate only)
```

- **Local-first:** the app still runs fully offline or on a plain static server. Sync turns on only when `/api/health` reports the database is reachable.
- **Idempotent sync:** re-sending the same purchases inserts nothing (unique on user, time, merchant, amount).
- **Honest privacy copy:** when sync is on, the onboarding, CSV importer and Settings say data is saved to Tiger Cloud. Users can switch it off in ⚙️. Gemini and ElevenLabs keys are never sent.

## Run it

1. Create a free service at [console.cloud.timescale.com](https://console.cloud.timescale.com) and copy its connection string.
2. Start the backend with it:
   ```sh
   cd backend && npm ci
   DATABASE_URL='postgres://tsdbadmin:…@….tsdb.cloud.timescale.com:3xxxx/tsdb?sslmode=require' npm run dev
   ```
3. Open http://localhost:3000, enter a name, pick **Connect your bank**, and finish a lesson in **Learn**.
4. Open **⚙️ Settings → 🐯 Tiger Data** to see weekly spend and learning stats computed in the database.

For Docker or the GCP deploy, add `DATABASE_URL=…` to the server's `.env`. `compose.yaml` passes it to the container.

## Show the judges

**API (no login needed):**
```sh
curl https://<host>/api/health   # {"db":"ok","engine":"timescaledb 2.x"}
curl https://<host>/api/stats    # members, purchases, lesson events, hypertable chunk counts
```

**SQL in the Tiger Cloud console:**
```sql
-- hypertables and their chunks
SELECT hypertable_name, num_chunks FROM timescaledb_information.hypertables;

-- weekly spend for the whole club, straight from the continuous aggregate
SELECT time_bucket('7 days', day) AS week, round(sum(total), 2) AS spent, sum(purchases) AS purchases
FROM daily_spend GROUP BY week ORDER BY week;

-- biggest categories in the last 30 days of data
SELECT category, round(sum(amount), 2) AS spent FROM transactions
WHERE ts > (SELECT max(ts) FROM transactions) - INTERVAL '30 days'
GROUP BY category ORDER BY spent DESC;

-- learning streaks: active days per member
SELECT u.name, count(DISTINCT ts::date) AS active_days, sum(xp) AS xp
FROM learn_events e JOIN users u ON u.id = e.user_id GROUP BY u.name ORDER BY xp DESC;
```

## API

| route | does |
|---|---|
| `GET /api/health` | `{ db: "ok" \| "off" \| "error", engine }` |
| `POST /api/sync` | `{ user: { id, name }, source, txns: [{ date, merchant, category, amount }] }`, up to 5,000 rows |
| `POST /api/events` | `{ user: { id, name }, events: [{ kind: lesson \| practice \| testout, lesson, xp, accuracy }] }` |
| `GET /api/insights?user=<uuid>` | weekly spend (12 weeks), top categories, learning totals |
| `GET /api/stats` | aggregate counts only, with no names or purchases |

**Hackathon limits:** accounts are anonymous browser UUIDs with no login, so anyone holding an id can read that member's insights. Add auth before real use.
