import assert from 'node:assert/strict';
import test from 'node:test';
import { generateStatements, getMonths, validateConfig, validateStatements } from '../site/assets/js/bank-statements/generation.js';
import { renderStatement } from '../site/assets/js/bank-statements/rendering.js';
import { BALANCE_TIERS, REVENUE_TIERS, FINANCING_PATTERNS, DEBT_COLLECTORS, BREAK_MODES, CATEGORIES, STATEMENT_COUNTS } from '../site/assets/js/bank-statements/data.js';
import { createRandom } from '../site/assets/js/shared/random.js';
import { bankConfig, deepFreeze } from './helpers.js';

const readMoney = text => Math.round(Number(text.replace(/[$,]/g, '')) * 100);
const categorySigns = Object.fromEntries(CATEGORIES.map(category => [category.key, category.sign]));
const weekday = (month, day) => new Date(Date.UTC(month.year, month.index, day)).getUTCDay();
const businessDays = month => Array.from({ length: month.days }, (_, index) => index + 1).filter(day => ![0, 6].includes(weekday(month, day)));

function assertLedger(result) {
  validateStatements(result.statements);
  for (const [index, statement] of result.statements.entries()) {
    assert.ok(Number.isSafeInteger(statement.openingCents));
    if (index) assert.equal(statement.openingCents, result.statements[index - 1].closingCents);
    const totals = Object.fromEntries(CATEGORIES.map(category => [category.key, 0]));
    let balance = statement.openingCents;
    assert.equal(statement.dailyBalances.length, statement.month.days);
    for (let day = 1; day <= statement.month.days; day++) {
      for (const transaction of statement.transactions.filter(transaction => transaction.day === day)) {
        assert.ok(Number.isSafeInteger(transaction.amountCents) && transaction.amountCents > 0);
        totals[transaction.category] += transaction.amountCents;
        balance += categorySigns[transaction.category] * transaction.amountCents;
      }
      assert.deepEqual(statement.dailyBalances[day - 1], { day, balanceCents: balance });
    }
    assert.deepEqual(statement.totals, totals);
    assert.equal(statement.closingCents, balance);
  }
}

function assertCollectors(result) {
  assert.equal(new Set(result.debtCollectors.map(collector => collector.name)).size, result.debtCollectors.length);
  for (const collector of result.debtCollectors) {
    const agency = DEBT_COLLECTORS.find(agency => agency.name === collector.name);
    assert.ok([agency.name, ...agency.aliases].includes(collector.statementName));
    for (const statement of result.statements) {
      const payments = statement.transactions.filter(transaction => transaction.collectorName === collector.name);
      assert.equal(payments.length, 1);
      const payment = payments[0];
      assert.equal(payment.category, 'ach');
      assert.equal(payment.label, 'ACH Debit');
      assert.equal(payment.detail, `To ${collector.statementName}`);
      assert.equal(payment.amountCents, collector.amountCents);
      assert.equal(payment.ref, collector.ref);
      assert.equal(payment.required, true);
      assert.ok(businessDays(statement.month).includes(payment.day));
    }
  }
}

test('all revenue, balance, repayment, and overdraft combinations reconcile', () => {
  for (const revenue of Object.keys(REVENUE_TIERS)) {
    for (const balanceTier of Object.keys(BALANCE_TIERS)) {
      for (const { value: pattern } of FINANCING_PATTERNS) {
        for (const allowOverdraft of [false, true]) {
          const config = deepFreeze(bankConfig({ revenue, balanceTier, allowOverdraft,
            seed: `${revenue}/${balanceTier}/${pattern}/${allowOverdraft}`,
            financings: [{ pattern, stopMonth: '' }],
            debtCollectors: [{ name: 'random', statementName: 'random' }],
          }));
          const result = generateStatements(config);
          assertLedger(result);
          assertCollectors(result);
        }
      }
    }
  }
});

test('required payments post through persistently negative balances and inactive days carry forward', () => {
  const result = generateStatements(bankConfig({ revenue: 'verylight', balanceTier: 'verylow', numMonths: 6,
    financings: Array.from({ length: 3 }, () => ({ pattern: 'daily', stopMonth: '' })),
    debtCollectors: Array.from({ length: 3 }, () => ({ name: 'random', statementName: 'canonical' })),
  }), () => 0);
  assertLedger(result);
  assertCollectors(result);
  assert.ok(result.statements.every(statement => statement.closingCents < 0));
  let inactiveDays = 0;
  for (const [index, statement] of result.statements.entries()) {
    if (index) assert.ok(statement.openingCents < 0);
    assert.equal(statement.transactions.filter(transaction => transaction.category === 'financing').length,
      businessDays(statement.month).length * 3);
    for (const [dayIndex, entry] of statement.dailyBalances.entries()) {
      if (!statement.transactions.some(transaction => transaction.day === entry.day)) {
        inactiveDays++;
        assert.equal(entry.balanceCents, dayIndex ? statement.dailyBalances[dayIndex - 1].balanceCents : statement.openingCents);
      }
    }
  }
  assert.ok(inactiveDays > 0);
});

test('calendar ranges preserve supported counts, leap years, and year transitions', () => {
  assert.deepEqual(getMonths('2000-03', 3).map(month => month.days), [31, 29, 31]);
  assert.deepEqual(getMonths('1900-03', 3).map(month => month.days), [31, 28, 31]);
  assert.deepEqual(getMonths('2025-01', 3).map(month => month.key), ['2024-11', '2024-12', '2025-01']);
  for (const numMonths of STATEMENT_COUNTS) {
    const result = generateStatements(bankConfig({ numMonths }));
    assert.equal(result.statements.length, numMonths);
    assertLedger(result);
  }
  assert.throws(() => getMonths('1900-01', 2), { field: 'lastMonth' });
  assert.throws(() => getMonths('2024-13', 1), { field: 'lastMonth' });
  assert.throws(() => getMonths('2024-02', 5), { field: 'numMonths' });
});

test('financing stop month is inclusive for every repayment pattern', () => {
  for (const { value: pattern } of FINANCING_PATTERNS) {
    const result = generateStatements(bankConfig({ financings: [{ pattern, stopMonth: '2024-02' }] }));
    const [january, february, march] = result.statements.map(statement => statement.transactions.filter(transaction => transaction.category === 'financing'));
    assert.ok(january.length > 0);
    assert.ok(february.length > 0);
    assert.equal(march.length, 0);
    if (pattern === 'daily') {
      assert.equal(february.length, businessDays(result.statements[1].month).length);
    } else if (pattern === 'weekly') {
      assert.ok(february.every(transaction => weekday(result.statements[1].month, transaction.day) === 3));
      assert.equal(february.length, 4);
    }
    assertLedger(result);
  }
  assert.throws(() => validateConfig(bankConfig({ financings: [{ pattern: 'daily', stopMonth: '2023-12' }] })), { field: 'financings' });
});

test('disabled collectors consume no random draws', () => {
  const config = bankConfig();
  const withoutProperty = { ...config };
  delete withoutProperty.debtCollectors;
  const explicitRandom = createRandom(config.seed);
  const absentRandom = createRandom(config.seed);
  assert.deepEqual(generateStatements(config, explicitRandom), generateStatements(withoutProperty, absentRandom));
  assert.equal(explicitRandom(), absentRandom());
});

test('one to three random collectors reserve every manual agency regardless of row order', () => {
  for (let count = 1; count <= 3; count++) {
    for (let seed = 0; seed < 8; seed++) {
      const debtCollectors = Array.from({ length: count }, () => ({ name: 'random', statementName: 'random' }));
      if (count > 1) debtCollectors[count - 1] = { name: 'Example Alder Recovery', statementName: 'random' };
      const config = bankConfig({ seed: `collectors-${count}-${seed}`, debtCollectors });
      const result = generateStatements(config);
      assert.equal(result.debtCollectors.length, count);
      assertCollectors(result);
      assertLedger(result);
      assert.deepEqual(generateStatements(config), result);
    }
  }
});

test('all exact aliases and agencies without aliases retain their printed names', () => {
  for (const agency of DEBT_COLLECTORS) {
    for (const alias of agency.aliases.length ? agency.aliases : [null]) {
      const config = bankConfig({ numMonths: 1, debtCollectors: [{ name: agency.name,
        statementName: alias === null ? 'random' : `alias:${alias}` }] });
      const result = generateStatements(config);
      assert.equal(result.debtCollectors[0].statementName, alias ?? agency.name);
      assertCollectors(result);
      assertLedger(result);
    }
  }
  assert.throws(() => validateConfig(bankConfig({ debtCollectors: [
    { name: 'Example Delta Recovery', statementName: 'canonical' }, { name: 'Example Delta Recovery', statementName: 'canonical' },
  ] })), { field: 'collectorName_1' });
  assert.throws(() => validateConfig(bankConfig({ debtCollectors: [{ name: 'Example Delta Recovery', statementName: 'alias:Not an alias' }] })), { field: 'collectorStatementName_0' });
});

test('each break mode changes presentation only on the latest statement', () => {
  const config = bankConfig({ debtCollectors: [{ name: 'Example Delta Recovery', statementName: 'alias:Example Delta / 202-555-0104' }] });
  const normal = generateStatements(config);
  for (const { value: breakMode } of BREAK_MODES) {
    const result = generateStatements({ ...config, breakMode });
    assertLedger(result);
    assertCollectors(result);
    const trueLedger = structuredClone(result);
    trueLedger.statements.forEach(statement => { statement.breakInfo = null; });
    assert.deepEqual(trueLedger, normal);
    assert.ok(result.statements.slice(0, -1).every(statement => statement.breakInfo === null));
    const latest = result.statements.at(-1);
    if (breakMode === 'none') {
      assert.equal(latest.breakInfo, null);
      continue;
    }
    const html = renderStatement(result, latest);
    assert.notEqual(html, renderStatement(normal, normal.statements.at(-1)));
    const printedClosing = readMoney(html.match(/<td>Ending Balance<\/td><td class="amount">([^<]+)<\/td>/)[1]);
    const info = latest.breakInfo;
    assert.ok(Number.isSafeInteger(info.deltaCents) && info.deltaCents !== 0);
    if (info.mode === 'misstated') {
      assert.ok(latest.transactions[info.transactionIndex].amountCents + info.deltaCents > 0);
      assert.equal(printedClosing, latest.closingCents);
      const printedTransactionAmounts = [...html.matchAll(/<table class="tx">([\s\S]*?)<\/table>/g)].flatMap(table =>
        [...table[1].matchAll(/<tr><td class="date-column">[\s\S]*?<td class="amount">([^<]+)<\/td><\/tr>/g)].map(row => readMoney(row[1])));
      const expectedAmounts = CATEGORIES.flatMap(category => latest.transactions.flatMap((transaction, index) =>
        transaction.category === category.key ? [transaction.amountCents + (index === info.transactionIndex ? info.deltaCents : 0)] : []));
      assert.deepEqual(printedTransactionAmounts, expectedAmounts);
    } else {
      assert.equal(info.mode, 'phantom');
      assert.ok(info.pivotDay >= 1 && info.pivotDay <= latest.month.days);
      assert.equal(printedClosing, latest.closingCents + info.deltaCents);
      const dailyTable = html.match(/<table class="balances">([\s\S]*?)<\/table>/)[1];
      const printedDaily = [...dailyTable.matchAll(/<td class="amount">([^<]+)<\/td>/g)].map(match => readMoney(match[1]));
      assert.deepEqual(printedDaily, latest.dailyBalances.map(entry => entry.balanceCents + (entry.day >= info.pivotDay ? info.deltaCents : 0)));
      assert.equal(printedDaily.at(-1), printedClosing);
    }
  }
});

test('ledger validation catches continuity, totals, daily balances, and misplaced corruption', () => {
  const original = generateStatements(bankConfig()).statements;
  const mutations = [
    statements => { statements[1].openingCents++; },
    statements => { statements[0].totals.deposits++; },
    statements => { statements[0].dailyBalances[0].balanceCents++; },
    statements => { statements[0].transactions[0].amountCents = 0; },
    statements => { statements[0].breakInfo = { mode: 'phantom', deltaCents: 100, pivotDay: 1 }; },
  ];
  for (const mutate of mutations) {
    const statements = structuredClone(original);
    mutate(statements);
    assert.throws(() => validateStatements(statements), /Ledger validation failed/);
  }
});

test('bank renderer escapes literal user and collector names and retains synthetic markings', () => {
  const result = generateStatements(bankConfig({ bizName: '<script>alert("test")</script> & Co', ownerName: "O'Neil <Owner>",
    debtCollectors: [{ name: 'Example Cedar & Pine', statementName: 'canonical' }] }));
  const html = result.statements.map(statement => renderStatement(deepFreeze(result), statement)).join('');
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt; &amp; Co'));
  assert.ok(html.includes('O&#39;Neil &lt;Owner&gt;'));
  assert.ok(html.includes('Example Cedar &amp; Pine'));
  assert.equal((html.match(/SYNTHETIC TEST DOCUMENT\./g) || []).length, result.statements.length);
});
