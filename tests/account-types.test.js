import assert from 'node:assert/strict';
import test from 'node:test';
import { generateStatements, validateConfig, validateStatements } from '../site/assets/js/bank-statements/generation.js';
import { renderStatement } from '../site/assets/js/bank-statements/rendering.js';
import {
  ACCOUNT_TYPES, REVENUE_TIERS, FINANCING_PATTERNS, BREAK_MODES, STATEMENT_COUNTS, BANKS,
  PROCESSORS, PLATFORM_DEPOSITS, CUSTOMER_NAMES, VENDORS, SUBSCRIPTIONS, UTILITIES, INSURANCE, LEASES, CC_PAYMENTS,
  PERSONAL_DEPOSITS, PERSONAL_VENDORS, PERSONAL_SUBSCRIPTIONS, PERSONAL_RECURRING, PERSONAL_BANK_TAGS,
} from '../site/assets/js/bank-statements/data.js';
import { bankConfig, deepFreeze } from './helpers.js';

const PERSONAL_TYPES = Object.keys(ACCOUNT_TYPES).filter(type => ACCOUNT_TYPES[type].personal);
const BUSINESS_DEPOSITS = new Set([...PROCESSORS, ...PLATFORM_DEPOSITS, ...CUSTOMER_NAMES]);
const BUSINESS_SPEND = new Set([
  ...VENDORS, ...SUBSCRIPTIONS, ...[UTILITIES, INSURANCE, LEASES, CC_PAYMENTS].flatMap(pool => pool.map(vendor => `To ${vendor}`)),
]);
const PERSONAL_DEPOSIT_DETAILS = new Set(PERSONAL_DEPOSITS.map(source => `From ${source}`));
const BUSINESS_DEPOSIT_DETAILS = new Set([...BUSINESS_DEPOSITS].map(source => `From ${source}`));
const PERSONAL_SPEND = new Set([
  ...PERSONAL_VENDORS, ...PERSONAL_SUBSCRIPTIONS, ...PERSONAL_RECURRING.flatMap(([pool]) => pool.map(vendor => `To ${vendor}`)),
]);
const render = result => result.statements.map(statement => renderStatement(result, statement)).join('');
const details = (result, category) => result.statements.flatMap(statement => statement.transactions.filter(transaction => transaction.category === category).map(transaction => transaction.detail));
const fieldError = field => error => error.field === field;

test('omitting accountType and choosing business give identical data and markup', () => {
  for (const seed of ['implicit-0', 'implicit-1']) {
    const base = bankConfig({ seed, financings: [{ pattern: 'daily', stopMonth: '' }], debtCollectors: [{ name: 'random', statementName: 'random' }] });
    const implicit = generateStatements(base);
    const explicit = generateStatements({ ...base, accountType: 'business', dba: false });
    assert.equal(JSON.stringify(explicit), JSON.stringify(implicit));
    assert.equal(render(explicit), render(implicit));
    assert.equal(Object.hasOwn(implicit, 'accountType'), false);
    assert.match(render(implicit), /Business Bank Statement[\s\S]*Business Checking/);
  }
});

test('personal account types reconcile across tiers, financings, collectors, and break modes', () => {
  for (const accountType of PERSONAL_TYPES) {
    for (const revenue of ACCOUNT_TYPES[accountType].revenueTiers) {
      for (const [index, { value: breakMode }] of BREAK_MODES.entries()) {
        for (const allowOverdraft of [false, true]) {
          const config = deepFreeze(bankConfig({
            accountType, revenue, breakMode, allowOverdraft, numMonths: STATEMENT_COUNTS[index % STATEMENT_COUNTS.length],
            balanceTier: index % 2 ? 'verylow' : 'mid', seed: `${accountType}/${revenue}/${breakMode}/${allowOverdraft}`,
            financings: FINANCING_PATTERNS.map(({ value: pattern }) => ({ pattern, stopMonth: '' })),
            debtCollectors: [{ name: 'random', statementName: 'random' }, { name: 'random', statementName: 'canonical' }],
          }));
          const result = generateStatements(config);
          validateStatements(result.statements);
          assert.equal(result.accountType, accountType);
          assert.deepEqual(generateStatements(config), result);
        }
      }
    }
  }
});

test('personalOnly accepts only below10k and verylight; the other types accept every tier', () => {
  for (const revenue of Object.keys(REVENUE_TIERS)) {
    const allowed = ['below10k', 'verylight'].includes(revenue);
    for (const accountType of PERSONAL_TYPES) {
      const accepts = accountType === 'personalOnly' ? allowed : true;
      const config = bankConfig({ accountType, revenue });
      if (accepts) assert.doesNotThrow(() => validateConfig(config));
      else assert.throws(() => validateConfig(config), fieldError('revenue'));
    }
    assert.doesNotThrow(() => validateConfig(bankConfig({ accountType: 'business', revenue })));
  }
});

test('invalid account type and DBA settings are rejected with their field', () => {
  assert.throws(() => validateConfig(bankConfig({ accountType: 'joint' })), fieldError('accountType'));
  assert.throws(() => validateConfig(bankConfig({ accountType: null })), fieldError('accountType'));
  for (const dba of ['yes', 1, null]) {
    assert.throws(() => validateConfig(bankConfig({ accountType: 'personalOnly', revenue: 'below10k', dba })), fieldError('dba'));
  }
  assert.throws(() => validateConfig(bankConfig({ dba: true })), fieldError('dba'));
  assert.throws(() => validateConfig(bankConfig({ accountType: 'business', dba: true })), fieldError('dba'));
  assert.doesNotThrow(() => validateConfig(bankConfig({ accountType: 'business', dba: false })));
  assert.doesNotThrow(() => validateConfig(bankConfig({ accountType: 'personalCommingled', dba: true })));
});

test('personal output has no business titles, bank tags, or business-only transaction pools', () => {
  for (const accountType of PERSONAL_TYPES) {
    const result = generateStatements(bankConfig({
      accountType, revenue: 'verylight', numMonths: 6, bank: '1', seed: `personal-pools-${accountType}`,
      financings: [{ pattern: 'daily', stopMonth: '' }],
    }));
    const html = render(result);
    assert.equal(result.bank.tag, PERSONAL_BANK_TAGS[BANKS[1].name]);
    assert.equal(BANKS[1].tag, 'Business Bank');
    assert.ok(html.includes('Personal Bank Statement') && html.includes('Personal Checking'));
    for (const text of ['Business Checking', 'Business Bank Statement', 'Business Bank<']) assert.ok(!html.includes(text), text);
    for (const category of ['card', 'ach']) {
      const used = details(result, category).filter(detail => !detail.includes('Merchant Advance'));
      assert.ok(used.length > 0);
      for (const detail of used) {
        assert.ok(!BUSINESS_SPEND.has(detail), detail);
        assert.ok(PERSONAL_SPEND.has(detail), detail);
      }
    }
    assert.ok(details(result, 'financing').every(detail => /^To .+ - Merchant Advance Pmt$/.test(detail)));
  }
});

test('commingled deposits mix business and personal sources while personalOnly has no business sources', () => {
  const counts = { commingled: { business: 0, personal: 0 }, only: { business: 0, personal: 0 } };
  for (let seed = 0; seed < 20; seed++) {
    for (const [key, accountType] of [['commingled', 'personalCommingled'], ['only', 'personalOnly']]) {
      const result = generateStatements(bankConfig({ accountType, revenue: 'verylight', numMonths: 6, seed: `mix-${seed}` }));
      for (const detail of details(result, 'deposits')) {
        if (BUSINESS_DEPOSIT_DETAILS.has(detail)) counts[key].business++;
        else if (PERSONAL_DEPOSIT_DETAILS.has(detail)) counts[key].personal++;
        else assert.fail(`unexpected deposit source ${detail}`);
      }
    }
  }
  assert.equal(counts.only.business, 0);
  assert.ok(counts.only.personal > 100);
  const share = counts.commingled.business / (counts.commingled.business + counts.commingled.personal);
  assert.ok(share > 0.55 && share < 0.75, `business share ${share}`);
});

test('DBA line and holder are escaped, and personal identity omits the business name without DBA', () => {
  const holder = 'Pat <O\'Neil> & Co';
  const dbaName = 'Fish & "Chips" <LLC>';
  const base = bankConfig({ accountType: 'personalCommingled', ownerName: holder, bizName: dbaName, numMonths: 1 });
  const withDba = generateStatements(deepFreeze({ ...base, dba: true }));
  const html = render(withDba);
  const escapedHolder = 'Pat &lt;O&#39;Neil&gt; &amp; Co';
  const escapedDba = 'Fish &amp; &quot;Chips&quot; &lt;LLC&gt;';
  assert.equal(withDba.business.legal, dbaName);
  assert.ok(html.includes(`<div class="name">${escapedHolder}</div><div>DBA ${escapedDba}</div>`));
  assert.ok(html.includes(`<footer class="foot">${escapedHolder} DBA ${escapedDba} &mdash;`));
  assert.ok(!html.includes('<LLC>') && !html.includes('<O'));

  const generated = generateStatements({ ...base, bizName: '  ', dba: true });
  assert.ok(generated.business.legal.length > 0);
  assert.ok(render(generated).includes(`DBA ${generated.business.legal}`));

  for (const dba of [false, undefined]) {
    const plain = generateStatements({ ...base, dba });
    const plainHtml = render(plain);
    assert.equal(plain.business.legal, '');
    assert.ok(!plainHtml.includes('DBA') && !plainHtml.includes('Chips'));
    assert.match(plainHtml, new RegExp(`<div class="name">${escapedHolder}</div>\\s*<div>\\d+ `));
    assert.ok(plainHtml.includes(`<footer class="foot">${escapedHolder} &mdash;`));
  }
});

test('below $10k deposit cap holds for personal account types', () => {
  const limitCents = 1000000;
  for (const accountType of PERSONAL_TYPES) {
    for (const numMonths of STATEMENT_COUNTS) {
      for (let seed = 0; seed < 8; seed++) {
        for (const { value: breakMode } of BREAK_MODES) {
          const config = bankConfig({ accountType, revenue: 'below10k', numMonths, breakMode, lastMonth: ['2024-02', '2025-01'][seed % 2], seed: `personal-cap-${seed}` });
          const result = generateStatements(config);
          assert.ok(result.statements.every(statement => statement.totals.deposits < limitCents));
        }
      }
      const maxed = generateStatements(bankConfig({ accountType, revenue: 'below10k', numMonths, lastMonth: '2024-02' }), () => 0.999999999);
      assert.ok(maxed.statements.every(statement => statement.totals.deposits === statement.month.days * 30000 && statement.totals.deposits < limitCents));
    }
  }
});

test('personal generation and rendering do not mutate frozen inputs or results', () => {
  for (const accountType of PERSONAL_TYPES) {
    const config = deepFreeze(bankConfig({
      accountType, dba: true, bizName: 'Frozen Trading', ownerName: 'Frozen Holder', revenue: 'below10k',
      financings: [{ pattern: 'obfuscated', stopMonth: '' }], debtCollectors: [{ name: 'random', statementName: 'random' }],
    }));
    const result = deepFreeze(generateStatements(config));
    assert.doesNotThrow(() => render(result));
  }
});
