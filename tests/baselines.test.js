import assert from 'node:assert/strict';
import test from 'node:test';
import { generateStatements } from '../site/assets/js/bank-statements/generation.js';
import { renderStatement } from '../site/assets/js/bank-statements/rendering.js';
import { DEBT_COLLECTORS } from '../site/assets/js/bank-statements/data.js';
import { generateApplication } from '../site/assets/js/mca-applications/generation.js';
import { renderApplication } from '../site/assets/js/mca-applications/rendering.js';
import { createRandom } from '../site/assets/js/shared/random.js';
import { baseline, deepFreeze, sha256 } from './helpers.js';

for (const fixture of baseline.bank) {
  test(`bank matches expected data and document: ${fixture.name}`, () => {
    const result = deepFreeze(generateStatements(deepFreeze(fixture.config)));
    assert.equal(sha256(JSON.stringify(result)), fixture.resultSha256);
    const html = result.statements.map(statement => renderStatement(result, statement)).join('');
    assert.equal(sha256(html), fixture.htmlSha256);
  });
}

for (const fixture of baseline.application) {
  test(`application matches expected data and document: ${fixture.name}`, () => {
    const result = deepFreeze(generateApplication(deepFreeze(fixture.config)));
    assert.equal(sha256(JSON.stringify(result)), fixture.resultSha256);
    assert.equal(sha256(renderApplication(result)), fixture.htmlSha256);
  });
}

for (const { seed, values } of baseline.random) {
  test(`seed retains the expected RNG sequence: ${JSON.stringify(seed)}`, () => {
    const first = createRandom(seed);
    const second = createRandom(seed);
    assert.deepEqual(values.map(() => first()), values);
    assert.deepEqual(values.map(() => second()), values);
  });
}

test('collector catalog retains all names, alias punctuation, and ordering', () => {
  assert.equal(DEBT_COLLECTORS.length, baseline.catalog.count);
  assert.equal(new Set(DEBT_COLLECTORS.map(collector => collector.name)).size, baseline.catalog.count);
  assert.equal(new Set(DEBT_COLLECTORS.flatMap(collector => collector.aliases)).size, baseline.catalog.noncanonicalAliasCount);
  assert.equal(sha256(JSON.stringify(DEBT_COLLECTORS)), baseline.catalog.sha256);
  for (const collector of DEBT_COLLECTORS) {
    assert.equal(collector.name, collector.name.trim());
    assert.ok(collector.name.startsWith('Example '));
    assert.ok(collector.aliases.every(alias => alias === alias.trim() && alias !== collector.name));
  }
});
