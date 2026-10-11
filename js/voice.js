/* mochii club — voice layer
 * Reads lesson text aloud. Uses ElevenLabs text-to-speech when a key is set in Settings
 * (stored in localStorage only, like the Gemini key), otherwise the browser's built-in speech.
 */
(function (global) {
  const R = (global.R = global.R || {});
  const LS = 'receipts.voice';
  const DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM'; // ElevenLabs premade "Rachel"
  let audio = null;
  const cache = new Map();

  const plain = (s) => String(s).replace(/\*\*/g, '').replace(/___/g, 'blank').replace(/\s+/g, ' ').trim();

  R.voice = {
    get config() {
      try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; }
    },
    save(cfg) { try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch {} },
    // Set by R.db.init() when the backend holds an ELEVENLABS_API_KEY; a key pasted in Settings still wins.
    server: false,
    get eleven() { return !!this.config.key || this.server; },
    get supported() { return this.eleven || (typeof speechSynthesis !== 'undefined'); },

    stop() {
      if (audio) { audio.pause(); audio = null; }
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    },

    async elevenBlob(text) {
      const { key, voiceId = DEFAULT_VOICE } = this.config;
      const k = `${voiceId}|${text}`;
      if (cache.has(k)) return cache.get(k);
      const res = key
        ? await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'xi-api-key': key, Accept: 'audio/mpeg' },
          body: JSON.stringify({ text, model_id: 'eleven_flash_v2_5', voice_settings: { stability: 0.45, similarity_boost: 0.8 } }),
        })
        : await fetch('/api/ai/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 120)}`);
      const url = URL.createObjectURL(await res.blob());
      cache.set(k, url);
      return url;
    },

    // Resolves when playback ends. Falls back to browser speech if ElevenLabs fails.
    async speak(raw) {
      this.stop();
      const text = plain(raw).slice(0, 900);
      if (!text) return;
      if (this.eleven) {
        try {
          const url = await this.elevenBlob(text);
          audio = new Audio(url);
          await new Promise((resolve) => { audio.onended = audio.onerror = resolve; audio.play().catch(resolve); });
          return;
        } catch (e) { console.warn(e); }
      }
      if (typeof speechSynthesis === 'undefined') return;
      await new Promise((resolve) => {
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.04; u.onend = u.onerror = resolve;
        speechSynthesis.speak(u);
      });
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
