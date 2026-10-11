// Server-held Gemini and ElevenLabs keys, so visitors get AI features without pasting their own.
// Keys come from GEMINI_API_KEY / ELEVENLABS_API_KEY and never reach the browser.
import { json } from './db.js';

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const GEMINI_FALLBACK = GEMINI_MODEL === 'gemini-3.8-flash' ? 'gemini-3.5-flash' : 'gemini-3.8-flash';
export const ELEVEN_VOICE = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

export const aiStatus = () => ({ gemini: Boolean(process.env.GEMINI_API_KEY), voice: Boolean(process.env.ELEVENLABS_API_KEY) });

// Per-IP fixed-window limits plus a global daily cap, so a public endpoint can't drain the keys.
const windows = new Map();
const daily = { day: '', counts: {} };
const LIMITS = {
  gemini: { perMin: 20, perDay: Number(process.env.AI_DAILY_GEMINI) || 3000 },
  tts: { perMin: 15, perDay: Number(process.env.AI_DAILY_TTS) || 1500 },
};

function clientIp(req) {
  return req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
}

// Browsers send Origin on POST; reject other sites calling our proxy from their pages.
function sameOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  try { return new URL(origin).host === host; } catch { return false; }
}

// Returns an error Response, or null when the request may proceed.
export function guard(req, kind) {
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  const today = new Date().toISOString().slice(0, 10);
  if (daily.day !== today) { daily.day = today; daily.counts = {}; }
  if ((daily.counts[kind] || 0) >= LIMITS[kind].perDay) return json({ error: 'daily AI limit reached' }, 429);
  const now = Date.now();
  const k = `${kind}|${clientIp(req)}`;
  let w = windows.get(k);
  if (!w || now - w.start > 60_000) { w = { start: now, n: 0 }; windows.set(k, w); }
  if (++w.n > LIMITS[kind].perMin) return json({ error: 'slow down a little' }, 429);
  daily.counts[kind] = (daily.counts[kind] || 0) + 1;
  if (windows.size > 5000) for (const [key, v] of windows) if (now - v.start > 60_000) windows.delete(key);
  return null;
}

// Same retry-then-fallback behavior as js/gemini.js.
export async function gemini(prompt, { json: wantJson = false, temperature = 1 } = {}) {
  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature, ...(wantJson ? { responseMimeType: 'application/json' } : {}) },
  });
  const call = (m) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY }, body,
    signal: AbortSignal.timeout(45_000),
  });
  let res = await call(GEMINI_MODEL);
  for (const [next, wait] of [[GEMINI_FALLBACK, 0], [GEMINI_MODEL, 1500]]) {
    if (![404, 429, 503].includes(res.status)) break;
    if (wait) await new Promise((r) => setTimeout(r, wait));
    res = await call(next);
  }
  if (!res.ok) throw Object.assign(new Error(`Gemini ${res.status}`), { upstream: res.status, detail: (await res.text()).slice(0, 300) });
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text || '').join('') || '';
}
