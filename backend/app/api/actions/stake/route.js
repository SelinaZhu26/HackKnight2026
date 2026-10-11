import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { actionJson, preflight } from '../../../../lib/actions.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Blink: "join this squad pot". A squad's share link unfurls into a stake button in any Blink client
// (X, dial.to, wallets). The wallet signs a transfer into the pot plus the same memo the app writes.
const RPC = process.env.SOLANA_RPC || 'https://api.devnet.solana.com';
const MEMO = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const AMOUNTS = [0.01, 0.05, 0.1];

function params(req) {
  const u = new URL(req.url);
  const q = (k) => (u.searchParams.get(k) || '').trim();
  const code = q('squad').toUpperCase();
  const month = q('month') || new Date().toISOString().slice(0, 7);
  let pot = null;
  try { pot = new PublicKey(q('pot')); } catch {}
  if (!/^[A-Z0-9]{2,12}$/.test(code) || !pot || !/^\d{4}-\d{2}$/.test(month)) return null;
  return {
    u, code, pot, month,
    name: q('name').slice(0, 40) || code,
    cat: q('cat').slice(0, 20) || 'spending',
    cap: Math.max(0, Math.round(Number(q('cap')) || 0)),
    amount: Number(q('amount')),
  };
}

export async function GET(req) {
  const p = params(req);
  if (!p) return actionJson({ message: 'missing or invalid squad, pot or month' }, 400);
  const base = `${p.u.origin}${p.u.pathname}?${p.u.searchParams.toString()}`.replace(/&amount=[^&]*/, '');
  return actionJson({
    type: 'action',
    icon: `${p.u.origin}/api/actions/icon`,
    title: `${p.name} · mochii club squad pot`,
    description: `Stake on staying under $${p.cap} on ${p.cat} this month. Winners split the pot. Only pass/fail and a salted hash of your spend go on-chain. (devnet)`,
    label: 'stake',
    links: { actions: AMOUNTS.map((a) => ({ type: 'transaction', label: `stake ${a} SOL`, href: `${base}&amount=${a}` })) },
  });
}

export async function POST(req) {
  const p = params(req);
  if (!p) return actionJson({ message: 'missing or invalid squad, pot or month' }, 400);
  if (!AMOUNTS.includes(p.amount)) return actionJson({ message: `amount must be one of ${AMOUNTS.join(', ')}` }, 400);
  const body = await req.json().catch(() => null);
  let account;
  try { account = new PublicKey(body?.account); } catch { return actionJson({ message: 'invalid account' }, 400); }

  const conn = new Connection(RPC, 'confirmed');
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  const tx = new Transaction({ feePayer: account, blockhash, lastValidBlockHeight });
  tx.add(SystemProgram.transfer({ fromPubkey: account, toPubkey: p.pot, lamports: Math.round(p.amount * LAMPORTS_PER_SOL) }));
  tx.add(new TransactionInstruction({
    keys: [{ pubkey: account, isSigner: true, isWritable: false }],
    programId: MEMO,
    data: Buffer.from(`mochii:v1:stake|${p.code}|${p.month}|blink`, 'utf8'),
  }));
  return actionJson({
    type: 'transaction',
    transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
    message: `staked ${p.amount} SOL in ${p.name} ◎ stay under $${p.cap} on ${p.cat}!`,
  });
}

export const OPTIONS = preflight;
