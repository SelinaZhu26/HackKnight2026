const assert = require('node:assert/strict');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

global.localStorage = { getItem: () => null, setItem() {} };
for (const file of ['data', 'analytics', 'gemini', 'wrapped']) require(`../js/${file}.js`);
const R = global.R;
const csv = (rows, header = 'Date,Description,Amount') => [header, ...rows].join('\n');
const negative = (text) => R.parseCSV(text, { spendingSign: 'negative' });
const data = R.generate();
const summary = R.summaryData(R.analyze(data.me), 'You');

test('share summaries reject injection in every numeric field and malformed objects', () => {
  for (const field of ['t', 'd', 'v', 's', 'p']) {
    for (const value of ['<img src=x onerror="alert(1)">', null, {}, [], NaN, Infinity, -Infinity]) {
      assert.throws(() => R.summaryCard({ ...summary, [field]: value }), /Invalid summary/);
    }
  }
  for (const value of [null, [], 'bad', {}, { ...summary, s: 101 }, { ...summary, au: 'constructor' }]) {
    assert.throws(() => R.validateSummary(value), /Invalid summary/);
  }
  assert.match(R.summaryCard(JSON.parse(JSON.stringify(summary))), /September wrapped/);
});

test('share text is escaped, including merchant names and display name', () => {
  const attack = '<img src=x onerror="alert(1)">';
  const html = R.summaryCard({ ...summary, n: attack, tm: attack, vm: attack, m: attack, nx: attack });
  assert.ok(!html.includes('<img'));
  assert.match(html, /&lt;img/);
});

test('amount-only CSV requires a sign regardless of row counts', () => {
  const text = csv(['09/01/2026,PAYROLL,1000', '09/02/2026,REFUND,10', '09/03/2026,STARBUCKS,-6.45']);
  assert.throws(() => R.parseCSV(text), { code: 'CSV_SIGN_REQUIRED' });
  const txns = negative(text);
  assert.equal(txns.length, 1);
  assert.equal(txns[0].merchant, 'Starbucks');
  assert.equal(txns[0].amount, 6.45);
  assert.throws(() => R.parseCSV(csv(['09/03/2026,STARBUCKS,-6.45'])), { code: 'CSV_SIGN_REQUIRED' });
});

test('positive-spending CSV excludes negative income and refunds', () => {
  const txns = R.parseCSV(csv(['09/01/2026,PAYROLL,-1000', '09/02/2026,REFUND,-10', '09/03/2026,STARBUCKS,6.45']), { spendingSign: 'positive' });
  assert.deepEqual(txns.map((t) => t.amount), [6.45]);
});

test('explicit debit/credit columns take precedence over amount and sign', () => {
  const txns = R.parseCSV(csv(['09/01/2026,PAYROLL,1000,,1000', '09/02/2026,REFUND,10,0,10', '09/03/2026,STARBUCKS,-6.45,6.45,'], 'Date,Description,Amount,Debit,Credit'), { spendingSign: 'positive' });
  assert.deepEqual(txns.map((t) => t.amount), [6.45]);
  const debitOnly = R.parseCSV(csv(['09/03/2026,STARBUCKS,6.45,', '09/04/2026,REFUND,-10,'], 'Date,Description,Debit,Credit'));
  assert.deepEqual(debitOnly.map((t) => t.amount), [6.45]);
});

test('explicit transaction types exclude refunds, payments and deposits', () => {
  for (const header of ['Transaction Type', 'Debit/Credit']) {
    const txns = R.parseCSV(csv(['09/01/2026,PAYROLL,1000,Deposit', '09/02/2026,REFUND,-10,Refund', '09/02/2026,PAYMENT,30,Payment', '09/03/2026,STARBUCKS,6.45,Debit'], `Date,Description,Amount,${header}`));
    assert.deepEqual(txns.map((t) => t.amount), [6.45]);
  }
});

test('CSV skips invalid amounts and calendar dates', () => {
  const txns = negative(csv(['09/01/2026,BAD,-Infinity', '09/02/2026,BAD,-10junk', '2026-02-30,BAD,-10', '09/31/2026,BAD,-10', '09/03/2026,STARBUCKS,-6.45']));
  assert.equal(txns.length, 1);
  assert.equal(R.parseTransactionDate('2026-02-30T12:00:00Z'), null);
  assert.equal(R.parseTransactionDate('Janitor 1 2026'), null);
});

test('date-only CSVs stay on September 1 across eastern and positive-offset timezones', () => {
  const script = `require('./js/data.js'); require('./js/analytics.js');
    for (const date of ['2026-09-01', '2026/09/01', '09/01/2026', '9/1/2026', '09-01-2026', '09/01/26', 'September 1 2026', 'Sep 1 2026']) {
      const txns = R.parseCSV('Date,Description,Amount\\n' + date + ',STARBUCKS,-6.45', {spendingSign:'negative'});
      const d = new Date(txns[0].date);
      require('node:assert/strict').equal(d.getDate(), 1);
      require('node:assert/strict').equal(d.getDay(), 2);
      require('node:assert/strict').equal(R.analyze(txns).month, '2026-09');
      require('node:assert/strict').equal(txns[0].noTime, true);
    }`;
  for (const TZ of ['America/New_York', 'Asia/Tokyo']) {
    const result = spawnSync(process.execPath, ['-e', script], { cwd: path.join(__dirname, '..'), env: { ...process.env, TZ }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  const timestamp = R.parseTransactionDate('2026-09-01T01:30:00-04:00');
  assert.equal(timestamp.date, '2026-09-01T05:30:00.000Z');
  assert.equal(timestamp.noTime, false);
});

test('subscriptions-only stories retain totals and subscription details', () => {
  const a = R.analyze(negative(csv(['09/02/2026,NETFLIX,-15.49', '09/03/2026,SPOTIFY,-5.99'])));
  assert.equal(a.total, 21.48);
  assert.equal(a.topMerchant, undefined);
  const html = R.soloSlides({ a, name: 'You' }).map((s) => s.html).join('');
  assert.match(html, /Netflix/);
  assert.match(html, /Spotify/);
  assert.match(html, /\$21.48\/mo/);
  assert.ok(!/undefined|NaN|Infinity/.test(html));
  assert.doesNotThrow(() => R.summaryCard(JSON.parse(JSON.stringify(R.summaryData(a, 'You')))));
});

test('zero spending and empty months have finite scores, percentages and story markup', () => {
  const zero = { date: R.parseTransactionDate('2026-10-01').date, merchant: 'Legacy zero receipt', category: 'Coffee', amount: 0, noTime: true };
  for (const a of [R.analyze([zero]), R.analyze([]), R.analyze(data.me, { month: '2026-10', budget: -1 })]) {
    assert.ok(Number.isFinite(a.score.score));
    assert.ok(a.score.score >= 0 && a.score.score <= 100);
    assert.ok(a.score.parts.every((p) => Number.isFinite(p.pts)));
    assert.ok(a.byCat.every((c) => Number.isFinite(c.pct)));
    assert.ok(!/undefined|NaN|Infinity/.test(R.soloSlides({ a, name: 'You' }).map((s) => s.html).join('')));
  }
});

test('offline receipt parser rejects missing, zero and negative totals', async () => {
  for (const text of ['From: Starbucks\nThanks for your order', 'From: Starbucks\nTotal: $0.00', 'From: Starbucks\nTotal: -$5.00', 'From: Starbucks\nTotal: $-5.00', 'From: Starbucks\nItem: $6.45\nTotal: Infinity', 'From: Starbucks\nItem: $6.45\nTotal: NaN']) {
    await assert.rejects(R.ai.parseReceipt(text), /positive total/);
  }
  const receipt = await R.ai.parseReceipt('From: Starbucks\nTotal Charged: $6.45\n2026-09-01');
  assert.equal(receipt.amount, 6.45);
  assert.equal(receipt.date, '2026-09-01');
  assert.equal(receipt.via, 'regex');
});

test('Gemini receipts validate amounts and dates before returning', async (t) => {
  const original = R.gemini.generate;
  t.after(() => { R.gemini.generate = original; });
  for (const amount of [0, -5, NaN, Infinity, '6.45', null]) {
    R.gemini.generate = async () => ({ merchant: 'Starbucks', date: '2026-09-01', amount, category: 'Coffee' });
    await assert.rejects(R.ai.parseReceipt('Total: $6.45'), /positive total/);
  }
  R.gemini.generate = async () => ({ merchant: 'Starbucks', date: '2026-02-30', amount: 6.45 });
  await assert.rejects(R.ai.parseReceipt('receipt'), /valid date/);
  R.gemini.generate = async () => ({ merchant: 'Starbucks', date: '2026-09-01', amount: 6.45, category: 'Coffee' });
  assert.equal((await R.ai.parseReceipt('receipt')).via, 'gemini');
});

test('all six seeded demo profiles still generate stories and valid share summaries', () => {
  for (const p of R.PEOPLE) {
    const a = R.analyze(data[p.id], { budget: p.budget });
    assert.ok(a.total > 0);
    assert.ok(Number.isFinite(a.score.score));
    assert.ok(R.soloSlides({ a, name: p.name }).length >= 10);
    assert.doesNotThrow(() => R.validateSummary(R.summaryData(a, p.name)));
  }
  const imported = negative(R.buildSampleCSV());
  assert.equal(imported.length, data.me.length);
  assert.equal(imported.reduce((sum, t) => sum + Math.round(t.amount * 100), 0),
    data.me.reduce((sum, t) => sum + Math.round(t.amount * 100), 0));
  assert.ok(imported.every((t) => !/PAYROLL|VENMO/i.test(t.merchant)));
});

test('offline receipt parser rejects accounting refunds and prefers the final total', async () => {
  for (const total of ['($5.00)', '(5.00)', '-5.00']) {
    await assert.rejects(R.ai.parseReceipt(`From: Starbucks\nTotal: ${total}`), /positive total/);
  }
  const r = await R.ai.parseReceipt('From: Starbucks\nAmount: $2.00\nTotal: $9.50\nOctober 8, 2026 11:47 PM');
  assert.equal(r.amount, 9.5);
  assert.equal(r.date, '2026-10-08');
  await assert.rejects(R.ai.parseReceipt('From: Starbucks\nTotal: $9.50\nFebruary 30, 2026'), /valid date/);
});

test('malformed AI plans fall back to usable structured steps', async (t) => {
  const original = R.gemini.generate;
  t.after(() => { R.gemini.generate = original; });
  const a = R.analyze(data.me);
  for (const plan of [{ headline: 'plan', steps: 'bad' }, { headline: 'plan', steps: [null] }, { steps: [{ save: NaN }] }, { headline: 'plan', steps: [{ emoji: '☕', title: 'coffee', detail: 'brew it', save: -5 }] }]) {
    R.gemini.generate = async () => plan;
    const result = await R.ai.glowUp(a, 'You');
    assert.equal(result.fallback, true);
    assert.ok(Array.isArray(result.steps));
    assert.ok(result.steps.every((s) => Number.isFinite(s.save)));
  }
  const valid = { headline: 'plan', steps: [{ emoji: '☕', title: 'coffee', detail: 'brew it', save: 5 }] };
  R.gemini.generate = async () => valid;
  assert.deepEqual(await R.ai.glowUp(a, 'You'), valid);
});

test('CSV merchant normalization always stays within the summary limit', () => {
  const txns = negative(csv([`09/01/2026,#${'merchant'.repeat(40)},-5`]));
  assert.equal(txns[0].merchant.length, 28);
  assert.doesNotThrow(() => R.soloSlides({ a: R.analyze(txns), name: 'You' }));
});
