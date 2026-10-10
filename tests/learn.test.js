const assert = require('node:assert/strict');
const { test } = require('node:test');

global.localStorage = { getItem: () => null, setItem() {} };
for (const file of ['data', 'analytics', 'gemini', 'wrapped', 'curriculum', 'voice', 'learn']) require(`../js/${file}.js`);
const R = global.R;
const C = R.learnCore;

test('curriculum has 12 units of 6 lessons with well-formed exercises', () => {
  assert.equal(R.CURRICULUM.length, 12);
  assert.equal(R.LESSONS.length, 72);
  assert.equal(new Set(R.LESSONS.map((l) => l.id)).size, 72);
  for (const l of R.LESSONS) {
    assert.ok(l.tip && l.ex.length >= 2, l.id);
    for (const x of l.ex) {
      if (x.t === 'mc') assert.ok(Number.isInteger(x.a) && x.a < x.o.length, l.id);
      if (x.t === 'blank') {
        assert.equal(x.q.split('___').length - 1, x.a.length, l.id);
        assert.ok(x.a.every((w) => x.bank.includes(w)), l.id);
      }
      if (x.t === 'num') assert.ok(Number.isFinite(x.a), l.id);
      if (x.t === 'open') assert.equal(C.gradeOffline(x, x.target), 'correct', `${l.id} target must pass its own rubric`);
    }
  }
});

test('answer checking tolerates formatting but not wrong values', () => {
  const num = { t: 'num', a: 1240 };
  for (const v of ['1240', '$1,240', ' 1240.00 ']) assert.ok(C.check(num, v), v);
  for (const v of ['1241', '', 'abc', '12 40x']) assert.ok(!C.check(num, v), v);
  assert.ok(C.check({ t: 'num', a: 0.5 }, '.5'));
  assert.ok(C.check({ t: 'blank', a: ['Gross', 'Net'] }, ['gross', 'NET']));
  assert.ok(!C.check({ t: 'blank', a: ['Gross', 'Net'] }, ['Net', 'Gross']));
  assert.ok(C.check({ t: 'mc', a: 1 }, 1) && !C.check({ t: 'mc', a: 1 }, 0));
});

test('offline grader distinguishes correct, partial, incorrect and unclear', () => {
  const ex = R.LESSONS.find((l) => l.id === '7.3').ex.find((x) => x.t === 'open');
  assert.equal(C.gradeOffline(ex, 'it costs $15 and repeating it stacks fees on your next paycheck'), 'correct');
  assert.equal(C.gradeOffline(ex, 'it costs 15 dollars'), 'partial');
  assert.equal(C.gradeOffline(ex, 'banana'), 'incorrect');
  assert.equal(C.gradeOffline(ex, ' '), 'unclear');
});

test('streaks extend on consecutive days, use a freeze for one missed day, and reset otherwise', () => {
  const L = C.fresh();
  assert.ok(C.touchStreak(L, '2026-10-01'));
  assert.ok(!C.touchStreak(L, '2026-10-01'));
  C.touchStreak(L, '2026-10-02');
  assert.equal(L.streak, 2);
  C.touchStreak(L, '2026-10-04'); // missed the 3rd, freeze covers it
  assert.equal(L.streak, 3);
  assert.equal(L.freezes, 0);
  assert.equal(C.liveStreak(L, '2026-10-05'), 3);
  assert.equal(C.liveStreak(L, '2026-10-07'), 0);
  C.touchStreak(L, '2026-10-07');
  assert.equal(L.streak, 1);
  assert.equal(L.best, 3);
  // month and DST boundaries count as one day
  const M = C.fresh(); C.touchStreak(M, '2026-10-31'); C.touchStreak(M, '2026-11-01'); C.touchStreak(M, '2026-11-02');
  assert.equal(M.streak, 3);
});

test('hearts regenerate over time and cap at the maximum', () => {
  const L = C.fresh();
  L.hearts = 2; L.heartAt = 0;
  assert.equal(C.regenHearts(L, C.HEART_MS * 2 + 5), 4);
  assert.equal(C.regenHearts(L, C.HEART_MS * 10), C.MAX_HEARTS);
});

test('Gemini practice items are validated before rendering', () => {
  assert.ok(C.validPractice({ t: 'mc', q: 'Which?', o: ['a', 'b'], a: 1 }));
  assert.equal(C.validPractice({ t: 'mc', q: 'Which?', o: ['a', 'b'], a: 2 }), null);
  assert.ok(C.validPractice({ t: 'blank', q: 'Net = gross − ___', a: ['deductions'], bank: ['deductions', 'tips'] }));
  assert.equal(C.validPractice({ t: 'blank', q: 'two ___ ___', a: ['x'], bank: ['x'] }), null);
  assert.equal(C.validPractice({ t: 'num', q: 'How much?', a: 'NaN' }), null);
  assert.equal(C.validPractice({ t: 'open', q: 'Explain', a: 1 }), null);
  assert.equal(C.validPractice({ t: 'num', q: 'How much?', a: 5, pre: '<img>' }).pre, '');
});

test('stars reward clean, unassisted lessons', () => {
  assert.equal(C.starsFor(0, 0), 3);
  assert.equal(C.starsFor(1, 0), 2);
  assert.equal(C.starsFor(0, 1), 2);
  assert.equal(C.starsFor(3, 0), 1);
});
