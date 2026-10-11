import { configured, ensureSchema, json } from '../../../lib/db.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lets the frontend decide whether to sync: db is "ok", "off" (no DATABASE_URL) or "error".
export async function GET() {
  if (!configured()) return json({ db: 'off' });
  try {
    const { engine } = await ensureSchema();
    return json({ db: 'ok', engine });
  } catch (e) {
    console.error(e);
    return json({ db: 'error' }, 503);
  }
}
