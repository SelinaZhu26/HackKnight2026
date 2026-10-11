import { aiStatus, gemini, guard } from '../../../../lib/ai.js';
import { json } from '../../../../lib/db.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST { prompt, json?, temperature? } → { text }. Used by js/gemini.js when the visitor has no key of their own.
export async function POST(req) {
  if (!aiStatus().gemini) return json({ error: 'gemini not configured' }, 503);
  const blocked = guard(req, 'gemini');
  if (blocked) return blocked;
  const body = await req.json().catch(() => null);
  const prompt = typeof body?.prompt === 'string' ? body.prompt : '';
  if (!prompt.trim() || prompt.length > 20_000) return json({ error: 'prompt must be 1-20000 characters' }, 400);
  const temperature = Number.isFinite(+body.temperature) ? Math.max(0, Math.min(2, +body.temperature)) : 1;
  try {
    return json({ text: await gemini(prompt, { json: body.json === true, temperature }) });
  } catch (e) {
    console.error(e.message, e.detail || '');
    return json({ error: e.message }, e.upstream === 429 || e.upstream === 503 ? 503 : 502);
  }
}
