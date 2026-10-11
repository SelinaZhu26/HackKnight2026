import { configured, ensureSchema, json } from '../../../lib/db.js';
import { aiStatus } from '../../../lib/ai.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lets the frontend decide whether to sync: db is "ok", "off" (no DATABASE_URL) or "error".
// ai says which server-held keys exist ({ gemini, voice }), so the browser can use /api/ai/*.
export async function GET() {
  const ai = aiStatus();
  if (!configured()) return json({ db: 'off', ai });
  try {
    const { engine } = await ensureSchema();
    return json({ db: 'ok', engine, ai });
  } catch (e) {
    console.error(e);
    return json({ db: 'error', ai }, 503);
  }
}
