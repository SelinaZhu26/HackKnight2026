// Optional browser regression checks: requires Playwright and an installed Chrome.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const files = ['index.html', 'styles.css', 'future.css', 'whimsy.css', ...['data', 'analytics', 'gemini', 'wrapped', 'forecast', 'future', 'curriculum', 'voice', 'learn', 'db', 'solana', 'app', 'whimsy'].map((s) => `js/${s}.js`)];
const server = http.createServer(async (req, res) => {
  const file = req.url === '/' ? 'index.html' : req.url.slice(1);
  if (!files.includes(file)) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
  res.end(await fs.readFile(path.join(root, file)));
});
const encode = (data) => Buffer.from(JSON.stringify(data)).toString('base64url');

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const errors = [];
    async function fresh(timezoneId = 'America/New_York', state) {
      const context = await browser.newContext({ timezoneId, viewport: { width: 1280, height: 960 } });
      await context.route('https://fonts.googleapis.com/**', (route) => route.abort());
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(url);
      if (state) {
        await page.evaluate((s) => localStorage.setItem('receipts.state', JSON.stringify(s)), state);
        await page.reload();
      }
      return { context, page };
    }
    async function upload(page, text, sign, onboarding = false) {
      const expected = await page.evaluate(({ text, sign }) => R.parseCSV(text, { spendingSign: sign }), { text, sign });
      if (!onboarding) await page.locator('[data-act=settings]').click();
      await page.locator(onboarding ? '#csvfile' : '#stFile').setInputFiles({ name: 'statement.csv', mimeType: 'text/csv', buffer: Buffer.from(text) });
      if (sign) {
        await page.locator('#csvSign').selectOption(sign);
        await page.locator('#csvImport').click();
      }
      await page.waitForFunction((expected) => {
        const state = JSON.parse(localStorage.getItem('receipts.state') || '{}');
        return state.source === 'csv' && JSON.stringify(state.csvTxns) === JSON.stringify(expected);
      }, expected);
      if (onboarding) {
        await page.locator('.story').waitFor();
        await page.locator('.story .x').click();
      }
    }

    // Run malicious links in disposable storage, observing both DOM insertion and execution.
    {
      const { context, page } = await fresh();
      const summary = await page.evaluate(() => R.summaryData(R.analyze(R.generate().me), 'You'));
      for (const field of ['t', 'd', 'v', 's', 'p']) {
        const payload = { ...summary, [field]: '<img id="injected" src=x onerror="window.__injected=true">' };
        await page.goto(`${url}/#/share/${encode(payload)}`);
        assert.match(await page.locator('#phone').innerText(), /link broke/);
        assert.equal(await page.locator('#injected').count(), 0);
        assert.equal(await page.evaluate(() => !!window.__injected), false);
      }
      for (const payload of [null, {}, { ...summary, n: 42 }, { ...summary, v: {} }]) {
        await page.goto(`${url}/#/share/${encode(payload)}`);
        assert.match(await page.locator('#phone').innerText(), /link broke/);
      }
      await page.goto(`${url}/#/share/bm90LWpzb24`);
      assert.match(await page.locator('#phone').innerText(), /link broke/);
      await page.goto(`${url}/#/share/${encode(summary)}`);
      assert.equal(await page.locator('.summary').count(), 1);
      const textPayload = { ...summary, n: '<img id="injected" src=x onerror="window.__injected=true">', tm: '<svg onload="window.__injected=true">', vm: '<img src=x>' };
      await page.goto(`${url}/#/share/${encode(textPayload)}`);
      assert.equal(await page.locator('.summary img, .summary svg').count(), 0);
      assert.equal(await page.evaluate(() => !!window.__injected), false);
      await context.close();
      console.log('PASS: valid shares, malicious numeric/text shares, and broken links');
    }

    for (const timezone of ['America/New_York', 'Asia/Tokyo']) {
      const { context, page } = await fresh(timezone);
      await upload(page, 'Date,Description,Amount\n2026-09-01,PAYROLL,1000\n2026-09-02,REFUND,10\n2026-09-01,STARBUCKS,-6.45', 'negative', true);
      const txns = await page.evaluate(() => JSON.parse(localStorage.getItem('receipts.state')).csvTxns);
      assert.equal(txns.length, 1);
      assert.equal(txns[0].amount, 6.45);
      assert.match(await page.locator('.cal-head').innerText(), /September 2026/);
      await page.locator('[data-act=calDay][data-d="1"]').click();
      assert.match(await page.locator('.cal-detail').innerText(), /Sep 1/);
      assert.match(await page.locator('.cal-detail').innerText(), /STARBUCKS/);
      await context.close();
      console.log(`PASS: negative-spending CSV and September 1 calendar in ${timezone}`);
    }

    {
      const { context, page } = await fresh('America/New_York', { onboarded: true });
      await upload(page, 'Date,Description,Amount\n09/01/2026,PAYROLL,-1000\n09/02/2026,REFUND,-10\n09/03/2026,STARBUCKS,6.45', 'positive');
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('receipts.state')).csvTxns.length), 1);
      await upload(page, 'Date,Description,Debit,Credit\n09/01/2026,PAYROLL,,1000\n09/02/2026,REFUND,,10\n09/03/2026,STARBUCKS,7.50,');
      assert.equal(await page.locator('#csvSign').count(), 0);
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('receipts.state')).csvTxns.length), 1);
      await context.close();
      console.log('PASS: positive-spending and explicit debit/credit uploads');
    }

    {
      const { context, page } = await fresh('America/New_York', { onboarded: true });
      await upload(page, 'Date,Description,Amount\n09/02/2026,NETFLIX,-15.49\n09/03/2026,SPOTIFY,-5.99', 'negative');
      await page.locator('[data-act=play]').click();
      await page.locator('.story').waitFor();
      assert.match(await page.locator('.story').textContent(), /NETFLIX/);
      assert.ok(!/undefined|NaN|Infinity/.test(await page.locator('.story').textContent()));
      assert.match(await page.locator('.story .summary').textContent(), /None this month/);
      await page.locator('.story .x').click();
      await page.locator('a[href="#/friends"]').click();
      await page.locator('[data-act=profile][data-id=me]').click();
      assert.match(await page.locator('.sheet').innerText(), /no non-subscription spending/);
      assert.match(await page.locator('.sheet').innerText(), /NETFLIX/);
      assert.match(await page.locator('.sheet').innerText(), /SPOTIFY/);
      assert.ok(!/undefined|NaN|Infinity/.test(await page.locator('.sheet').innerText()));
      const exportSize = await page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem('receipts.state'));
        const c = R.shareImage(R.summaryData(R.analyze(s.csvTxns), 'You'));
        return [c.width, c.height, c.toDataURL().length];
      });
      assert.deepEqual(exportSize.slice(0, 2), [1080, 1920]);
      assert.ok(exportSize[2] > 1000);
      await context.close();
      console.log('PASS: subscriptions-only Wrapped, profile, share card and PNG export');
    }

    {
      const { context, page } = await fresh('America/New_York', { onboarded: true });
      await page.locator('.topbar [data-act=gmail]').click();
      for (const total of ['', 'Total: $0.00', 'Total: -$5.00']) {
        await page.locator('#rcpt').fill(`From: Starbucks\nThanks for your order\n${total}`);
        await page.locator('#rcptGo').click();
        await page.waitForFunction(() => document.querySelector('#rcptOut')?.textContent.includes('positive total'));
        assert.equal(await page.locator('#rcptAdd').count(), 0);
      }
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('receipts.state')).extraTxns?.length || 0), 0);
      await page.locator('#rcptSample').click();
      await page.locator('#rcptGo').click();
      await page.locator('#rcptAdd').click();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('receipts.state')).extraTxns.length === 1);
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('receipts.state')).extraTxns[0].amount), 29.82);
      assert.equal(await page.evaluate(() => new Date(JSON.parse(localStorage.getItem('receipts.state')).extraTxns[0].date).getDate()), 8);
      assert.ok(!/NaN|Infinity/.test(await page.locator('#phone').innerText()));
      await context.close();
      console.log('PASS: invalid receipts stay out of storage, valid sample receipt adds normally');
    }

    {
      const { context, page } = await fresh('America/New_York', { onboarded: true, source: 'csv', csvTxns: [{ date: '2026-10-01T16:00:00.000Z', merchant: 'Legacy zero', category: 'Coffee', amount: 0, noTime: true }] });
      assert.ok(!/NaN|Infinity|undefined/.test(await page.locator('#phone').innerHTML()));
      await page.locator('[data-act=play]').click();
      assert.ok(!/NaN|Infinity|undefined/.test(await page.locator('.story').innerHTML()));
      await context.close();
      console.log('PASS: legacy zero-total month renders finite analytics and Wrapped');
    }

    {
      const { context, page } = await fresh('America/New_York', { onboarded: true, name: 'a'.repeat(201) });
      await page.locator('[data-act=play]').click();
      await page.locator('.story').waitFor();
      await page.locator('.story .x').click();
      await page.locator('[data-act=settings]').click();
      assert.equal(await page.locator('#stName').getAttribute('maxlength'), '18');
      for (const budget of ['0', '-10', '1e309']) {
        await page.locator('#stBudget').fill(budget);
        await page.locator('#stSave').click();
        assert.equal(await page.locator('#stSave').count(), 1);
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('receipts.state')).budget), undefined);
      }
      await page.locator('#stBudget').fill('900');
      await page.locator('#stSave').click();
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('receipts.state')).name.length), 18);
      await page.evaluate(() => { R.gemini.generate = async () => ({ headline: 'plan', steps: 'bad' }); });
      await page.locator('[data-act=plan]').click();
      await page.locator('#plan .step').first().waitFor();
      assert.match(await page.locator('#plan').innerText(), /YOUR PLAN/);
      await context.close();
      console.log('PASS: long display names, invalid budgets and malformed AI plans');
    }

    {
      const { context, page } = await fresh('America/New_York', { onboarded: true });
      await page.goto(`${url}/#/friends-wrapped`);
      await page.locator('.story .x').click();
      assert.match(await page.locator('#screen .title').innerText(), /friends/);
      assert.equal(await page.locator('a.tab.on').getAttribute('href'), '#/friends');

      await page.evaluate(() => {
        window.storyKeys = new Set();
        const add = document.addEventListener.bind(document);
        const remove = document.removeEventListener.bind(document);
        document.addEventListener = (type, fn, ...args) => { if (type === 'keydown') window.storyKeys.add(fn); return add(type, fn, ...args); };
        document.removeEventListener = (type, fn, ...args) => { if (type === 'keydown') window.storyKeys.delete(fn); return remove(type, fn, ...args); };
      });
      await page.locator('[data-act=playFriends]').click();
      assert.equal(await page.evaluate(() => window.storyKeys.size), 1);
      await page.evaluate(() => { location.hash = '#/roasts'; });
      await page.waitForFunction(() => R.Story.active === null);
      assert.equal(await page.evaluate(() => window.storyKeys.size), 0);

      const ended = await page.evaluate(async () => {
        let ticks = 0, closed = 0;
        const original = R.Story.prototype.tick;
        R.Story.prototype.tick = function (now) { ticks++; return original.call(this, now); };
        const story = new R.Story(document.querySelector('#phone'), [{ bg: '#000', html: 'one', duration: 1 }], { onClose: () => { closed++; } });
        await new Promise((resolve) => setTimeout(resolve, 80));
        const atClose = ticks;
        await new Promise((resolve) => setTimeout(resolve, 80));
        story.close();
        R.Story.prototype.tick = original;
        return { atClose, ticks, closed, active: !!R.Story.active, keys: window.storyKeys.size };
      });
      assert.equal(ended.closed, 1);
      assert.equal(ended.atClose, ended.ticks);
      assert.equal(ended.active, false);
      assert.equal(ended.keys, 0);
      await context.close();
      console.log('PASS: Friends Wrapped route and story cleanup on navigation/automatic completion');
    }

    {
      const { context, page } = await fresh('America/New_York', { onboarded: true, source: 'csv', csvTxns: [] });
      await page.locator('a[href="#/squads"]').click();
      await page.locator('[data-act=newSquad]').click();
      await page.locator('#sqName').fill('Zero cap');
      await page.locator('#sqLimit').fill('-10');
      await page.locator('#sqCreate').click();
      assert.equal(await page.locator('#sqCreate').count(), 1);
      await page.locator('#sqLimit').fill('0');
      await page.locator('#sqCreate').click();
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('receipts.state')).squads[0].limit), 0);
      assert.ok(!/NaN|Infinity/.test(await page.locator('#phone').innerHTML()));
      await context.close();
      console.log('PASS: zero squad caps are retained and negative caps rejected');
    }
    assert.deepEqual(errors, [], `Browser exceptions: ${errors.join(', ')}`);
    console.log('All browser regression checks passed without page errors.');
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
