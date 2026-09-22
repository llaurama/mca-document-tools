import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const baseline = JSON.parse(readFileSync(new URL('./fixtures/generation-baselines.json', import.meta.url), 'utf8'));
export const sha256 = value => createHash('sha256').update(value).digest('hex');

export function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export function bankConfig(overrides = {}) {
  return {
    bizName: '', ownerName: '', bank: 'random', lastMonth: '2024-03', numMonths: 3,
    revenue: 'moderate', balanceTier: 'mid', allowOverdraft: false, seed: 'bank-regression',
    breakMode: 'none', financings: [], debtCollectors: [], ...overrides,
  };
}

export function applicationConfig(overrides = {}) {
  return {
    bizName: '', ownerCount: 1, owners: [{ name: '', percentage: '' }],
    applicationDate: '2024-02-29', seed: 'application-regression', ...overrides,
  };
}
