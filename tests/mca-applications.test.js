import assert from 'node:assert/strict';
import test from 'node:test';
import { generateApplication, validateConfig, analyzeOwnership } from '../site/assets/js/mca-applications/generation.js';
import { renderApplication } from '../site/assets/js/mca-applications/rendering.js';
import { ENTITY_TYPES, OWNER_COUNTS } from '../site/assets/js/mca-applications/data.js';
import { createRandom } from '../site/assets/js/shared/random.js';
import { applicationConfig, deepFreeze } from './helpers.js';

const toBasisPoints = percentage => Math.round(percentage * 100);
const escaped = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const dateYearDifference = (start, end) => Number(end.slice(0, 4)) - Number(start.slice(0, 4)) - Number(end.slice(5) < start.slice(5));

function assertApplication(application, config) {
  assert.equal(application.owners.length, config.ownerCount);
  assert.ok(Number.isSafeInteger(application.amountCents) && application.amountCents >= 2500000 && application.amountCents <= 50000000);
  const entity = ENTITY_TYPES.find(type => type.label === application.entity);
  assert.ok(application.owners.length >= entity.minOwners && application.owners.length <= entity.maxOwners);
  const analysis = analyzeOwnership(config.owners);
  const total = application.owners.reduce((sum, owner) => sum + toBasisPoints(owner.pct), 0);
  assert.equal(total, analysis.automaticCount ? 10000 : analysis.manualTotal);
  if (entity.fullOwnershipOnly) assert.equal(total, 10000);
  application.owners.forEach((owner, index) => {
    assert.ok(owner.pct > 0 && owner.pct <= 100);
    assert.ok(Math.abs(owner.pct * 100 - toBasisPoints(owner.pct)) < 1e-8);
    if (config.owners[index].percentage !== '') {
      assert.equal(toBasisPoints(owner.pct), toBasisPoints(Number(config.owners[index].percentage)));
    }
    if (config.owners[index].name.trim()) {
      assert.equal([owner.first, owner.last].filter(Boolean).join(' '), config.owners[index].name.trim().replace(/\s+/g, ' '));
    }
    assert.ok(entity.titles.includes(owner.title));
    assert.ok(owner.email.endsWith('@example.com'));
    const age = dateYearDifference(owner.dob, config.applicationDate);
    assert.ok(age >= 34 && age <= 61);
  });
  assert.equal(application.years, dateYearDifference(application.start, config.applicationDate));
  assert.ok(application.years >= 5 && application.years <= 18);
  assert.equal(application.appDate, config.applicationDate);
}

test('one to four owners retain valid shares, names, dates, and entity compatibility', () => {
  for (const ownerCount of OWNER_COUNTS) {
    for (let seed = 0; seed < 40; seed++) {
      for (const automatic of [false, true]) {
        const owners = Array.from({ length: ownerCount }, (_, index) => ({
          name: index % 2 ? `Given${index} Family${index}` : '', percentage: automatic ? '' : (100 / ownerCount).toFixed(2),
        }));
        // Three explicit 33.33% shares intentionally leave 0.01% unassigned.
        const config = deepFreeze(applicationConfig({ ownerCount, owners, seed: `owners-${seed}-${ownerCount}-${automatic}` }));
        const result = generateApplication(config);
        assertApplication(result, config);
        assert.deepEqual(generateApplication(config), result);
      }
    }
  }
});

test('mixed decimal ownership fills the remainder with positive hundredth-percent shares', () => {
  const scenarios = [
    ['45.25', '30', ''], ['99.97', '', '', ''], ['.5', '', ''], ['10.', '15.25'], ['100'],
  ];
  for (const percentages of scenarios) {
    const config = applicationConfig({ ownerCount: percentages.length,
      owners: percentages.map((percentage, index) => ({ name: `Owner ${index + 1}`, percentage })) });
    const result = generateApplication(config);
    assertApplication(result, config);
    if (percentages[0] === '99.97') assert.deepEqual(result.owners.map(owner => owner.pct), [99.97, .01, .01, .01]);
  }
});

test('partial sole owner never generates a sole proprietorship', () => {
  for (let seed = 0; seed < 40; seed++) {
    const config = applicationConfig({ seed: `partial-${seed}`, owners: [{ name: '', percentage: '50' }] });
    const result = generateApplication(config);
    assert.equal(result.owners[0].pct, 50);
    assert.notEqual(result.entity, 'Sole Proprietorship');
  }
});

test('all owner blocks have matching authorized signatures, names, titles, and dates', () => {
  const seenTitles = new Set();
  for (const ownerCount of OWNER_COUNTS) {
    for (let seed = 0; seed < 24; seed++) {
      const config = applicationConfig({ ownerCount, seed: `signatures-${ownerCount}-${seed}`,
        owners: Array.from({ length: ownerCount }, (_, index) => ({ name: `Person ${index + 1}`, percentage: '' })) });
      const result = deepFreeze(generateApplication(config));
      const html = renderApplication(result);
      const signatures = [...html.matchAll(/<section class="signature-block">([\s\S]*?)<\/section>/g)].map(match => match[1]);
      const ownerBlocks = [...html.matchAll(/<section class="owner-block">([\s\S]*?)<\/section>/g)].map(match => match[1]);
      assert.equal(signatures.length, ownerCount);
      assert.equal(ownerBlocks.length, ownerCount);
      result.owners.forEach((owner, index) => {
        seenTitles.add(owner.title);
        assert.ok(ownerBlocks[index].includes(escaped(owner.title)));
        assert.ok(signatures[index].includes(escaped(`${owner.first} ${owner.last}`.trim())));
        assert.ok(signatures[index].includes(escaped(owner.title)));
        assert.ok(signatures[index].includes('02/29/2024'));
        assert.ok(signatures[index].includes('Authorized Owner Signature'));
      });
      assert.ok(html.includes('SYNTHETIC TEST DOCUMENT'));
    }
  }
  for (const title of ['CEO', 'CFO', 'COO', 'VP']) assert.ok(seenTitles.has(title), `${title} must remain reachable`);
});

test('literal HTML characters and Unicode names are escaped and yield safe derived emails', () => {
  const config = applicationConfig({ bizName: '<Business> & "Company"', ownerCount: 4, owners: [
    { name: "O'Neil & Co", percentage: '25' }, { name: '<script>alert(1)</script>', percentage: '25' },
    { name: 'Zoë García', percentage: '25' }, { name: 'Li', percentage: '25' },
  ] });
  const result = deepFreeze(generateApplication(config));
  const html = renderApplication(result);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;Business&gt; &amp; &quot;Company&quot;'));
  assert.ok(html.includes('O&#39;Neil'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.equal(result.owners[2].email, 'zoe.garcia@example.com');
  assert.equal(result.owners[3].email, 'li@example.com');
  assert.ok(result.owners.every(owner => !/[<>"'&\s]/.test(owner.email)));
  assert.ok(result.email.endsWith('.example.com'));
});

test('dates stay valid around leap days, year transitions, and supported range endpoints', () => {
  for (const applicationDate of ['1900-01-01', '2000-02-29', '2024-02-29', '2025-01-01', '9999-12-31']) {
    const config = applicationConfig({ applicationDate });
    const result = generateApplication(config);
    assertApplication(result, config);
    for (const value of [result.start, ...result.owners.map(owner => owner.dob)]) {
      assert.equal(new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10), value);
    }
  }
});

test('invalid owner amounts and totals identify the affected input', () => {
  for (const percentage of ['0', '0.00', '-1', '100.01', '1.001', '1e1', 'NaN', 'Infinity', 'invalid', ' ', '1,5']) {
    assert.throws(() => validateConfig(applicationConfig({ owners: [{ name: '', percentage }] })), { field: 'ownerPercentage_0' });
  }
  for (const percentage of [null, undefined, 50]) {
    assert.throws(() => validateConfig(applicationConfig({ owners: [{ name: '', percentage }] })), { field: 'ownerPercentage_0' });
  }
  assert.throws(() => validateConfig(applicationConfig({ ownerCount: 2,
    owners: [{ name: '', percentage: '60' }, { name: '', percentage: '40.01' }] })), { field: 'ownerPercentage_1' });
  assert.throws(() => validateConfig(applicationConfig({ ownerCount: 2,
    owners: [{ name: '', percentage: '100' }, { name: '', percentage: '' }] })), { field: 'ownerPercentage_1' });
  assert.throws(() => validateConfig(applicationConfig({ ownerCount: 3,
    owners: [{ name: '', percentage: '99.99' }, { name: '', percentage: '' }, { name: '', percentage: '' }] })), { field: 'ownerPercentage_1' });
});

test('invalid configuration rejects before consuming the supplied random source', () => {
  const scenarios = [
    [{ ownerCount: 0 }, 'ownerCount'], [{ ownerCount: 5 }, 'ownerCount'], [{ ownerCount: 2 }, 'ownerCount'],
    [{ owners: null }, 'ownerCount'], [{ owners: [{ name: 'x'.repeat(161), percentage: '' }] }, 'ownerName_0'],
    [{ bizName: 'x'.repeat(161) }, 'bizNameOverride'], [{ seed: '' }, 'seed'], [{ seed: 'x'.repeat(201) }, 'seed'],
    [{ applicationDate: '2025-02-29' }, 'applicationDate'], [{ applicationDate: '1899-12-31' }, 'applicationDate'],
    [{ applicationDate: '2024-13-01' }, 'applicationDate'], [{ applicationDate: '2024-1-1' }, 'applicationDate'],
  ];
  for (const [overrides, field] of scenarios) {
    assert.throws(() => generateApplication(applicationConfig(overrides), () => { assert.fail('Validation must precede generation'); }), { field });
  }
});

test('an injected random source reproduces seed output without modifying configuration', () => {
  const config = deepFreeze(applicationConfig({ ownerCount: 4,
    owners: Array.from({ length: 4 }, () => ({ name: '', percentage: '' })) }));
  assert.deepEqual(generateApplication(config, createRandom(config.seed)), generateApplication(config));
});
