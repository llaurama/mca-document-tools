import { createRandom, randomInt, pick } from '../shared/random.js';
import { pad } from '../shared/formatting.js';
import { configError } from '../shared/validation.js';
import {
  BANKS, FIRST, LAST, BIZ_CORE, BIZ_KIND, STREETS, CITIES, PROCESSORS, PLATFORM_DEPOSITS,
  CUSTOMER_NAMES, VENDORS, SUBSCRIPTIONS, UTILITIES, INSURANCE, LEASES, CC_PAYMENTS, FUNDERS,
  DEBT_COLLECTORS, DEBT_COLLECTOR_BY_NAME, DEBT_COLLECTOR_COUNTS, REVENUE_TIERS, BALANCE_TIERS,
  STATEMENT_COUNTS, FINANCING_PATTERNS, BREAK_MODES, CATEGORIES, CATEGORY_BY_KEY, MONTH_NAMES,
} from './data.js';

const moneyCents = (rng, minDollars, maxDollars) => randomInt(rng, Math.round(minDollars * 100), Math.round(maxDollars * 100));
const referenceNumber = rng => String(randomInt(rng, 10000000, 999999999));
const weekday = (month, day) => new Date(Date.UTC(month.year, month.index, day)).getUTCDay();
const isBusinessDay = (month, day) => ![0, 6].includes(weekday(month, day));

function collectorStatementNameOptions(name) {
  const aliases = DEBT_COLLECTOR_BY_NAME.get(name)?.aliases || [];
  return [
    { value: "canonical", label: "Agency name" },
    { value: "random", label: "Random name or alias" },
    ...aliases.map(alias => ({ value: `alias:${alias}`, label: alias })),
  ];
}

function getMonths(lastMonth, numMonths) {
  if (!STATEMENT_COUNTS.includes(numMonths)) throw configError("numMonths", "Choose 1, 2, 3, 4, or 6 statements.");
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(lastMonth);
  if (!match || Number(match[1]) < 1900) throw configError("lastMonth", "Choose a valid month between January 1900 and December 9999.");
  const last = Number(match[1]) * 12 + Number(match[2]) - 1;
  if (last - numMonths + 1 < 1900 * 12) throw configError("lastMonth", "The first statement must be January 1900 or later.");
  return Array.from({ length: numMonths }, (_, offset) => {
    const absoluteMonth = last - numMonths + 1 + offset;
    const year = Math.floor(absoluteMonth / 12);
    const index = absoluteMonth % 12;
    return {
      key: `${year}-${pad(index + 1)}`, label: `${MONTH_NAMES[index]} ${year}`, year, index,
      days: new Date(Date.UTC(year, index + 1, 0)).getUTCDate()
    };
  });
}

function validateConfig(config) {
  const months = getMonths(config.lastMonth, config.numMonths);
  for (const field of ["bizName", "ownerName", "seed"]) {
    if (typeof config[field] !== "string") throw configError(field, "Enter text for this field.");
  }
  if (!config.seed.trim()) throw configError("seed", "A generation seed is required.");
  if (config.bank !== "random" && !BANKS.some((_, index) => String(index) === config.bank)) throw configError("bank", "Choose a bank from the list.");
  if (!Object.hasOwn(REVENUE_TIERS, config.revenue)) throw configError("revenue", "Choose a revenue tier.");
  if (!Object.hasOwn(BALANCE_TIERS, config.balanceTier)) throw configError("balanceTier", "Choose a starting balance.");
  if (typeof config.allowOverdraft !== "boolean") throw configError("allowOverdraft", "Choose whether discretionary spending may overdraw.");
  if (!BREAK_MODES.some(mode => mode.value === config.breakMode)) throw configError("breakMode", "Choose a reconciliation mode.");
  if (!Array.isArray(config.financings) || config.financings.length > 3) throw configError("financings", "Choose between zero and three financings.");
  config.financings.forEach((financing, index) => {
    if (!FINANCING_PATTERNS.some(pattern => pattern.value === financing.pattern)) throw configError("financings", `Choose a repayment pattern for financing ${index + 1}.`);
    if (financing.stopMonth !== "" && !months.slice(0, -1).some(month => month.key === financing.stopMonth)) throw configError("financings", `Choose a stop month within the range for financing ${index + 1}, or Never.`);
  });
  const { debtCollectors = [] } = config;
  if (!Array.isArray(debtCollectors) || debtCollectors.length > DEBT_COLLECTOR_COUNTS.at(-1)) {
    throw configError("debtCollectorCount", "Choose between one and three collectors, or turn off debt collectors.");
  }
  const selectedNames = new Set();
  debtCollectors.forEach((collector, index) => {
    if (!collector || (collector.name !== "random" && !DEBT_COLLECTOR_BY_NAME.has(collector.name))) {
      throw configError(`collectorName_${index}`, `Choose an agency for collector ${index + 1}.`);
    }
    if (collector.name !== "random") {
      if (selectedNames.has(collector.name)) throw configError(`collectorName_${index}`, "Choose a different agency for each collector, or Random.");
      selectedNames.add(collector.name);
    }
    if (!collectorStatementNameOptions(collector.name).some(option => option.value === collector.statementName)) {
      throw configError(`collectorStatementName_${index}`, `Choose a valid statement name for collector ${index + 1}.`);
    }
  });
}

/* ---------------- Identity and financing generation ---------------- */
function makeBusiness(config, rng) {
  const legal = [pick(rng, BIZ_CORE), ...pick(rng, BIZ_KIND)].join(" ");
  const [city, state, zip] = pick(rng, CITIES);
  const street = `${randomInt(rng, 50, 9999)} ${pick(rng, STREETS)}`;
  const ownerName = `${pick(rng, FIRST)} ${pick(rng, LAST)}`.toUpperCase();
  const acct = `${randomInt(rng, 1, 9)}-${randomInt(rng, 100, 999)}-${randomInt(rng, 1000, 9999)}-${randomInt(rng, 1000, 9999)}`;
  return { legal: config.bizName.trim() || legal, ownerName: config.ownerName.trim() || ownerName, acct, addr: { street, city, state, zip } };
}

function spendScale(revenue) {
  const tier = REVENUE_TIERS[revenue];
  return Math.max(0.4, (tier.dayMin + tier.dayMax) / 16000);
}

function buildFinancings(config, rng) {
  const availableFunders = [...FUNDERS];
  const tier = REVENUE_TIERS[config.revenue];
  return config.financings.map(settings => {
    const funder = availableFunders.splice(randomInt(rng, 0, availableFunders.length - 1), 1)[0];
    const financing = { ...settings, funder, ref: referenceNumber(rng) };
    if (settings.pattern !== "obfuscated") {
      const fraction = randomInt(rng, 4, 11) / 100;
      financing.amountCents = Math.round((tier.dayMin + tier.dayMax) / 2 * 100 * fraction * (settings.pattern === "weekly" ? 5 : 1));
      return financing;
    }
    const ranges = [[250, 700], [700, 1300], [1000, 2200], [1500, 2600], [4000, 9000], [300, 900]];
    const scale = spendScale(config.revenue);
    financing.subs = Array.from({ length: randomInt(rng, 4, 6) }, (_, index) => ({
      amountCents: Math.round(moneyCents(rng, ...ranges[index]) * scale),
      anchorDay: randomInt(rng, 2, 27),
    }));
    financing.lumpSumMonthIndex = config.numMonths > 1 && rng() < 0.5 ? randomInt(rng, 1, config.numMonths - 1) : null;
    return financing;
  });
}

function financingDebits(financing, month, monthIndex, rng) {
  if (financing.stopMonth && month.key > financing.stopMonth) return [];
  const debits = [];
  const add = (day, amountCents) => debits.push({ day, category: "financing", label: "ACH Debit", detail: `To ${financing.funder}`, ref: financing.ref, amountCents });
  if (financing.pattern !== "obfuscated") {
    for (let day = 1; day <= month.days; day++) {
      if (financing.pattern === "daily" ? isBusinessDay(month, day) : weekday(month, day) === 3) add(day, financing.amountCents);
    }
    return debits;
  }
  const jitter = cents => Math.round(cents * (1 + rng() * 0.03 - 0.015));
  for (const sub of financing.subs) {
    const firstDay = Math.min(month.days, Math.max(1, sub.anchorDay + randomInt(rng, -3, 4)));
    add(firstDay, jitter(sub.amountCents));
    if (rng() < 0.45) {
      const secondDay = Math.min(month.days, firstDay + randomInt(rng, 0, 3));
      add(secondDay, jitter(sub.amountCents));
      if (rng() < 0.35) add(Math.min(month.days, secondDay + randomInt(rng, 0, 3)), jitter(sub.amountCents));
    }
  }
  if (rng() < 0.4) add(randomInt(rng, 2, month.days - 2), moneyCents(rng, 150, 2200));
  if (financing.lumpSumMonthIndex === monthIndex) {
    add(randomInt(rng, 20, month.days - 2), Math.max(...financing.subs.map(sub => sub.amountCents)) * randomInt(rng, 5, 12) + moneyCents(rng, 0, 500));
  }
  return debits;
}

function buildDebtCollectors(config, rng) {
  const { debtCollectors = [] } = config;
  // Reserve every manual selection before resolving Random, regardless of row order.
  const selectedNames = new Set(debtCollectors.filter(collector => collector.name !== "random").map(collector => collector.name));
  const scale = spendScale(config.revenue);
  return debtCollectors.map(selection => {
    const collector = selection.name === "random"
      ? pick(rng, DEBT_COLLECTORS.filter(candidate => !selectedNames.has(candidate.name)))
      : DEBT_COLLECTOR_BY_NAME.get(selection.name);
    selectedNames.add(collector.name);
    const statementName = selection.statementName === "random" ? pick(rng, [collector.name, ...collector.aliases])
      : selection.statementName === "canonical" ? collector.name : selection.statementName.slice("alias:".length);
    return { name: collector.name, statementName, amountCents: moneyCents(rng, 100 * scale, 1000 * scale), ref: referenceNumber(rng) };
  });
}

function debtCollectorDebits(collectors, month, rng) {
  if (!collectors.length) return [];
  const businessDays = Array.from({ length: month.days }, (_, index) => index + 1).filter(day => isBusinessDay(month, day));
  return collectors.map(collector => ({
    day: pick(rng, businessDays), category: "ach", label: "ACH Debit", detail: `To ${collector.statementName}`,
    ref: collector.ref, amountCents: collector.amountCents, required: true, collectorName: collector.name,
  }));
}

/* ---------------- Transactions and true ledger ---------------- */
function monthTransactions(month, monthIndex, config, financings, rng, debtCollectors = []) {
  const tier = REVENUE_TIERS[config.revenue];
  const scale = spendScale(config.revenue);
  const transactions = [];
  const add = (day, category, label, detail, amountCents) => transactions.push({ day, category, label, detail, ref: referenceNumber(rng), amountCents });
  for (let day = 1; day <= month.days; day++) {
    if (!isBusinessDay(month, day) && rng() < 0.6) continue;
    const depositCount = randomInt(rng, ...tier.depsPerDay);
    for (let index = 0; index < depositCount; index++) {
      const source = rng() < 0.55 ? pick(rng, PLATFORM_DEPOSITS) : pick(rng, rng() < 0.5 ? PROCESSORS : CUSTOMER_NAMES);
      add(day, "deposits", "Electronic Deposit", `From ${source}`, moneyCents(rng, tier.dayMin / depositCount, tier.dayMax / depositCount));
    }
    const cardCount = randomInt(rng, 0, Math.min(8, Math.round(3 * scale)));
    for (let index = 0; index < cardCount; index++) {
      add(day, "card", "Debit Card Purchase", pick(rng, VENDORS), moneyCents(rng, 15 * scale, 450 * scale));
    }
    if (rng() < 0.18) {
      const [vendors, min, max] = pick(rng, [[UTILITIES, 60, 350], [INSURANCE, 150, 900], [LEASES, 200, 1500], [CC_PAYMENTS, 100, 2500]]);
      add(day, "ach", "Electronic Withdrawal", `To ${pick(rng, vendors)}`, moneyCents(rng, min * scale, max * scale));
    }
  }
  const subscriptionCount = randomInt(rng, 2, 4);
  for (let index = 0; index < subscriptionCount; index++) {
    add(randomInt(rng, 1, 10), "ach", "Recurring Debit", pick(rng, SUBSCRIPTIONS), moneyCents(rng, 9, 120));
  }
  for (const financing of financings) transactions.push(...financingDebits(financing, month, monthIndex, rng));
  transactions.push(...debtCollectorDebits(debtCollectors, month, rng));
  return transactions.sort((left, right) => left.day - right.day || CATEGORY_BY_KEY[right.category].sign - CATEGORY_BY_KEY[left.category].sign);
}

function buildStatement(month, openingCents, candidates, allowOverdraft) {
  const transactions = [];
  const dailyBalances = [];
  const totals = Object.fromEntries(CATEGORIES.map(category => [category.key, 0]));
  let closingCents = openingCents;
  let cursor = 0;
  for (let day = 1; day <= month.days; day++) {
    while (cursor < candidates.length && candidates[cursor].day === day) {
      const transaction = candidates[cursor++];
      const projected = closingCents + CATEGORY_BY_KEY[transaction.category].sign * transaction.amountCents;
      if (!allowOverdraft && projected < 0 && !transaction.required && ["card", "ach"].includes(transaction.category)) continue;
      transactions.push(transaction);
      totals[transaction.category] += transaction.amountCents;
      closingCents = projected;
    }
    dailyBalances.push({ day, balanceCents: closingCents });
  }
  return { month, openingCents, closingCents, transactions, dailyBalances, totals, breakInfo: null };
}

function validateStatements(statements) {
  const assert = (condition, message) => { if (!condition) throw new Error(`Ledger validation failed: ${message}`); };
  statements.forEach((statement, index) => {
    assert(Number.isSafeInteger(statement.openingCents) && Number.isSafeInteger(statement.closingCents), "invalid statement balance.");
    if (index > 0) {
      const previous = statements[index - 1];
      assert(statement.openingCents === previous.closingCents, "balance continuity between months.");
      assert(statement.month.year * 12 + statement.month.index === previous.month.year * 12 + previous.month.index + 1, "nonconsecutive statement months.");
    }
    const totals = Object.fromEntries(CATEGORIES.map(category => [category.key, 0]));
    const movements = Array(statement.month.days + 1).fill(0);
    let previousDay = 0;
    let previousSign = 1;
    for (const transaction of statement.transactions) {
      const category = CATEGORY_BY_KEY[transaction.category];
      assert(category && Number.isSafeInteger(transaction.amountCents) && transaction.amountCents > 0, "invalid transaction amount or category.");
      assert(Number.isInteger(transaction.day) && transaction.day >= 1 && transaction.day <= statement.month.days, "invalid transaction date.");
      assert(transaction.day >= previousDay && (transaction.day !== previousDay || category.sign <= previousSign), "transaction order.");
      previousDay = transaction.day;
      previousSign = category.sign;
      totals[category.key] += transaction.amountCents;
      movements[transaction.day] += category.sign * transaction.amountCents;
    }
    assert(CATEGORIES.every(category => totals[category.key] === statement.totals[category.key]), "category totals.");
    assert(statement.dailyBalances.length === statement.month.days, "missing calendar-day balances.");
    let balance = statement.openingCents;
    statement.dailyBalances.forEach((entry, dayIndex) => {
      balance += movements[dayIndex + 1];
      assert(Number.isSafeInteger(balance) && entry.day === dayIndex + 1 && entry.balanceCents === balance, "daily balance reconciliation.");
    });
    assert(balance === statement.closingCents, "closing balance reconciliation.");
    if (statement.breakInfo) {
      const info = statement.breakInfo;
      assert(index === statements.length - 1 && Number.isSafeInteger(info.deltaCents) && info.deltaCents !== 0, "invalid reconciliation break.");
      if (info.mode === "misstated") {
        assert(Number.isInteger(info.transactionIndex) && statement.transactions[info.transactionIndex]?.amountCents + info.deltaCents > 0, "nonpositive misstated amount.");
      } else {
        assert(info.mode === "phantom" && Number.isInteger(info.pivotDay) && info.pivotDay >= 1 && info.pivotDay <= statement.month.days, "invalid phantom pivot.");
      }
    }
  });
}

/* ---------------- Presentation corruption and generation entry point ---------------- */
function makeBreakInfo(statement, requestedMode, rng) {
  if (requestedMode === "none") return null;
  const mode = requestedMode === "random" ? pick(rng, ["misstated", "phantom"]) : requestedMode;
  const magnitude = moneyCents(rng, 15, 200);
  let deltaCents = (rng() < 0.5 ? -1 : 1) * magnitude;
  if (mode === "misstated") {
    const populated = CATEGORIES.filter(category => statement.transactions.some(transaction => transaction.category === category.key));
    // A ledger with no retained transactions can still exercise a balance mismatch.
    if (populated.length) {
      const category = pick(rng, populated).key;
      const indexes = statement.transactions.flatMap((transaction, index) => transaction.category === category ? [index] : []);
      const transactionIndex = pick(rng, indexes);
      if (statement.transactions[transactionIndex].amountCents + deltaCents <= 0) deltaCents = magnitude;
      return { mode, transactionIndex, deltaCents };
    }
  }
  return { mode: "phantom", pivotDay: randomInt(rng, 1, statement.month.days), deltaCents };
}

function generateStatements(config, rng = createRandom(config.seed)) {
  validateConfig(config);
  const bank = config.bank === "random" ? pick(rng, BANKS) : BANKS[Number(config.bank)];
  const business = makeBusiness(config, rng);
  const months = getMonths(config.lastMonth, config.numMonths);
  const financings = buildFinancings(config, rng);
  const debtCollectors = buildDebtCollectors(config, rng);
  const balanceTier = BALANCE_TIERS[config.balanceTier];
  let openingCents = moneyCents(rng, balanceTier.min, balanceTier.max);
  const statements = months.map((month, index) => {
    const statement = buildStatement(month, openingCents, monthTransactions(month, index, config, financings, rng, debtCollectors), config.allowOverdraft);
    openingCents = statement.closingCents;
    return statement;
  });
  statements.at(-1).breakInfo = makeBreakInfo(statements.at(-1), config.breakMode, rng);
  validateStatements(statements);
  return { seed: config.seed, bank, business, statements, debtCollectors };
}


export {
  collectorStatementNameOptions, getMonths, validateConfig, makeBusiness, spendScale,
  buildFinancings, financingDebits, buildDebtCollectors, debtCollectorDebits, monthTransactions,
  buildStatement, validateStatements, makeBreakInfo, generateStatements, moneyCents,
  referenceNumber, weekday, isBusinessDay,
};
