import { db, handle, json } from '../../../lib/db.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET ?user=<uuid> → weekly spend trend, top categories and learning activity, computed in the database.
// On TimescaleDB this reads the daily_spend continuous aggregate with time_bucket; on plain Postgres it
// falls back to date_trunc over the raw table.
export async function GET(req) {
  return handle(async ({ timescale }) => {
    const user = new URL(req.url).searchParams.get('user') || '';
    if (!/^[0-9a-f-]{36}$/i.test(user)) return json({ error: 'user must be a UUID' }, 400);
    const weekly = timescale
      ? `SELECT time_bucket(INTERVAL '7 days', day) AS week, sum(total)::float AS total, sum(purchases)::int AS purchases
         FROM daily_spend WHERE user_id = $1 GROUP BY week ORDER BY week DESC LIMIT 12`
      : `SELECT date_trunc('week', ts) AS week, sum(amount)::float AS total, count(*)::int AS purchases
         FROM transactions WHERE user_id = $1 GROUP BY week ORDER BY week DESC LIMIT 12`;
    const pool = db();
    const [w, c, l] = await Promise.all([
      pool.query(weekly, [user]),
      pool.query(`SELECT category, sum(amount)::float AS total, count(*)::int AS purchases FROM transactions
        WHERE user_id = $1 AND ts > (SELECT max(ts) FROM transactions WHERE user_id = $1) - INTERVAL '30 days'
        GROUP BY category ORDER BY total DESC LIMIT 5`, [user]),
      pool.query(`SELECT coalesce(sum(xp), 0)::int AS xp, count(*) FILTER (WHERE kind <> 'practice')::int AS lessons,
        count(DISTINCT (ts AT TIME ZONE 'UTC')::date)::int AS active_days, avg(accuracy)::float AS accuracy
        FROM learn_events WHERE user_id = $1`, [user]),
    ]);
    return json({ engine: timescale ? 'timescaledb' : 'postgres', weekly: w.rows.reverse(), topCategories: c.rows, learning: l.rows[0] });
  });
}
