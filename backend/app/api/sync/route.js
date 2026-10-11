import { db, handle, json, upsertUser } from '../../../lib/db.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const MAX = 5000;

// POST { user: { id, name }, source, txns: [{ date, merchant, category, amount }] }
// Idempotent: re-sending the same purchases inserts nothing new.
export async function POST(req) {
  return handle(async () => {
    const body = await req.json().catch(() => null);
    const txns = Array.isArray(body?.txns) ? body.txns.slice(0, MAX) : null;
    if (!txns) return json({ error: 'txns must be an array' }, 400);
    const source = ['demo', 'csv', 'gmail'].includes(body.source) ? body.source : 'demo';
    const rows = txns.map((t) => ({ ts: new Date(t?.date), merchant: String(t?.merchant ?? '').trim().slice(0, 60), category: String(t?.category ?? 'Other').slice(0, 30), amount: Math.round(Number(t?.amount) * 100) / 100 }))
      .filter((t) => !Number.isNaN(t.ts.getTime()) && t.merchant && t.amount > 0 && t.amount < 1e9);
    const client = await db().connect();
    try {
      await client.query('BEGIN');
      const id = await upsertUser(client, body.user);
      const { rowCount } = await client.query(
        `INSERT INTO transactions (user_id, ts, merchant, category, amount, source)
         SELECT $1::uuid, *, $6::text FROM unnest($2::timestamptz[], $3::text[], $4::text[], $5::numeric[])
         ON CONFLICT DO NOTHING`,
        [id, rows.map((r) => r.ts), rows.map((r) => r.merchant), rows.map((r) => r.category), rows.map((r) => r.amount), source]);
      await client.query('COMMIT');
      return json({ ok: true, received: txns.length, inserted: rowCount, skipped: txns.length - rows.length });
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  });
}
