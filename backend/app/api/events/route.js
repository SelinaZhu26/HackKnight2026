import { db, handle, json, upsertUser } from '../../../lib/db.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const KINDS = ['lesson', 'practice', 'testout'];

// POST { user: { id, name }, events: [{ ts, kind, lesson, xp, accuracy }] } from the Learn tab.
export async function POST(req) {
  return handle(async () => {
    const body = await req.json().catch(() => null);
    const events = (Array.isArray(body?.events) ? body.events.slice(0, 100) : [])
      .map((e) => ({ ts: new Date(e?.ts ?? Date.now()), kind: e?.kind, lesson: e?.lesson ? String(e.lesson).slice(0, 10) : null,
        xp: Math.max(0, Math.min(1000, Math.round(Number(e?.xp) || 0))), accuracy: Number.isFinite(+e?.accuracy) ? Math.max(0, Math.min(1, +e.accuracy)) : null }))
      .filter((e) => KINDS.includes(e.kind) && !Number.isNaN(e.ts.getTime()));
    if (!events.length) return json({ error: 'no valid events' }, 400);
    const client = await db().connect();
    try {
      const id = await upsertUser(client, body.user);
      const { rowCount } = await client.query(
        `INSERT INTO learn_events (user_id, ts, kind, lesson_id, xp, accuracy)
         SELECT $1::uuid, * FROM unnest($2::timestamptz[], $3::text[], $4::text[], $5::int[], $6::real[])
         ON CONFLICT DO NOTHING`,
        [id, events.map((e) => e.ts), events.map((e) => e.kind), events.map((e) => e.lesson), events.map((e) => e.xp), events.map((e) => e.accuracy)]);
      return json({ ok: true, inserted: rowCount });
    } finally {
      client.release();
    }
  });
}
