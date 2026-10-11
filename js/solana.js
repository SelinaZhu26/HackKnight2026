/* mochii club — Solana squad pots (devnet).
 *
 * Squads already have stakes ("loser buys boba"). This makes them real:
 *   1. stake   — each member sends a small stake into the squad's pot, with a memo naming the squad + month.
 *   2. settle  — after the month, mochii (the referee) checks each member's category spend against the cap,
 *                writes ONE memo with a salted hash commitment + pass/fail per member (no amounts, no merchants),
 *                and pays winners their stake back plus an even split of the forfeited stakes.
 *   3. verify  — any member can recompute their own commitment from the salt we give them.
 *
 * MVP honesty: the pot is a referee-held devnet keypair kept in this browser. In production it's a program-derived
 * escrow (Anchor) that can only pay out to wallets that staked, once per month, when the referee signs. See SOLANA.md.
 * Friends in the demo are simulated: their stakes are shown but not on-chain. Your stake and payout are real devnet txs.
 */
(function (global) {
  const R = (global.R = global.R || {});
  const WEB3_URL = 'https://unpkg.com/@solana/web3.js@1.95.3/lib/index.iife.min.js';
  const RPC = 'https://api.devnet.solana.com';
  const MEMO_PROGRAM = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
  const LS_BURNER = 'mochii.sol.burner';
  const LS_POTS = 'mochii.sol.pots';
  const LS_LEDGER = 'mochii.sol.ledger';
  const FEE = 5000; // lamports per signature on Solana

  const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  let web3P = null, conn = null, walletState = null;
  function web3() {
    if (global.solanaWeb3) return Promise.resolve(global.solanaWeb3);
    if (!web3P) {
      web3P = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = WEB3_URL; s.async = true;
        s.onload = () => (global.solanaWeb3 ? resolve(global.solanaWeb3) : reject(new Error('web3 failed to load')));
        s.onerror = () => { web3P = null; reject(new Error('couldn’t load Solana library (offline?)')); };
        document.head.appendChild(s);
      });
    }
    return web3P;
  }
  async function connection() {
    const w = await web3();
    if (!conn) conn = new w.Connection(RPC, 'confirmed');
    return conn;
  }

  async function sha256hex(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  const randHex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');

  function memoIx(w, signer, text) {
    return new w.TransactionInstruction({
      keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
      programId: new w.PublicKey(MEMO_PROGRAM),
      data: new TextEncoder().encode(text),
    });
  }

  // ---------- wallets ----------
  const phantom = () => global.phantom?.solana || (global.solana?.isPhantom ? global.solana : null);

  async function burnerKeypair() {
    const w = await web3();
    let sk = get(LS_BURNER, null);
    if (!sk) { sk = Array.from(w.Keypair.generate().secretKey); set(LS_BURNER, sk); }
    return w.Keypair.fromSecretKey(Uint8Array.from(sk));
  }

  async function sendSigned(tx, signers) {
    const c = await connection();
    const { blockhash, lastValidBlockHeight } = await c.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    let signature;
    if (walletState?.kind === 'phantom' && !signers) {
      ({ signature } = await phantom().signAndSendTransaction(tx));
    } else {
      tx.sign(...signers);
      signature = await c.sendRawTransaction(tx.serialize());
    }
    const res = await c.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
    if (res.value.err) throw new Error('transaction failed on-chain');
    return signature;
  }

  R.sol = {
    cluster: 'devnet',
    explorer: (sig) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
    explorerAddr: (a) => `https://explorer.solana.com/address/${a}?cluster=devnet`,
    short: (a) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : ''),
    get wallet() { return walletState; },
    hasPhantom: () => !!phantom(),
    load: web3,

    // Connect Phantom if it's installed, otherwise use a devnet burner wallet kept in this browser.
    async connect(prefer = 'auto') {
      const w = await web3();
      if (prefer !== 'burner' && phantom()) {
        const r = await phantom().connect();
        walletState = { kind: 'phantom', address: r.publicKey.toString(), pubkey: new w.PublicKey(r.publicKey.toString()) };
      } else {
        const kp = await burnerKeypair();
        walletState = { kind: 'burner', address: kp.publicKey.toBase58(), pubkey: kp.publicKey, kp };
      }
      return walletState;
    },
    async disconnect() { if (walletState?.kind === 'phantom') await phantom().disconnect().catch(() => {}); walletState = null; },

    async balance(address) {
      const w = await web3(); const c = await connection();
      return (await c.getBalance(new w.PublicKey(address || walletState.address))) / w.LAMPORTS_PER_SOL;
    },

    async airdrop(sol = 1) {
      const w = await web3(); const c = await connection();
      const sig = await c.requestAirdrop(walletState.pubkey, Math.round(sol * w.LAMPORTS_PER_SOL));
      const { blockhash, lastValidBlockHeight } = await c.getLatestBlockhash('confirmed');
      await c.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
      return sig;
    },

    // Each squad's pot address. MVP: a referee-held keypair per squad code (see header).
    async pot(code) {
      const w = await web3();
      const pots = get(LS_POTS, {});
      if (!pots[code]) { pots[code] = Array.from(w.Keypair.generate().secretKey); set(LS_POTS, pots); }
      return w.Keypair.fromSecretKey(Uint8Array.from(pots[code]));
    },

    ledger(code) { return get(LS_LEDGER, {})[code] || null; },
    saveLedger(code, entry) { const l = get(LS_LEDGER, {}); l[code] = entry; set(LS_LEDGER, l); },
    clearLedger(code) { const l = get(LS_LEDGER, {}); delete l[code]; set(LS_LEDGER, l); },

    // Stake into a squad pot: transfer + memo "mochii:v1:stake|CODE|MONTH|slot".
    async stake(sq, month, sol) {
      if (!walletState) throw new Error('connect a wallet first');
      const w = await web3();
      const pot = await this.pot(sq.code);
      const lamports = Math.round(sol * w.LAMPORTS_PER_SOL);
      const slot = 'm' + sq.members.indexOf('me');
      const tx = new w.Transaction({ feePayer: walletState.pubkey });
      tx.add(w.SystemProgram.transfer({ fromPubkey: walletState.pubkey, toPubkey: pot.publicKey, lamports }));
      tx.add(memoIx(w, walletState.pubkey, `mochii:v1:stake|${sq.code}|${month}|${slot}`));
      const sig = await sendSigned(tx, walletState.kind === 'burner' ? [walletState.kp] : null);
      const entry = { month, pot: pot.publicKey.toBase58(), stakeSol: sol, mine: { sig, wallet: walletState.address, lamports }, settled: null };
      this.saveLedger(sq.code, entry);
      return entry;
    },

    // Settle: one referee-signed tx with the commitment memo + your payout if you won.
    // results: [{ id, amt, ok }] from the app's squad status.
    async settle(sq, month, results) {
      const w = await web3(); const c = await connection();
      const entry = this.ledger(sq.code);
      if (!entry?.mine) throw new Error('nobody staked yet');
      const pot = await this.pot(sq.code);

      // salted commitments: hash(code|month|slot|cents|salt). Only the hash + pass/fail goes on-chain.
      const rows = [];
      for (const r of results) {
        const slot = 'm' + sq.members.indexOf(r.id);
        const salt = randHex(8);
        const cents = Math.round(r.amt * 100);
        const commit = (await sha256hex(`${sq.code}|${month}|${slot}|${cents}|${salt}`)).slice(0, 12);
        rows.push({ ...r, slot, salt, cents, commit });
      }
      const winners = rows.filter((r) => r.ok); const losers = rows.filter((r) => !r.ok);
      const stake = entry.stakeSol;
      const potSol = stake * rows.length;
      const share = winners.length ? potSol / winners.length : 0; // winners split the whole pot
      const me = rows.find((r) => r.id === 'me');

      const memo = `mochii:v1:settle|${sq.code}|${month}|${sq.cat}<=${sq.limit}|` + rows.map((r) => `${r.slot}:${r.ok ? 'W' : 'L'}:${r.commit}`).join('|');
      const potBal = await c.getBalance(pot.publicKey);
      const tx = new w.Transaction({ feePayer: pot.publicKey });
      tx.add(memoIx(w, pot.publicKey, memo));
      // Only your stake is real on devnet, so the pot can pay at most what it holds (minus the fee).
      let paidLamports = 0;
      if (me?.ok) {
        paidLamports = Math.max(0, Math.min(potBal - FEE, Math.round(share * w.LAMPORTS_PER_SOL)));
        if (paidLamports > 0) tx.add(w.SystemProgram.transfer({ fromPubkey: pot.publicKey, toPubkey: new w.PublicKey(entry.mine.wallet), lamports: paidLamports }));
      }
      const sig = await sendSigned(tx, [pot]);
      entry.settled = {
        sig, memo, at: Date.now(), potSol, share, winners: winners.map((r) => r.id), losers: losers.map((r) => r.id),
        paidSol: paidLamports / w.LAMPORTS_PER_SOL,
        rows: rows.map(({ id, slot, ok, commit, salt, cents }) => ({ id, slot, ok, commit, ...(id === 'me' ? { salt, cents } : {}) })),
      };
      this.saveLedger(sq.code, entry);
      return entry;
    },

    // Recompute your own commitment from the salt we revealed to you.
    async verify(sq, entry) {
      const me = entry.settled.rows.find((r) => r.id === 'me');
      const h = (await sha256hex(`${sq.code}|${entry.month}|${me.slot}|${me.cents}|${me.salt}`)).slice(0, 12);
      return { ok: h === me.commit, hash: h, onchain: me.commit };
    },

    // Blink share link (Solana Actions). Works when the backend (/api/actions) is deployed on a public URL.
    blinkUrl(sq, origin = location.origin) {
      const entry = this.ledger(sq.code);
      const pot = entry?.pot || '';
      const action = `${origin}/api/actions/stake?squad=${encodeURIComponent(sq.code)}&pot=${pot}&month=${entry?.month || ''}&name=${encodeURIComponent(sq.name)}&cat=${encodeURIComponent(sq.cat)}&cap=${sq.limit}`;
      return `https://dial.to/?action=${encodeURIComponent('solana-action:' + action)}&cluster=devnet`;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
