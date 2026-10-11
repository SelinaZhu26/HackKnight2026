// Postgres / Tiger Data (TimescaleDB) access for the API routes.
// Configure with DATABASE_URL (the Tiger Cloud service URL). Without it, the API reports db: "off"
// and the frontend keeps working from localStorage alone.
import pg from 'pg';
import { SCHEMA } from './schema.js';

let pool = null;
let ready = null;

export const configured = () => Boolean(process.env.DATABASE_URL);

export function db() {
  pool ||= new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 8_000 });
  return pool;
}

// Applies lib/schema.js once per process. Timescale-only statements run only if the extension exists.
export function ensureSchema() {
  ready ||= (async () => {
    const [base, rest = ''] = SCHEMA.split('\n-- timescale:begin\n');
    const timescale = rest.split('\n-- timescale:end\n')[0];
    const client = await db().connect();
    try {
      await client.query(base);
      let engine = 'postgres';
      try {
        await client.query('CREATE EXTENSION IF NOT EXISTS timescaledb');
        const { rows } = await client.query("SELECT extversion FROM pg_extension WHERE extname = 'timescaledb'");
        if (rows[0]) {
          const stmts = timescale.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').split(';').map((s) => s.trim()).filter(Boolean);
          for (const stmt of stmts) await client.query(stmt);
          engine = `timescaledb ${rows[0].extversion}`;
        }
      } catch (e) {
        console.warn('TimescaleDB features unavailable, using plain Postgres:', e.message);
      }
      return { engine, timescale: engine.startsWith('timescaledb') };
    } finally {
      client.release();
    }
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

export const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Validates { id, name } and upserts the user row.
export async function upsertUser(client, user) {
  if (!user || !UUID.test(String(user.id))) throw Object.assign(new Error('user.id must be a UUID'), { status: 400 });
  const name = String(user.name || 'You').trim().slice(0, 40) || 'You';
  await client.query(
    `INSERT INTO users (id, name) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, last_seen = now()`, [user.id, name]);
  return user.id;
}

// Shared wrapper: 503 when no database, 400 for bad input, 500 otherwise.
export async function handle(fn) {
  if (!configured()) return json({ error: 'database not configured' }, 503);
  try {
    const info = await ensureSchema();
    return await fn(info);
  } catch (e) {
    if (e.status) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: 'database error' }, 500);
  }
}
