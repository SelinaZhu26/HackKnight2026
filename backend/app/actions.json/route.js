import { actionJson, preflight } from '../../lib/actions.js';

export const dynamic = 'force-static';

// Tells Blink clients which URLs on this site are Solana Actions.
export function GET() {
  return actionJson({ rules: [{ pathPattern: '/api/actions/**', apiPath: '/api/actions/**' }] });
}
export const OPTIONS = preflight;
