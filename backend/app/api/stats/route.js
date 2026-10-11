import { db, handle, json } from '../../../lib/db.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public, aggregate-only numbers for the demo (no names or purchases): row counts and hypertable chunks.
export async function GET() {
  return handle(async ({ engine, timescale }) => {
    const pool = db();
    const { rows: [counts] } = await pool.query(`SELECT
      (SELECT count(*) FROM users)::int AS users,
      (SELECT count(*) FROM transactions)::int AS transactions,
      (SELECT count(*) FROM learn_events)::int AS learn_events,
      (SELECT coalesce(sum(amount), 0) FROM transactions)::float AS dollars_tracked`);
    const hypertables = timescale
      ? (await pool.query(`SELECT hypertable_name AS name, num_chunks FROM timescaledb_information.hypertables ORDER BY 1`)).rows
      : [];
    return json({ engine, ...counts, hypertables });
  });
}
