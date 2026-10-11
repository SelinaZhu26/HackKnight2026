# ◎ mochii club × Solana: Squad Pots

**One line for judges:** squads already bet on each other ("loser buys boba"). Solana makes the bet real. Friends stake a few dollars, nobody holds the money, winners get paid the moment the month closes, and your spending never touches the chain.

## The problem

Accountability groups work when there's a consequence, and the "loser buys boba" deal is ours. In practice it breaks down three ways:

1. **IOUs don't get paid.** Nobody chases a friend for $5 of boba, so the stake isn't real, and the commitment isn't either.
2. **Someone has to hold the money.** A Venmo pot means trusting one friend with everyone's cash and with deciding who won.
3. **Proving you won means showing your bank statement.** Nobody wants to send the group chat their transactions.

There's research behind this. Commitment contracts with real money on the line (stickK, Beeminder) beat plain goals. stickK reports users with a financial stake are about 3× more likely to succeed. They need a **neutral escrow** and a **referee**, and that's exactly what's missing between friends.

## What we built

| step | what happens | what's on-chain |
|---|---|---|
| **1. stake** | Each member stakes (0.01 / 0.05 / 0.1 SOL on devnet) into the squad's pot | a transfer into the pot + memo `mochii:v1:stake\|SQUAD\|MONTH\|slot` |
| **2. live the month** | The app tracks each member's category spend against the cap (e.g. Food ≤ $150) | nothing |
| **3. settle** | mochii, as referee, checks each member, writes one settlement memo, and pays winners an even split of the whole pot | memo `mochii:v1:settle\|SQUAD\|MONTH\|Food<=150\|m0:W:3f2a…\|m1:L:9c1e…` + payout transfer |
| **4. verify** | Any member recomputes their own hash from the salt the app gave them and checks it against the chain | — |
| **share** | The squad link is a **Blink**: pasted on X or dial.to, it unfurls into "stake 0.05 SOL" buttons | the same stake transaction, built by `/api/actions/stake` |

### Privacy by design: commitments, not receipts

Amounts, merchants and names never go on-chain. For each member we publish:

```
commit = sha256("SQUAD|2026-09|m2|13200|<random salt>")[:12]     →   m2:W:4c09a1e7b2d3
```

- **Public:** squad code, month, the rule (`Food<=150`), each slot's pass/fail and its commitment.
- **Private:** the spend ($132.00 → `13200` cents) and the salt. Only that member's device has them.
- **Verifiable:** the member taps **verify my hash** and the app recomputes it in the browser against the chain. If the referee ever lies about someone's result, that person can prove what was committed.

## Why Solana specifically (not "just use a database")

| need | why Solana fits |
|---|---|
| **Micro-stakes** ($1–5 from broke students) | about $0.0003 per transaction. On a chain where fees are $1+, the fee would eat the stake |
| **Instant payout** | ~400 ms blocks. Winners are paid the moment the month is settled, not 3 business days later |
| **Neutral escrow** | The pot is an address, not a friend. In production it's a program account that can only pay wallets that staked |
| **Stable money** | USDC is native on Solana, so stakes don't swing in value (devnet MVP uses SOL) |
| **Viral sharing** | **Blinks** make a share link executable. This is our "sharing links" growth loop with a stake button built in |
| **Auditability** | Anyone can read every stake and settlement on the explorer. The referee can't quietly change results |

## Trust model (and what's MVP vs. production)

| | MVP (this repo, devnet) | production |
|---|---|---|
| Pot | A referee-held keypair per squad, stored in the browser | An Anchor program PDA per squad and month: `seeds = ["pot", squad, month]` |
| Payout rules | Enforced by app code | Enforced by the program: one settlement per month, only to wallets that staked, total paid ≤ pot |
| Referee | The app computes pass/fail from your bank or CSV data | mochii's referee key signs. Members get a **24h dispute window** before funds release |
| Friends | Simulated in the demo. Their stakes show but aren't on-chain | Each friend signs with their own wallet, from the app or a Blink |
| Money | Devnet SOL | USDC (SPL token), capped at $20 per stake |

We're upfront about the "oracle problem": spending data lives off-chain, so someone has to attest to it. Our answer: the referee only publishes **commitments**, settlement is **public and auditable**, and members can **verify** their own results. That's strictly more trustworthy than the friend holding the Venmo pot.

## Design choices we'd defend

- **It's a commitment contract, not gambling.** You bet on your own behavior, and the outcome is in your control. There's no house and no odds. The pot is just your friends' stakes.
- **Built for students:** small stakes by default (0.01–0.1), a hard cap in production, and a planned **soft mode** where a missed goal locks your stake in *your own* savings vault for 30 days instead of losing it.
- **No crypto knowledge needed:** no Phantom? A devnet demo wallet is created in the browser. In production: embedded wallets and USDC on-ramp.
- **Composable with the rest of the app:** the "prove me wrong" prediction becomes a solo pot. Stake on beating it, and get it back plus a streak if you do.

## Code map

```
js/solana.js                         wallet (Phantom or demo), stake, settle with commitments, verify, Blink URL
js/app.js        (SQUAD POTS)        pot row on each squad card + stake / settle / receipt sheets
backend/app/api/actions/stake        Solana Action: GET = Blink card (3 stake buttons), POST = unsigned stake tx
backend/app/api/actions/icon         Blink card icon (SVG mochi)
backend/app/actions.json             Blink discovery rules
backend/lib/actions.js               spec CORS + X-Action-Version / X-Blockchain-Ids headers
```

## Demo script (90 seconds)

> Pre-fund before judging. The public devnet faucet is often rate-limited. Open ⚙️ or any squad pot → **use demo wallet** → **copy address**, paste it into [faucet.solana.com](https://faucet.solana.com) and request 1 SOL. Or use Phantom in Testnet mode.

1. **Squads** → **join w/ code** → `SNACK` (Food ≤ $150). You're at $132, so on track. Priya is at $175 and isn't.
2. Tap **◎ put money on it** → **stake 0.05 SOL**. Open **stake tx ↗** to show the transfer and the memo on Solana Explorer.
3. **settle September**: the receipt shows PASS/FAIL with hashes and no amounts. Open **settlement tx ↗** to show the memo and the payout.
4. **verify my hash**: the browser recomputes sha256 and it matches the chain ✓.
5. Contrast: **No-DoorDash November** (you're at $396 vs a $100 cap) → stake → settle → stake forfeited 💀.
6. **share as Blink** (deployed backend only): paste into dial.to and a friend gets one-click stake buttons.

## Judge Q&A cheat sheet

- **"Why not Venmo?"** Venmo needs a person to hold the pot and decide the winner, and it can't prove results without exposing bank data. Here, escrow is neutral, results are committed publicly, and data stays private.
- **"Who decides who won?"** mochii's referee, from the user's linked bank data. It's auditable on-chain, with per-member verification and a dispute window in production.
- **"Can't the referee cheat?"** Every settlement is public and signed. A member can prove their committed spend with their salt. In production the program also enforces payout rules the referee can't override.
- **"Is my spending public?"** No. Only pass/fail and a salted hash. You can't recover $132 from `4c09a1e7b2d3` without the salt.
- **"What if I can't afford to lose?"** Stakes are tiny and capped, and soft mode turns a loss into forced savings.
- **"Why devnet?"** It's a hackathon MVP, so no real money moves. The same code runs on mainnet with USDC once the escrow program is audited.

## Try the Blink API

```sh
# Blink card: title, description, three stake buttons
curl "https://<host>/api/actions/stake?squad=SNACK&pot=<POT_ADDRESS>&month=2026-09&name=Snack%20Budget%20Society&cat=Food&cap=150"

# Unsigned transaction for a wallet to sign: transfer → pot + memo
curl -X POST "https://<host>/api/actions/stake?squad=SNACK&pot=<POT_ADDRESS>&month=2026-09&cat=Food&cap=150&amount=0.05" \
  -H 'content-type: application/json' -d '{"account":"<YOUR_WALLET>"}'
```

Set `SOLANA_RPC` to use a private RPC instead of the public devnet endpoint.
