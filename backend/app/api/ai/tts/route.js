import { aiStatus, ELEVEN_VOICE, guard } from '../../../../lib/ai.js';
import { json } from '../../../../lib/db.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST { text } → audio/mpeg from ElevenLabs. Used by js/voice.js when the visitor has no key of their own.
export async function POST(req) {
  if (!aiStatus().voice) return json({ error: 'voice not configured' }, 503);
  const blocked = guard(req, 'tts');
  if (blocked) return blocked;
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text || text.length > 900) return json({ error: 'text must be 1-900 characters' }, 400);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(ELEVEN_VOICE)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': process.env.ELEVENLABS_API_KEY, Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: 'eleven_flash_v2_5', voice_settings: { stability: 0.45, similarity_boost: 0.8 } }),
    signal: AbortSignal.timeout(30_000),
  }).catch((e) => ({ ok: false, status: 0, text: async () => e.message }));
  if (!res.ok) {
    console.error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return json({ error: `voice ${res.status}` }, 502);
  }
  return new Response(res.body, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } });
}
