import assert from 'node:assert/strict';
import test from 'node:test';
import { generateStatements, validateConfig } from '../site/assets/js/bank-statements/generation.js';
import { renderStatement } from '../site/assets/js/bank-statements/rendering.js';
import { bankConfig } from './helpers.js';

const render = result => result.statements.map(statement => renderStatement(result, statement)).join('');

test('statements print the product name in the title, account line, summary heading, and footer', () => {
  const cases = [
    ['business', undefined, 'Business Checking', 'Business Bank Statement'],
    ['business', 'savings', 'Business Savings', 'Business Bank Statement'],
    ['business', 'creditCard', 'Business Credit Card', 'Business Credit Card Statement'],
    ['personalOnly', 'checking', 'Personal Checking', 'Personal Bank Statement'],
    ['personalOnly', 'savings', 'Personal Savings', 'Personal Bank Statement'],
  ];
  for (const [accountType, product, label, title] of cases) {
    const result = generateStatements(bankConfig({ accountType, product, revenue: 'below10k', numMonths: 1 }));
    const html = render(result);
    assert.ok(html.includes(`<div class="doc-title">${title}</div>`), title);
    assert.ok(html.includes(`<div class="product-name">${label}</div>`), label);
    assert.ok(html.includes(`<span class="k">Account Type:</span> <span class="v">${label}</span>`), label);
    assert.ok(html.includes(`<h2 class="sec-head">${label} Summary</h2>`), label);
    assert.ok(html.includes(`&mdash; ${label} ${result.business.acct} &mdash;`), label);
  }
});

test('product changes only labels: transactions match checking, and checking results omit the key', () => {
  const checking = generateStatements(bankConfig({ product: 'checking' }));
  assert.deepEqual(generateStatements(bankConfig()), checking);
  assert.ok(!Object.hasOwn(checking, 'product'));
  for (const product of ['savings', 'creditCard']) {
    const { product: stored, ...rest } = generateStatements(bankConfig({ product }));
    assert.equal(stored, product);
    assert.deepEqual(rest, checking);
  }
});

test('unknown products are rejected', () => {
  for (const product of ['moneyMarket', null, '']) {
    assert.throws(() => validateConfig(bankConfig({ product })), error => error.field === 'product');
  }
});
