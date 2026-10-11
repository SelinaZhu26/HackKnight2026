// Solana Actions (Blinks) helpers: spec-required CORS + version headers.
// https://solana.com/docs/advanced/actions
export const DEVNET = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1';

export const ACTION_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Encoding, Accept-Encoding',
  'Access-Control-Expose-Headers': 'X-Action-Version, X-Blockchain-Ids',
  'X-Action-Version': '2.4',
  'X-Blockchain-Ids': DEVNET,
  'Content-Type': 'application/json',
};

export const actionJson = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: ACTION_HEADERS });
export const preflight = () => new Response(null, { status: 204, headers: ACTION_HEADERS });
