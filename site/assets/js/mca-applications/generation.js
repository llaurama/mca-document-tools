import { FIRST, LAST, BIZ_CORE, BIZ_KIND, ISO, USES, STREETS, LINE2, CITIES, OWNER_COUNTS, ENTITY_TYPES } from './data.js';
import { createRandom, randomInt, pick } from '../shared/random.js';
import { pad } from '../shared/formatting.js';
import { configError } from '../shared/validation.js';

export const formatName = owner => [owner.first, owner.last].filter(Boolean).join(" ");
export const formatDate = isoDate => `${isoDate.slice(5, 7)}/${isoDate.slice(8, 10)}/${isoDate.slice(0, 4)}`;
const DAY_MS = 24 * 60 * 60 * 1000;

export function validateConfig(config) {
  if (typeof config.bizName !== "string" || config.bizName.length > 160) throw configError("bizNameOverride", "Business name must contain no more than 160 characters.");
  if (!OWNER_COUNTS.includes(config.ownerCount)) throw configError("ownerCount", "Choose between one and four owners.");
  if (!Array.isArray(config.owners) || config.owners.length !== config.ownerCount) throw configError("ownerCount", "Provide settings for each selected owner.");
  config.owners.forEach((owner, index) => {
    if (!owner || typeof owner.name !== "string" || owner.name.length > 160) throw configError(`ownerName_${index}`, `Owner ${index + 1}'s name must contain no more than 160 characters.`);
  });
  analyzeOwnership(config.owners);
  const value = config.applicationDate;
  const parsed = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear() < 1900 || parsed.toISOString().slice(0, 10) !== value) {
    throw configError("applicationDate", "Choose a valid application date between January 1, 1900 and December 31, 9999.");
  }
  if (typeof config.seed !== "string" || !config.seed.trim() || config.seed.length > 200) throw configError("seed", "Enter a generation seed of 1–200 characters.");
}

export function completedYears(start, end) {
  return Number(end.slice(0, 4)) - Number(start.slice(0, 4)) - (end.slice(5) < start.slice(5) ? 1 : 0);
}

export function yearsBefore(isoDate, years) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const targetYear = year - years;
  const lastDay = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, month - 1, Math.min(day, lastDay)));
}

// Select real calendar days with the requested range of completed anniversaries.
export function pastDate(applicationDate, minYears, maxYears, rng) {
  const firstDay = yearsBefore(applicationDate, maxYears + 1).getTime() / DAY_MS + 1;
  const lastDay = yearsBefore(applicationDate, minYears).getTime() / DAY_MS;
  return new Date(randomInt(rng, firstDay, lastDay) * DAY_MS).toISOString().slice(0, 10);
}

/* ---------------- Identity and ownership generation ---------------- */
export function emailSlug(value, fallback, separator = "", maxLength = 63) {
  const slug = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, separator).replace(/^\.+|\.+$/g, "").slice(0, maxLength).replace(/\.+$/g, "");
  return slug || fallback;
}

function phone(rng) {
  return `(555) ${randomInt(rng, 100, 999)}-${pad(randomInt(rng, 0, 9999), 4)}`;
}

function makeAddress(rng) {
  const [city, state, zip] = pick(rng, CITIES);
  return { street1: `${randomInt(rng, 50, 9999)} ${pick(rng, STREETS)}`, street2: pick(rng, LINE2), city, state, zip };
}

export function analyzeOwnership(owners) {
  let manualTotal = 0;
  const basisPoints = owners.map((owner, index) => {
    const value = owner.percentage;
    if (value === '') return null;
    if (typeof value !== 'string' || !/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(value)) {
      throw configError(`ownerPercentage_${index}`, `Enter a percentage with up to two decimal places for owner ${index + 1}, or leave it blank for automatic.`);
    }
    const amount = Math.round(Number(value) * 100);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) {
      throw configError(`ownerPercentage_${index}`, `Owner ${index + 1}'s ownership must be greater than 0% and no more than 100%.`);
    }
    manualTotal += amount;
    if (manualTotal > 10000) throw configError(`ownerPercentage_${index}`, 'Total ownership cannot exceed 100%.');
    return amount;
  });
  const automaticCount = basisPoints.filter(value => value === null).length;
  const remaining = 10000 - manualTotal;
  if (remaining < automaticCount) {
    throw configError(`ownerPercentage_${basisPoints.indexOf(null)}`, 'Leave at least 0.01% for each automatic owner, or reduce the owner count.');
  }
  return { basisPoints, manualTotal, automaticCount, remaining };
}

export function ownershipSplit(owners, rng) {
  const { basisPoints, automaticCount, remaining: unassigned } = analyzeOwnership(owners);
  let remaining = unassigned;
  let ownersLeft = automaticCount;
  return basisPoints.map(value => {
    if (value !== null) return value / 100;
    // Keep all automatic shares positive, even when only a fraction remains.
    const minimum = remaining >= ownersLeft * 500 ? 500 : 1;
    const maximum = Math.min(remaining - (ownersLeft - 1) * minimum, Math.floor(remaining / ownersLeft) + 1000);
    const amount = ownersLeft === 1 ? remaining : randomInt(rng, minimum, maximum);
    remaining -= amount;
    ownersLeft--;
    return amount / 100;
  });
}

function makeOwner(percentage, index, config, entity, rng) {
  let first = pick(rng, FIRST);
  let last = pick(rng, LAST);
  const nameOverride = config.owners[index].name.trim();
  if (nameOverride) {
    const [given, ...family] = nameOverride.split(/\s+/);
    first = given;
    last = family.join(" ");
  }
  const email = `${emailSlug(formatName({ first, last }), `owner${index + 1}`, ".", 64)}@example.com`;
  return {
    first, last, pct: percentage,
    ssn: `${randomInt(rng, 100, 899)}-${randomInt(rng, 10, 99)}-${randomInt(rng, 1000, 9999)}`,
    dob: pastDate(config.applicationDate, 34, 61, rng),
    email, cell: phone(rng), home: phone(rng), title: pick(rng, entity.titles), addr: makeAddress(rng),
  };
}

/* ---------------- Pure application entry point ---------------- */
export function generateApplication(config, rng) {
  validateConfig(config);
  rng ??= createRandom(config.seed);
  const core = pick(rng, BIZ_CORE);
  const kind = pick(rng, BIZ_KIND);
  const ownership = analyzeOwnership(config.owners);
  const includesFullOwnership = ownership.automaticCount > 0 || ownership.manualTotal === 10000;
  const entity = pick(rng, ENTITY_TYPES.filter(type => config.ownerCount >= type.minOwners && config.ownerCount <= type.maxOwners
    && (!type.fullOwnershipOnly || includesFullOwnership)));
  const legal = config.bizName.trim() || `${core} ${kind[0]}${entity.suffix}`;
  const start = pastDate(config.applicationDate, 5, 18, rng);
  const owners = ownershipSplit(config.owners, rng).map((percentage, index) => makeOwner(percentage, index, config, entity, rng));
  return {
    seed: config.seed, legal, dba: `${core} ${kind[1]}`, entity: entity.label,
    fein: `${randomInt(rng, 10, 99)}-${randomInt(rng, 1000000, 9999999)}`,
    email: `billing@${emailSlug(legal, "business")}.example.com`, phone: phone(rng),
    start, years: completedYears(start, config.applicationDate), biz: makeAddress(rng),
    amountCents: randomInt(rng, 25, 500) * 100000, iso: pick(rng, ISO), use: pick(rng, USES),
    appDate: config.applicationDate, owners,
  };
}
